#!/usr/bin/env python3
"""Generate the architecture diagrams for /for-engineers/ as standalone SVG files.

    python3 tools/build_diagrams.py

These describe the real pipelines in the app repo. Stage names match the actual types, so
a reader can go from a box here to a file there. Keep them in step when the code moves.
"""

INK, INK_SOFT, MUTED = "#171307", "#5B5340", "#7D7360"
RULE, RULE_FIRM, CARD, SUNK = "#E6DCC2", "#CFC2A0", "#FFFDF7", "#F7F1DF"
YELLOW, AMBER = "#E9B11E", "#7A4E00"
CALM, STRUGGLE = "#2563EB", "#C2410C"
FONT = "Geist, ui-sans-serif, -apple-system, sans-serif"
MONO = "'Geist Mono', ui-monospace, Menlo, monospace"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def svg(w, h, title, desc, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
            f'role="img" aria-labelledby="t d" font-family="{FONT}">'
            f'<title id="t">{esc(title)}</title><desc id="d">{esc(desc)}</desc>'
            f'<defs><marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
            f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{INK_SOFT}"/></marker>'
            f'<marker id="arw-fb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
            f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{STRUGGLE}"/></marker></defs>'
            f'<rect width="{w}" height="{h}" fill="{CARD}"/>{body}</svg>')


def text(x, y, s, size=12, fill=INK_SOFT, anchor="start", weight=400, mono=False):
    fam = f' font-family="{MONO}"' if mono else ""
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" '
            f'font-weight="{weight}"{fam}>{esc(s)}</text>')


def wrap(x, y, lines, size=11.5, fill=MUTED, anchor="middle", lh=14, mono=False):
    return "".join(text(x, y + i * lh, ln, size, fill, anchor, mono=mono) for i, ln in enumerate(lines))


def box(x, y, w, h, title, lines, accent=None, sub=None, fill=None):
    edge = accent or RULE_FIRM
    o = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill or SUNK}" stroke="{edge}" stroke-width="2"/>']
    o.append(text(x + w / 2, y + 26, title, 13.5, INK, "middle", 500))
    if sub:
        o.append(text(x + w / 2, y + 43, sub, 10.5, AMBER, "middle", mono=True))
    o.append(wrap(x + w / 2, y + (62 if sub else 48), lines))
    return "".join(o)


