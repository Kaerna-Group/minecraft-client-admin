import type { Session } from '@supabase/supabase-js';

import type {
  LauncherBan,
  LauncherNews,
  LauncherProfile,
  LauncherRelease,
} from '@renderer/lib/client-api';
import type { LauncherSettings } from '@renderer/lib/settings';

export type LauncherStore = {
  configured: boolean;
  shellReady: boolean;
  bootstrapping: boolean;
  authBusy: boolean;
  dataLoading: boolean;
  logsVisible: boolean;
  appVersion: string;
  platform: string;
  serverStatus: 'online' | 'degraded' | 'offline';
  session: Session | null;
  roles: string[];
  profile: LauncherProfile | null;
  activeBan: LauncherBan | null;
  news: LauncherNews[];
  activeRelease: LauncherRelease | null;
  settings: LauncherSettings;
  authError: string;
  dataError: string;
  registerMessage: string;
  initializeApp: () => Promise<void>;
  setLogsVisible: (value: boolean) => void;
  updateSettings: (value: Partial<LauncherSettings>) => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};
