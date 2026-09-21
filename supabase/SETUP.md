# Turning on the early-access form

The form on the homepage and on `/for-students/` posts straight into a Supabase table. Until
the table exists, the form shows an error instead of signing anyone up. This is a one-time,
five-minute job and it never needs doing again.

**Project:** `mstrcjcgsieixmlevrtv` (the same Supabase project the app uses).
**The SQL to run:** [`waitlist.sql`](waitlist.sql), in this folder.

## Doing it in the dashboard

1. Open <https://supabase.com/dashboard> and pick the Klera project.
2. In the left sidebar choose **SQL Editor**.
3. Click **New query**.
4. Open `supabase/waitlist.sql` from this repo, copy the whole file, paste it in.
5. Click **Run** (or press Cmd+Enter).
6. It should report success with no rows returned. Running it twice is harmless: every
   statement is written to be safe to re-run.

## Checking it worked

In the dashboard go to **Table Editor**. There should now be a `waitlist` table in the
`public` schema with columns `id, email, name, role, device, note, source, created_at`.

Then open the live site, submit the form with your own email, and refresh the table. Your row
should be there. Submitting the same address twice is expected to say you are already on the
list rather than to add a second row.

## Reading the signups later

Table Editor shows them, newest first if you sort by `created_at`. Or in the SQL editor:

```sql
select created_at, email, name, role, device, note
from public.waitlist
order by created_at desc;
```

## Why the key in the site is safe

`assets/site-config.js` contains a **publishable** key. That kind of key is designed to sit in
public client code; it is not a secret and it is not the service-role key. What it is allowed
to do is decided entirely by row-level security, and `waitlist.sql` grants it `INSERT` on this
one table and nothing else. There is deliberately **no SELECT policy and no SELECT grant**, so
someone holding that key can add a signup and cannot read the list back, not even their own
row. Reading the list requires the dashboard or the service-role key, neither of which is ever
in the browser.

Never put a service-role key in `site-config.js` or anywhere else in this repo.

---

## If you are handing this to someone else

Paste them this:

> Klera's marketing site has an early-access signup form that writes into our Supabase project
> `mstrcjcgsieixmlevrtv`. The table does not exist yet, so the form currently errors.
>
> Please run the SQL in `supabase/waitlist.sql` from the `klera-site` repo
> (https://github.com/Dariusplayer09/klera-site) against that project, using the dashboard's
> SQL Editor. It creates a `public.waitlist` table, a unique index on lowercased email, enables
> row-level security, and adds a single INSERT-only policy for the anon and authenticated roles
> with validation on the email format and the role/device enums. It deliberately grants no
> SELECT, so the publishable key in the site cannot read the list back.
>
> Every statement is idempotent, so it is safe to run more than once. Nothing else in the
> project is touched: it only creates that one table and its policy.
>
> Afterwards, please confirm the `waitlist` table shows up in the Table Editor, and submit the
> form once on https://dariusplayer09.github.io/klera-site/ to check a row lands.
