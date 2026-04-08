-- Kaerna admin seed dataset
-- Run this only in a development or staging project after the base schema and admin RPC files.

begin;

insert into public.launcher_news (id, title, body, is_published)
values
  (gen_random_uuid(), 'Welcome to Kaerna', 'The launcher backend is connected and ready for moderation workflows.', true),
  (gen_random_uuid(), 'Maintenance window', 'Expect a short maintenance window before the next release rollout.', false)
on conflict do nothing;

insert into public.build_releases (id, version, manifest_url, changelog, is_active)
values
  (gen_random_uuid(), '0.1.0', 'https://example.com/releases/0.1.0/manifest.json', 'Initial test release', true),
  (gen_random_uuid(), '0.1.1-rc1', 'https://example.com/releases/0.1.1-rc1/manifest.json', 'Release candidate for staging validation', false)
on conflict (version) do nothing;

commit;
