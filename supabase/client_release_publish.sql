begin;

alter table public.build_releases
  add column if not exists zip_url text,
  add column if not exists published_at timestamptz,
  add column if not exists github_release_tag text;

update public.build_releases
set zip_url = manifest_url
where zip_url is null and manifest_url is not null;

create or replace function public.admin_publish_build_release(
  target_version text,
  target_zip_url text,
  target_changelog text default null,
  target_published_at timestamptz default null,
  target_github_release_tag text default null
)
returns public.build_releases
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  saved_release public.build_releases;
  previous_release public.build_releases;
  switched_count integer := 0;
begin
  if nullif(trim(target_version), '') is null then
    raise exception 'invalid_input';
  end if;

  if nullif(trim(target_zip_url), '') is null then
    raise exception 'invalid_input';
  end if;

  select * into previous_release
  from public.build_releases
  where version = trim(target_version)
  limit 1;

  insert into public.build_releases (
    version,
    zip_url,
    manifest_url,
    changelog,
    is_active,
    published_at,
    github_release_tag,
    created_by
  )
  values (
    trim(target_version),
    trim(target_zip_url),
    trim(target_zip_url),
    nullif(trim(target_changelog), ''),
    true,
    target_published_at,
    nullif(trim(target_github_release_tag), ''),
    auth.uid()
  )
  on conflict (version)
  do update set
    zip_url = excluded.zip_url,
    manifest_url = excluded.manifest_url,
    changelog = excluded.changelog,
    is_active = true,
    published_at = excluded.published_at,
    github_release_tag = excluded.github_release_tag
  returning * into saved_release;

  update public.build_releases
  set is_active = false
  where id <> saved_release.id and is_active = true;

  get diagnostics switched_count = row_count;

  perform public.admin_write_audit_log(
    'build_release',
    'published_sync',
    saved_release.id::text,
    format('Release %s published from GitHub workflow.', saved_release.version),
    jsonb_build_object(
      'before', to_jsonb(previous_release),
      'after', to_jsonb(saved_release),
      'source', 'github_actions'
    )
  );

  perform public.admin_write_audit_log(
    'build_release',
    'activated',
    saved_release.id::text,
    format('Release %s set active via GitHub workflow. %s previous active releases were disabled.', saved_release.version, switched_count),
    jsonb_build_object(
      'release_id', saved_release.id,
      'version', saved_release.version,
      'zip_url', saved_release.zip_url,
      'switched_count', switched_count,
      'source', 'github_actions'
    )
  );

  return saved_release;
end;
$$;

grant execute on function public.admin_publish_build_release(text, text, text, timestamptz, text) to authenticated;

commit;
