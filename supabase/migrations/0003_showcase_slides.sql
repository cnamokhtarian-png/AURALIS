-- AURALIS — home-page portfolio slideshow (Admin → اسلایدشو).
-- Images may be a bundled path (/images/showcase/...), an external URL, or a data URL
-- uploaded from the admin's device (same convention as products/categories).
-- Already applied to the AURALIS Supabase project (migration: add_showcase_slides).

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
