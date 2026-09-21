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
    assets/demo/            real captures from the app (mp4 clips, poster and filmstrip frames)
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

## Regenerating the clips

There is no ffmpeg on the build machine. Clips are trimmed with the system `avconvert`:

    avconvert -s <source>.mov -o out.m4v -p PresetAppleM4V720pHD --start 7.0 --duration 9.1 --replace

then renamed to `.mp4`. Frames come from a short AVFoundation script run with `swift`.
Anything with narration must ship with `controls` and must not autoplay.

## The waitlist

**Not switched on yet.** `supabase/waitlist.sql` has to be run once against the Supabase
project before the form works; until then it shows an error rather than dropping signups
silently. Step by step instructions, including a message you can forward to whoever has
dashboard access, are in [`supabase/SETUP.md`](supabase/SETUP.md).

The SQL creates the table and locks the publishable key to INSERT only, with no way to read
the list back from the browser.
