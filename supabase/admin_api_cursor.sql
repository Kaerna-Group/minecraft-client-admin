begin;

-- Cursor pagination migration for admin list RPC functions.
-- Apply this file in Supabase SQL Editor after the base admin_api.sql setup.

create or replace function public.admin_list_profiles(
  search_query text default null,
  sort_by text default 'created_at',
  sort_direction text default 'desc',
  page_size integer default 20,
  after_cursor jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_search text := nullif(trim(search_query), '');
  limit_size integer := greatest(1, least(coalesce(page_size, 20), 100));
  cursor_sort_value text := coalesce(after_cursor->>'sort_value', '');
  cursor_id text := coalesce(after_cursor->>'id', '');
  response jsonb;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  with base as (
    select
      p.id,
      u.email,
      p.nickname,
      p.avatar_url,
      p.created_at,
      p.last_login_at,
      case
        when sort_by = 'email' then lower(coalesce(u.email, ''))
        when sort_by = 'nickname' then lower(coalesce(p.nickname, ''))
        when sort_by = 'last_login_at' then coalesce(to_char(p.last_login_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '')
        else coalesce(to_char(p.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '')
      end as sort_key
    from public.profiles p
    join auth.users u on u.id = p.id
    where normalized_search is null
      or lower(coalesce(u.email, '')) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(p.nickname, '')) like '%' || lower(normalized_search) || '%'
      or p.id::text like '%' || normalized_search || '%'
  ),
  filtered as (
    select *
    from base
    where after_cursor is null
      or (
        sort_direction = 'asc'
        and (
          sort_key > cursor_sort_value
          or (sort_key = cursor_sort_value and id::text > cursor_id)
        )
      )
      or (
        sort_direction = 'desc'
        and (
          sort_key < cursor_sort_value
          or (sort_key = cursor_sort_value and id::text < cursor_id)
        )
      )
  ),
  ordered_page as (
    select *
    from filtered
    order by
      case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(email, '')) end asc,
      case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(email, '')) end desc,
      case when sort_by = 'nickname' and sort_direction = 'asc' then lower(coalesce(nickname, '')) end asc,
      case when sort_by = 'nickname' and sort_direction = 'desc' then lower(coalesce(nickname, '')) end desc,
      case when sort_by = 'last_login_at' and sort_direction = 'asc' then last_login_at end asc,
      case when sort_by = 'last_login_at' and sort_direction = 'desc' then last_login_at end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    limit limit_size
  ),
  peek_row as (
    select 1
    from filtered
    order by
      case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(email, '')) end asc,
      case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(email, '')) end desc,
      case when sort_by = 'nickname' and sort_direction = 'asc' then lower(coalesce(nickname, '')) end asc,
      case when sort_by = 'nickname' and sort_direction = 'desc' then lower(coalesce(nickname, '')) end desc,
      case when sort_by = 'last_login_at' and sort_direction = 'asc' then last_login_at end asc,
      case when sort_by = 'last_login_at' and sort_direction = 'desc' then last_login_at end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    offset limit_size
    limit 1
  ),
  last_row as (
    select *
    from ordered_page
    order by
      case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(email, '')) end asc,
      case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(email, '')) end desc,
      case when sort_by = 'nickname' and sort_direction = 'asc' then lower(coalesce(nickname, '')) end asc,
      case when sort_by = 'nickname' and sort_direction = 'desc' then lower(coalesce(nickname, '')) end desc,
      case when sort_by = 'last_login_at' and sort_direction = 'asc' then last_login_at end asc,
      case when sort_by = 'last_login_at' and sort_direction = 'desc' then last_login_at end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    offset greatest(limit_size - 1, 0)
    limit 1
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(ordered_page) - 'sort_key') from ordered_page), '[]'::jsonb),
    'next_cursor', case when exists(select 1 from peek_row) then (select jsonb_build_object('sort_value', sort_key, 'id', id::text) from last_row) else null end,
    'has_more', exists(select 1 from peek_row)
  ) into response;

  return response;
end;
$$;

grant execute on function public.admin_list_profiles(text, text, text, integer, jsonb) to authenticated;

