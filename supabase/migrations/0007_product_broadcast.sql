-- AURALIS — product catalogue broadcast (photo posts in the Telegram channel).
-- One row per (product, channel) so re-running "publish all" never spams the
-- channel with duplicates. Use only on a fresh database or in a reviewed migration plan;
-- IF NOT EXISTS does not verify existing object definitions.

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
