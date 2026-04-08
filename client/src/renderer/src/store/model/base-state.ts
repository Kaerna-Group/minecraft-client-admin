import { isSupabaseConfigured } from '@renderer/lib/env';
import type {
  LauncherBan,
  LauncherNews,
  LauncherProfile,
  LauncherRelease,
} from '@renderer/lib/client-api';
import { defaultSettings } from '@renderer/lib/settings';
import type {
  LauncherInstallState,
  LauncherRuntimeState,
} from '../../../../shared/launcher-api';

const initialInstallState: LauncherInstallState = {
  phase: 'idle',
  installedVersion: null,
  remoteVersion: null,
  updateAvailable: false,
  progress: 0,
  message: 'Launcher has not checked the local build yet.',
  instancePath: defaultSettings.instancePath,
  lastInstalledAt: null,
  lastError: '',
  activeReleaseId: null,
};

const initialRuntimeState: LauncherRuntimeState = {
  phase: 'idle',
  javaPath: null,
  javaVersion: null,
  processId: null,
  message: 'Runtime validation has not started yet.',
  lastError: '',
  logs: [],
  canLaunch: false,
};

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
  installState: initialInstallState,
  runtimeState: initialRuntimeState,
  settings: defaultSettings,
  authError: '',
  dataError: '',
  registerMessage: '',
};
