# klera-site

The Klera marketing site. Static HTML, CSS and JavaScript. **No build step and no
dependencies** — what is in the repo is what is served.

Live at <https://klera.tech> (Vercel, auto-deploys from `main`). Also mirrored on GitHub Pages at dariusplayer09.github.io/klera-site.

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
    privacy/                privacy policy, rendered from the app repo's legal/PRIVACY_POLICY.md
    how-it-works/           redirect, folded into for-students
    learner-profile/        redirect, folded into for-engineers
    exams/                  redirect, folded into for-students
    assets/klera.css        the whole stylesheet
    assets/klera.js         pointer effects, sheets, the demo toggle
    assets/waitlist.js      the early-access form
    assets/site-config.js   Supabase URL and publishable key
    assets/shots/           app captures, when added (see MEDIA_SLOTS.md)
    assets/figures/         the one generated data figure (two-students.svg)
    tools/build_figures.py  its generator
    MEDIA_SLOTS.md          every placeholder slot and the exact shot it wants
    supabase/waitlist.sql   the waitlist table, run once per project

## Before changing anything

Read `DESIGN.md`. It holds the tokens, the rule that handwriting is never drawn in code,
the rule that every number is a real measurement, and the pre-flight checklist.

## Regenerating the figure

    python3 tools/build_figures.py

## Screenshots and clips

All app media was removed in the September 2026 cleanup. Each place one belongs shows a
dashed Slot box; `MEDIA_SLOTS.md` lists them with the shot and size. Clips with narration
must ship with `controls` and must not autoplay.

## The waitlist

**Not switched on yet.** Run `supabase/waitlist.sql` once. The full early-access checklist
(table, klera.tech mailboxes, TestFlight, invite batches, free year of Premium) is in
[`supabase/SETUP.md`](supabase/SETUP.md).
