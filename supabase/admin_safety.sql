begin;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  entity_type text not null,
  action_type text not null,
  target_id text,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_entity_action on public.audit_logs(entity_type, action_type, created_at desc);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

create or replace function public.admin_write_audit_log(
  target_entity_type text,
  target_action_type text,
  target_id text,
  target_summary text,
  target_payload jsonb default '{}'::jsonb
)
returns public.audit_logs
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inserted_log public.audit_logs;
  actor_email_value text;
begin
  select email into actor_email_value
  from auth.users
  where id = auth.uid();

  insert into public.audit_logs (
    actor_user_id,
    actor_email,
    entity_type,
    action_type,
    target_id,
    summary,
    payload
  ) values (
    auth.uid(),
    actor_email_value,
    target_entity_type,
    target_action_type,
    target_id,
    target_summary,
    coalesce(target_payload, '{}'::jsonb)
  )
  returning * into inserted_log;

  return inserted_log;
end;
$$;

grant execute on function public.admin_write_audit_log(text, text, text, text, jsonb) to authenticated;

create or replace function public.admin_assert_last_admin_guard(target_user_id uuid, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count integer;
begin
  if target_role <> 'admin' then
    return;
  end if;

  select count(*) into admin_count
  from public.user_roles
  where role = 'admin';

  if admin_count <= 1 then
    raise exception 'last_admin_guard';
  end if;
end;
$$;

grant execute on function public.admin_assert_last_admin_guard(uuid, text) to authenticated;

create or replace function public.admin_list_audit_logs(
  search_query text default null,
  entity_filter text default 'all',
  action_filter text default 'all',
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
    and (entity_filter = 'all' or al.entity_type = entity_filter)
    and (action_filter = 'all' or al.action_type = action_filter)
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

grant execute on function public.admin_list_audit_logs(text, text, text, text, integer, jsonb) to authenticated;

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
  previous_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select * into previous_profile from public.profiles where id = target_profile_id;

  if previous_profile is null then
    raise exception 'profile_not_found';
  end if;

  update public.profiles
  set
    nickname = nullif(trim(next_nickname), ''),
    avatar_url = nullif(trim(next_avatar_url), '')
  where id = target_profile_id
  returning * into updated_profile;

  perform public.admin_write_audit_log(
    'profile',
    'updated',
    updated_profile.id::text,
    'Profile metadata updated',
    jsonb_build_object('before', to_jsonb(previous_profile), 'after', to_jsonb(updated_profile))
  );

  return updated_profile;
end;
$$;

grant execute on function public.admin_update_profile(uuid, text, text) to authenticated;

create or replace function public.admin_upsert_user_role(
  target_user_id uuid,
  target_role text
)
returns public.user_roles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  saved_role public.user_roles;
  target_email text;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if target_role not in ('admin', 'moderator', 'player') then
    raise exception 'invalid_input';
  end if;

  select email into target_email from auth.users where id = target_user_id;

  insert into public.user_roles (user_id, role)
  values (target_user_id, target_role)
  on conflict (user_id, role) do update set role = excluded.role
  returning * into saved_role;

  perform public.admin_write_audit_log(
    'user_role',
    'upserted',
    target_user_id::text,
    format('Role %s granted or confirmed for %s', target_role, coalesce(target_email, target_user_id::text)),
    jsonb_build_object('user_id', target_user_id, 'email', target_email, 'role', target_role)
  );

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
set search_path = public, auth
as $$
declare
  target_email text;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if target_role = 'admin' then
    perform public.admin_assert_last_admin_guard(target_user_id, target_role);
  end if;

  select email into target_email from auth.users where id = target_user_id;

  delete from public.user_roles
  where user_id = target_user_id
    and role = target_role;

  perform public.admin_write_audit_log(
    'user_role',
    'deleted',
    target_user_id::text,
    format('Role %s removed from %s', target_role, coalesce(target_email, target_user_id::text)),
    jsonb_build_object('user_id', target_user_id, 'email', target_email, 'role', target_role)
  );
end;
$$;

grant execute on function public.admin_delete_user_role(uuid, text) to authenticated;

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
  previous_ban public.user_bans;
  action_label text;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  if target_user_id is null then
    raise exception 'invalid_input';
  end if;

  if target_ban_id is not null then
    select * into previous_ban from public.user_bans where id = target_ban_id;
  end if;

  if target_ban_id is null then
    action_label := 'created';
    insert into public.user_bans (user_id, is_banned, reason, banned_until, created_by)
    values (target_user_id, target_is_banned, nullif(trim(target_reason), ''), target_banned_until, auth.uid())
    returning * into saved_ban;
  else
    action_label := 'updated';
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

  perform public.admin_write_audit_log(
    'user_ban',
    action_label,
    saved_ban.id::text,
    format('Ban record %s for %s', action_label, saved_ban.user_id::text),
    jsonb_build_object('before', to_jsonb(previous_ban), 'after', to_jsonb(saved_ban))
  );

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
declare
  previous_ban public.user_bans;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  select * into previous_ban from public.user_bans where id = target_ban_id;

  delete from public.user_bans where id = target_ban_id;

  perform public.admin_write_audit_log(
    'user_ban',
    'deleted',
    target_ban_id::text,
    'Ban record deleted',
    jsonb_build_object('before', to_jsonb(previous_ban))
  );
end;
$$;

grant execute on function public.admin_delete_user_ban(uuid) to authenticated;

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
  previous_news public.launcher_news;
  action_label text;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  if nullif(trim(target_title), '') is null or nullif(trim(target_body), '') is null then
    raise exception 'invalid_input';
  end if;

  if target_news_id is not null then
    select * into previous_news from public.launcher_news where id = target_news_id;
  end if;

  if target_news_id is null then
    action_label := 'created';
    insert into public.launcher_news (title, body, is_published, created_by)
    values (trim(target_title), trim(target_body), target_is_published, auth.uid())
    returning * into saved_news;
  else
    action_label := 'updated';
    update public.launcher_news
    set
      title = trim(target_title),
      body = trim(target_body),
      is_published = target_is_published
    where id = target_news_id
    returning * into saved_news;
  end if;

  if saved_news is null then
    raise exception 'news_not_found';
  end if;

  perform public.admin_write_audit_log(
    'launcher_news',
    action_label,
    saved_news.id::text,
    format('News item %s: %s', action_label, saved_news.title),
    jsonb_build_object('before', to_jsonb(previous_news), 'after', to_jsonb(saved_news))
  );

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
declare
  previous_news public.launcher_news;
begin
  if not public.is_admin_or_moderator() then
    raise exception 'forbidden';
  end if;

  select * into previous_news from public.launcher_news where id = target_news_id;

  delete from public.launcher_news where id = target_news_id;

  perform public.admin_write_audit_log(
    'launcher_news',
    'deleted',
    target_news_id::text,
    'News item deleted',
    jsonb_build_object('before', to_jsonb(previous_news))
  );
end;
$$;

grant execute on function public.admin_delete_launcher_news(uuid) to authenticated;

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
  previous_release public.build_releases;
  action_label text;
  switched_count integer := 0;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if nullif(trim(target_version), '') is null then
    raise exception 'invalid_input';
  end if;

  if target_release_id is not null then
    select * into previous_release from public.build_releases where id = target_release_id;
  end if;

  if target_release_id is null then
    action_label := 'created';
    insert into public.build_releases (version, manifest_url, changelog, is_active, created_by)
    values (trim(target_version), nullif(trim(target_manifest_url), ''), nullif(trim(target_changelog), ''), target_is_active, auth.uid())
    returning * into saved_release;
  else
    action_label := 'updated';
    update public.build_releases
    set
      version = trim(target_version),
      manifest_url = nullif(trim(target_manifest_url), ''),
      changelog = nullif(trim(target_changelog), ''),
      is_active = target_is_active
    where id = target_release_id
    returning * into saved_release;
  end if;

  if saved_release is null then
    raise exception 'release_not_found';
  end if;

  if saved_release.is_active then
    update public.build_releases
    set is_active = false
    where id <> saved_release.id and is_active = true;

    get diagnostics switched_count = row_count;
  end if;

  perform public.admin_write_audit_log(
    'build_release',
    action_label,
    saved_release.id::text,
    format('Release %s: %s', action_label, saved_release.version),
    jsonb_build_object('before', to_jsonb(previous_release), 'after', to_jsonb(saved_release))
  );

  if saved_release.is_active then
    perform public.admin_write_audit_log(
      'build_release',
      'activated',
      saved_release.id::text,
      format('Release %s set active. %s previous active releases were disabled.', saved_release.version, switched_count),
      jsonb_build_object('release_id', saved_release.id, 'version', saved_release.version, 'switched_count', switched_count)
    );
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
declare
  previous_release public.build_releases;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select * into previous_release from public.build_releases where id = target_release_id;

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
