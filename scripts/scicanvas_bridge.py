"""Send matplotlib / seaborn figures to an open SciCanvas (copied to ~/.scicanvas/scicanvas.py by SciCanvas).

    import scicanvas
    scicanvas.send()                      # the current figure
    scicanvas.send(fig, name="Fig 2B")    # a Figure, an Axes, or a seaborn grid

The figure arrives on the page SciCanvas has open, at its own size, with its text kept as editable text.
"""
import io
import json
import os
import urllib.error
import urllib.parse
import urllib.request

__all__ = ["send", "ping"]
CONFIG = os.path.join(os.path.expanduser("~"), ".scicanvas", "bridge.json")


def _config():
    try:
        with open(CONFIG) as f:
            return json.load(f)
    except FileNotFoundError:
        raise RuntimeError("SciCanvas isn't running: open it, then send again.") from None


def _figure(obj):
    import matplotlib.pyplot as plt
    if obj is None:
        return plt.gcf()
    if hasattr(obj, "savefig") and hasattr(obj, "get_size_inches"):
        return obj
    for attr in ("figure", "fig"):  # Axes, seaborn FacetGrid / PairGrid / JointGrid
        f = getattr(obj, attr, None)
        if f is not None and hasattr(f, "savefig"):
            return f
    raise TypeError(f"Can't send a {type(obj).__name__}: pass a matplotlib Figure, Axes or seaborn grid.")


def ping():
    c = _config()
    with urllib.request.urlopen(f"http://127.0.0.1:{c['port']}/ping", timeout=5) as r:
        return json.loads(r.read())


def send(fig=None, name=None, source="Python"):
    import matplotlib.pyplot as plt
    fig = _figure(fig)
    with plt.rc_context({"svg.fonttype": "none"}):
        buf = io.StringIO()
        fig.savefig(buf, format="svg", transparent=True)
    w, h = fig.get_size_inches()
    c = _config()
    q = urllib.parse.urlencode({"name": name or (fig.get_suptitle() if hasattr(fig, "get_suptitle") and fig.get_suptitle() else "Python plot"),
                                "source": source, "width": f"{w:.4f}", "height": f"{h:.4f}"})
    req = urllib.request.Request(f"http://127.0.0.1:{c['port']}/svg?{q}", data=buf.getvalue().encode("utf-8"), method="POST",
                                 headers={"Content-Type": "image/svg+xml", "X-SciCanvas-Token": c["token"]})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"SciCanvas refused the plot: {e.read().decode(errors='replace')}") from None
    except urllib.error.URLError:
        raise RuntimeError("Couldn't reach SciCanvas: is it open?") from None
    return True
