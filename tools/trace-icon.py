"""Trace a picture into a layered vector SVG (for icons drawn from a reference illustration).

    python3 tools/trace-icon.py INPUT OUTPUT.svg [--levels 16] [--scale 3]

The picture is upscaled (--scale, bicubic) and lightly smoothed, the white background touching the
border is removed, and the remaining tones are clustered into --levels greys (k-means). Each tone
is traced as a stack: a layer covers every pixel of that tone or darker, so the layers nest and
leave no gaps. Contours are simplified and drawn as smooth curves (Catmull-Rom to cubic Bezier).
The SVG keeps the input's pixel frame (viewBox = width x height), so every edge stays where it is
in the picture.
"""
import argparse

import cv2
import numpy as np


def smooth_path(pts, corner_deg=40):
    """Closed path through the points: smooth (Catmull-Rom as cubic Bezier) where the outline bends
    gently, straight into and out of corners that turn more than corner_deg."""
    n = len(pts)
    if n < 3:
        return ""
    import math

    def turn(i):
        a, b, c = pts[i - 1], pts[i], pts[(i + 1) % n]
        a1, a2 = math.atan2(b[1] - a[1], b[0] - a[0]), math.atan2(c[1] - b[1], c[0] - b[0])
        return abs((a2 - a1 + math.pi) % (2 * math.pi) - math.pi) > math.radians(corner_deg)
    corner = [turn(i) for i in range(n)]
    d = f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = p1 if corner[i] else (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = p2 if corner[(i + 1) % n] else (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        if c1 is p1 and c2 is p2:
            d += f"L{p2[0]:.1f} {p2[1]:.1f}"
        else:
            d += f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d + "Z"


def trace(src, levels=16, scale=3, eps=0.6, min_area=3):
    img = cv2.imread(src, cv2.IMREAD_COLOR)
    if img is None:                                   # webp or other formats OpenCV may lack
        from PIL import Image
        img = cv2.cvtColor(np.array(Image.open(src).convert("RGB")), cv2.COLOR_RGB2BGR)
    h0, w0 = img.shape[:2]
    grey = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    big = cv2.resize(grey, (w0 * scale, h0 * scale), interpolation=cv2.INTER_CUBIC)
    big = cv2.bilateralFilter(big, 5, 14, 5)          # keep edges, flatten noise and gradients
    # background: near-white connected to the border
    bg = (big >= 246).astype(np.uint8)
    _n, lab = cv2.connectedComponents(bg, connectivity=4)
    edge = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    border = [k for k in np.unique(edge) if k != 0]       # label 0 is the non-white pixels
    obj = ~(np.isin(lab, border) & (bg == 1))
    obj = cv2.morphologyEx(obj.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    # tones inside the object
    vals = big[obj].reshape(-1, 1).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.5)
    _c, labels, centers = cv2.kmeans(vals, levels, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    order = np.argsort(-centers[:, 0])                # light to dark
    rank = np.empty(levels, int)
    rank[order] = np.arange(levels)
    tone = np.full(big.shape, -1, int)
    tone[obj] = rank[labels[:, 0]]
    layers = []
    for r in range(levels):
        colour = int(round(centers[order[r], 0]))
        mask = ((tone >= r) & obj).astype(np.uint8) * 255
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        contours, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        d = ""
        for c in contours:
            if abs(cv2.contourArea(c)) < min_area * scale * scale:
                continue
            ap = cv2.approxPolyDP(c, eps * scale, True)[:, 0, :] / scale
            if len(ap) >= 3:
                d += smooth_path([tuple(p) for p in ap])
        if d:
            layers.append((colour, d))
    return w0, h0, layers


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--levels", type=int, default=16)
    ap.add_argument("--scale", type=int, default=3)
    a = ap.parse_args()
    w, h, layers = trace(a.input, a.levels, a.scale)
    body = "".join(f'<path fill="#{c:02x}{c:02x}{c:02x}" fill-rule="evenodd" d="{d}"/>' for c, d in layers)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{body}</svg>'
    open(a.output, "w").write(svg)
    print(f"{a.output}: {w} x {h}, {len(layers)} tone layers, {len(svg) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