def arrow(x1, y1, x2, y2, label=None, marker="arw", colour=INK_SOFT, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    o = [f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{colour}" stroke-width="2" '
         f'marker-end="url(#{marker})"{d}/>']
    if label:
        o.append(text((x1 + x2) / 2, min(y1, y2) - 9, label, 10.5, colour, "middle", mono=True))
    return "".join(o)


def gate(x, y, label):
    """A gate badge: a condition the data must satisfy before it moves on."""
    w = 8 * len(label) + 26
    return (f'<rect x="{x - w / 2:.1f}" y="{y}" width="{w}" height="24" rx="12" fill="{YELLOW}"/>'
            + text(x, y + 16, label, 10.5, INK, "middle", 500, mono=True))


# --------------------------------------------------------------- handwriting pipeline
def handwriting():
    """Rows, top to bottom: the five stage boxes, the fallback branch hanging off stage one,
    then the determinism note as a full-width strip. The fallback arrow used to cross the
    determinism strip, which is why the strip is last rather than in the middle."""
    W, H = 1180, 470
    bw, bh, y = 178, 112, 96
    xs = [28, 258, 488, 718, 948]
    stages = [
        ("MathExpressionParser", "LaTeX to AST", ["A tight LaTeX subset:", "fractions, radicals,", "super and subscripts"]),
        ("HandwrittenLayoutEngine", "AST to geometry", ["Positions every glyph.", "Emits geometry only,", "never ink properties"]),
        ("ExpressionStrokeComposer", "geometry to ink", ["Jitter, baseline drift,", "slant sheared on the", "expression baseline"]),
        ("SemanticStrokeScheduler", "ink to timeline", ["The single source of", "timing truth. Pure", "function of its input"]),
        ("Handwriting2Animator", "timeline to canvas", ["Plays the schedule", "onto the student's", "own PKCanvasView"]),
    ]
    o = [text(28, 34, "Handwriting 2: how a string becomes pen strokes", 15, INK, weight=500),
         text(28, 56, "Five pure stages. Each one emits a different kind of thing, which is why they can be tested separately.", 12, MUTED)]
    for i, (t, sub, lines) in enumerate(stages):
        o.append(box(xs[i], y, bw, bh, t, lines, accent=YELLOW if i == 0 else RULE_FIRM, sub=sub))
        if i:
            o.append(arrow(xs[i - 1] + bw + 6, y + bh / 2, xs[i] - 6, y + bh / 2))

    # the fallback branch, hanging straight down off stage one
    fy = y + bh + 46
    ax = xs[0] + 88
    o.append(arrow(ax, y + bh + 6, ax, fy - 6, None, "arw-fb", STRUGGLE, "6 5"))
    o.append(text(ax + 14, y + bh + 30, "on any parse or layout failure", 10.5, STRUGGLE, mono=True))
    o.append(box(xs[0], fy, 330, 92, "MathHandwritingRenderer",
                 ["The previous glyph-stamp engine.", "Still shipped, still the fallback."],
                 accent=STRUGGLE, sub="production fallback"))
    o.append(box(xs[0] + 360, fy, 360, 92, "Real pen strokes, not a font",
                 ["PKStroke objects on the student's canvas.", "Erasable, selectable, zoomable like their own ink."],
                 accent=YELLOW))
    o.append(box(xs[0] + 750, fy, 402, 92, "Handwriting Lab",
                 ["Every constant above is live-tunable in the app.", "Its defaults match the baked v2 values exactly."],
                 sub="the iteration surface"))

    # the determinism note, full width, last so nothing crosses it
    dy = fy + 112
    o.append(f'<rect x="{xs[0]}" y="{dy}" width="{1152 - xs[0]}" height="54" rx="12" fill="{CARD}" stroke="{RULE}" stroke-width="2" stroke-dasharray="6 5"/>')
    o.append(text(xs[0] + 16, dy + 24, "Deterministic given a seed", 12, INK, weight=500))
    o.append(text(xs[0] + 16, dy + 42, "The only stochastic element is inter-stroke pause noise. The same string and seed produce the same strokes, so the schedule can be asserted in a test rather than eyeballed.", 11.5, MUTED))
    return svg(W, H, "The Handwriting 2 pipeline",
               "Five stages: parser, layout engine, stroke composer, scheduler, animator. Any parse or "
               "layout failure falls back to the older glyph-stamp renderer.", "".join(o))


# --------------------------------------------------------------- visualisation cascade
def visualisation():
    W, H = 1180, 470
    o = [text(28, 34, "The visualisation cascade: the model recommends, the engine decides", 15, INK, weight=500),
         text(28, 56, "A generated diagram that is wrong is worse than no diagram, so every tier can be refused and the last one cannot fail.", 12, MUTED)]

    o.append(box(28, 92, 200, 104, "Detection", ["Is a picture worth drawing", "here, and of what?"], accent=YELLOW, sub="classify"))
    o.append(arrow(234, 144, 268, 144))
    o.append(box(274, 92, 200, 104, "Viz3DRouter", ["Renders 3D only when the", "third dimension earns it.", "A parabola stays flat."], sub="route"))

    tiers = [
        ("Tier 0", "curated template", ["A hand-written JSXGraph", "template. Params validated", "against a whitelist first."], CALM),
        ("Tier 0-3D", "validated spec", ["A spatial spec, routed", "before the 2D tiers when", "the router allows it."], CALM),
        ("Tier 1", "generated script", ["The model writes JSXGraph.", "First tier that can be", "wrong, so it is gated."], YELLOW),
        ("Tier 2", "generated HTML", ["A full interactive widget", "in a sandboxed shell.", "Also gated."], YELLOW),
        ("Tier 3", "local fallback", ["Never fails and never", "invents mathematics. Asks", "for a retry instead."], STRUGGLE),
    ]
    x, ty, bw, bh = 28, 232, 210, 118
    for i, (name, sub, lines, accent) in enumerate(tiers):
        bx = x + i * (bw + 14)
        o.append(box(bx, ty, bw, bh, name, lines, accent=accent, sub=sub))
        if i:
            o.append(arrow(bx - 8, ty + bh / 2, bx - 2, ty + bh / 2))
            o.append(text(bx - 5, ty + bh / 2 - 10, "refused", 10, STRUGGLE, "middle", mono=True))
    o.append(arrow(374, 202, 133, ty - 6))

    gy = ty + bh + 34
    o.append(f'<rect x="28" y="{gy}" width="1124" height="76" rx="12" fill="{SUNK}" stroke="{YELLOW}" stroke-width="2"/>')
    o.append(text(48, gy + 26, "Quality gate, between the generated tiers and the screen", 13, INK, weight=500))
    o.append(text(48, gy + 46, "Static half: generated code referencing an escape hatch is rejected before it reaches a web view, on top of a CSP that already blocks the network.", 11.5, MUTED))
    o.append(text(48, gy + 63, "Dynamic half: the widget is rendered once off-screen and must clear instrumentation minimums. Anything that fails either half falls to the next tier down.", 11.5, MUTED))
    return svg(W, H, "The visualisation cascade",
               "Detection feeds a router, then five tiers from a curated template down to a local "
               "fallback that never fails. A two-part quality gate sits between the generated tiers "
               "and the screen.", "".join(o))


# --------------------------------------------------------------- learner profile
def profile():
    W, H = 1180, 500
    o = [text(28, 34, "The learner profile: from pen samples to what the tutor says", 15, INK, weight=500),
         text(28, 56, "Yellow badges are gates. Before a gate opens, every read downstream of it is zero by construction, not by measurement.", 12, MUTED)]

    y, bh = 100, 116
    cols = [
        (28, 206, "Pencil samples", "PKStroke", ["Force, azimuth, altitude,", "timestamp, per point,", "at the tablet's own rate"]),
        (264, 206, "Per-attempt features", "Kinematics", ["Mean force, speed,", "jerkiness, pre-stroke", "pause, erase bursts"]),
        (500, 206, "Per-student baseline", "RobustStat", ["Running centre and MAD,", "debiased for warm-up.", "One baseline per student"]),
        (736, 206, "Standard scores", "KinematicZ", ["zForce, zSpeed, zJerk,", "and a separate pause z", "from the pace baseline"]),
        (972, 180, "Detectors", "PenSignalDetectors", ["dysfluency, strain,", "struggle, pause kind"]),
    ]
    for i, (x, w, t, sub, lines) in enumerate(cols):
        o.append(box(x, y, w, bh, t, lines, accent=YELLOW if i == 4 else RULE_FIRM, sub=sub))
        if i:
            px = cols[i - 1][0] + cols[i - 1][1]
            o.append(arrow(px + 6, y + bh / 2, x - 6, y + bh / 2))

    o.append(gate(500 + 103, y + bh + 14, "12 clean samples before it opens"))
    o.append(gate(736 + 103, y + bh + 14, ">=5 strokes and >=5s, else nil"))

    fy = y + bh + 76
    o.append(f'<rect x="28" y="{fy}" width="1124" height="120" rx="12" fill="{SUNK}" stroke="{RULE}" stroke-width="2"/>')
    o.append(text(48, fy + 26, "The two reads, exactly as they are computed", 13, INK, weight=500))
    o.append(text(48, fy + 52, "dysfluency  =  sigmoid( 0.7 * zJerk  +  0.5 * max(0, -zSpeed)  -  1.0 )", 13, INK, mono=True))
    o.append(text(48, fy + 74, "strain      =  sigmoid( 0.8 * zForce  -  1.0 )  *  paired", 13, INK, mono=True))
    o.append(text(48, fy + 98, "paired is 1.0 when the attempt is known not to have progressed or has two erase bursts, and 0.3 otherwise. An unjudged attempt takes the 0.3, because whether our verifier got round to marking the work is a fact about our budget, not about the student.", 11.5, MUTED))

    ty = fy + 146
    o.append(box(28, ty, 300, 86, "TeachingContext", ["A prompt-ready summary. The engine", "that builds it is pure and stateless."], accent=YELLOW, sub="LearnerGuidanceEngine"))
    o.append(arrow(334, ty + 43, 380, ty + 43))
    o.append(box(386, ty, 300, 86, "The tutor's next turn", ["Which hint, what tone, how fast to", "reveal, what difficulty comes next."]))
    o.append(box(744, ty, 408, 86, "Never shown to the student", ["No score, no streak, no progress bar. A student told they are", "at 71 percent does not learn anything from the number."], accent=STRUGGLE))
    return svg(W, H, "The learner-profile pipeline",
               "Pencil samples become per-attempt features, which feed a per-student baseline, which "
               "produces standard scores, which feed four detectors. Two gates stand in the way, and "
               "before either opens the reads downstream are zero by construction.", "".join(o))


for name, fn in [("handwriting-pipeline", handwriting), ("viz-cascade", visualisation), ("profile-pipeline", profile)]:
    path = f"assets/figures/{name}.svg"
    open(path, "w").write(fn())
    print("wrote", path)
