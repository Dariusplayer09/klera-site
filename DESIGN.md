# Klera site design system

The source of truth for how every page looks and moves.

## Design read

A product site for an iPad AI tutor, split into three audiences (students, investors,
engineers), in the logo's own paper-and-ink language: cream stock, one warm yellow, a
hand-drawn line quality, real captures instead of imitations.

**Dials:** `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 4`, `VISUAL_DENSITY 4`.

## Structure

`/` is a hub, not a pitch. It states what Klera is, then sends the visitor to the page
written for them. The three audience pages are the site; everything else supports them.

| Path | For | Contains |
|---|---|---|
| `/` | everyone | Hero, the three doors, what it is, early access |
| `/for-students/` | the person who uses it | How it feels, the five-rung help ladder, the real filmstrip, what it notices, the interactive diagram, exams, early access |
| `/for-investors/` | the person who funds it | Problem, the three moats, comparison, business model and pricing, honest status |
| `/for-engineers/` | the person who would build it | Handwriting pipeline, visualisation cascade, the six-family learner profile with real measurements, hiring |
| `/about/` | context | Who is building it, how we work |

`/how-it-works/`, `/learner-profile/` and `/exams/` were folded into those three. Each keeps
an `index.html` that redirects and still reads if the redirect is blocked; GitHub Pages has
no server-side redirect.

## The rule that overrides the rest: never fake the product

**Handwriting is never drawn in code.** No SVG strokes, no 3D tubes, no handwriting fonts
standing in for the engine. Hand-built imitations of handwriting look fake next to what the
app actually produces, and a site about a handwriting engine cannot afford that.

Everything that shows the product is a real capture from the app, or a visible ✱ slot waiting
for one. Everything that shows data is a real measurement from a device run, or it is not
drawn. When a run publishes a range but not its individual values, the figure draws the range
and says so; it does not interpolate points to make the row look fuller.

## Tokens

| Token | Value | Role |
|---|---|---|
| `--paper` | `#FEFCF3` | page ground. Sampled from the logo's own background |
| `--card` | `#FFFDF7` | raised surfaces |
| `--sunk` | `#F7F1DF` | wells, code blocks, formula blocks |
| `--ink` | `#171307` | primary text, 18.0:1 on paper |
| `--ink-soft` | `#5B5340` | secondary text, 7.4:1 |
| `--muted` | `#7D7360` | tertiary text, 4.6:1 |
| `--rule` | `#E6DCC2` | hairlines, decorative only |
| `--rule-firm` | `#CFC2A0` | borders around interactive things |
| `--yellow` | `#E9B11E` | the logo's exact ink. **Graphic colour only** |
| `--yellow-pale` | `#FBEDC4` | washes |
| `--amber` | `#7A4E00` | accent text and links, 7.00:1 |
| `--calm` | `#2563EB` | data only |
| `--struggle` | `#C2410C` | data only |

**The yellow is 1.90:1 on cream.** It can be a fill, a highlighter sweep, a step marker, a
button background (ink on yellow is 9.51:1), a border. It can never be text, and never a
hairline that has to be read. Anything that must be read and is not ink uses `--amber`.

Data colours were validated as a categorical pair on `#FEFCF3`: lightness band, chroma floor,
CVD separation (dE 31.7 protan, 31.6 tritan), normal-vision floor (dE 36.1) and 5.0:1
contrast, all pass. The palette is capped at two on purpose, because the data itself is
two-valued (calm range, struggle points). A third series gets small multiples, not a third
hue picked by eye. Never use these as UI colour.

## Type

- **Display:** Fraunces, variable, `opsz` high, weight ~380. Headlines only. Sentence case.
- **Body:** Geist, 17px base, line-height 1.62, measure 64ch.
- **Data:** Geist Mono with `tabular-nums`, inside figures, tables, formulas and kickers only.

## Measured vs modelled

The site makes two different kinds of numeric claim and they are never allowed to blur.

- **Measured.** Real per-attempt values from instrumented device runs. These carry the run
  context in the caption and appear in `two-students.svg`, `pause-run005.svg`,
  `separation-run005.svg`, `baseline-debias.svg` and the attempt table.
- **Modelled or illustrative.** Everything else. `channel-coverage.svg` and
  `profile-at-term.svg` are generated from a model to show the shape of the thing at scale.
  Each says so **inside the figure itself**, not only in the caption, and the caption repeats
  it in bold.

Never relabel a modelled figure as measured, never put one next to a measured table without
the word, and never invent rows for a table that is presented as a log. The engineering page
is the page that makes the rest of the site believable; a single fabricated row there costs
more than every figure on it is worth.

## The hand-drawn line

The logo is one continuous uneven stroke, so the boxes that matter echo it: `--drawn` is four
unequal corner radii, used on the three doors, prose panels (`.panel-drawn`), the early-access
block and the numbered step markers. Everything else keeps an even `--radius`. Used on every
box it would read as a gimmick; used on the ones carrying an argument it reads as the logo.

**The sweep** is the same idea on text: a ragged marker swipe drawn as an inline SVG, covering
the lower two thirds of the glyphs. It replaced a flat rectangle sitting on the baseline, which
read as a strikethrough and cut through descenders. It sets `white-space: nowrap`, because a
swept phrase breaking across two lines leaves an orphan word wearing half a highlight. **Keep
swept phrases to two or three words**, or the nowrap overflows a narrow screen. One per page.

