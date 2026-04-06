begin;

create or replace function public.admin_list_profiles(
  search_query text default null,
  sort_by text default 'created_at',
  sort_direction text default 'desc'
)
returns table (
  id uuid,
  email text,
  nickname text,
  avatar_url text,
  created_at timestamptz,
  last_login_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_search text := nullif(trim(search_query), '');
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.id,
    u.email,
    p.nickname,
    p.avatar_url,
    p.created_at,
    p.last_login_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where normalized_search is null
    or lower(coalesce(u.email, '')) like '%' || lower(normalized_search) || '%'
    or lower(coalesce(p.nickname, '')) like '%' || lower(normalized_search) || '%'
    or p.id::text like '%' || normalized_search || '%'
  order by
    case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(u.email, '')) end asc,
    case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(u.email, '')) end desc,
    case when sort_by = 'nickname' and sort_direction = 'asc' then lower(coalesce(p.nickname, '')) end asc,
    case when sort_by = 'nickname' and sort_direction = 'desc' then lower(coalesce(p.nickname, '')) end desc,
    case when sort_by = 'last_login_at' and sort_direction = 'asc' then p.last_login_at end asc,
    case when sort_by = 'last_login_at' and sort_direction = 'desc' then p.last_login_at end desc,
    case when sort_by = 'created_at' and sort_direction = 'asc' then p.created_at end asc,
    case when sort_by = 'created_at' and sort_direction = 'desc' then p.created_at end desc,
    p.created_at desc,
    p.id asc;
end;
$$;

grant execute on function public.admin_list_profiles(text, text, text) to authenticated;

create or replace function public.admin_update_profile(
  target_profile_id uuid,
  next_nickname text default null,
  next_avatar_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  update public.profiles
  set
    nickname = nullif(trim(next_nickname), ''),
    avatar_url = nullif(trim(next_avatar_url), '')
  where id = target_profile_id
  returning * into updated_profile;

  if updated_profile is null then
    raise exception 'profile_not_found';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.admin_update_profile(uuid, text, text) to authenticated;

create or replace function public.admin_list_user_roles(
  search_query text default null,
  sort_by text default 'user_id',
  sort_direction text default 'asc'
)
returns table (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_search text := nullif(trim(search_query), '');
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    ur.user_id,
    u.email,
    ur.role,
    ur.created_at
  from public.user_roles ur
  join auth.users u on u.id = ur.user_id
  where normalized_search is null
    or lower(coalesce(u.email, '')) like '%' || lower(normalized_search) || '%'
    or lower(coalesce(ur.role, '')) like '%' || lower(normalized_search) || '%'
    or ur.user_id::text like '%' || normalized_search || '%'
  order by
    case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(u.email, '')) end asc,
    case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(u.email, '')) end desc,
    case when sort_by = 'role' and sort_direction = 'asc' then lower(coalesce(ur.role, '')) end asc,
    case when sort_by = 'role' and sort_direction = 'desc' then lower(coalesce(ur.role, '')) end desc,
    case when sort_by = 'created_at' and sort_direction = 'asc' then ur.created_at end asc,
    case when sort_by = 'created_at' and sort_direction = 'desc' then ur.created_at end desc,
    case when sort_by = 'user_id' and sort_direction = 'asc' then ur.user_id::text end asc,
    case when sort_by = 'user_id' and sort_direction = 'desc' then ur.user_id::text end desc,
    ur.user_id asc,
    ur.role asc;
end;
$$;

grant execute on function public.admin_list_user_roles(text, text, text) to authenticated;

create or replace function public.admin_upsert_user_role(
  target_user_id uuid,
  target_role text
)
returns public.user_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_role public.user_roles;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id, role) do update
  set role = excluded.role
  returning * into saved_role;

  return saved_role;
end;
$$;

grant execute on function public.admin_upsert_user_role(uuid, text) to authenticated;