create or replace function public.admin_list_user_roles(
  search_query text default null,
  sort_by text default 'created_at',
  sort_direction text default 'desc',
  page_size integer default 20,
  after_cursor jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_search text := nullif(trim(search_query), '');
  limit_size integer := greatest(1, least(coalesce(page_size, 20), 100));
  cursor_sort_value text := coalesce(after_cursor->>'sort_value', '');
  cursor_user_id text := coalesce(after_cursor->>'user_id', '');
  cursor_role text := coalesce(after_cursor->>'role', '');
  response jsonb;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  with base as (
    select ur.user_id, u.email, ur.role, ur.created_at,
      case
        when sort_by = 'email' then lower(coalesce(u.email, ''))
        when sort_by = 'role' then lower(coalesce(ur.role, ''))
        when sort_by = 'user_id' then ur.user_id::text
        else coalesce(to_char(ur.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '')
      end as sort_key
    from public.user_roles ur
    join auth.users u on u.id = ur.user_id
    where normalized_search is null
      or lower(coalesce(u.email, '')) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(ur.role, '')) like '%' || lower(normalized_search) || '%'
      or ur.user_id::text like '%' || normalized_search || '%'
  ), filtered as (
    select * from base
    where after_cursor is null
      or (sort_direction = 'asc' and (sort_key > cursor_sort_value or (sort_key = cursor_sort_value and user_id::text > cursor_user_id) or (sort_key = cursor_sort_value and user_id::text = cursor_user_id and role > cursor_role)))
      or (sort_direction = 'desc' and (sort_key < cursor_sort_value or (sort_key = cursor_sort_value and user_id::text < cursor_user_id) or (sort_key = cursor_sort_value and user_id::text = cursor_user_id and role < cursor_role)))
  ), ordered_page as (
    select * from filtered
    order by
      case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(email, '')) end asc,
      case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(email, '')) end desc,
      case when sort_by = 'role' and sort_direction = 'asc' then lower(coalesce(role, '')) end asc,
      case when sort_by = 'role' and sort_direction = 'desc' then lower(coalesce(role, '')) end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_by = 'user_id' and sort_direction = 'asc' then user_id::text end asc,
      case when sort_by = 'user_id' and sort_direction = 'desc' then user_id::text end desc,
      case when sort_direction = 'asc' then user_id::text end asc,
      case when sort_direction = 'desc' then user_id::text end desc,
      case when sort_direction = 'asc' then role end asc,
      case when sort_direction = 'desc' then role end desc
    limit limit_size
  ), peek_row as (
    select 1 from filtered
    order by
      case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(email, '')) end asc,
      case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(email, '')) end desc,
      case when sort_by = 'role' and sort_direction = 'asc' then lower(coalesce(role, '')) end asc,
      case when sort_by = 'role' and sort_direction = 'desc' then lower(coalesce(role, '')) end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_by = 'user_id' and sort_direction = 'asc' then user_id::text end asc,
      case when sort_by = 'user_id' and sort_direction = 'desc' then user_id::text end desc,
      case when sort_direction = 'asc' then user_id::text end asc,
      case when sort_direction = 'desc' then user_id::text end desc,
      case when sort_direction = 'asc' then role end asc,
      case when sort_direction = 'desc' then role end desc
    offset limit_size limit 1
  ), last_row as (
    select * from ordered_page
    order by
      case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(email, '')) end asc,
      case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(email, '')) end desc,
      case when sort_by = 'role' and sort_direction = 'asc' then lower(coalesce(role, '')) end asc,
      case when sort_by = 'role' and sort_direction = 'desc' then lower(coalesce(role, '')) end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_by = 'user_id' and sort_direction = 'asc' then user_id::text end asc,
      case when sort_by = 'user_id' and sort_direction = 'desc' then user_id::text end desc,
      case when sort_direction = 'asc' then user_id::text end asc,
      case when sort_direction = 'desc' then user_id::text end desc,
      case when sort_direction = 'asc' then role end asc,
      case when sort_direction = 'desc' then role end desc
    offset greatest(limit_size - 1, 0) limit 1
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(ordered_page) - 'sort_key') from ordered_page), '[]'::jsonb),
    'next_cursor', case when exists(select 1 from peek_row) then (select jsonb_build_object('sort_value', sort_key, 'user_id', user_id::text, 'role', role) from last_row) else null end,
    'has_more', exists(select 1 from peek_row)
  ) into response;

  return response;
end;
$$;

grant execute on function public.admin_list_user_roles(text, text, text, integer, jsonb) to authenticated;

