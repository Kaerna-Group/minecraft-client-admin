import type { Session } from '@supabase/supabase-js';

import type {
  LauncherBan,
  LauncherNews,
  LauncherProfile,
  LauncherRelease,
} from '@renderer/lib/client-api';
import type { LauncherSettings } from '@renderer/lib/settings';
import type {
  LauncherInstallState,
  LauncherRuntimeState,
} from '../../../../shared/launcher-api';

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
  installState: LauncherInstallState;
  runtimeState: LauncherRuntimeState;
  settings: LauncherSettings;
  authError: string;
  dataError: string;
  registerMessage: string;
  initializeApp: () => Promise<void>;
  setLogsVisible: (value: boolean) => void;
  updateSettings: (value: Partial<LauncherSettings>) => void;
  refreshInstallState: () => Promise<void>;
  validateRuntime: () => Promise<void>;
  launchGame: () => Promise<void>;
  stopGame: () => Promise<void>;
  installActiveRelease: () => Promise<void>;
  retryInstall: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};
