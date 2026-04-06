import { isSupabaseConfigured } from '@renderer/lib/env';
import type {
  LauncherBan,
  LauncherNews,
  LauncherProfile,
  LauncherRelease,
} from '@renderer/lib/client-api';
import { defaultSettings } from '@renderer/lib/settings';

export const baseState = {
  configured: isSupabaseConfigured,
  shellReady: false,
  bootstrapping: false,
  authBusy: false,
  dataLoading: false,
  logsVisible: true,
  appVersion: '0.1.0-shell',
  platform: 'unknown',
  serverStatus: 'offline' as const,
  session: null,
  roles: [] as string[],
  profile: null as LauncherProfile | null,
  activeBan: null as LauncherBan | null,
  news: [] as LauncherNews[],
  activeRelease: null as LauncherRelease | null,
  settings: defaultSettings,
  authError: '',
  dataError: '',
  registerMessage: '',
};
