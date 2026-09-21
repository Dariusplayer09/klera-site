-- Klera early-access waitlist.
-- Run once against the Klera Supabase project (SQL editor, or `supabase db execute`).
--
-- Security shape: the site is static and public, so it carries a publishable key. That key
-- is allowed to INSERT a signup and nothing else. There is deliberately no SELECT policy
-- and no SELECT grant, so a visitor holding the key cannot read the list back, not their
-- own row and not anyone else's. Reading the list is done from the Supabase dashboard or
-- with the service-role key, neither of which ever reaches the browser.

create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text        not null,
  name        text,
  role        text        not null default 'student',
  device      text        not null default 'unsure',
  note        text,
  source      text        not null default 'site',
  created_at  timestamptz not null default now()
);

comment on table public.waitlist is
  'Early-access signups from klera.app. Insert-only for the publishable key; never readable client side.';

-- One signup per address. A repeat submit raises 23505, which the form reports as
-- "you are already on the list" rather than as an error.
create unique index if not exists waitlist_email_unique on public.waitlist (lower(email));
create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

-- Privileges: insert only. No select, update or delete for the public roles.
revoke all on public.waitlist from anon, authenticated;
grant insert on public.waitlist to anon, authenticated;

drop policy if exists "anyone may join the waitlist" on public.waitlist;
create policy "anyone may join the waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (
        email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and length(email) between 5 and 254
    and (name is null or length(name) <= 120)
    and (note is null or length(note) <= 500)
    and role   in ('student', 'parent', 'teacher', 'other')
    and device in ('ipad-pencil', 'ipad-no-pencil', 'no-ipad', 'unsure')
    and source = 'site'
  );

-- Read the list (dashboard / service role only):
--   select created_at, email, name, role, device, note
--   from public.waitlist order by created_at desc;
