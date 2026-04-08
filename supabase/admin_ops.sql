begin;

create or replace function public.admin_list_audit_logs(
  search_query text default null,
  entity_filter text default 'all',
  action_filter text default 'all',
  actor_filter text default null,
  preset_filter text default 'all',
  time_from timestamptz default null,
  time_to timestamptz default null,
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
  normalized_actor text := nullif(trim(actor_filter), '');
  limit_size integer := greatest(1, least(coalesce(page_size, 20), 100));
  cursor_sort_value text := coalesce(after_cursor->>'sort_value', '');
  cursor_id text := coalesce(after_cursor->>'id', '');
  response jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  with base as (
    select
      al.id,
      al.actor_user_id,
      al.actor_email,
      al.entity_type,
      al.action_type,
      al.target_id,
      al.summary,
      al.payload,
      al.created_at,
      coalesce(to_char(al.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '') as sort_key
    from public.audit_logs al
    where (
      normalized_search is null
      or lower(coalesce(al.actor_email, '')) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(al.entity_type, '')) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(al.action_type, '')) like '%' || lower(normalized_search) || '%'
      or lower(coalesce(al.summary, '')) like '%' || lower(normalized_search) || '%'
      or coalesce(al.target_id, '') like '%' || normalized_search || '%'
    )
    and (
      normalized_actor is null
      or lower(coalesce(al.actor_email, '')) like '%' || lower(normalized_actor) || '%'
      or coalesce(al.actor_user_id::text, '') like '%' || normalized_actor || '%'
    )
    and (entity_filter = 'all' or al.entity_type = entity_filter)
    and (action_filter = 'all' or al.action_type = action_filter)
    and (time_from is null or al.created_at >= time_from)
    and (time_to is null or al.created_at <= time_to)
    and (
      preset_filter = 'all'
      or (preset_filter = 'roles' and al.entity_type = 'user_role')
      or (preset_filter = 'bans' and al.entity_type = 'user_ban')
      or (preset_filter = 'releases' and al.entity_type = 'build_release')
    )
  ),
  filtered as (
    select * from base
    where after_cursor is null
      or (sort_direction = 'asc' and (sort_key > cursor_sort_value or (sort_key = cursor_sort_value and id::text > cursor_id)))
      or (sort_direction = 'desc' and (sort_key < cursor_sort_value or (sort_key = cursor_sort_value and id::text < cursor_id)))
  ),
  ordered_page as (
    select * from filtered
    order by
      case when sort_direction = 'asc' then created_at end asc,
      case when sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    limit limit_size
  ),
  peek_row as (
    select 1 from filtered
    order by
      case when sort_direction = 'asc' then created_at end asc,
      case when sort_direction = 'desc' then created_at end desc,
      case when sort_direction = 'asc' then id::text end asc,
      case when sort_direction = 'desc' then id::text end desc
    offset limit_size limit 1
  ),
  last_row as (
    select * from ordered_page
    order by
      case when sort_direction = 'asc' then created_at end asc,
      case when sort_direction = 'desc' then created_at end desc,
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

grant execute on function public.admin_list_audit_logs(text, text, text, text, text, timestamptz, timestamptz, text, integer, jsonb) to authenticated;

create or replace function public.admin_get_system_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  active_release_payload jsonb;
  recent_audit_payload jsonb;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  select to_jsonb(br)
  into active_release_payload
  from public.build_releases br
  where br.is_active = true
  order by br.updated_at desc nulls last, br.created_at desc nulls last
  limit 1;

  if public.is_admin() then
    select coalesce(jsonb_agg(to_jsonb(al) order by al.created_at desc), '[]'::jsonb)
    into recent_audit_payload
    from (
      select *
      from public.audit_logs
      order by created_at desc
      limit 8
    ) al;
  else
    recent_audit_payload := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'backend_timestamp', timezone('utc', now()),
    'entity_counts', jsonb_build_object(
      'profiles', (select count(*) from public.profiles),
      'user_roles', (select count(*) from public.user_roles),
      'user_bans', (select count(*) from public.user_bans),
      'launcher_news', (select count(*) from public.launcher_news),
      'build_releases', (select count(*) from public.build_releases),
      'audit_logs', case when public.is_admin() then (select count(*) from public.audit_logs) else 0 end
    ),
    'active_release', active_release_payload,
    'recent_audit_logs', recent_audit_payload
  );
end;
$$;

grant execute on function public.admin_get_system_status() to authenticated;

create or replace function public.admin_delete_build_release(target_release_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_release public.build_releases;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select * into previous_release from public.build_releases where id = target_release_id;

  if previous_release is null then
    raise exception 'release_not_found';
  end if;

  if previous_release.is_active then
    raise exception 'active_release_guard';
  end if;

  delete from public.build_releases where id = target_release_id;

  perform public.admin_write_audit_log(
    'build_release',
    'deleted',
    target_release_id::text,
    'Build release deleted',
    jsonb_build_object('before', to_jsonb(previous_release))
  );
end;
$$;

grant execute on function public.admin_delete_build_release(uuid) to authenticated;

commit;
