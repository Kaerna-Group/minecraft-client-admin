import type { LauncherApi } from '../../../shared/launcher-api';

declare global {
  interface Window {
    launcherApi: LauncherApi;
  }
}

export const launcherApi = {
  getAppInfo: () => window.launcherApi?.getAppInfo(),
  ping: () => window.launcherApi?.ping(),
};
