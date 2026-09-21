#!/usr/bin/env python3
"""Generate the data figures for /for-engineers/ as standalone SVG files.

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
INK       = "#171307"
INK_SOFT  = "#5B5340"
MUTED     = "#7D7360"
RULE      = "#E6DCC2"
CARD      = "#FFFDF7"
YELLOW    = "#E9B11E"

FONT = "Geist, ui-sans-serif, -apple-system, sans-serif"
MONO = "'Geist Mono', ui-monospace, Menlo, monospace"

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


def strip_chart(path, title, desc, rows, xmin, xmax, ticks, threshold=None,
                xlabel="", note="", w=840, row_h=58, pad_l=210):
    """One horizontal strip per signal: the calm range as a bar, struggle attempts as dots.

    A range bar plus individual dots is the honest form here. n is 7 and 3; a box plot
    would imply a distribution we have no right to claim from three points, and a bar
    chart of means would hide the whole finding, which is about overlap."""
    pad_r, pad_t, pad_b = 34, 58, 62
    h = pad_t + row_h * len(rows) + pad_b
    plot_w = w - pad_l - pad_r

    def X(v):
        return pad_l + (v - xmin) / (xmax - xmin) * plot_w

    o = [head(w, h, title, desc)]
    o.append(txt(20, 26, title, 15, INK, weight=500))

    # grid + ticks, recessive
    for t in ticks:
        x = X(t)
        o.append(f'<line x1="{x:.1f}" y1="{pad_t - 12}" x2="{x:.1f}" y2="{pad_t + row_h * len(rows) - 14}" stroke="{RULE}" stroke-width="1"/>')
        o.append(txt(x, h - pad_b + 30, f"{t:g}", 11, MUTED, "middle", mono=True))

    if threshold is not None:
        x = X(threshold)
        o.append(f'<line x1="{x:.1f}" y1="{pad_t - 20}" x2="{x:.1f}" y2="{pad_t + row_h * len(rows) - 14}" stroke="{INK_SOFT}" stroke-width="2" stroke-dasharray="5 4"/>')
        o.append(txt(x, pad_t - 28, f"fires at {threshold:g}", 11, INK_SOFT, "middle"))

    for i, r in enumerate(rows):
        y = pad_t + i * row_h + 8
        o.append(txt(pad_l - 14, y + 5, r["label"], 13, INK, "end"))
        lo, hi = r["calm"]
        x0, x1 = X(lo), X(hi)
        # the calm band: a 12px bar with 4px rounded ends, anchored to the measured extent
        o.append(f'<rect x="{x0:.1f}" y="{y - 6:.1f}" width="{max(x1 - x0, 6):.1f}" height="12" rx="4" fill="{CALM}" fill-opacity="0.24"/>')
        o.append(f'<line x1="{x0:.1f}" y1="{y - 9:.1f}" x2="{x0:.1f}" y2="{y + 9:.1f}" stroke="{CALM}" stroke-width="2"/>')
        o.append(f'<line x1="{x1:.1f}" y1="{y - 9:.1f}" x2="{x1:.1f}" y2="{y + 9:.1f}" stroke="{CALM}" stroke-width="2"/>')
        for v in r["struggle"]:
            # 2px surface ring so overlapping dots stay countable
            o.append(f'<circle cx="{X(v):.1f}" cy="{y:.1f}" r="7" fill="{STRUGGLE}" stroke="{CARD}" stroke-width="2"/>')
        o.append(txt(pad_l - 14, y + 20, r["sub"], 11, MUTED, "end"))

    if xlabel:
        o.append(txt(pad_l + plot_w / 2, h - pad_b + 50, xlabel, 12, MUTED, "middle"))
    if note:
        o.append(txt(20, h - 12, note, 12, INK_SOFT))
    o.append("</svg>")
    open(path, "w").write("".join(o))
    print("wrote", path)


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


def baseline_chart(path, w=840):
    """Before and after the RobustStat warm-up debias, as measured on device.

    zJerk is a z-score against the student's own baseline, so a healthy estimator
    produces values on both sides of zero. Run 002's five post-baseline reads were all
    positive, which is the estimator talking rather than the student.

    Run 002 publishes its five individual values, so they are drawn as points. Run 004
    publishes only its range and the sign count, so it is drawn as a range and labelled
    with that count. Individual run-004 points are NOT interpolated to fill the row."""
    xmin, xmax = -4, 2
    pad_l, pad_r, pad_t = 210, 34, 66
    row_h, h = 104, 66 + 2 * 104 + 60
    plot_w = w - pad_l - pad_r
    X = lambda v: pad_l + (v - xmin) / (xmax - xmin) * plot_w

    o = [head(w, h, "Jerk z-scores before and after the estimator fix",
              "Run 002 produced five positive jerk z-scores out of five, spanning plus 0.80 to "
              "plus 1.12. After the warm-up debias, run 004 spanned minus 3.39 to plus 0.51 with "
              "eight of nine negative.")]
    o.append(txt(20, 26, "Jerk z-scores before and after the estimator fix", 15, INK, weight=500))
    o.append(txt(20, 46, "One student, same device. A z-score against your own normal should sit on both sides of zero.", 12, MUTED))

    # run 002 - five published values, drawn as points
    y = pad_t + 34
    o.append(txt(pad_l - 16, y - 2, "Run 002, biased estimator", 13, INK, "end", weight=500))
    o.append(f'<line x1="{X(xmin):.1f}" y1="{y:.1f}" x2="{X(xmax):.1f}" y2="{y:.1f}" stroke="{RULE}" stroke-width="1"/>')
    o.append(f'<line x1="{X(0):.1f}" y1="{y - 22:.1f}" x2="{X(0):.1f}" y2="{y + 22:.1f}" stroke="{INK_SOFT}" stroke-width="2"/>')
    for v in [1.11, 1.10, 1.12, 0.80, 0.87]:
        o.append(f'<circle cx="{X(v):.1f}" cy="{y:.1f}" r="7" fill="{STRUGGLE}" stroke="{CARD}" stroke-width="2"/>')
    o.append(txt(pad_l, y + 34, "All five post-baseline reads positive. Centre still under-converged after 12 samples.", 12, INK_SOFT))

    # run 004 - only the range and the sign count are published, so only those are drawn
    y = pad_t + row_h + 34
    o.append(txt(pad_l - 16, y - 2, "Run 004, warm-up debiased", 13, INK, "end", weight=500))
    o.append(f'<line x1="{X(xmin):.1f}" y1="{y:.1f}" x2="{X(xmax):.1f}" y2="{y:.1f}" stroke="{RULE}" stroke-width="1"/>')
    o.append(f'<line x1="{X(0):.1f}" y1="{y - 22:.1f}" x2="{X(0):.1f}" y2="{y + 22:.1f}" stroke="{INK_SOFT}" stroke-width="2"/>')
    x0, x1 = X(-3.39), X(0.51)
    o.append(f'<rect x="{x0:.1f}" y="{y - 7:.1f}" width="{x1 - x0:.1f}" height="14" rx="4" fill="{CALM}" fill-opacity="0.24"/>')
    for v in (-3.39, 0.51):
        o.append(f'<line x1="{X(v):.1f}" y1="{y - 11:.1f}" x2="{X(v):.1f}" y2="{y + 11:.1f}" stroke="{CALM}" stroke-width="2"/>')
        o.append(f'<circle cx="{X(v):.1f}" cy="{y:.1f}" r="7" fill="{CALM}" stroke="{CARD}" stroke-width="2"/>')
    o.append(txt(pad_l, y + 34, "Range only: 8 of 9 negative, straddling zero. The nine values are not published individually.", 12, INK_SOFT))

    for t in [-4, -3, -2, -1, 0, 1, 2]:
        o.append(txt(X(t), h - 30, f"{t:+g}" if t else "0", 11, MUTED, "middle", mono=True))
    o.append(txt(pad_l + plot_w / 2, h - 10, "jerk z-score against this student's own baseline", 12, MUTED, "middle"))
    o.append("</svg>")
    open(path, "w").write("".join(o))
    print("wrote", path)


strip_chart(
    "assets/figures/separation-run005.svg",
    "Run 005: what the finished detectors read",
    "For each detector, the range across seven calm attempts and the value on each of three "
    "genuinely stuck attempts. Pressure strain and dysfluency overlap completely; unproductive "
    "struggle splits cleanly but never reaches its own threshold.",
    [
        {"label": "Pressure strain",      "sub": "7 calm, 3 stuck", "calm": (0.05, 0.12), "struggle": [0.06, 0.11, 0.12]},
        {"label": "Dysfluency",           "sub": "7 calm, 3 stuck", "calm": (0.13, 0.57), "struggle": [0.26, 0.56, 0.39]},
        {"label": "Unproductive struggle","sub": "7 calm, 3 stuck", "calm": (0.25, 0.25), "struggle": [0.50, 0.50, 0.50]},
    ],
    0, 1, [0, 0.2, 0.4, 0.6, 0.8, 1.0], threshold=0.60,
    xlabel="detector output, 0 to 1",
    note="Blue bar: the range across this student's calm attempts. Orange dot: one stuck attempt.",
)

strip_chart(
    "assets/figures/pause-run005.svg",
    "The one signal that does separate this student",
    "Pre-stroke pause, as a z-score against the student's own pace baseline. Calm attempts "
    "span minus 0.51 to plus 0.65. The hardest stuck attempt reads plus 7.32.",
    [
        {"label": "Pre-stroke pause", "sub": "7 calm, 3 stuck", "calm": (-0.51, 0.65), "struggle": [-0.36, 1.21, 7.32]},
    ],
    -1.5, 8, [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8],
    xlabel="pause z-score against this student's own pace baseline",
    note="The detector that reads this signal could not fire during the run. That is the bug described below.",
    row_h=74,
)

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

baseline_chart("assets/figures/baseline-debias.svg")
