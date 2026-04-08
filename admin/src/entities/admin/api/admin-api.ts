import type { CursorPage, CursorValue } from '@shared/lib/cursor';
import { supabase } from '@shared/api/supabase';

export type SortDirection = 'asc' | 'desc';
export type TableDensity = 'comfortable' | 'compact';

export type Profile = {
  id: string;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_login_at: string | null;
};

export type UserRole = {
  user_id: string;
  email?: string | null;
  role: string;
  created_at?: string | null;
};

export type UserBan = {
  id: string;
  user_id: string;
  email?: string | null;
  is_banned: boolean;
  reason: string | null;
  banned_until: string | null;
  created_at: string | null;
};

export type LauncherNews = {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  created_at: string | null;
  updated_at?: string | null;
};

export type BuildRelease = {
  id: string;
  version: string;
  manifest_url: string | null;
  changelog: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at?: string | null;
};

export type AuditLog = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  entity_type: string;
  action_type: string;
  target_id: string | null;
  summary: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type SystemStatus = {
  backend_timestamp: string;
  entity_counts: {
    profiles: number;
    user_roles: number;
    user_bans: number;
    launcher_news: number;
    build_releases: number;
    audit_logs: number;
  };
  active_release: BuildRelease | null;
  recent_audit_logs: AuditLog[];
};

export type ExportEnvelope<T> = {
  version: 1;
  entity: 'launcher_news' | 'build_releases';
  exported_at: string;
  items: T[];
};

type CursorQuery = {
  pageSize?: number;
  afterCursor?: CursorValue | null;
};

export type ProfileQuery = CursorQuery & {
  search?: string;
  sortBy?: 'created_at' | 'email' | 'nickname' | 'last_login_at';
  sortDirection?: SortDirection;
};

export type RoleQuery = CursorQuery & {
  search?: string;
  sortBy?: 'user_id' | 'email' | 'role' | 'created_at';
  sortDirection?: SortDirection;
};

export type BanQuery = CursorQuery & {
  search?: string;
  statusFilter?: 'all' | 'active' | 'inactive';
  sortBy?: 'created_at' | 'email' | 'banned_until';
  sortDirection?: SortDirection;
};

export type NewsQuery = CursorQuery & {
  search?: string;
  publicationFilter?: 'all' | 'published' | 'draft';
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortDirection?: SortDirection;
};

export type ReleaseQuery = CursorQuery & {
  search?: string;
  statusFilter?: 'all' | 'active' | 'inactive';
  sortBy?: 'created_at' | 'updated_at' | 'version';
  sortDirection?: SortDirection;
};

export type AuditLogQuery = CursorQuery & {
  search?: string;
  entityFilter?: 'all' | 'profile' | 'user_role' | 'user_ban' | 'launcher_news' | 'build_release';
  actionFilter?: 'all' | 'created' | 'updated' | 'deleted' | 'upserted' | 'activated';
  actorFilter?: string;
  presetFilter?: 'all' | 'roles' | 'bans' | 'releases';
  timeFrom?: string;
  timeTo?: string;
  sortDirection?: SortDirection;
};

const DEFAULT_PAGE_SIZE = 20;

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
}

function parseCursorPage<T>(data: unknown): CursorPage<T> {
  if (!data || typeof data !== 'object') {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const payload = data as {
    items?: T[];
    next_cursor?: CursorValue | null;
    has_more?: boolean;
  };

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    nextCursor: payload.next_cursor ?? null,
    hasMore: Boolean(payload.has_more),
  };
}

async function callCursorRpc<T>(functionName: string, params: Record<string, unknown>) {
  const client = requireSupabase();
  const { data, error } = await client.rpc(functionName, params);

  if (error) {
    throw error;
  }

  return parseCursorPage<T>(data);
}

async function callRpc<T>(functionName: string, params: Record<string, unknown> = {}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc(functionName, params);

  if (error) {
    throw error;
  }

  return data as T;
}

