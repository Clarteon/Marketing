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
  constraint leads_source_check check (source in ('website-form'))
);

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
