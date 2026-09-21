# klera-site

The Klera marketing site. Static HTML, CSS and JavaScript. **No build step and no
dependencies** — what is in the repo is what is served.

Live at <https://dariusplayer09.github.io/klera-site/> from `main`.

## Run it locally

    python3 -m http.server 8000

Then open <http://127.0.0.1:8000/>. Open it over HTTP rather than `file://`, or the relative
paths and the waitlist fetch will not behave the way they do in production.

## Layout

    index.html              the hub
    for-students/           for the person who uses it
    for-investors/          for the person who funds it
    for-engineers/          for the person who would build it
    about/                  who is building it
    how-it-works/           redirect, folded into for-students
    learner-profile/        redirect, folded into for-engineers
    exams/                  redirect, folded into for-students
    assets/klera.css        the whole stylesheet
    assets/klera.js         pointer effects, sheets, the demo toggle
    assets/waitlist.js      the early-access form
    assets/site-config.js   Supabase URL and publishable key
    assets/demo/            real captures from the app
    assets/figures/         generated SVG figures and diagrams
    tools/                  the generators for assets/figures
    supabase/waitlist.sql   the waitlist table, run once per project

## Before changing anything

Read `DESIGN.md`. It holds the tokens, the rule that handwriting is never drawn in code,
the rule that every number is a real measurement, and the pre-flight checklist.

## Regenerating the figures

    python3 tools/build_figures.py
    python3 tools/build_diagrams.py

Both write into `assets/figures/`, which is committed because there is no build step.

## The waitlist

`supabase/waitlist.sql` creates the table and locks the publishable key to INSERT only, with
no way to read the list back from the browser. Run it once against the Supabase project, then
read signups from the dashboard. Without a key configured, the form disables itself and points
at the contact email instead of silently dropping signups.
