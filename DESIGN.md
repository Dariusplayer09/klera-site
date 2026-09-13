# Klera site design system

The source of truth for how every page under `/` looks and moves. The teaser at `/` is
deliberately outside this system until launch.

## Design read

A product site for an iPad AI tutor, for students and investors, with a dark ink-on-glass
language, built on native CSS, one Three.js hero and pointer-reactive depth.

**Dials:** `DESIGN_VARIANCE 7`, `MOTION_INTENSITY 7`, `VISUAL_DENSITY 3`.
Mode: redesign, visual overhaul. Content, page slugs and nav labels are preserved.

## The one bold thing

The hero on `/how-it-works/` is a live 3D scene: the app's real handwriting demo
(`2x + 5 = 13`) written stroke by stroke as tubes of ink on a floating glass slab that
tilts toward the pointer. Everything else stays quiet. Motion elsewhere only answers a
person's action: hover, click, open.

## Tokens

| Token | Value | Role |
|---|---|---|
| `--ground` | `#070B14` | page background, ink navy |
| `--panel` | `#0D1322` | raised surfaces |
| `--raised` | `#161E32` | sheets, popovers |
| `--paper` | `#ECEAE4` | primary text, 16.4:1 on ground |
| `--graphite` | `#9BA3B4` | secondary text, 7.8:1 on ground, 6.6:1 on raised |
| `--accent` | `#8DB0FF` | the single UI accent: links, focus, ink glow, 9.2:1 |
| `--calm` | `#3987e5` | data only |
| `--struggle` | `#C47A24` | data only |

Data colors were re-validated on both `#070B14` and `#0D1322`: lightness band, chroma
floor, CVD separation (dE 26.7 protan), normal-vision floor (dE 29.3), 3:1 contrast all
pass. Never use them as UI color, and never pick replacements by eye.

A dim grey (`#6E7689`) exists for hairlines only. At 4.33:1 it fails body-text contrast.

## Type

- **Display:** Fraunces, variable, `opsz` high, weight ~380. Headlines only. Sentence case.
  `text-wrap: balance`.
- **Body:** Geist 300/400/500, 17px base, line-height 1.6, measure 64ch.
- **Data:** Geist Mono with `tabular-nums`, inside charts and tables only. Never for labels.

## Layout

Every page mixes layout families; no family appears twice on a page.

- **Nav:** floating glass pill, one line, 64px max.
- **Hero:** two columns on desktop (text left, scene right), stacked on mobile so text
  never sits on top of the 3D canvas. Max four text elements, subtext 20 words or fewer.
- **Families in use:** split with live component, interactive picker with pop-up sheet,
  asymmetric bento, full-width statement, numbered stepper (only where content is a real
  sequence), data figure with disclosure.
- **Radius:** containers 22px, inner 14px, controls pill.

## Interaction and motion

- Animate `transform` and `opacity` only. Never `transition: all`.
- **Panels:** a soft accent spotlight follows the pointer; `[data-tilt]` panels rotate up to
  5deg. Fine pointers only (`hover: hover` and `pointer: fine`).
- **Magnetic buttons** (`[data-magnetic]`) move up to 6px toward the pointer.
- **Pop-ups** are native `<dialog>` sheets, opened only by a click. Esc and backdrop close
  them, focus returns to the opener, `overscroll-behavior: contain`.
- **3D scene:** pointer events (mouse, touch and pen), one raycaster, coordinates stored on
  move and raycast once per frame. Pauses offscreen and in background tabs. Pixel ratio
  capped at 1.75. Has a visible pause control and a "write it again" button, which is the
  keyboard alternative to clicking the slab. Static SVG fallback when WebGL is missing.
- **System cursor is never replaced.** The pointer drives the scene and the panels; the
  cursor itself stays native for accessibility.
- **Reduced motion:** the scene renders one finished static frame, tilt and magnetic are
  off, sheets open instantly, ink is drawn immediately.

## Copy

- No em dashes or en dashes anywhere. Hyphen, comma, colon or a new sentence.
- Sentence case for headings and buttons.
- No eyebrow labels above sections, no numbered section markers, no arrows on links.
- Curly quotes, real ellipsis.

## Images: the ✱ rule

No random stock. Every place a real photo belongs is a visible `.ph` slot marked
**✱ Replace** with the exact shot, aspect ratio and pixel size needed. Search the repo for
`✱` to find all of them. Each slot reserves its space so swapping the image causes no
layout shift. When replacing, keep the `width`, `height` and `alt`.

## Theme

Dark only, locked. The brand is dark (the teaser at `/` is dark), so this is a deliberate
single-theme site: `color-scheme: dark`, `theme-color` matches `--ground`.

## Pre-flight checklist

- [ ] Zero em or en dashes in visible text
- [ ] At most one eyebrow per three sections
- [ ] No three-equal-card rows
- [ ] Every interactive element: visible `:focus-visible`, 44px target, hover state
- [ ] Skip link present
- [ ] `prefers-reduced-motion` verified on every animated element
- [ ] Images and ✱ slots reserve space
- [ ] Charts: colors from tokens, table view present, identity not color-alone
- [ ] Audited against Vercel Web Interface Guidelines