create or replace function public.admin_delete_user_role(
  target_user_id uuid,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  delete from public.user_roles
  where user_id = target_user_id
    and role = target_role;
end;
$$;

grant execute on function public.admin_delete_user_role(uuid, text) to authenticated;

create or replace function public.admin_list_user_bans(
  search_query text default null,
  status_filter text default 'all',
  sort_by text default 'created_at',
  sort_direction text default 'desc'
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  is_banned boolean,
  reason text,
  banned_until timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_search text := nullif(trim(search_query), '');
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    ub.id,
    ub.user_id,
    u.email,
    ub.is_banned,
    ub.reason,
    ub.banned_until,
    ub.created_at
  from public.user_bans ub
  join auth.users u on u.id = ub.user_id
  where (
    normalized_search is null
    or lower(coalesce(u.email, '')) like '%' || lower(normalized_search) || '%'
    or lower(coalesce(ub.reason, '')) like '%' || lower(normalized_search) || '%'
    or ub.user_id::text like '%' || normalized_search || '%'
  )
  and (
    status_filter = 'all'
    or (status_filter = 'active' and ub.is_banned = true)
    or (status_filter = 'inactive' and ub.is_banned = false)
  )
  order by
    case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(u.email, '')) end asc,
    case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(u.email, '')) end desc,
    case when sort_by = 'banned_until' and sort_direction = 'asc' then ub.banned_until end asc,
    case when sort_by = 'banned_until' and sort_direction = 'desc' then ub.banned_until end desc,
    case when sort_by = 'created_at' and sort_direction = 'asc' then ub.created_at end asc,
    case when sort_by = 'created_at' and sort_direction = 'desc' then ub.created_at end desc,
    ub.created_at desc,
    ub.id desc;
end;
$$;

grant execute on function public.admin_list_user_bans(text, text, text, text) to authenticated;

create or replace function public.admin_upsert_user_ban(
  target_ban_id uuid default null,
  target_user_id uuid default null,
  target_is_banned boolean default true,
  target_reason text default null,
  target_banned_until timestamptz default null
)
returns public.user_bans
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  saved_ban public.user_bans;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  if target_ban_id is null then
    insert into public.user_bans (user_id, is_banned, reason, banned_until, created_by)
    values (target_user_id, target_is_banned, nullif(trim(target_reason), ''), target_banned_until, auth.uid())
    returning * into saved_ban;
  else
    update public.user_bans
    set
      user_id = coalesce(target_user_id, user_id),
      is_banned = target_is_banned,
      reason = nullif(trim(target_reason), ''),
      banned_until = target_banned_until
    where id = target_ban_id
    returning * into saved_ban;
  end if;

  if saved_ban is null then
    raise exception 'ban_not_found';
  end if;

  return saved_ban;
end;
$$;

grant execute on function public.admin_upsert_user_ban(uuid, uuid, boolean, text, timestamptz) to authenticated;

