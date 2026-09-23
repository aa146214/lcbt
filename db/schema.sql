-- LEADS
-- -----
-- One row per completed quiz where somebody left an email address.
--
-- Run once against the Neon database, e.g.
--   psql "$DATABASE_URL" -f db/schema.sql
-- It is idempotent, so re-running it on an existing database is safe.

create table if not exists leads (
  id                 bigint generated always as identity primary key,

  email              text        not null,
  -- "registration" when we had nothing to match them with and they asked to
  -- be told when something opens up; "matches" otherwise. Stored rather than
  -- inferred from the course ids, so the CRM can route the two differently.
  lead_type          text        not null check (lead_type in ('matches', 'registration')),
  -- Opt-in for marketing, which is separate from the matches they asked for.
  -- Sending the matches is the thing they requested; anything beyond that
  -- needs its own consent, so the two are kept apart.
  marketing_consent  boolean     not null,

  -- Quiz answers and the course ids, as JSON rather than columns: the
  -- questions are content (questions.json) and will change without a
  -- migration, so pinning them to a schema would only go stale.
  answers            jsonb       not null,
  saved_course_ids   jsonb       not null,
  matched_course_ids jsonb       not null,

  source             text        not null,
  -- What the browser said, and what the server saw. They differ when a device
  -- clock is wrong, so keep both rather than trusting either alone.
  submitted_at       timestamptz,
  created_at         timestamptz not null default now(),

  -- Set once the lead has been handed to LCBT's CRM. Null means outstanding,
  -- which is what makes it possible to collect now and replay later.
  forwarded_at       timestamptz,

  -- What actually left the building. Null means that email did not send, so
  -- a resend can find it; a lead is never rejected for an email failure.
  staff_emailed_at   timestamptz,
  learner_emailed_at timestamptz
);

-- Added after the table shipped, so existing databases get them too.
alter table leads add column if not exists staff_emailed_at   timestamptz;
alter table leads add column if not exists learner_emailed_at timestamptz;

-- Newest first is how anyone will read this table.
create index if not exists leads_created_at_idx on leads (created_at desc);

-- "What has not reached the CRM yet" — a partial index, since the answer is
-- expected to be a small slice of the table.
create index if not exists leads_pending_idx on leads (created_at) where forwarded_at is null;

-- Someone retaking the quiz is a real second lead, so email is deliberately
-- not unique; this only makes "find everything for this person" quick, which
-- is also what a deletion request needs.
create index if not exists leads_email_idx on leads (lower(email));
