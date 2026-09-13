# klera-site

The Klera website. Static HTML, no build step, no dependencies.

```
index.html              the launch teaser (kept at / until the 15th)
assets/klera.css        shared design system — colors, type, figures, charts
how-it-works/           the app: canvas, the five actions, handwriting engine
learner-profile/        the pen-signal work, two layers (simple, then the data)
exams/                  exam simulation and the grader
about/                  principles, inspirations, who
```

## Run it locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Conventions

- **No frameworks, no bundler.** Every page is a single self-contained HTML file
  plus the shared stylesheet. Diagrams and charts are inline SVG, generated in the
  page — there are no image assets to re-export when the app changes.
- **Data colors are validated, not chosen by eye.** `--calm` / `--struggle` in
  `assets/klera.css` pass the OKLCH lightness band, chroma floor, colorblind
  separation (ΔE 26.7 protan / 24.7 tritan), normal-vision floor (ΔE 29.3) and 3:1
  contrast against the `#070707` surface. If you change them, re-validate.
- **Motion respects `prefers-reduced-motion`** everywhere, including the
  handwriting animations.
- **Every number on the learner-profile page is a real measurement** from the
  device calibration runs in the app repo. If a figure changes there, change it
  here — and do not add a figure that has not been measured.

## Companion repo

The app itself lives in `NeuraBoard-HKTE`. Content here is written against that
repo's `PEN_CALIBRATION_FINDINGS.md`, `RUN_005_FINDINGS.md` and
`LEARNER_PROFILE_WIRING.md`. Clone them side by side.
