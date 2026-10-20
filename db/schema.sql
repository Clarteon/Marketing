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
