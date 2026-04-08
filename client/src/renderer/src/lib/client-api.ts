import { supabase } from './supabase';

export type LauncherProfile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_login_at: string | null;
};

export type LauncherRole = {
  user_id: string;
  role: string;
};

export type LauncherBan = {
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

export type LauncherRelease = {
  id: string;
  version: string;
  zip_url: string | null;
  manifest_url: string | null;
  changelog: string | null;
  is_active: boolean;
  created_at: string | null;
  published_at: string | null;
  github_release_tag: string | null;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
}

export async function fetchUserRoles(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('user_roles')
    .select('user_id, role')
    .eq('user_id', userId)
    .order('role', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as LauncherRole[];
}

export async function fetchCurrentBan(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('user_bans')
    .select('id, user_id, is_banned, reason, banned_until, created_at')
    .eq('user_id', userId)
    .eq('is_banned', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const now = Date.now();
  const activeBan = (data ?? []).find((entry) => !entry.banned_until || new Date(entry.banned_until).getTime() > now);

  return (activeBan ?? null) as LauncherBan | null;
}

export async function fetchProfile(userId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, nickname, avatar_url, created_at, last_login_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as LauncherProfile | null;
}

export async function fetchPublishedNews() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('launcher_news')
    .select('id, title, body, is_published, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as LauncherNews[];
}

export async function fetchActiveRelease() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('build_releases')
    .select('id, version, zip_url, manifest_url, changelog, is_active, created_at, published_at, github_release_tag')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return ((data ?? [])[0] ?? null) as LauncherRelease | null;
}
