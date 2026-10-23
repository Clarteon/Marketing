-- Clarteon lead log (Neon Postgres)

create table if not exists leads (
  id uuid primary key,
  request_id text not null unique,
  name text not null,
  email text not null,
  company text,
  need text not null,
  team_size text,
  consent boolean not null default true,
  source text not null default 'website-form',
  created_at timestamptz not null default now(),
  team_email_sent_at timestamptz,
  receipt_email_sent_at timestamptz,
  last_error text,
  constraint leads_team_size_check check (
    team_size is null or team_size in ('1', '2-10', '11-50', '51-200', '200+', 'not-sure')
  ),
  constraint leads_source_check check (source in ('website-form', 'clara-chat'))
);

-- Older databases were created with the website-form-only constraint. Replacing
-- it is safe: the check only widens the allowed values.
alter table leads drop constraint if exists leads_source_check;
alter table leads add constraint leads_source_check check (source in ('website-form', 'clara-chat'));

create index if not exists leads_created_at_idx on leads (created_at);
create index if not exists leads_email_idx on leads (email);

-- Discovery-call bookings. A pending row holds a slot while the calendar event
-- is created; a confirmed row is the durable record. The unique slot_start is
-- the database-level double-booking guard.
create table if not exists bookings (
  request_id text primary key,
  slot_start timestamptz not null unique,
  slot_end timestamptz not null,
  name text not null,
  email text not null,
  notes text,
  timezone text not null,
  status text not null default 'pending',
  google_event_id text,
  meet_link text,
  calendar_link text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint bookings_status_check check (status in ('pending', 'confirmed'))
);

create index if not exists bookings_email_idx on bookings (email);
create index if not exists bookings_created_at_idx on bookings (created_at);

-- Clara knowledge layer. Unanswered questions are redacted before insert; the
-- review queue never needs a visitor's email or phone number.
create table if not exists knowledge_questions (
  id uuid primary key,
  question text not null,
  fingerprint text not null unique,
  status text not null default 'open',
  answer text,
  source_url text,
  ask_count integer not null default 1,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  constraint knowledge_questions_status_check check (
    status in ('open', 'approved', 'rejected')
  )
);

create index if not exists knowledge_questions_queue_idx
  on knowledge_questions (status, last_seen_at desc);

-- Approved answers are the only visitor-influenced text Clara can learn from.
-- They are published only after a reviewer signs in and approves the wording.
create table if not exists knowledge_faqs (
  id uuid primary key,
  slug text not null unique,
  title text not null,
  question text not null,
  answer text not null,
  tags text[] not null default '{}',
  synonyms text[] not null default '{}',
  source_url text not null default '/contact#message',
  status text not null default 'published',
  source_question_id uuid references knowledge_questions (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_faqs_status_check check (status in ('published', 'archived'))
);

create index if not exists knowledge_faqs_status_idx on knowledge_faqs (status);

create table if not exists knowledge_audit (
  id uuid primary key,
  action text not null,
  question_id uuid,
  faq_id uuid,
  actor text not null,
  created_at timestamptz not null default now(),
  constraint knowledge_audit_action_check check (action in ('approve', 'reject'))
);

create index if not exists knowledge_audit_created_at_idx on knowledge_audit (created_at);

-- The runtime index is a single JSON document. It is a cache of the generated
-- content index plus published FAQs, so a database outage can fall back to the
-- bundled index without stopping Clara.
create table if not exists knowledge_index (
  id text primary key,
  generated_at timestamptz not null,
  base_generated_at timestamptz not null,
  chunk_count integer not null,
  payload jsonb not null
);
