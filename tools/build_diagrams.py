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
    """Handwriting 3: the shipped path. Two rows snaking left to right, then the fallback
    ladder as its own band, because the fallback is layered (glyph, line, bundle) and drawing
    it as one arrow understated it."""
    W, H = 1180, 560
    bw, bh = 250, 128
    xs = [28, 308, 588, 868]

    row1 = [
        ("Parse and lay out", "shared front end", ["A tight LaTeX subset becomes an AST,", "then a stream of positioned slots.", "Geometry only, no ink yet."]),
        ("Layout humanizer", "one hand, not noise", ["Slant, size bias and a baseline wave", "drawn ONCE per render and applied to", "every slot, so the line shares a lean."]),
        ("Phrase and template match", "captured, not synthesised", ["Picks real captured handwriting per", "symbol, or one phrase template across", "a run. Phrases win where they exist."]),
        ("Template warper", "fit without mush", ["Affine into the slot, baseline aligned.", "Horizontal scale clamped to within 33%", "of vertical; phrases warp aspect-locked."]),
    ]
    row2 = [
        ("Stroke composer", "real pen attributes", ["Carries the captured pressure, width", "and timing through into PKStrokes."]),
        ("SemanticStrokeScheduler", "the timing truth", ["One pure function. Live render, debug", "overlay and tests agree by construction."]),
        ("Handwriting2Animator", "onto their canvas", ["Plays the schedule stroke by stroke", "onto the student's own PKCanvasView."]),
    ]

    o = [text(28, 34, "Handwriting 3: how a string becomes real pen strokes", 15, INK, weight=500),
         text(28, 56, "The glyphs are captured human handwriting, warped into a typeset layout. Nothing here is a font and nothing is drawn by formula.", 12, MUTED)]

    y1 = 92
    for i, (t, sub, lines) in enumerate(row1):
        o.append(box(xs[i], y1, bw, bh, t, lines, accent=YELLOW if i in (0, 2) else RULE_FIRM, sub=sub))
        if i:
            o.append(arrow(xs[i - 1] + bw + 4, y1 + bh / 2, xs[i] - 4, y1 + bh / 2))

    # Row two runs RIGHT TO LEFT, directly under row one, so the turn is a short vertical
    # drop instead of a long line travelling back across boxes it would otherwise cross.
    y2 = y1 + bh + 56
    o.append(arrow(xs[3] + bw / 2, y1 + bh + 4, xs[3] + bw / 2, y2 - 4))
    seq = list(reversed(row2)) + [("Real strokes, not a font", "the output",
                                   ["Erasable, selectable and zoomable", "exactly like the student's own ink,",
                                    "in their own coordinate space."])]
    # seq[0] sits furthest right and the chain walks left
    for i, (t, sub, lines) in enumerate(seq):
        x = xs[3 - i]
        o.append(box(x, y2, bw, bh, t, lines, accent=YELLOW if i == 3 else RULE_FIRM, sub=sub))
        if i:
            o.append(arrow(xs[3 - i + 1] - 4, y2 + bh / 2, x + bw + 4, y2 + bh / 2))

    fy = y2 + bh + 34
    o.append(f'<rect x="28" y="{fy}" width="{W - 56}" height="86" rx="12" fill="{SUNK}" stroke="{STRUGGLE}" stroke-width="2"/>')
    o.append(text(48, fy + 26, "The fallback is a ladder, not a switch", 13, INK, weight=500))
    o.append(text(48, fy + 46, "A missing glyph mixes in Handwriting 2 ink for that one symbol.  A line with poor template coverage, or one that will not parse, is rendered", 11.5, MUTED))
    o.append(text(48, fy + 63, "wholesale by Handwriting 2.  A missing or corrupt template bundle degrades to an empty store, which makes coverage zero and hands the whole render back.", 11.5, MUTED))
    o.append(text(48, fy + 80, "Every level is silent and none of them can produce garbage ink. A tutor that writes nothing is a worse failure than one whose hand is a generation old.", 11.5, MUTED))
    return svg(W, H, "The Handwriting 3 pipeline",
               "Parse and lay out, humanize the layout, match captured templates per symbol or "
               "phrase, warp them into the slots, compose strokes carrying real pen attributes, "
               "schedule the timing, animate onto the canvas. The fallback to Handwriting 2 is "
               "layered at the glyph, line and bundle level.", "".join(o))


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
    """The profile as six stacked bands, not a wide left-to-right chain.

    The chain version ran to 1180px and had to scroll on every screen the site is read on.
    Bands also match the real shape of the thing: each one is a different KIND of work
    (measure, normalise, score, interpret, remember, act) and each has several members, which
    a single row of boxes could not show without going wider still."""
    W = 900
    bands = [
        ("Measure", "every attempt, continuously",
         ["Pen kinematics:  force, speed, jerkiness, pre-stroke pause, erase bursts, stroke fluency",
          "Help behaviour:  which rung of the ladder, whether they tried first, how fast a hint is taken up",
          "Work structure:  valid steps, the line the error starts on, self-correction, copy likelihood",
          "Silent verification:  the background check that marks finished work nobody asked us to mark",
          "Language:  distress and constructive-question hits, plus a model read of how they sound",
          "Difficulty:  what they attempt and what they finish unaided, per level, decayed over months"],
         YELLOW),
        ("Normalise", "against this student, never a population",
         ["Robust running centre and deviation per signal, warm-up debiased so an early sample",
          "cannot anchor the estimate. Two gates: 12 clean samples before the kinematic baseline",
          "opens, and at least 5 strokes and 5 active seconds before an attempt may be scored."],
         RULE_FIRM),
        ("Score", "standard scores and four detectors",
         ["zForce, zSpeed, zJerk against the kinematic baseline. A separate pause z against the",
          "pace baseline, bucketed by difficulty. From those: dysfluency, pressure strain,",
          "productive and unproductive struggle, and the kind of pause."],
         RULE_FIRM),
        ("Interpret", "two layers, deliberately separate",
         ["Six composite reads per attempt, each with its own confidence: productive struggle,",
          "destructive struggle, anxiety risk, boredom risk, flow-like, help dependence.",
          "Five live flow bands: apathy, boredom, flow, confusion, frustration."],
         CALM),
        ("Remember", "slowly, across sessions",
         ["Five traits folded by EWMA with a 120-day half-life and a five-observation floor:",
          "help orientation, competence, frustration tendency, uptake speed, constructive",
          "engagement. Plus a demonstrated difficulty ceiling and one readiness verdict."],
         RULE_FIRM),
        ("Act, then check it worked", "the loop that closes",
         ["A prompt-ready teaching context picks the rung, the tone, the pace and what comes next.",
          "Every intervention is then scored by what the student did next and folded back into the",
          "arm that produced it, so a mapping that is wrong for this student stops being used."],
         STRUGGLE),
    ]
    # Height per band follows its line count; the Measure band carries six and used to
    # overflow a fixed 108px box.
    gap, top = 14, 92
    heights = [64 + 15 * len(b[2]) for b in bands]
    H = top + sum(heights) + gap * len(bands) + 74
    o = [text(28, 34, "The learner profile: six kinds of work on one student", 15, INK, weight=500),
         text(28, 56, "No single signal decides anything. Each band is weak on its own and the fusion is what is accurate.", 12, MUTED)]

    ys = []
    _y = top
    for hgt in heights:
        ys.append(_y); _y += hgt + gap
    for i, (name, sub, lines, accent) in enumerate(bands):
        y, bh = ys[i], heights[i]
        o.append(f'<rect x="28" y="{y}" width="{W - 56}" height="{bh}" rx="12" fill="{SUNK}" stroke="{accent}" stroke-width="2"/>')
        o.append(f'<rect x="28" y="{y}" width="6" height="{bh}" rx="3" fill="{accent}"/>')
        o.append(text(48, y + 26, name, 14, INK, weight=500))
        o.append(text(48, y + 44, sub, 10.5, AMBER, mono=True))
        for j, ln in enumerate(lines):
            o.append(text(48, y + 64 + j * 15, ln, 11, MUTED))
        if i:
            o.append(arrow(W / 2, y - gap + 1, W / 2, y - 2))

    # the return path: effectiveness folds back into how the student is taught
    ry = ys[-1] + heights[-1] / 2
    o.append(f'<path d="M {W - 28} {ry} H {W - 14} V {top + heights[0] / 2} H {W - 28}" fill="none" stroke="{STRUGGLE}" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#arw-fb)"/>')
    o.append(text(W - 34, top - 8, "what worked feeds back in", 10.5, STRUGGLE, "end", mono=True))
    o.append(text(28, H - 40, "Never shown to the student. No score, no streak, no progress bar.", 12, INK, weight=500))
    o.append(text(28, H - 22, "A student told they are at 71 percent learns nothing from the number, and starts working for the number instead of the problem.", 11.5, MUTED))
    return svg(W, H, "The learner-profile stack",
               "Six bands, top to bottom: measure, normalise against this student, score, interpret, "
               "remember across sessions, and act then check it worked, with the effectiveness result "
               "feeding back into how the student is taught.", "".join(o))


for name, fn in [("handwriting-pipeline", handwriting), ("viz-cascade", visualisation), ("profile-pipeline", profile)]:
    path = f"assets/figures/{name}.svg"
    open(path, "w").write(fn())
    print("wrote", path)