create or replace function public.admin_delete_user_ban(target_ban_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  delete from public.user_bans where id = target_ban_id;
end;
$$;

grant execute on function public.admin_delete_user_ban(uuid) to authenticated;

create or replace function public.admin_list_launcher_news(
  search_query text default null,
  publication_filter text default 'all',
  sort_by text default 'created_at',
  sort_direction text default 'desc'
)
returns table (
  id uuid,
  title text,
  body text,
  is_published boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_search text := nullif(trim(search_query), '');
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    ln.id,
    ln.title,
    ln.body,
    ln.is_published,
    ln.created_at,
    ln.updated_at
  from public.launcher_news ln
  where (
    normalized_search is null
    or lower(coalesce(ln.title, '')) like '%' || lower(normalized_search) || '%'
    or lower(coalesce(ln.body, '')) like '%' || lower(normalized_search) || '%'
  )
  and (
    publication_filter = 'all'
    or (publication_filter = 'published' and ln.is_published = true)
    or (publication_filter = 'draft' and ln.is_published = false)
  )
  order by
    case when sort_by = 'title' and sort_direction = 'asc' then lower(coalesce(ln.title, '')) end asc,
    case when sort_by = 'title' and sort_direction = 'desc' then lower(coalesce(ln.title, '')) end desc,
    case when sort_by = 'updated_at' and sort_direction = 'asc' then ln.updated_at end asc,
    case when sort_by = 'updated_at' and sort_direction = 'desc' then ln.updated_at end desc,
    case when sort_by = 'created_at' and sort_direction = 'asc' then ln.created_at end asc,
    case when sort_by = 'created_at' and sort_direction = 'desc' then ln.created_at end desc,
    ln.created_at desc,
    ln.id desc;
end;
$$;

grant execute on function public.admin_list_launcher_news(text, text, text, text) to authenticated;

create or replace function public.admin_upsert_launcher_news(
  target_news_id uuid default null,
  target_title text default null,
  target_body text default null,
  target_is_published boolean default false
)
returns public.launcher_news
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  saved_news public.launcher_news;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  if target_news_id is null then
    insert into public.launcher_news (title, body, is_published, created_by)
    values (coalesce(nullif(trim(target_title), ''), 'Untitled news'), coalesce(nullif(trim(target_body), ''), ''), target_is_published, auth.uid())
    returning * into saved_news;
  else
    update public.launcher_news
    set
      title = coalesce(nullif(trim(target_title), ''), title),
      body = coalesce(target_body, body),
      is_published = target_is_published
    where id = target_news_id
    returning * into saved_news;
  end if;

  if saved_news is null then
    raise exception 'news_not_found';
  end if;

  return saved_news;
end;
$$;

grant execute on function public.admin_upsert_launcher_news(uuid, text, text, boolean) to authenticated;

create or replace function public.admin_delete_launcher_news(target_news_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  delete from public.launcher_news where id = target_news_id;
end;
$$;

grant execute on function public.admin_delete_launcher_news(uuid) to authenticated;

create or replace function public.admin_list_build_releases(
  search_query text default null,
  status_filter text default 'all',
  sort_by text default 'created_at',
  sort_direction text default 'desc'
)
returns table (
  id uuid,
  version text,
  manifest_url text,
  changelog text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_search text := nullif(trim(search_query), '');
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  return query
  select
    br.id,
    br.version,
    br.manifest_url,
    br.changelog,
    br.is_active,
    br.created_at,
    br.updated_at
  from public.build_releases br
  where (
    normalized_search is null
    or lower(coalesce(br.version, '')) like '%' || lower(normalized_search) || '%'
    or lower(coalesce(br.manifest_url, '')) like '%' || lower(normalized_search) || '%'
    or lower(coalesce(br.changelog, '')) like '%' || lower(normalized_search) || '%'
  )
  and (
    status_filter = 'all'
    or (status_filter = 'active' and br.is_active = true)
    or (status_filter = 'inactive' and br.is_active = false)
  )
  order by
    case when sort_by = 'version' and sort_direction = 'asc' then lower(coalesce(br.version, '')) end asc,
    case when sort_by = 'version' and sort_direction = 'desc' then lower(coalesce(br.version, '')) end desc,
    case when sort_by = 'updated_at' and sort_direction = 'asc' then br.updated_at end asc,
    case when sort_by = 'updated_at' and sort_direction = 'desc' then br.updated_at end desc,
    case when sort_by = 'created_at' and sort_direction = 'asc' then br.created_at end asc,
    case when sort_by = 'created_at' and sort_direction = 'desc' then br.created_at end desc,
    br.created_at desc,
    br.id desc;
end;
$$;

grant execute on function public.admin_list_build_releases(text, text, text, text) to authenticated;

create or replace function public.admin_upsert_build_release(
  target_release_id uuid default null,
  target_version text default null,
  target_manifest_url text default null,
  target_changelog text default null,
  target_is_active boolean default false
)
returns public.build_releases
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  saved_release public.build_releases;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if target_release_id is null then
    insert into public.build_releases (version, manifest_url, changelog, is_active, created_by)
    values (coalesce(nullif(trim(target_version), ''), 'unversioned'), nullif(trim(target_manifest_url), ''), nullif(trim(target_changelog), ''), target_is_active, auth.uid())
    returning * into saved_release;
  else
    update public.build_releases
    set
      version = coalesce(nullif(trim(target_version), ''), version),
      manifest_url = nullif(trim(target_manifest_url), ''),
      changelog = nullif(trim(target_changelog), ''),
      is_active = target_is_active
    where id = target_release_id
    returning * into saved_release;
  end if;

  if saved_release is null then
    raise exception 'release_not_found';
  end if;

  return saved_release;
end;
$$;

grant execute on function public.admin_upsert_build_release(uuid, text, text, text, boolean) to authenticated;

create or replace function public.admin_delete_build_release(target_release_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  delete from public.build_releases where id = target_release_id;
end;
$$;

grant execute on function public.admin_delete_build_release(uuid) to authenticated;

commit;
