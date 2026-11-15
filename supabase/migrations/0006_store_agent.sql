-- AURALIS — Store Agent (sales · marketing · market research) schema.
-- Apply once (Supabase SQL editor, `supabase db push`, or `npm run db:push`).
-- Safe to run twice.

-- ── enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type lead_status as enum
    ('new', 'qualified', 'contacted', 'replied', 'negotiating', 'won', 'lost', 'unsubscribed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_source as enum
    ('telegram', 'instagram', 'eitaa', 'rubika', 'bale', 'website', 'hashtag', 'import', 'manual', 'referral');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_grade as enum ('hot', 'warm', 'cold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type store_message_direction as enum ('inbound', 'outbound', 'note');
exception when duplicate_object then null; end $$;

do $$ begin
  create type store_message_status as enum
    ('received', 'draft', 'queued', 'sent', 'failed', 'discarded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_status as enum ('draft', 'active', 'paused', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type store_post_status as enum ('draft', 'queued', 'sent', 'failed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type research_kind as enum ('competitor', 'pricing', 'trend', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type store_agent_kind as enum ('research', 'marketing', 'sales', 'orchestrator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type store_agent_run_status as enum ('running', 'done', 'failed');
exception when duplicate_object then null; end $$;

-- ── channels ───────────────────────────────────────────────────────────────
create table if not exists store_channels (
  id serial primary key,
  key text not null unique,
  label text not null,
  -- api | manual | webhook
  mode text not null default 'manual',
  api_base text,
  token text,                       -- encrypted by the app before insert
  handle text,
  enabled boolean not null default false,
  note text,
  status text not null default 'unverified',
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── single-row agent settings ──────────────────────────────────────────────
create table if not exists store_agent_settings (
  id serial primary key,
  brand_name text not null default 'AURALIS',
  brand_voice text not null default '',
  offer_text text not null default '',
  lead_magnet_title text not null default '',
  lead_magnet_url text not null default '',
  store_url text not null default '',
  support_phone text not null default '',
  target_audience text not null default '',
  max_discount_percent integer not null default 10,
  daily_send_cap integer not null default 30,
  min_gap_minutes integer not null default 7,
  max_gap_minutes integer not null default 18,
  quiet_start_hour integer not null default 22,
  quiet_end_hour integer not null default 8,
  timezone text not null default 'Asia/Tehran',
  require_approval boolean not null default true,
  auto_welcome boolean not null default true,
  follow_up_days integer[] not null default '{2,5,10}',
  research_cadence text not null default 'weekly',
  notify_telegram boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ── leads (CRM) ────────────────────────────────────────────────────────────
create table if not exists leads (
  id serial primary key,
  name text not null default '',
  handle text,
  external_id text,
  channel text not null default 'manual',
  source lead_source not null default 'manual',
  source_url text,
  interest text,
  need text,
  phone text,
  email text,
  city text,
  consent boolean not null default false,
  score integer not null default 0,
  grade lead_grade not null default 'cold',
  status lead_status not null default 'new',
  estimated_value integer not null default 0,
  tags text[] not null default '{}',
  notes text,
  last_inbound_at timestamptz,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  follow_up_step integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leads_channel_external_key
  on leads (channel, external_id) where external_id is not null;
create unique index if not exists leads_channel_handle_key
  on leads (channel, handle) where handle is not null;
create index if not exists leads_status_idx on leads (status);
create index if not exists leads_grade_idx on leads (grade, score desc);
create index if not exists leads_follow_up_idx on leads (next_follow_up_at)
  where next_follow_up_at is not null;
create index if not exists leads_created_at_idx on leads (created_at desc);

-- ── timeline ───────────────────────────────────────────────────────────────
create table if not exists lead_events (
  id serial primary key,
  lead_id integer not null references leads(id) on delete cascade,
  kind text not null,
  detail text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lead_events_lead_idx on lead_events (lead_id, created_at desc);

-- ── conversations / draft queue ────────────────────────────────────────────
create table if not exists store_messages (
  id serial primary key,
  lead_id integer not null references leads(id) on delete cascade,
  channel text not null,
  direction store_message_direction not null,
  status store_message_status not null default 'draft',
  body text not null,
  ai_generated boolean not null default false,
  approved_at timestamptz,
  scheduled_for timestamptz,
  sent_at timestamptz,
  external_id text,
  error text,
  meta jsonb not null default '{}'::jsonb,
  -- Telegram copy of an AI draft, so the operator can approve / edit by replying
  telegram_notify_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_messages_lead_idx on store_messages (lead_id, created_at);
create index if not exists store_messages_status_idx on store_messages (status, scheduled_for);
create index if not exists store_messages_sent_idx on store_messages (channel, sent_at desc)
  where sent_at is not null;
create index if not exists store_messages_notify_idx on store_messages (telegram_notify_message_id)
  where telegram_notify_message_id is not null;

-- ── campaigns & posts ──────────────────────────────────────────────────────
create table if not exists campaigns (
  id serial primary key,
  title text not null,
  goal text,
  offer text,
  audience text,
  channels text[] not null default '{}',
  status campaign_status not null default 'draft',
  start_at timestamptz,
  end_at timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketing_posts (
  id serial primary key,
  campaign_id integer references campaigns(id) on delete set null,
  channel text not null,
  format text not null default 'post',
  title text not null default '',
  body text not null,
  hashtags text[] not null default '{}',
  image_prompt text,
  status store_post_status not null default 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  external_id text,
  permalink text,
  error text,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_posts_status_idx on marketing_posts (status, scheduled_for);
create index if not exists marketing_posts_campaign_idx on marketing_posts (campaign_id);

-- ── market research ────────────────────────────────────────────────────────
create table if not exists competitors (
  id serial primary key,
  name text not null,
  handle text,
  url text,
  channel text,
  price_min integer,
  price_max integer,
  rating integer,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  review_notes text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trend_signals (
  id serial primary key,
  keyword text not null,
  channel text,
  score integer not null default 50,
  volume_hint text,
  source text not null default 'manual',
  note text,
  captured_at timestamptz not null default now()
);

create table if not exists research_reports (
  id serial primary key,
  kind research_kind not null default 'custom',
  title text not null,
  summary text not null default '',
  insights jsonb not null default '[]'::jsonb,
  pricing jsonb not null default '{}'::jsonb,
  weaknesses text[] not null default '{}',
  trends text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,
  engine text not null default 'template',
  created_at timestamptz not null default now()
);

create index if not exists research_reports_created_idx on research_reports (created_at desc);

-- ── agent run log ──────────────────────────────────────────────────────────
create table if not exists store_agent_runs (
  id serial primary key,
  kind store_agent_kind not null,
  status store_agent_run_status not null default 'running',
  trigger text not null default 'manual',
  stats jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists store_agent_runs_started_idx on store_agent_runs (started_at desc);

-- ── keep updated_at fresh (function created by 0004) ───────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists store_channels_updated_at on store_channels;
create trigger store_channels_updated_at before update on store_channels
  for each row execute function set_updated_at();

drop trigger if exists store_agent_settings_updated_at on store_agent_settings;
create trigger store_agent_settings_updated_at before update on store_agent_settings
  for each row execute function set_updated_at();

drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at before update on leads
  for each row execute function set_updated_at();

drop trigger if exists store_messages_updated_at on store_messages;
create trigger store_messages_updated_at before update on store_messages
  for each row execute function set_updated_at();

drop trigger if exists campaigns_updated_at on campaigns;
create trigger campaigns_updated_at before update on campaigns
  for each row execute function set_updated_at();

drop trigger if exists marketing_posts_updated_at on marketing_posts;
create trigger marketing_posts_updated_at before update on marketing_posts
  for each row execute function set_updated_at();

drop trigger if exists competitors_updated_at on competitors;
create trigger competitors_updated_at before update on competitors
  for each row execute function set_updated_at();

-- ── seed the single settings row + default channels ────────────────────────
insert into store_agent_settings (id)
select 1
where not exists (select 1 from store_agent_settings);

insert into store_channels (key, label, mode, api_base, enabled, note)
select v.key, v.label, v.mode, v.api_base, v.enabled, v.note
from (values
  ('telegram',  'تلگرام',  'api',     'https://api.telegram.org', false,
   'ربات BotFather؛ پیام‌ها و پاسخ مشتریان از همین‌جا می‌آید.'),
  ('bale',      'بله',     'api',     'https://tapi.bale.ai',      false,
   'توکن ربات بله (@BotFather بله) — API سازگار با تلگرام.'),
  ('instagram', 'اینستاگرام', 'manual', null,                    false,
   'ارسال دستی از پیام‌های مستقیم؛ ایجنت متن را آماده می‌کند (بدون اسکرپ یا پیام انبوه).'),
  ('eitaa',     'ایتا',    'manual',  null,                      false,
   'کپی متن آماده‌شده و ارسال از حساب رسمی.'),
  ('rubika',    'روبیکا',  'manual',  null,                      false,
   'کپی متن آماده‌شده و ارسال از حساب رسمی.'),
  ('website',   'وب‌سایت', 'webhook', null,                      true,
   'فرم سایت / لندینگ: POST به /api/control/store/inbound با کلید مخفی.')
) as v(key, label, mode, api_base, enabled, note)
where not exists (select 1 from store_channels c where c.key = v.key);

-- ── lock down the Data API roles (same convention as 0001/0004) ────────────
alter table store_channels enable row level security;
alter table store_agent_settings enable row level security;
alter table leads enable row level security;
alter table lead_events enable row level security;
alter table store_messages enable row level security;
alter table campaigns enable row level security;
alter table marketing_posts enable row level security;
alter table competitors enable row level security;
alter table trend_signals enable row level security;
alter table research_reports enable row level security;
alter table store_agent_runs enable row level security;

do $$ begin
  revoke all on table
    store_channels, store_agent_settings, leads, lead_events, store_messages,
    campaigns, marketing_posts, competitors, trend_signals, research_reports,
    store_agent_runs
  from anon, authenticated;
exception when undefined_object then null; end $$;

-- ── convenience view: pipeline by stage ────────────────────────────────────
create or replace view store_lead_pipeline as
select
  status,
  count(*) as lead_count,
  coalesce(sum(estimated_value), 0) as pipeline_value,
  coalesce(round(avg(score)), 0) as avg_score
from leads
group by status;

do $$ begin
  revoke all on store_lead_pipeline from anon, authenticated;
exception when undefined_object then null; end $$;
