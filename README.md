# klera-site

The Klera website. Static HTML, no build step, no dependencies to install.

```
index.html              homepage: real app recording, 3D measurement explorer
how-it-works/           the board, the five actions, the handwriting engine
learner-profile/        the pen-signal work: plain version first, then the data
exams/                  exam simulation and the grader
about/                  principles, inspirations, who
assets/klera.css        design system
assets/klera.js         pointer effects, pop-up sheets, demo play/pause
assets/signal-scene.js  the 3D explorer (Three.js from jsDelivr)
assets/demo/            real recording and frames from the app
DESIGN.md               design rules and the reasons behind them
```

## Run it locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Rules that matter

- **Never fake the product.** Handwriting is never drawn in code. Product visuals are real
  captures from the app or visible `✱ Replace` slots. See `DESIGN.md`.
- **Every number is a real measurement** from the device calibration runs in the app repo
  (`PEN_CALIBRATION_FINDINGS.md`, `RUN_005_FINDINGS.md`). If a figure changes there, change
  it here in both `learner-profile/index.html` and `assets/signal-scene.js`.
- **Data colors are validated, not chosen by eye.** Re-validate if you change them.
- **Motion respects `prefers-reduced-motion`** everywhere.

## Companion repo

The app lives in `NeuraBoard-HKTE`. Clone the two side by side.
