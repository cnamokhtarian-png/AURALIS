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
