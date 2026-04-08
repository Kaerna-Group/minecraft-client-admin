import type {
  LauncherApi,
  LauncherInstallRequest,
  LauncherInstallSettings,
  LauncherReleaseDescriptor,
} from '../../../shared/launcher-api';

declare global {
  interface Window {
    launcherApi: LauncherApi;
  }
}

export const launcherApi = {
  getAppInfo: () => window.launcherApi?.getAppInfo(),
  ping: () => window.launcherApi?.ping(),
  getInstallState: () => window.launcherApi?.getInstallState(),
  checkBuildStatus: (release: LauncherReleaseDescriptor | null, settings: LauncherInstallSettings) =>
    window.launcherApi?.checkBuildStatus(release, settings),
  installBuild: (request: LauncherInstallRequest) => window.launcherApi?.installBuild(request),
  retryInstall: () => window.launcherApi?.retryInstall(),
};
