import { supabase } from '../../../shared/api/supabase';

export type Profile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_login_at: string | null;
};

export type UserRole = {
  user_id: string;
  role: string;
};

export type UserBan = {
  id: string;
  user_id: string;
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
};

export type BuildRelease = {
  id: string;
  version: string;
  manifest_url: string | null;
  changelog: string | null;
  is_active: boolean;
  created_at: string | null;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
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

export async function fetchProfiles() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, nickname, avatar_url, created_at, last_login_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function fetchRoles() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('user_roles')
    .select('user_id, role')
    .order('user_id', { ascending: true });

  if (error) throw error;
  return (data ?? []) as UserRole[];
}

export async function upsertRole(input: UserRole) {
  const client = requireSupabase();
  const { error } = await client.from('user_roles').upsert(input);
  if (error) throw error;
}

export async function deleteRole(input: UserRole) {
  const client = requireSupabase();
  const { error } = await client
    .from('user_roles')
    .delete()
    .eq('user_id', input.user_id)
    .eq('role', input.role);
  if (error) throw error;
}

export async function fetchBans() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('user_bans')
    .select('id, user_id, is_banned, reason, banned_until, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserBan[];
}

export async function createBan(input: Omit<UserBan, 'id' | 'created_at'>) {
  const client = requireSupabase();
  const { error } = await client.from('user_bans').insert(input);
  if (error) throw error;
}

export async function deleteBan(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('user_bans').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchNews() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('launcher_news')
    .select('id, title, body, is_published, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as LauncherNews[];
}

export async function createNews(input: Omit<LauncherNews, 'id' | 'created_at'>) {
  const client = requireSupabase();
  const { error } = await client.from('launcher_news').insert(input);
  if (error) throw error;
}

export async function updateNewsPublish(id: string, isPublished: boolean) {
  const client = requireSupabase();
  const { error } = await client.from('launcher_news').update({ is_published: isPublished }).eq('id', id);
  if (error) throw error;
}

export async function deleteNews(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('launcher_news').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchBuildReleases() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('build_releases')
    .select('id, version, manifest_url, changelog, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as BuildRelease[];
}

export async function createBuildRelease(input: Omit<BuildRelease, 'id' | 'created_at'>) {
  const client = requireSupabase();
  const { error } = await client.from('build_releases').insert(input);
  if (error) throw error;
}

export async function updateBuildReleaseActive(id: string, isActive: boolean) {
  const client = requireSupabase();
  const { error } = await client.from('build_releases').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function deleteBuildRelease(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('build_releases').delete().eq('id', id);
  if (error) throw error;
}
