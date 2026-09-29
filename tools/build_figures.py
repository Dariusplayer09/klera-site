#!/usr/bin/env python3
"""Generate the one data figure on /for-engineers/ (two-students.svg) as a standalone SVG.

The site has no build step, so the SVGs in assets/figures/ are committed. Re-run this
script and commit the result whenever the numbers change:

    python3 tools/build_figures.py

Every value below is a real measurement copied from the app repo's device-run findings
(PEN_CALIBRATION_FINDINGS.md, run 004, and RUN_005_FINDINGS.md, run 005). Nothing here
is illustrative. If a number cannot be sourced to a run, it does not get drawn.

Colours are the two validated data tokens from DESIGN.md. They passed the categorical
checks on the #FEFCF3 surface: lightness band, chroma floor, CVD separation (dE 31.7
protan), normal-vision floor (dE 36.1) and 5.0:1 contrast. Do not substitute by eye.
"""

CALM      = "#2563EB"
STRUGGLE  = "#C2410C"
INK       = "#1B1A17"
INK_SOFT  = "#45403A"
MUTED     = "#6B6457"
RULE      = "#E8DFC9"
CARD      = "#FFFFFF"
SUNK      = "#FBF0DA"
YELLOW    = "#E0A92E"
AMBER     = "#7A5A14"

FONT = "Figtree, ui-sans-serif, -apple-system, sans-serif"
MONO = "ui-monospace, Menlo, monospace"

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def head(w, h, title, desc):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" role="img" aria-labelledby="t d" font-family="{FONT}">'
            f'<title id="t">{esc(title)}</title><desc id="d">{esc(desc)}</desc>'
            f'<rect width="{w}" height="{h}" fill="{CARD}"/>')

def txt(x, y, s, size=13, fill=INK_SOFT, anchor="start", weight=400, mono=False):
    fam = f' font-family="{MONO}"' if mono else ""
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{fill}" '
            f'text-anchor="{anchor}" font-weight="{weight}"{fam}>{esc(s)}</text>')




def compare_chart(path, title, desc, panels, xmin, xmax, ticks, threshold, w=840):
    """Small multiples: the same signal, the same axis, one panel per student.

    Two students on one axis is the whole argument, so they share a scale and never
    get two y-axes."""
    pad_l, pad_r, pad_t = 150, 34, 62
    panel_h, gap = 92, 26
    h = pad_t + len(panels) * (panel_h + gap) + 54
    plot_w = w - pad_l - pad_r

    def X(v):
        return pad_l + (v - xmin) / (xmax - xmin) * plot_w

    o = [head(w, h, title, desc)]
    o.append(txt(20, 26, title, 15, INK, weight=500))
    o.append(txt(20, 44, "Same signal, same scale, one panel per student.", 12, MUTED))

    for i, p in enumerate(panels):
        top = pad_t + i * (panel_h + gap)
        y = top + panel_h / 2
        o.append(f'<rect x="{pad_l - 12}" y="{top}" width="{plot_w + 24}" height="{panel_h}" rx="10" fill="{CARD}" stroke="{RULE}"/>')
        for t in ticks:
            o.append(f'<line x1="{X(t):.1f}" y1="{top + 10}" x2="{X(t):.1f}" y2="{top + panel_h - 10}" stroke="{RULE}" stroke-width="1"/>')
        tx = X(threshold)
        o.append(f'<line x1="{tx:.1f}" y1="{top + 6}" x2="{tx:.1f}" y2="{top + panel_h - 6}" stroke="{INK_SOFT}" stroke-width="2" stroke-dasharray="5 4"/>')

        o.append(txt(pad_l - 26, y - 4, p["who"], 14, INK, "end", weight=500))
        o.append(txt(pad_l - 26, y + 14, p["run"], 11, MUTED, "end", mono=True))

        lo, hi = p["calm"]
        x0, x1 = X(lo), X(hi)
        o.append(f'<rect x="{x0:.1f}" y="{y - 7:.1f}" width="{max(x1 - x0, 6):.1f}" height="14" rx="4" fill="{CALM}" fill-opacity="0.24"/>')
        o.append(f'<line x1="{x0:.1f}" y1="{y - 11:.1f}" x2="{x0:.1f}" y2="{y + 11:.1f}" stroke="{CALM}" stroke-width="2"/>')
        o.append(f'<line x1="{x1:.1f}" y1="{y - 11:.1f}" x2="{x1:.1f}" y2="{y + 11:.1f}" stroke="{CALM}" stroke-width="2"/>')
        for v in p["struggle"]:
            o.append(f'<circle cx="{X(v):.1f}" cy="{y:.1f}" r="7.5" fill="{STRUGGLE}" stroke="{CARD}" stroke-width="2"/>')
        o.append(txt(pad_l, top + panel_h - 12, p["verdict"], 12, INK_SOFT))

    for t in ticks:
        o.append(txt(X(t), h - 26, f"{t:g}", 11, MUTED, "middle", mono=True))
    o.append(txt(X(threshold), h - 8, f"detector fires at {threshold:g}", 11, INK_SOFT, "middle"))
    o.append("</svg>")
    open(path, "w").write("".join(o))
    print("wrote", path)


compare_chart(
    "assets/figures/two-students.svg",
    "The same detector, two students",
    "Pressure strain separates the first student's stuck attempt cleanly from their calm range, "
    "and is completely flat for the second student, whose stuck attempts sit inside their calm range.",
    [
        {"who": "Student A", "run": "run 004, n=8 calm, 1 stuck", "calm": (0.03, 0.24), "struggle": [0.56],
         "verdict": "Separates cleanly. Struggle sits well outside the calm range."},
        {"who": "Student B", "run": "run 005, n=7 calm, 3 stuck", "calm": (0.05, 0.12), "struggle": [0.06, 0.11, 0.12],
         "verdict": "Completely flat. All three stuck attempts sit inside the calm range."},
    ],
    0, 0.7, [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7], threshold=0.60,
)
