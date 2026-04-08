export type LauncherAppInfo = {
  name: string;
  version: string;
  platform: string;
};

export type LauncherReleaseDescriptor = {
  id: string;
  version: string;
  zipUrl: string;
  changelog?: string | null;
  publishedAt?: string | null;
  githubReleaseTag?: string | null;
};

export type LauncherInstallSettings = {
  instancePath: string;
  debugMode: boolean;
  minRamMb?: number;
  maxRamMb?: number;
  javaPath?: string;
};

export type LauncherInstallPhase =
  | 'idle'
  | 'checking'
  | 'update_available'
  | 'bootstrapping_minecraft'
  | 'bootstrapping_neoforge'
  | 'applying_modpack'
  | 'ready'
  | 'failed';

export type LauncherInstallState = {
  phase: LauncherInstallPhase;
  installedVersion: string | null;
  remoteVersion: string | null;
  updateAvailable: boolean;
  progress: number;
  message: string;
  instancePath: string;
  lastInstalledAt: string | null;
  lastError: string;
  activeReleaseId: string | null;
};

export type LauncherInstallRequest = {
  release: LauncherReleaseDescriptor;
  settings: LauncherInstallSettings;
};

export type LauncherRuntimePhase =
  | 'idle'
  | 'validating'
  | 'ready_to_launch'
  | 'launching'
  | 'running'
  | 'stopping'
  | 'failed';

export type LauncherRuntimeState = {
  phase: LauncherRuntimePhase;
  javaPath: string | null;
  javaVersion: string | null;
  processId: number | null;
  message: string;
  lastError: string;
  logs: string[];
  canLaunch: boolean;
};

export type LauncherRuntimeRequest = {
  release: LauncherReleaseDescriptor | null;
  settings: LauncherInstallSettings;
  playerName: string;
  playerId: string;
  installState: LauncherInstallState;
  banReason?: string | null;
};

export type LauncherApi = {
  getAppInfo: () => Promise<LauncherAppInfo>;
  ping: () => Promise<string>;
  getInstallState: () => Promise<LauncherInstallState>;
  checkBuildStatus: (
    release: LauncherReleaseDescriptor | null,
    settings: LauncherInstallSettings,
  ) => Promise<LauncherInstallState>;
  installBuild: (
    request: LauncherInstallRequest,
  ) => Promise<LauncherInstallState>;
  retryInstall: () => Promise<LauncherInstallState>;
  getLaunchState: () => Promise<LauncherRuntimeState>;
  getRecentLaunchLogs: () => Promise<string[]>;
  validateRuntime: (
    request: LauncherRuntimeRequest,
  ) => Promise<LauncherRuntimeState>;
  launchGame: (
    request: LauncherRuntimeRequest,
  ) => Promise<LauncherRuntimeState>;
  stopGame: () => Promise<LauncherRuntimeState>;
};
