-- Klera early-access waitlist.
-- Run once against the Klera Supabase project (SQL editor, or `supabase db execute`).
-- Every statement is idempotent: safe on an empty project AND on one where an older
-- version of this file was already run (new columns are added, nothing is dropped).
--
-- Security shape: the site is static and public, so it carries a publishable key. That key
-- may INSERT a signup, and only into the columns a visitor is allowed to set. There is no
-- SELECT policy and no SELECT grant, so a visitor holding the key cannot read the list back,
-- not their own row and not anyone else's. The ops columns (status, invited_at,
-- premium_granted, ...) are writable only from the dashboard or with the service-role key,
-- neither of which ever reaches the browser.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- table
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

-- Visitor-supplied (added in the September 2026 site update)
alter table public.waitlist add column if not exists university      text;
alter table public.waitlist add column if not exists apple_id_email  text;
alter table public.waitlist add column if not exists consent         boolean not null default false;
alter table public.waitlist add column if not exists page            text;

-- Ops columns: set by us, never by the form
alter table public.waitlist add column if not exists status           text not null default 'waiting';
alter table public.waitlist add column if not exists batch            int;
alter table public.waitlist add column if not exists invited_at       timestamptz;
alter table public.waitlist add column if not exists first_session_at timestamptz;
-- The offer changed from lifetime Premium to a free year (Sept 2026). If an older version of
-- this file created premium_lifetime, rename it rather than keeping two flags.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'waitlist' and column_name = 'premium_lifetime') then
    alter table public.waitlist rename column premium_lifetime to premium_granted;
  end if;
end $$;
alter table public.waitlist add column if not exists premium_granted  boolean not null default false;
alter table public.waitlist add column if not exists premium_until    date;
alter table public.waitlist add column if not exists ops_note         text;

comment on table public.waitlist is
  'Early-access signups from the Klera site. Insert-only for the publishable key; never readable client side.';
comment on column public.waitlist.status is
  'waiting -> invited (TestFlight invite sent) -> active (used the build) -> premium (free year granted). Also: declined, removed.';
comment on column public.waitlist.premium_granted is
  'The early-access promise: a free year of Premium. Set true once a tester has actually used the build.';
comment on column public.waitlist.premium_until is
  'Last day of the free year. Set to grant date + 1 year when premium_granted is set.';

-- ---------------------------------------------------------------- constraints
alter table public.waitlist drop constraint if exists waitlist_status_check;
alter table public.waitlist add  constraint waitlist_status_check
  check (status in ('waiting', 'invited', 'active', 'premium', 'declined', 'removed'));

-- One signup per address. A repeat submit raises 23505 (HTTP 409), which the form reports
-- as "you are already on the list" rather than as an error.
create unique index if not exists waitlist_email_unique on public.waitlist (lower(email));
create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);
create index if not exists waitlist_status_idx     on public.waitlist (status);

-- ---------------------------------------------------------------- privileges
alter table public.waitlist enable row level security;

-- Column-level insert grant: the anon key can only fill the visitor columns. Any attempt to
-- set status / premium_granted / batch from the browser is rejected by Postgres itself.
revoke all on public.waitlist from anon, authenticated;
grant insert (email, name, role, university, device, note, apple_id_email, consent, page, source)
  on public.waitlist to anon, authenticated;

drop policy if exists "anyone may join the waitlist" on public.waitlist;
create policy "anyone may join the waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (
        email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and length(email) between 5 and 254
    and (name is null or length(name) <= 120)
    and (university is null or length(university) <= 120)
    and (note is null or length(note) <= 500)
    and (apple_id_email is null or (apple_id_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and length(apple_id_email) <= 254))
    and consent = true
    and role   in ('student', 'school-student', 'parent', 'teacher', 'other')
    and device in ('ipad-pencil', 'ipad-no-pencil', 'no-ipad', 'unsure')
    and (page is null or page in ('home', 'students'))
    and source = 'site'
  );

-- ---------------------------------------------------------------- ops view
-- Who to invite next: Pencil owners first, then iPad without Pencil, oldest signup first.
-- The TestFlight address is the Apple ID if they gave one, otherwise their email.
-- security_invoker: the view runs with the caller's rights, so anon still sees nothing.
create or replace view public.waitlist_next_batch
with (security_invoker = true) as
select id, created_at, name, email,
       coalesce(apple_id_email, email) as testflight_email,
       role, university, device, note
from public.waitlist
where status = 'waiting'
  and device in ('ipad-pencil', 'ipad-no-pencil', 'unsure')
order by (device = 'ipad-pencil') desc, (device = 'ipad-no-pencil') desc, created_at;

revoke all on public.waitlist_next_batch from anon, authenticated;
