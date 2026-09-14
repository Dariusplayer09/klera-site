# Klera site design system

The source of truth for how every page looks and moves.

## Design read

A product site for an iPad AI tutor, for students and investors, with a dark ink-on-glass
language, built on native CSS, one Three.js scene and pointer-reactive depth.

**Dials:** `DESIGN_VARIANCE 7`, `MOTION_INTENSITY 7`, `VISUAL_DENSITY 3`.

## The rule that overrides the rest: never fake the product

**Handwriting is never drawn in code.** No SVG strokes, no 3D tubes, no handwriting fonts
standing in for the engine. Hand-built imitations of handwriting look fake next to what the
app actually produces, and a site about a handwriting engine cannot afford that.

Everything that shows the product is a real capture from the app, or a visible ✱ slot waiting
for one. Everything that shows data is a real measurement from the calibration findings, or it
is not drawn.

## The one bold thing

The homepage explorer (`#explore`, `assets/signal-scene.js`): the two students' real
learner-profile measurements as a 3D space. Calm ranges are boxes with their measured extents;
genuine struggle attempts are orbs at their measured coordinates. The pointer turns the space,
hovering an orb opens a pop-up, and a button list gives the same readout without a pointer or
without WebGL. Everything else stays quiet; motion elsewhere only answers a person.

## Real assets

| File | What it is |
|---|---|
| `assets/demo/board-demo.gif` | Real recording from the app, 800 x 565, 121 frames, 12.1 s: Solve writing the answer to an integral in handwriting |
| `assets/demo/board-question.png` | First frame of that recording: the student's question inside a detected cluster box |
| `assets/demo/solve-step-2.png`, `-3`, `-5` | Frames at 3.1 s, 9.1 s and 12.1 s of the same recording |
| `assets/klera-mark-512.png`, `apple-touch-icon.png`, `favicon-32.png` | The app icon |

The recording is a GIF because no video encoder was available when the site was built. A GIF
cannot pause, so markup loads the still and `klera.js` swaps between still and GIF behind a
visible toggle; reduced motion starts on the still. Replace with an MP4 in a `<video>` when one
can be encoded.

## Tokens

| Token | Value | Role |
|---|---|---|
| `--ground` | `#070B14` | page background, ink navy |
| `--panel` | `#0D1322` | raised surfaces |
| `--raised` | `#161E32` | sheets, popovers |
| `--paper` | `#ECEAE4` | primary text, 16.4:1 on ground |
| `--graphite` | `#9BA3B4` | secondary text, 7.8:1 on ground, 6.6:1 on raised |
| `--accent` | `#8DB0FF` | the single UI accent: links, focus, 9.2:1 |
| `--calm` | `#3987e5` | data only |
| `--struggle` | `#C47A24` | data only |

Data colors were validated on both `#070B14` and `#0D1322`: lightness band, chroma floor, CVD
separation (dE 26.7 protan), normal-vision floor (dE 29.3), 3:1 contrast all pass. Never use
them as UI color, and never pick replacements by eye. `#6E7689` exists for hairlines only.

## Type

- **Display:** Fraunces, variable, `opsz` high, weight ~380. Headlines only. Sentence case.
- **Body:** Geist, 17px base, line-height 1.6, measure 64ch.
- **Data:** Geist Mono with `tabular-nums`, inside charts and tables only.

## Layout

- **Nav:** floating glass pill with the app mark, one line, 64px max.
- **Hero:** text left, a real capture in a device frame right; stacked on mobile.
- **Families:** hero, statement, 3D explorer, split with real frame, picker with sheets,
  filmstrip of real frames in order, asymmetric bento, stepper only for real sequences, data
  figure with disclosure. No family twice on a page.

## Interaction and motion

- Animate `transform` and `opacity` only. Never `transition: all`.
- Panels and device frames: pointer spotlight and up to 5deg tilt, fine pointers only.
- Magnetic buttons move up to 6px toward the pointer.
- Pop-ups are native `<dialog>` sheets opened only by a click.
- The 3D scene: pointer events, one raycaster, loop stopped offscreen, in hidden tabs and on
  pause; `boot()` called at the bottom of its module; constant scale; reduced motion renders on
  demand with no drift.
- The system cursor is never replaced.

## Copy

No em or en dashes. Sentence case. No eyebrow labels (the homepage launch kicker is the single
allowed one). No arrows on links. Curly quotes.

## Images: the ✱ rule

Where a real capture belongs and none exists yet, a visible `.ph` slot marked **✱ Replace**
states the exact shot and size. Search the repo for `✱`. Each slot reserves its space.

## Theme

Dark only, locked. `color-scheme: dark`, `theme-color` matches `--ground`.

## Pre-flight checklist

- [ ] No handwriting drawn in code anywhere
- [ ] Zero em or en dashes in visible text
- [ ] At most one eyebrow per three sections
- [ ] Every interactive element: visible `:focus-visible`, 44px target, hover state
- [ ] `prefers-reduced-motion` verified on every animated element
- [ ] Images carry width, height and accurate alt text; ✱ slots reserve space
- [ ] Charts and the 3D explorer use real measurements only, with a non-visual alternative
- [ ] Audited against the Vercel Web Interface Guidelines
