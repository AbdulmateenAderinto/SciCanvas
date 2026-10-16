# SciCanvas plot worker (Python). SciCanvas starts it once and keeps it running, so matplotlib (and numpy, pandas,
# seaborn when installed) are imported once and each plot renders in a fraction of a second.
#
# Protocol: one request per line on stdin, "<id>\t<folder>". The folder holds code.py, params.json, data.json
# ({"name": "/path/to/file"}) and, optionally, prelude.py (the figure's shared plot code, run first). The worker
# writes out.svg, axes.json (where the axes sit), log.txt and, on failure, error.txt into the folder, then prints
# "DONE <id>".
#
# params.json: width / height (inches, the size the plot PRINTS at), fontSize, tickSize, labelSize, titleSize,
# legendSize (pt), minScriptPt (smallest size for super- and subscripts), family, palette (["#rrggbb"]), and
# margins ({"left", "right", "top", "bottom"} in mm, or null for automatic layout).
#
# The code runs with: plt, np, pd (or None), sns (or None), data (name -> path), read(name) (a data file as a pandas
# DataFrame, CSV / TSV / Excel; a numpy structured array without pandas), PALETTE, WIDTH and HEIGHT (in), FONT_SIZE
# and the other sizes (pt). The last figure made is the plot. Text stays text in the SVG (svg.fonttype = none), so
# labels can be edited in SciCanvas.
import contextlib
import io
import json
import os
import sys
import traceback

os.environ.setdefault("MPLBACKEND", "Agg")
import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib._mathtext as mathtext  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

try:
    import pandas as pd
except ImportError:
    pd = None
try:
    import seaborn as sns
except ImportError:
    sns = None

PROTOCOL_OUT = sys.stdout
MM = 25.4


def sizes(p):
    fs = float(p.get("fontSize", 7))
    return {
        "font": fs,
        "tick": float(p.get("tickSize") or fs - 1),
        "label": float(p.get("labelSize") or fs),
        "title": float(p.get("titleSize") or fs + 1),
        "legend": float(p.get("legendSize") or fs - 1),
        "script": float(p.get("minScriptPt") or 0),
    }


def style(p):
    s = sizes(p)
    width, height = p.get("width", 4), p.get("height", 3)
    family, palette, margins = p.get("family") or "Arial", p.get("palette") or [], p.get("margins")
    plt.rcdefaults()
    if sns is not None:
        sns.set_theme(style="ticks", palette=palette or None)
    if palette:
        from cycler import cycler
        plt.rcParams["axes.prop_cycle"] = cycler(color=palette)
    plt.rcParams.update({
        "svg.fonttype": "none",            # keep text as editable text
        "svg.hashsalt": "scicanvas",        # stable ids between runs
        "font.family": "sans-serif",
        "font.sans-serif": [family, "Arial", "Helvetica", "DejaVu Sans"],
        "font.size": s["font"],
        "axes.titlesize": s["title"],
        "figure.titlesize": s["title"],
        "axes.labelsize": s["label"],
        "xtick.labelsize": s["tick"],
        "ytick.labelsize": s["tick"],
        "legend.fontsize": s["legend"],
        "legend.title_fontsize": s["label"],
        # maths ($10^3$, $Aicda^{-/-}$) in the figure's font, not DejaVu
        "mathtext.fontset": "custom",
        "mathtext.rm": family,
        "mathtext.it": f"{family}:italic",
        "mathtext.bf": f"{family}:bold",
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.linewidth": 0.8,
        "xtick.major.width": 0.8,
        "ytick.major.width": 0.8,
        "lines.linewidth": 1.4,
        "figure.figsize": (width, height),
        "figure.constrained_layout.use": not margins,
        "savefig.transparent": True,
    })
    if margins:
        plt.rcParams.update({
            "figure.subplot.left": margins["left"] / (width * MM),
            "figure.subplot.right": 1 - margins["right"] / (width * MM),
            "figure.subplot.bottom": margins["bottom"] / (height * MM),
            "figure.subplot.top": 1 - margins["top"] / (height * MM),
        })
    # Super- and subscripts are drawn at 0.7x their text; never let the smallest text's scripts print below the
    # minimum (a journal's 5-6 pt), so Aicda^{-/-} and 10^3 tick labels stay legible.
    smallest = min(s["tick"], s["legend"], s["label"], s["font"])
    mathtext.SHRINK_FACTOR = min(1.0, max(0.7, s["script"] / smallest)) if s["script"] else 0.7


def make_reader(data):
    def read(name, **kw):
        if name not in data:
            raise KeyError(f"No data file called {name!r}. Attached: {', '.join(data) or 'none'}")
        path = data[name]
        ext = os.path.splitext(path)[1].lower()
        if pd is not None:
            if ext in (".xlsx", ".xls"):
                return pd.read_excel(path, **kw)
            return pd.read_csv(path, sep="\t" if ext in (".tsv", ".txt") else ",", **kw)
        return np.genfromtxt(path, delimiter="\t" if ext in (".tsv", ".txt") else ",", names=True, dtype=None, encoding="utf-8", **kw)
    return read


