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
