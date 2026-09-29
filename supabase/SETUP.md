# Early access: what to do, in order

The signup form on the homepage and on `/for-students/` writes straight into a Supabase
table. **Until step 1 is done, the form shows an error instead of signing anyone up.**

**Project:** `mstrcjcgsieixmlevrtv` (the same Supabase project the app uses).
**The SQL:** [`waitlist.sql`](waitlist.sql), in this folder.

## Your checklist

- [ ] **1. Create the table** (5 min, needs Supabase dashboard access). See "Switching it on".
- [ ] **2. Test the form** with your own email on the live site, then check the row landed.
- [ ] **3. Make the klera.tech mailboxes work.** The site now lists `filip@klera.tech` and
      `darius@klera.tech`. Confirm both actually receive mail (send yourself a test from a
      personal account). If the domain has no mail set up yet, add Google Workspace, Zoho or
      iCloud custom domain MX records, or a forwarder like ImprovMX to your current inboxes.
- [ ] **4. Set up TestFlight external testing** in App Store Connect: create an external
      group ("Early access"), upload a build, submit it for Beta App Review (first build only,
      usually about a day). Needs the paid Apple Developer Program.
- [ ] **5. Invite in batches** (see "Running early access"). Pencil owners first.
- [ ] **6. Grant the free year of Premium** to everyone who actually used the build.
- [x] **7. Privacy policy** renamed to Klera AI, now at
      <https://fifilukasiewicz.github.io/klera-legal/>, with a section covering the waitlist.

## Switching it on (step 1)

1. Open <https://supabase.com/dashboard> and pick the Klera project.
2. Left sidebar: **SQL Editor**, then **New query**.
3. Paste the whole of `supabase/waitlist.sql`, click **Run**.
4. It should succeed with no rows returned. Running it again is harmless; if an older
   version was already run, it just adds the new columns.

Check: **Table Editor** shows `public.waitlist` with columns `id, email, name, role, device,
note, source, created_at, university, apple_id_email, consent, page, status, batch,
invited_at, first_session_at, premium_granted, premium_until, ops_note`.

## What each column is for

| Column | Set by | Meaning |
|---|---|---|
| `email`, `name` | form | Who they are |
| `role` | form | `student` (university), `school-student`, `parent`, `teacher`, `other` |
| `university` | form | Free text, for campus targeting (Bocconi first) |
| `device` | form | `ipad-pencil`, `ipad-no-pencil`, `no-ipad`, `unsure` |
| `note` | form | What they study |
| `apple_id_email` | form | Where to send the TestFlight invite if different from `email` |
| `consent` | form | Must be true, or the database rejects the row (EU) |
| `page` | form | `home` or `students`, which form they used |
| `status` | **you** | `waiting` → `invited` → `active` → `premium`, or `declined` / `removed` |
| `batch` | **you** | Which invite wave (1, 2, 3...) |
| `invited_at`, `first_session_at` | **you** | Dates, for the pilot write-up |
| `premium_granted` | **you** | The promise: a free year. True once they tested |
| `premium_until` | **you** | Last day of their free year |
| `ops_note` | **you** | Anything else |

The browser key physically cannot write the "you" columns: they are not in its insert grant.

## Running early access

**See who is next** (Pencil owners first, oldest first):

```sql
select * from public.waitlist_next_batch limit 25;
```

Copy the `testflight_email` column into the TestFlight external group (App Store Connect,
TestFlight, your group, Testers, add by email or import CSV). Then mark them invited:

```sql
update public.waitlist
set status = 'invited', batch = 1, invited_at = now()
where lower(coalesce(apple_id_email, email)) in (
  -- paste the addresses you just invited, lower case
  'someone@studbocconi.it'
);
```

**When someone has used the build** (TestFlight shows sessions per tester):

```sql
update public.waitlist
set status = 'premium', premium_granted = true,
    premium_until = (current_date + interval '1 year')::date,
    first_session_at = coalesce(first_session_at, now())
where lower(email) = 'someone@studbocconi.it';
```

**Deletion request** (GDPR): `delete from public.waitlist where lower(email) = '...';`

**Numbers for the deck:**

```sql
select status, count(*) from public.waitlist group by status order by 2 desc;
select device, count(*) from public.waitlist group by device order by 2 desc;
select coalesce(university, '(blank)') u, count(*) from public.waitlist group by u order by 2 desc limit 15;
```

**Export everything:** Table Editor, `waitlist`, **Export to CSV**.

## Wiring the free year into the app (later)

When the app has a paywall, the simplest correct wiring: on sign-in, look up the user's
email in `waitlist` from a server-side function (service role, never the client) and, if
`premium_granted` is true and `premium_until` is today or later, unlock Premium. Until the app sells anything, the column is the
record of who was promised it and until when.

## Why the key in the site is safe

`assets/site-config.js` contains a **publishable** key. It is designed to sit in public
client code; it is not the service-role key. What it can do is decided by row-level security
and grants, and `waitlist.sql` lets it insert a row into the visitor columns of this one
table and nothing else. No SELECT policy, no SELECT grant, so nobody holding it can read the
list back. Never put a service-role key in this repo.

---

## If you are handing step 1 to someone else

Paste them this:

> Klera's site has an early-access form that writes into our Supabase project
> `mstrcjcgsieixmlevrtv`. Please run `supabase/waitlist.sql` from the `klera-site` repo
> (https://github.com/Dariusplayer09/klera-site) in the dashboard's SQL Editor. It creates
> (or upgrades) a `public.waitlist` table with a unique index on lowercased email, enables
> RLS, grants the anon role INSERT on the visitor columns only, adds one validating INSERT
> policy, and a `waitlist_next_batch` view for us. No SELECT is granted to anon. Every
> statement is idempotent and nothing else in the project is touched.
>
> Afterwards please confirm `waitlist` shows in the Table Editor and submit the form once on
> https://dariusplayer09.github.io/klera-site/ to check a row lands.
