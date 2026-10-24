# Klera site design system

The source of truth for how every page looks and moves.

## Design read

A product site for an iPad AI tutor, written for students first, in the logo's own paper-and-ink
language: cream stock, one warm yellow, a
hand-drawn line quality, real captures instead of imitations.

**Dials:** `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 4`, `VISUAL_DENSITY 4`.

## Structure

Since 2026-10-24 (LLM council review, Filip chose it): **the home page is the student page.**
No audience picker on the front door. Investors and hires mostly arrive through a link a founder
sent them, so they get short pages of their own, linked quietly from the nav and footer, and
their URLs go straight into outreach.

| Path | For | Contains |
|---|---|---|
| `/` | students (and everyone landing cold) | Welcome wordmark, the try-it pad, How it works, the help hub (with real-engine board scenes for Next step, Find my mistake and Solve), guided solve, what it notices, exams, also in the app, early access |
| `/investors/` | the person who funds it | Thesis, real recording, why now, answer machines, what we've built, moats, business, where we are, deck request |
| `/join/` | the person who would build it | The one-line character demo, three hard problems, per-student baseline figure, five principles, roles, research |
| `/about/` | context | Who is building it, how we work |

`/for-students/`, `/for-investors/`, `/for-engineers/`, `/how-it-works/`, `/learner-profile/` and
`/exams/` are redirect stubs (meta refresh + canonical) so old links keep working.

`index.html` is generated: edit `tools/index.template.html`, `tools/early-access.partial.html` and
`tools/footer.partial.html`, then run `python3 tools/build_home.py`.

## The rule that overrides the rest: never fake the product

**Handwriting is never drawn in code.** No SVG strokes, no 3D tubes, no handwriting fonts
standing in for the engine.

**Klera and the board scenes are never animated by the site.** The app's own Swift code produces
every frame and the site only draws them (2026-10-24, after the hand-ported character was rejected
as "a crappy version" of the real one):

- `NeuraBoardTests/SiteExport/KleraSiteExportTests.swift` in the app repo runs the real engines
  (KleraPose, KleraDirector's pen choreography, Handwriting2 and its animator writing into a
  recording surface, MistakeMark, KleraWordmarkStroke) and writes `assets/data/engine/*.json`.
- `assets/klera-engine.js` draws those frames: a pose the way `KleraRenderer.draw` does, the ink as
  PencilKit's own interpolated points, the mistake wash as `KleraMistakeMarkLayer` draws it.
- `assets/klera-live.js` only decides when a piece plays. No motion constants live in it.

Re-export after any change to Klera, the handwriting or the welcome screen:

    TEST_RUNNER_KLERA_SITE_EXPORT=<site>/assets/data/engine xcodebuild -project NeuraBoard.xcodeproj \
      -scheme NeuraBoard -destination 'platform=iOS Simulator,id=<UDID>' -jobs 3 test \
      -only-testing:NeuraBoardTests/KleraSiteExportTests

The student lines in the scenes are written by the same engine in black; the page never claims
they are a student's handwriting.

Everything that shows the product is a real capture from the app, or a visible ✱ slot waiting
for one. Everything that shows data is a real measurement from a device run, or it is not
drawn. When a run publishes a range but not its individual values, the figure draws the range
and says so; it does not interpolate points to make the row look fuller.

## Visual source: the pitch deck

Since September 2026 the site follows the TEF Ignition deck (`Klera — TEF Ignition Pitch
Deck/*.png`): warm off-white ground, uppercase condensed section titles (Oswald) with an 8px
yellow bar on the left (`.sec-head`), bronze subtitles (`.sub`), big-number cards on pale
yellow with one solid-yellow card (`.stat`, `.stat.is-yellow`), black pill bars
(`.pillbar`), overlapping circles for the three-step story (`.circles`), numbered timelines
that darken pale to bronze (`.timeline`, `.steps`), week blocks (`.weeks`), the competition
quadrant (`.quad`), the market funnel (`.funnel`) and a full-bleed yellow band (`.band`).
Body type is Figtree.

## Tokens

| Token | Value | Role |
|---|---|---|
| `--paper` / `--paper-2` | `#FAF7F0` / `#FDFCF9` | page ground and its lighter gradient end |
| `--pale` | `#FBF0DA` | card ground |
| `--mid` | `#F2D48C` | second progression step |
| `--yellow` | `#E0A92E` | the deck yellow. **Fill only.** Ink on it is 8:1, white is 2.1:1, so never white text on yellow |
| `--gold` / `--bronze-g` | `#C8921F` / `#8C6A1F` | third and fourth progression steps, graphic |
| `--bronze` | `#7A5A14` | accent text, 5.9:1 |
| `--gold-num` | `#A87A12` | big numbers only (large text, 3.4:1 on pale) |
| `--ink` | `#1B1A17` | text |
| `--pill` | `#1B1B1B` | black pills and dark buttons |
| `--calm` / `--struggle` | `#2563EB` / `#C2410C` | data only |

