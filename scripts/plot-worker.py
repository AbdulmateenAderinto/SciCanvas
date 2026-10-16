# SciCanvas plot worker (Python). SciCanvas starts it once and keeps it running, so matplotlib (and numpy, pandas,
# seaborn when installed) are imported once and each plot renders in a fraction of a second.
#
# Protocol: one request per line on stdin, "<id>\t<folder>". The folder holds code.py, params.json
# ({"width": in, "height": in, "fontSize": pt}) and data.json ({"name": "/path/to/file"}). The worker writes
# out.svg, log.txt and, on failure, error.txt into the folder, then prints "DONE <id>".
#
# The code runs with: plt, np, pd (or None), sns (or None), data (name -> path) and read(name), which loads a data
# file as a pandas DataFrame (CSV, TSV, Excel), or a numpy structured array without pandas; PALETTE (the figure's
# colours, also the default colour cycle), WIDTH and HEIGHT (inches) and FONT_SIZE (pt), the figure's plot style. The last figure made
# is the plot. Text stays text in the SVG (svg.fonttype = none), so labels can be edited in SciCanvas.
import contextlib
import io
import json
import os
import sys
import traceback

os.environ.setdefault("MPLBACKEND", "Agg")
import matplotlib  # noqa: E402

matplotlib.use("Agg")
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


def style(font_size, width, height, family="Arial", palette=None):
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
        "font.size": font_size,
        "axes.titlesize": font_size + 1,
        "axes.labelsize": font_size,
        "xtick.labelsize": font_size - 1,
        "ytick.labelsize": font_size - 1,
        "legend.fontsize": font_size - 1,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.linewidth": 0.8,
        "xtick.major.width": 0.8,
        "ytick.major.width": 0.8,
        "lines.linewidth": 1.4,
        "figure.figsize": (width, height),
        "figure.constrained_layout.use": True,
        "savefig.transparent": True,
    })


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


def run(folder):
    with open(os.path.join(folder, "params.json")) as f:
        p = json.load(f)
    with open(os.path.join(folder, "data.json")) as f:
        data = json.load(f)
    with open(os.path.join(folder, "code.py"), encoding="utf-8") as f:
        code = f.read()
    plt.close("all")
    palette = p.get("palette") or []
    style(p.get("fontSize", 8), p.get("width", 4), p.get("height", 3), p.get("family") or "Arial", palette)
    ns = {"plt": plt, "np": np, "pd": pd, "sns": sns, "data": data, "read": make_reader(data), "PALETTE": palette,
          "WIDTH": p.get("width", 4), "HEIGHT": p.get("height", 3), "FONT_SIZE": p.get("fontSize", 8), "__name__": "__plot__"}
    log = io.StringIO()
    error = None
    try:
        with contextlib.redirect_stdout(log), contextlib.redirect_stderr(log):
            exec(compile(code, "plot", "exec"), ns)
        nums = plt.get_fignums()
        if not nums:
            error = "The code didn't make a figure (use plt.subplots() or plt.figure())."
        else:
            buf = io.StringIO()
            plt.figure(nums[-1]).savefig(buf, format="svg")
            with open(os.path.join(folder, "out.svg"), "w", encoding="utf-8") as f:
                f.write(buf.getvalue())
    except Exception:
        tb = traceback.format_exc().splitlines()
        # keep the user's lines only (frames in "plot"), not the worker's
        keep = [ln for i, ln in enumerate(tb) if 'File "plot"' in ln or (i > 0 and 'File "plot"' in tb[i - 1])]
        error = "\n".join([ln for ln in keep[-6:] if ln != tb[-1]] + [tb[-1]])
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
