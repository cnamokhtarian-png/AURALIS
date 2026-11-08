-- Production hardening: the original showcase table was created without RLS.
-- Public storefront access is served through the server-side service role;
-- browser roles must not read or modify the table directly.
alter table showcase_slides enable row level security;

revoke all on table showcase_slides from anon, authenticated;