The deck puts white text on yellow; the site deliberately does not (contrast).

## Measured vs modelled

Any number presented as a measurement came from a real session or the May 2026 survey (98
university students), and its source is printed under it. Anything modelled says so on the
figure. Never fabricate rows or round away an uncomfortable number.

## Layout

- **Nav:** full-width sticky bar, wordmark left, current page underlined in yellow, black
  "Early access" pill on the right.
- **Home hero:** the deck cover. Large logo (`klera-logo-full.png`, bulb and wordmark,
  transparent), the tagline in bronze, then slot H1.
- **Other heroes:** uppercase title and lead left, a media slot right; stacked below 900px.
- **Build pages from `.sec-head` sections**, one deck pattern per section, no pattern twice
  in a row.

## Figures

One data figure remains, `assets/figures/two-students.svg`, generated by
`python3 tools/build_figures.py`. The other figures and the architecture diagram generator
were deleted in the September 2026 cleanup.

## Early access

One form, on `/`, posting straight to Supabase PostgREST. The key in
`assets/site-config.js` is a publishable key and is meant to be public; `supabase/waitlist.sql`
grants it INSERT on the waitlist table and nothing else, with no SELECT policy and no SELECT
grant, so it cannot read the list back. Run that SQL once per project. If the key is missing
the form disables itself and says so rather than silently dropping signups.

The offer, stated the same way everywhere: **anyone who signs up and tests the app keeps
a free year of Klera Premium.**

## Interaction and motion

Klera is the motion. Everything else stays quiet.

- **One load moment:** the welcome wordmark, exactly as `KleraWelcomeView` plays it (3 s write in
  the amber-to-gold sweep, 0.7 s to flat Klera yellow, settle 1.18 to 0.86 on
  cubic-bezier(.2,.8,.2,1)). The bulb fades in beside it afterwards.
- **Board scenes** (help hub: Next step, Find my mistake, Solve) play when their tab opens or
  they scroll into view, with a Play again button. After a scene Klera idles at its dock.
- **The pad** plays the app's clips: rays when you stop for three seconds, thinking when you
  rub out and carry on.
- No companion and no pointer-following eyes: the app has neither.
- Animate `transform`, `opacity` and SVG path data only. Never `transition: all`.
- Panels and device frames: pointer spotlight and up to 5deg tilt, fine pointers only.
- Magnetic buttons move up to 6px toward the pointer.
- The system cursor is never replaced.
- `prefers-reduced-motion`: every piece shows its finished state and never animates.
- Klera's render loop runs only while it is on screen and the tab is visible.

## Copy

No em or en dashes (a true minus sign in a negative number is not a dash). Sentence case.
No eyebrow labels beyond one `kicker` per page naming the audience. No arrows on links.
Curly quotes. Say the uncomfortable number rather than rounding it away.

## Media

Real app media lives in `assets/klera-assets/` (see `MEDIA_SLOTS.md` for what is where and
what is still a `.slot`). Mockups are pre-framed: `.mock`, no extra radius or shadow. Bare
captures use `.shot`. Silent loops use `video[data-loop]`; image sequences use `[data-frames]`.
Fill slots with real captures only. Clips with narration ship with `controls`, never autoplay.

## Join page: theory, not code

`/join/` explains principles and ideas, and cites the research they come from. It
must not publish formulas, constants, weights, thresholds, class or type names, internal run
tables, or bug post-mortems. Architecture diagrams that named internal types were deleted.

## Theme

Light only, locked. `color-scheme: light`, `theme-color` matches `--paper`. The previous
ink-navy dark theme and its WebGL measurement explorer (`assets/signal-scene.js`) were
retired in this repaint; the explorer's content is now the four static data figures, which
are accessible and need no WebGL. Both are recoverable from commit `34b538e`.

## Pre-flight checklist

- [ ] No handwriting drawn in code anywhere
- [ ] Zero em or en dashes in visible text
- [ ] Every number traceable to a device run, and ranges drawn as ranges
- [ ] Every `.slot` is listed in MEDIA_SLOTS.md
- [ ] Nothing on /join/ reads like code: no formulas, constants or type names
- [ ] Every figure is captioned measured, modelled or illustrative, and says which on its face
- [ ] Swept phrases are three words or fewer
- [ ] Any clip with audio has `controls` and does not autoplay
- [ ] Every interactive element: visible `:focus-visible`, 44px target, hover state
- [ ] `prefers-reduced-motion` verified on every animated element, including every Klera
- [ ] Klera point data still matches the app (`KleraGlyph.swift`, `KleraWordmarkStroke.json`)
- [ ] Images carry width, height and accurate alt text; ✱ slots reserve space
- [ ] Nothing but diagrams, tables, formulas and `pre` may scroll sideways
- [ ] Rendered and looked at, at 1440px and at 390px
