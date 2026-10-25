-- AURALIS — initial schema (mirrors src/db/schema.ts)
-- Applied to the dedicated AURALIS Supabase project.
-- The app connects as the `postgres` role through the transaction pooler,
-- so Row Level Security is enabled with no public policies: the public
-- (anon/authenticated) API roles get no access to store data.

create type user_role as enum ('admin', 'customer');
create type order_status as enum ('awaiting_payment', 'receipt_submitted', 'paid', 'shipped', 'delivered', 'cancelled');
create type conversation_status as enum ('open', 'closed');

create table users (
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

create table sessions (
  id serial primary key,
  token text not null unique,
  user_id integer not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table categories (
  id serial primary key,
  name text not null,
  slug text not null unique,
  description text,
  image text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table products (
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

create table orders (
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

create table order_items (
  id serial primary key,
  order_id integer not null references orders(id) on delete cascade,
  product_id integer references products(id) on delete set null,
  product_name text not null,
  product_image text,
  unit_price integer not null,
  quantity integer not null
);

create table conversations (
  id serial primary key,
  user_id integer not null references users(id) on delete cascade,
  product_id integer references products(id) on delete set null,
  subject text not null,
  status conversation_status not null default 'open',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table messages (
  id serial primary key,
  conversation_id integer not null references conversations(id) on delete cascade,
  sender_id integer not null references users(id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table store_settings (
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
create index sessions_user_id_idx on sessions(user_id);
create index products_category_id_idx on products(category_id);
create index orders_user_id_idx on orders(user_id);
create index orders_status_idx on orders(status);
create index order_items_order_id_idx on order_items(order_id);
create index conversations_user_id_idx on conversations(user_id);
create index conversations_last_message_at_idx on conversations(last_message_at);
create index messages_conversation_id_idx on messages(conversation_id);
create index messages_sender_id_idx on messages(sender_id);

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
