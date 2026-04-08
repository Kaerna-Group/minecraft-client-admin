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
};

export type LauncherInstallPhase =
  | 'idle'
  | 'checking'
  | 'update_available'
  | 'downloading'
  | 'extracting'
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

export type LauncherApi = {
  getAppInfo: () => Promise<LauncherAppInfo>;
  ping: () => Promise<string>;
  getInstallState: () => Promise<LauncherInstallState>;
  checkBuildStatus: (release: LauncherReleaseDescriptor | null, settings: LauncherInstallSettings) => Promise<LauncherInstallState>;
  installBuild: (request: LauncherInstallRequest) => Promise<LauncherInstallState>;
  retryInstall: () => Promise<LauncherInstallState>;
};