## Layout

- **Nav:** floating cream pill, the wordmark at 26px, current page marked with a yellow chip.
- **Hero:** text left, a real capture in a device frame right; stacked below 900px.
- **Families:** hero, three doors, statement grid, stepper, filmstrip of real frames,
  data figure with legend and caption, wide diagram in a scroller, comparison table,
  stat tiles, the early-access block. No family twice on a page.
- **Prose panels are capped at 78ch**, not stretched to the grid, so a paragraph never runs
  to a 110-character measure.

## Figures and diagrams

Both are generated, not hand-placed, and the generators are committed:

    python3 tools/build_figures.py     # the four data figures
    python3 tools/build_diagrams.py    # the three architecture diagrams

Output lands in `assets/figures/` and is committed too, because the site has no build step.
Re-run and commit whenever a number or a pipeline changes. Every figure carries real alt text
describing the values, and the engineering page also prints the underlying run as a table, so
the data is reachable without seeing the picture.

Diagrams are wide by nature. They keep their width inside a `.diagram` scroller rather than
shrinking their labels to nothing, with a `.scroll-hint` line below that hides above 1200px.

## Early access

One form, on `/` and `/for-students/`, posting straight to Supabase PostgREST. The key in
`assets/site-config.js` is a publishable key and is meant to be public; `supabase/waitlist.sql`
grants it INSERT on the waitlist table and nothing else, with no SELECT policy and no SELECT
grant, so it cannot read the list back. Run that SQL once per project. If the key is missing
the form disables itself and says so rather than silently dropping signups.

The offer, stated the same way everywhere: **anyone who signs up and tests the app keeps
unlimited Klera Premium for life.**

## Interaction and motion

- Animate `transform` and `opacity` only. Never `transition: all`.
- Panels and device frames: pointer spotlight and up to 5deg tilt, fine pointers only.
- Magnetic buttons move up to 6px toward the pointer.
- Pop-ups are native `<dialog>` sheets opened only by a click.
- The system cursor is never replaced.
- Nothing moves on its own. Every effect answers a pointer or a click.

## Copy

No em or en dashes (a true minus sign in a negative number is not a dash). Sentence case.
No eyebrow labels beyond one `kicker` per page naming the audience. No arrows on links.
Curly quotes. Say the uncomfortable number rather than rounding it away.

## Media

Real recordings from the app, trimmed from screen captures with `avconvert` (no ffmpeg on this
machine; `--start` and `--duration` trim, and `PresetAppleM4V720pHD` writes `.m4v`, renamed to
`.mp4`). Frames are pulled with a small AVFoundation script run through `swift`, not a GUI.

| File | What it is |
|---|---|
| `solve-handwriting.mp4` | 24 s, portrait. The current engine writing a full quadratic solution in captured handwriting, with the voice tutor narrating. **Has audio**, so it ships with `controls` and never autoplays. |
| `solve-step-1..4.png` | Four frames from that same recording, in order, for the filmstrip |
| `viz-detect.mp4` | 6.6 s, silent. A handwritten quadratic detected, and a live card generated from it. The internal flow read-out is visible top left |
| `viz-explore.mp4` | 9.1 s, silent. The card full screen, with the discriminant slider dragged and roots merging |
| `*-poster.png` | Poster frames, so nothing loads as a black rectangle |

Silent clips carry `data-loop` and are handled by `klera.js`: they autoplay muted, pause when
scrolled off screen, hold on their poster under `prefers-reduced-motion`, and have a visible
play/pause button either way. `video.play()` rejecting is caught and ignored, because it does
so routinely in a background tab or low power mode and the poster is a fine resting state.

The previous pink-ink GIF and its frames are gone: they were the old engine, and showing an
outdated render of the thing the product is judged on is worse than showing nothing.

## Images: the ✱ rule

Where a real capture belongs and none exists yet, a visible `.ph` slot marked **✱ Replace**
states the exact shot and size. Search the repo for `✱`. Each slot reserves its space.

Outstanding, and deliberately confined to `/about/`: the about hero photo, and both founder
portraits and bios. Every other page ships with real media only. Contact is a real address.

## Theme

Light only, locked. `color-scheme: light`, `theme-color` matches `--paper`. The previous
ink-navy dark theme and its WebGL measurement explorer (`assets/signal-scene.js`) were
retired in this repaint; the explorer's content is now the four static data figures, which
are accessible and need no WebGL. Both are recoverable from commit `34b538e`.

## Pre-flight checklist

- [ ] No handwriting drawn in code anywhere
- [ ] Zero em or en dashes in visible text
- [ ] Every number traceable to a device run, and ranges drawn as ranges
- [ ] No ✱ placeholder anywhere
- [ ] Every figure is captioned measured, modelled or illustrative, and says which on its face
- [ ] Swept phrases are three words or fewer
- [ ] Any clip with audio has `controls` and does not autoplay
- [ ] Every interactive element: visible `:focus-visible`, 44px target, hover state
- [ ] `prefers-reduced-motion` verified on every animated element
- [ ] Images carry width, height and accurate alt text; ✱ slots reserve space
- [ ] Nothing but diagrams, tables, formulas and `pre` may scroll sideways
- [ ] Rendered and looked at, at 1440px and at 390px