async function collectAllPages<T>(loader: (afterCursor: CursorValue | null) => Promise<CursorPage<T>>) {
  const items: T[] = [];
  let cursor: CursorValue | null = null;
  let hasMore = true;

  while (hasMore) {
    const page = await loader(cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
    hasMore = page.hasMore && Boolean(cursor);
  }

  return items;
}

export async function fetchCurrentUserRoles(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('user_roles')
    .select('user_id, role')
    .eq('user_id', userId)
    .order('role', { ascending: true });

  if (error) throw error;
  return (data ?? []) as UserRole[];
}

export async function fetchProfiles(query: ProfileQuery = {}) {
  return callCursorRpc<Profile>('admin_list_profiles', {
    search_query: query.search ?? null,
    sort_by: query.sortBy ?? 'created_at',
    sort_direction: query.sortDirection ?? 'desc',
    page_size: query.pageSize ?? DEFAULT_PAGE_SIZE,
    after_cursor: query.afterCursor ?? null,
  });
}

export async function updateProfile(input: Pick<Profile, 'id' | 'nickname' | 'avatar_url'>) {
  await callRpc('admin_update_profile', {
    target_profile_id: input.id,
    next_nickname: input.nickname ?? null,
    next_avatar_url: input.avatar_url ?? null,
  });
}

export async function fetchRoles(query: RoleQuery = {}) {
  return callCursorRpc<UserRole>('admin_list_user_roles', {
    search_query: query.search ?? null,
    sort_by: query.sortBy ?? 'user_id',
    sort_direction: query.sortDirection ?? 'asc',
    page_size: query.pageSize ?? DEFAULT_PAGE_SIZE,
    after_cursor: query.afterCursor ?? null,
  });
}

export async function upsertRole(input: UserRole) {
  await callRpc('admin_upsert_user_role', {
    target_user_id: input.user_id,
    target_role: input.role,
  });
}

export async function deleteRole(input: UserRole) {
  await callRpc('admin_delete_user_role', {
    target_user_id: input.user_id,
    target_role: input.role,
  });
}

export async function fetchBans(query: BanQuery = {}) {
  return callCursorRpc<UserBan>('admin_list_user_bans', {
    search_query: query.search ?? null,
    status_filter: query.statusFilter ?? 'all',
    sort_by: query.sortBy ?? 'created_at',
    sort_direction: query.sortDirection ?? 'desc',
    page_size: query.pageSize ?? DEFAULT_PAGE_SIZE,
    after_cursor: query.afterCursor ?? null,
  });
}

export async function upsertBan(input: Partial<UserBan> & Pick<UserBan, 'user_id' | 'is_banned'>) {
  await callRpc('admin_upsert_user_ban', {
    target_ban_id: input.id ?? null,
    target_user_id: input.user_id,
    target_is_banned: input.is_banned,
    target_reason: input.reason ?? null,
    target_banned_until: input.banned_until ?? null,
  });
}

export async function deleteBan(id: string) {
  await callRpc('admin_delete_user_ban', {
    target_ban_id: id,
  });
}

export async function fetchNews(query: NewsQuery = {}) {
  return callCursorRpc<LauncherNews>('admin_list_launcher_news', {
    search_query: query.search ?? null,
    publication_filter: query.publicationFilter ?? 'all',
    sort_by: query.sortBy ?? 'created_at',
    sort_direction: query.sortDirection ?? 'desc',
    page_size: query.pageSize ?? DEFAULT_PAGE_SIZE,
    after_cursor: query.afterCursor ?? null,
  });
}

export async function upsertNews(input: Partial<LauncherNews> & Pick<LauncherNews, 'title' | 'body' | 'is_published'>) {
  await callRpc('admin_upsert_launcher_news', {
    target_news_id: input.id ?? null,
    target_title: input.title,
    target_body: input.body,
    target_is_published: input.is_published,
  });
}

export async function deleteNews(id: string) {
  await callRpc('admin_delete_launcher_news', {
    target_news_id: id,
  });
}

export async function fetchBuildReleases(query: ReleaseQuery = {}) {
  return callCursorRpc<BuildRelease>('admin_list_build_releases', {
    search_query: query.search ?? null,
    status_filter: query.statusFilter ?? 'all',
    sort_by: query.sortBy ?? 'created_at',
    sort_direction: query.sortDirection ?? 'desc',
    page_size: query.pageSize ?? DEFAULT_PAGE_SIZE,
    after_cursor: query.afterCursor ?? null,
  });
}

export async function upsertBuildRelease(input: Partial<BuildRelease> & Pick<BuildRelease, 'version' | 'is_active'>) {
  await callRpc('admin_upsert_build_release', {
    target_release_id: input.id ?? null,
    target_version: input.version,
    target_manifest_url: input.manifest_url ?? null,
    target_changelog: input.changelog ?? null,
    target_is_active: input.is_active,
  });
}

export async function deleteBuildRelease(id: string) {
  await callRpc('admin_delete_build_release', {
    target_release_id: id,
  });
}

export async function fetchAuditLogs(query: AuditLogQuery = {}) {
  return callCursorRpc<AuditLog>('admin_list_audit_logs', {
    search_query: query.search ?? null,
    entity_filter: query.entityFilter ?? 'all',
    action_filter: query.actionFilter ?? 'all',
    actor_filter: query.actorFilter ?? null,
    preset_filter: query.presetFilter ?? 'all',
    time_from: query.timeFrom ?? null,
    time_to: query.timeTo ?? null,
    sort_direction: query.sortDirection ?? 'desc',
    page_size: query.pageSize ?? DEFAULT_PAGE_SIZE,
    after_cursor: query.afterCursor ?? null,
  });
}

export async function fetchSystemStatus() {
  return callRpc<SystemStatus>('admin_get_system_status');
}

export async function exportNewsPackage(query: Omit<NewsQuery, 'afterCursor' | 'pageSize'> = {}): Promise<ExportEnvelope<LauncherNews>> {
  const items = await collectAllPages((afterCursor) =>
    fetchNews({ ...query, afterCursor, pageSize: 100 }),
  );

  return {
    version: 1,
    entity: 'launcher_news',
    exported_at: new Date().toISOString(),
    items,
  };
}

export async function exportReleasePackage(query: Omit<ReleaseQuery, 'afterCursor' | 'pageSize'> = {}): Promise<ExportEnvelope<BuildRelease>> {
  const items = await collectAllPages((afterCursor) =>
    fetchBuildReleases({ ...query, afterCursor, pageSize: 100 }),
  );

  return {
    version: 1,
    entity: 'build_releases',
    exported_at: new Date().toISOString(),
    items,
  };
}

export function downloadJsonFile(fileName: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(href);
}

export async function parseJsonFile<T>(file: File) {
  const raw = await file.text();
  return JSON.parse(raw) as T;
}

export async function importNewsPackage(payload: ExportEnvelope<LauncherNews>) {
  for (const item of payload.items) {
    await upsertNews({
      id: item.id,
      title: item.title,
      body: item.body,
      is_published: item.is_published,
    });
  }
}

export async function importReleasePackage(payload: ExportEnvelope<BuildRelease>) {
  for (const item of payload.items) {
    await upsertBuildRelease({
      id: item.id,
      version: item.version,
      manifest_url: item.manifest_url,
      changelog: item.changelog,
      is_active: item.is_active,
    });
  }
}