create or replace function public.admin_list_user_bans(
  search_query text default null,
  status_filter text default 'all',
  sort_by text default 'created_at',
  sort_direction text default 'desc',
  page_size integer default 20,
  after_cursor jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_search text := nullif(trim(search_query), '');
  limit_size integer := greatest(1, least(coalesce(page_size, 20), 100));
  cursor_sort_value text := coalesce(after_cursor->>'sort_value', '');
  cursor_id text := coalesce(after_cursor->>'id', '');
  response jsonb;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  with base as (
    select ub.id, ub.user_id, u.email, ub.is_banned, ub.reason, ub.banned_until, ub.created_at,
      case
        when sort_by = 'email' then lower(coalesce(u.email, ''))
        when sort_by = 'banned_until' then coalesce(to_char(ub.banned_until at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '')
        else coalesce(to_char(ub.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '')
      end as sort_key
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
  ), filtered as (
    select * from base
    where after_cursor is null
      or (sort_direction = 'asc' and (sort_key > cursor_sort_value or (sort_key = cursor_sort_value and id::text > cursor_id)))
      or (sort_direction = 'desc' and (sort_key < cursor_sort_value or (sort_key = cursor_sort_value and id::text < cursor_id)))
  ), ordered_page as (
    select * from filtered
    order by
      case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(email, '')) end asc,
      case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(email, '')) end desc,
      case when sort_by = 'banned_until' and sort_direction = 'asc' then banned_until end asc,
      case when sort_by = 'banned_until' and sort_direction = 'desc' then banned_until end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    limit limit_size
  ), peek_row as (
    select 1 from filtered
    order by
      case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(email, '')) end asc,
      case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(email, '')) end desc,
      case when sort_by = 'banned_until' and sort_direction = 'asc' then banned_until end asc,
      case when sort_by = 'banned_until' and sort_direction = 'desc' then banned_until end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    offset limit_size limit 1
  ), last_row as (
    select * from ordered_page
    order by
      case when sort_by = 'email' and sort_direction = 'asc' then lower(coalesce(email, '')) end asc,
      case when sort_by = 'email' and sort_direction = 'desc' then lower(coalesce(email, '')) end desc,
      case when sort_by = 'banned_until' and sort_direction = 'asc' then banned_until end asc,
      case when sort_by = 'banned_until' and sort_direction = 'desc' then banned_until end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    offset greatest(limit_size - 1, 0) limit 1
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(ordered_page) - 'sort_key') from ordered_page), '[]'::jsonb),
    'next_cursor', case when exists(select 1 from peek_row) then (select jsonb_build_object('sort_value', sort_key, 'id', id::text) from last_row) else null end,
    'has_more', exists(select 1 from peek_row)
  ) into response;

  return response;
end;
$$;

grant execute on function public.admin_list_user_bans(text, text, text, text, integer, jsonb) to authenticated;

create or replace function public.admin_list_launcher_news(
  search_query text default null,
  publication_filter text default 'all',
  sort_by text default 'created_at',
  sort_direction text default 'desc',
  page_size integer default 20,
  after_cursor jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_search text := nullif(trim(search_query), '');
  limit_size integer := greatest(1, least(coalesce(page_size, 20), 100));
  cursor_sort_value text := coalesce(after_cursor->>'sort_value', '');
  cursor_id text := coalesce(after_cursor->>'id', '');
  response jsonb;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  with base as (
    select ln.id, ln.title, ln.body, ln.is_published, ln.created_at, ln.updated_at,
      case
        when sort_by = 'title' then lower(coalesce(ln.title, ''))
        when sort_by = 'updated_at' then coalesce(to_char(ln.updated_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '')
        else coalesce(to_char(ln.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '')
      end as sort_key
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
  ), filtered as (
    select * from base
    where after_cursor is null
      or (sort_direction = 'asc' and (sort_key > cursor_sort_value or (sort_key = cursor_sort_value and id::text > cursor_id)))
      or (sort_direction = 'desc' and (sort_key < cursor_sort_value or (sort_key = cursor_sort_value and id::text < cursor_id)))
  ), ordered_page as (
    select * from filtered
    order by
      case when sort_by = 'title' and sort_direction = 'asc' then lower(coalesce(title, '')) end asc,
      case when sort_by = 'title' and sort_direction = 'desc' then lower(coalesce(title, '')) end desc,
      case when sort_by = 'updated_at' and sort_direction = 'asc' then updated_at end asc,
      case when sort_by = 'updated_at' and sort_direction = 'desc' then updated_at end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    limit limit_size
  ), peek_row as (
    select 1 from filtered
    order by
      case when sort_by = 'title' and sort_direction = 'asc' then lower(coalesce(title, '')) end asc,
      case when sort_by = 'title' and sort_direction = 'desc' then lower(coalesce(title, '')) end desc,
      case when sort_by = 'updated_at' and sort_direction = 'asc' then updated_at end asc,
      case when sort_by = 'updated_at' and sort_direction = 'desc' then updated_at end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    offset limit_size limit 1
  ), last_row as (
    select * from ordered_page
    order by
      case when sort_by = 'title' and sort_direction = 'asc' then lower(coalesce(title, '')) end asc,
      case when sort_by = 'title' and sort_direction = 'desc' then lower(coalesce(title, '')) end desc,
      case when sort_by = 'updated_at' and sort_direction = 'asc' then updated_at end asc,
      case when sort_by = 'updated_at' and sort_direction = 'desc' then updated_at end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    offset greatest(limit_size - 1, 0) limit 1
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(ordered_page) - 'sort_key') from ordered_page), '[]'::jsonb),
    'next_cursor', case when exists(select 1 from peek_row) then (select jsonb_build_object('sort_value', sort_key, 'id', id::text) from last_row) else null end,
    'has_more', exists(select 1 from peek_row)
  ) into response;

  return response;
