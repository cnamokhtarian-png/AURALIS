-- AURALIS — store cover photos managed from Admin → Settings.
-- hero_image: home-page hero cover (null = bundled /images/hero.jpg)
-- atelier_image: atelier photo on home/about (null = bundled /images/atelier.jpg)
-- Values may be a path/URL or a data URL uploaded from the admin's device.
-- Already applied to the AURALIS Supabase project (migration: add_store_cover_images).

alter table store_settings add column if not exists hero_image text;
alter table store_settings add column if not exists atelier_image text;
