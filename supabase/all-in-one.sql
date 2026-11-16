-- AURALIS — کامل‌ترین فایل راه‌اندازی (نسخه یکجا)
-- در Supabase → SQL Editor این فایل را paste کنید و Run بزنید.
-- اجرای دوباره هم بی‌خطر است (همه دستورها idempotent شده‌اند).
-- روی Supabase این نقش‌ها از قبل وجود دارند؛ این بلوک فقط برای اجرای محلی است.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;


-- ══════════ 0001_init.sql ══════════
-- AURALIS — initial schema (mirrors src/db/schema.ts)
-- Applied to the dedicated AURALIS Supabase project.
-- The app connects as the `postgres` role through the transaction pooler,
-- so Row Level Security is enabled with no public policies: the public
-- (anon/authenticated) API roles get no access to store data.

do $$ begin
  create type user_role as enum ('admin', 'customer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type order_status as enum ('awaiting_payment', 'receipt_submitted', 'paid', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type conversation_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

create table if not exists users (
  id serial primary key,
  name text not null,
  email text not null unique,
  phone text,
  password_hash text not null,
  role user_role not null default 'customer',
  address text,
  city text,
  province text,
  postal_code text,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id serial primary key,
  token text not null unique,
  user_id integer not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id serial primary key,
  name text not null,
  slug text not null unique,
  description text,
  image text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id serial primary key,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price integer not null,
  compare_at_price integer,
  category_id integer references categories(id) on delete set null,
  images jsonb not null default '[]'::jsonb,
  stock integer not null default 0,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  materials text,
  dimensions text,
  craft_time text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id serial primary key,
  order_number text not null unique,
  user_id integer not null references users(id) on delete cascade,
  status order_status not null default 'awaiting_payment',
  subtotal integer not null,
  shipping_fee integer not null default 0,
  total integer not null,
  customer_name text not null,
  phone text not null,
  province text not null,
  city text not null,
  address text not null,
  postal_code text,
  note text,
  receipt_image text,
  receipt_ref text,
  receipt_note text,
  receipt_submitted_at timestamptz,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  tracking_code text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id serial primary key,
  order_id integer not null references orders(id) on delete cascade,
  product_id integer references products(id) on delete set null,
  product_name text not null,
  product_image text,
  unit_price integer not null,
  quantity integer not null
);

create table if not exists conversations (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  product_id integer references products(id) on delete set null,
  subject text not null,
  status conversation_status not null default 'open',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id serial primary key,
  conversation_id integer not null references conversations(id) on delete cascade,
  sender_id integer not null references users(id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists store_settings (
  id serial primary key,
  card_number text not null,
  card_holder text not null,
  bank_name text not null,
  sheba_number text,
  shipping_fee integer not null default 0,
  free_shipping_threshold integer not null default 0,
  announcement text,
  support_phone text,
  instagram text,
  address text,
  updated_at timestamptz not null default now()
);

-- Indexes for the hot query paths
create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists products_category_id_idx on products(category_id);
create index if not exists orders_user_id_idx on orders(user_id);
create index if not exists orders_status_idx on orders(status);
create index if not exists order_items_order_id_idx on order_items(order_id);
create index if not exists conversations_user_id_idx on conversations(user_id);
create index if not exists conversations_last_message_at_idx on conversations(last_message_at);
create index if not exists messages_conversation_id_idx on messages(conversation_id);
create index if not exists messages_sender_id_idx on messages(sender_id);

-- Lock the tables down for the Supabase Data API roles.
-- (The application connects as `postgres`, which owns the tables.)
alter table users enable row level security;
alter table sessions enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table store_settings enable row level security;

revoke all on table users, sessions, categories, products, orders, order_items, conversations, messages, store_settings from anon, authenticated;


-- ══════════ 0002_store_cover_images.sql ══════════
-- AURALIS — store cover photos managed from Admin → Settings.
-- hero_image: home-page hero cover (null = bundled /images/hero.jpg)
-- atelier_image: atelier photo on home/about (null = bundled /images/atelier.jpg)
-- Values may be a path/URL or a data URL uploaded from the admin's device.
-- Already applied to the AURALIS Supabase project (migration: add_store_cover_images).

alter table store_settings add column if not exists hero_image text;
alter table store_settings add column if not exists atelier_image text;


-- ══════════ 0003_showcase_slides.sql ══════════
-- AURALIS — home-page portfolio slideshow (Admin → اسلایدشو).
-- Images may be a bundled path (/images/showcase/...), an external URL, or a data URL
-- uploaded from the admin's device (same convention as products/categories).
-- Apply once (Supabase SQL editor, `supabase db push`, or `npm run db:push`).

create table if not exists showcase_slides (
  id serial primary key,
  title text not null,
  description text,
  image text not null,
  alt text,
  href text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists showcase_slides_order_idx on showcase_slides (sort_order, id);

-- Banner-level copy (null = the built-in defaults in the storefront component).
alter table store_settings add column if not exists showcase_enabled boolean not null default true;
alter table store_settings add column if not exists showcase_eyebrow text;
alter table store_settings add column if not exists showcase_title text;
alter table store_settings add column if not exists showcase_subtitle text;

-- First run: fill the banner with the four bundled portfolio shots.
insert into showcase_slides (title, description, image, alt, sort_order)
select
  v.title,
  v.description,
  v.image,
  v.alt,
  v.sort_order
from (
  values
    (
      'جعبه جواهر مرواریدی',
      'مرواریدهای صدفی، دست‌بافت روی قاب محکم؛ گنجینه‌ای برای خاطرات شما.',
      '/images/showcase/pearl-jewelry-box.webp',
      'جعبه جواهر دست‌ساز مرواریدی آورالیس روی سطح مرمر',
      1
    ),
    (
      'جاکلیدی پینگوئین',
      'مروارید سیاه و سفید با جزئیات قرمز؛ همراه کوچک روزهای سرد.',
      '/images/showcase/penguin-keychain.webp',
      'جاکلیدی دست‌ساز پینگوئین با مروارید سیاه و سفید در فضای برفی',
      2
    ),
    (
      'جاکلیدی اسم اختصاصی',
      'حروف مرواریدی با زنجیر آبکاری‌شده؛ هویت شخصی شما، دست‌ساز.',
      '/images/showcase/name-keychain.webp',
      'جاکلیدی حروف اسم سفارشی با مروارید سفید آویزان از کیف چرمی',
      3
    ),
    (
      'جاکلیدی پلاک پوکر',
      'طرح اسپید و دل با مروارید رنگی؛ هدیه‌ای خاص برای علاقه‌مندان بازی.',
      '/images/showcase/poker-keychain.webp',
      'دو جاکلیدی دست‌ساز با نقش پاسور و مروارید مشکی و قرمز',
      4
    )
) as v(title, description, image, alt, sort_order)
where not exists (select 1 from showcase_slides);


-- ══════════ 0004_control_center.sql ══════════
-- AURALIS — Control Center (freelance agent dashboard) schema.
-- Sections: job feed & bidding, client chats, USDT wallet, automated task engine.
-- Apply once (Supabase SQL editor, `supabase db push`, or `npm run db:push`).

-- ── enums ──────────────────────────────────────────────────────────────────
do $$ begin
  create type project_status as enum ('found', 'proposal_sent', 'in_progress', 'completed', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_sender as enum ('ai', 'client', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wallet_tx_status as enum ('pending', 'confirmed', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agent_task_kind as enum ('nextjs_scaffold', 'translation', 'pptx');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agent_task_status as enum ('queued', 'processing', 'done', 'failed');
exception when duplicate_object then null; end $$;

-- ── projects (job feed & bidding) ──────────────────────────────────────────
create table if not exists projects (
  id serial primary key,
  title text not null,
  client_name text,
  platform text not null default 'Direct',           -- Upwork | Freelancer | Direct | ...
  source_url text,
  description text,
  budget_usdt numeric(12, 2) not null default 0,
  currency text not null default 'USDT',             -- USDT (TRC-20) / USDC ...
  skills text[] not null default '{}',               -- Next.js, ترجمه, پاورپوینت, ...
  status project_status not null default 'found',
  proposal_text text,
  telegram_message_id bigint,                        -- inline keyboard message for editing later
  proposal_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_status_idx on projects (status);
create index if not exists projects_created_at_idx on projects (created_at desc);
create unique index if not exists projects_source_url_key
  on projects (source_url) where source_url is not null;

-- ── chats (client communications, human-in-the-loop) ───────────────────────
create table if not exists chats (
  id serial primary key,
  project_id integer not null references projects(id) on delete cascade,
  sender chat_sender not null,
  message text not null,
  -- set for AI drafts waiting for the operator's approval in Telegram / dashboard
  is_draft boolean not null default false,
  delivered_at timestamptz,
  -- message_id of the Telegram copy, so the operator can *reply* to it
  telegram_message_id bigint,
  timestamp timestamptz not null default now()
);

create index if not exists chats_telegram_message_idx
  on chats (telegram_message_id) where telegram_message_id is not null;

create index if not exists chats_project_id_idx on chats (project_id, timestamp);

-- ── wallet settings + transactions ─────────────────────────────────────────
create table if not exists wallet_settings (
  id serial primary key,
  trc20_address text not null default '',
  total_earned_usdt numeric(12, 2) not null default 0,
  network text not null default 'TRC-20',
  updated_at timestamptz not null default now()
);

create table if not exists wallet_transactions (
  id serial primary key,
  project_id integer references projects(id) on delete set null,
  amount_usdt numeric(12, 2) not null,
  network text not null default 'TRC-20',
  tx_hash text,
  status wallet_tx_status not null default 'pending',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_project_idx on wallet_transactions (project_id);

-- ── automated execution engine tasks ───────────────────────────────────────
create table if not exists agent_tasks (
  id serial primary key,
  project_id integer references projects(id) on delete cascade,
  kind agent_task_kind not null,
  status agent_task_status not null default 'queued',
  title text not null,
  input jsonb not null default '{}'::jsonb,          -- user prompt + options
  result jsonb,                                      -- generated files / outline / text
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_tasks_project_idx on agent_tasks (project_id, created_at desc);

-- ── keep updated_at fresh ──────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

drop trigger if exists wallet_settings_updated_at on wallet_settings;
create trigger wallet_settings_updated_at before update on wallet_settings
  for each row execute function set_updated_at();

drop trigger if exists agent_tasks_updated_at on agent_tasks;
create trigger agent_tasks_updated_at before update on agent_tasks
  for each row execute function set_updated_at();

-- ── seed the single wallet row ─────────────────────────────────────────────
insert into wallet_settings (trc20_address, total_earned_usdt)
select '', 0
where not exists (select 1 from wallet_settings);

-- ── lock down the Data API roles (same convention as 0001_init.sql) ────────
alter table projects enable row level security;
alter table chats enable row level security;
alter table wallet_settings enable row level security;
alter table wallet_transactions enable row level security;
alter table agent_tasks enable row level security;

do $$ begin
  revoke all on table projects, chats, wallet_settings, wallet_transactions, agent_tasks
    from anon, authenticated;
exception when undefined_object then null; end $$;

-- ── per-project totals used by the dashboard charts ────────────────────────
create or replace view project_financials as
select
  p.id as project_id,
  p.status,
  p.budget_usdt,
  coalesce(sum(case when t.status = 'confirmed' then t.amount_usdt else 0 end), 0) as settled_usdt,
  coalesce(sum(case when t.status <> 'failed' then t.amount_usdt else 0 end), 0) as expected_usdt
from projects p
left join wallet_transactions t on t.project_id = p.id
group by p.id, p.status, p.budget_usdt;

do $$ begin
  revoke all on project_financials from anon, authenticated;
exception when undefined_object then null; end $$;


-- ══════════ 0005_app_settings.sql ══════════
-- AURALIS — Control Center credentials saved from the dashboard.
-- The settings page (/control/settings) writes here so nothing has to be typed
-- into Vercel. Secret values are encrypted by the app (AES-256-GCM) before they
-- land in `value`, and env vars always win over these rows when both exist.

create table if not exists app_settings (
  key text primary key,
  value text,
  is_secret boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table app_settings is
  'Control Center credentials (Telegram, Supabase, wallet, LLM). Service-role only.';

alter table app_settings enable row level security;

do $$ begin
  revoke all on table app_settings from anon, authenticated;
exception when undefined_object then null; end $$;

-- Keep the wallet tab in sync when the address is saved from the settings page.
insert into wallet_settings (trc20_address, network)
select '', 'TRC-20'
where not exists (select 1 from wallet_settings);


-- ══════════ 0006_store_agent.sql ══════════
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


-- ══════════ 0007_product_broadcast.sql ══════════
-- One row per (product, channel) so re-running "publish all" never spams the
-- channel with duplicates. Safe to run twice.

create table if not exists store_product_posts (
  id serial primary key,
  product_id integer not null references products(id) on delete cascade,
  channel text not null default 'telegram',
  -- sent | failed
  status text not null default 'failed',
  caption text,
  external_id text,
  error text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, channel)
);

create index if not exists store_product_posts_status_idx
  on store_product_posts (channel, status, posted_at desc);

alter table store_product_posts enable row level security;

do $$ begin
  revoke all on table store_product_posts from anon, authenticated;
exception when undefined_object then null; end $$;

do $$ begin
  revoke all on sequence store_product_posts_id_seq from anon, authenticated;
exception when undefined_object then null; end $$;


-- ══════════ 0008_contact_phones.sql ══════════
-- AURALIS — maker + admin contact lines (plain digits, no dashes).
alter table store_settings add column if not exists admin_phone text;
alter table store_agent_settings add column if not exists admin_phone text not null default '';

update store_settings
set support_phone = '09132389654',
    admin_phone = '09014837991',
    updated_at = now()
where id = 1;

update store_agent_settings
set support_phone = '09132389654',
    admin_phone = '09014837991',
    updated_at = now()
where id = 1;