def axes_box(fig, p):
    """Where the axes sit, in mm from each edge (the union of the plot's axes, colour bars left out)."""
    w, h = p.get("width", 4) * MM, p.get("height", 3) * MM
    boxes = [a.get_position() for a in fig.axes if a.get_label() != "<colorbar>" and a.get_visible()]
    if not boxes:
        return None
    x0, y0 = min(b.x0 for b in boxes), min(b.y0 for b in boxes)
    x1, y1 = max(b.x1 for b in boxes), max(b.y1 for b in boxes)
    return {"left": x0 * w, "right": (1 - x1) * w, "bottom": y0 * h, "top": (1 - y1) * h, "count": len(boxes)}


def user_error():
    tb = traceback.format_exc().splitlines()
    # keep the user's lines only (frames in "plot" or "prelude"), not the worker's
    mine = lambda ln: 'File "plot"' in ln or 'File "prelude"' in ln  # noqa: E731
    keep = [ln for i, ln in enumerate(tb) if mine(ln) or (i > 0 and mine(tb[i - 1]))]
    return "\n".join([ln.replace('File "prelude"', 'Shared plot code') for ln in keep[-6:] if ln != tb[-1]] + [tb[-1]])


def run(folder):
    with open(os.path.join(folder, "params.json")) as f:
        p = json.load(f)
    with open(os.path.join(folder, "data.json")) as f:
        data = json.load(f)
    with open(os.path.join(folder, "code.py"), encoding="utf-8") as f:
        code = f.read()
    prelude_path = os.path.join(folder, "prelude.py")
    prelude = open(prelude_path, encoding="utf-8").read() if os.path.exists(prelude_path) else ""
    plt.close("all")
    style(p)
    s = sizes(p)
    ns = {"plt": plt, "np": np, "pd": pd, "sns": sns, "data": data, "read": make_reader(data), "PALETTE": p.get("palette") or [],
          "WIDTH": p.get("width", 4), "HEIGHT": p.get("height", 3), "FONT_SIZE": s["font"], "TICK_SIZE": s["tick"],
          "LABEL_SIZE": s["label"], "TITLE_SIZE": s["title"], "LEGEND_SIZE": s["legend"], "MARGINS": p.get("margins"), "__name__": "__plot__"}
    log = io.StringIO()
    error = None
    try:
        with contextlib.redirect_stdout(log), contextlib.redirect_stderr(log):
            if prelude.strip():
                exec(compile(prelude, "prelude", "exec"), ns)
            exec(compile(code, "plot", "exec"), ns)
        nums = plt.get_fignums()
        if not nums:
            error = "The code didn't make a figure (use plt.subplots() or plt.figure())."
        else:
            fig = plt.figure(nums[-1])
            m = p.get("margins")
            if m:  # fixed margins win over a layout the code chose, so panels line up
                fig.set_layout_engine("none")
                fig.subplots_adjust(left=m["left"] / (p["width"] * MM), right=1 - m["right"] / (p["width"] * MM),
                                    bottom=m["bottom"] / (p["height"] * MM), top=1 - m["top"] / (p["height"] * MM))
            buf = io.StringIO()
            fig.savefig(buf, format="svg")
            with open(os.path.join(folder, "out.svg"), "w", encoding="utf-8") as f:
                f.write(buf.getvalue())
            box = axes_box(fig, p)
            if box:
                with open(os.path.join(folder, "axes.json"), "w") as f:
                    json.dump(box, f)
    except Exception:
        error = user_error()
    finally:
        plt.close("all")
    with open(os.path.join(folder, "log.txt"), "w", encoding="utf-8") as f:
        f.write(log.getvalue())
    if error:
        with open(os.path.join(folder, "error.txt"), "w", encoding="utf-8") as f:
            f.write(error)


def main():
    versions = {"python": sys.version.split()[0], "matplotlib": matplotlib.__version__,
                "pandas": pd.__version__ if pd is not None else None, "seaborn": sns.__version__ if sns is not None else None}
    print("READY " + json.dumps(versions), file=PROTOCOL_OUT, flush=True)
    for line in sys.stdin:
        line = line.rstrip("\n")
        if not line:
            continue
        rid, folder = line.split("\t", 1)
        try:
            run(folder)
        except Exception as e:  # a broken request must not stop the worker
            with open(os.path.join(folder, "error.txt"), "w", encoding="utf-8") as f:
                f.write(f"SciCanvas plot worker: {e}")
        print(f"DONE {rid}", file=PROTOCOL_OUT, flush=True)


if __name__ == "__main__":
    main()