end;
$$;

grant execute on function public.admin_list_launcher_news(text, text, text, text, integer, jsonb) to authenticated;

create or replace function public.admin_list_build_releases(
  search_query text default null,
  status_filter text default 'all',
  sort_by text default 'created_at',
  sort_direction text default 'desc',
  page_size integer default 20,
  after_cursor jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_search text := nullif(trim(search_query), '');
  limit_size integer := greatest(1, least(coalesce(page_size, 20), 100));
  cursor_sort_value text := coalesce(after_cursor->>'sort_value', '');
  cursor_id text := coalesce(after_cursor->>'id', '');
  response jsonb;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  with base as (
    select br.id, br.version, br.manifest_url, br.changelog, br.is_active, br.created_at, br.updated_at,
      case
        when sort_by = 'version' then lower(coalesce(br.version, ''))
        when sort_by = 'updated_at' then coalesce(to_char(br.updated_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '')
        else coalesce(to_char(br.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '')
      end as sort_key
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
  ), filtered as (
    select * from base
    where after_cursor is null
      or (sort_direction = 'asc' and (sort_key > cursor_sort_value or (sort_key = cursor_sort_value and id::text > cursor_id)))
      or (sort_direction = 'desc' and (sort_key < cursor_sort_value or (sort_key = cursor_sort_value and id::text < cursor_id)))
  ), ordered_page as (
    select * from filtered
    order by
      case when sort_by = 'version' and sort_direction = 'asc' then lower(coalesce(version, '')) end asc,
      case when sort_by = 'version' and sort_direction = 'desc' then lower(coalesce(version, '')) end desc,
      case when sort_by = 'updated_at' and sort_direction = 'asc' then updated_at end asc,
      case when sort_by = 'updated_at' and sort_direction = 'desc' then updated_at end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    limit limit_size
  ), peek_row as (
    select 1 from filtered
    order by
      case when sort_by = 'version' and sort_direction = 'asc' then lower(coalesce(version, '')) end asc,
      case when sort_by = 'version' and sort_direction = 'desc' then lower(coalesce(version, '')) end desc,
      case when sort_by = 'updated_at' and sort_direction = 'asc' then updated_at end asc,
      case when sort_by = 'updated_at' and sort_direction = 'desc' then updated_at end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    offset limit_size limit 1
  ), last_row as (
    select * from ordered_page
    order by
      case when sort_by = 'version' and sort_direction = 'asc' then lower(coalesce(version, '')) end asc,
      case when sort_by = 'version' and sort_direction = 'desc' then lower(coalesce(version, '')) end desc,
      case when sort_by = 'updated_at' and sort_direction = 'asc' then updated_at end asc,
      case when sort_by = 'updated_at' and sort_direction = 'desc' then updated_at end desc,
      case when sort_by = 'created_at' and sort_direction = 'asc' then created_at end asc,
      case when sort_by = 'created_at' and sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    offset greatest(limit_size - 1, 0) limit 1
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(ordered_page) - 'sort_key') from ordered_page), '[]'::jsonb),
    'next_cursor', case when exists(select 1 from peek_row) then (select jsonb_build_object('sort_value', sort_key, 'id', id::text) from last_row) else null end,
    'has_more', exists(select 1 from peek_row)
  ) into response;

  return response;
end;
$$;

grant execute on function public.admin_list_build_releases(text, text, text, text, integer, jsonb) to authenticated;

commit;
