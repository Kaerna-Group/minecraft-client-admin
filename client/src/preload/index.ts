import { contextBridge, ipcRenderer } from 'electron';

import type { LauncherApi } from '../shared/launcher-api';

const api: LauncherApi = {
  getAppInfo: async () => ipcRenderer.invoke('launcher:get-app-info'),
  ping: async () => 'pong',
  getInstallState: async () => ipcRenderer.invoke('launcher:get-install-state'),
  checkBuildStatus: async (release, settings) =>
    ipcRenderer.invoke('launcher:check-build-status', release, settings),
  installBuild: async (request) =>
    ipcRenderer.invoke('launcher:install-build', request),
  retryInstall: async () => ipcRenderer.invoke('launcher:retry-install'),
  getLaunchState: async () => ipcRenderer.invoke('launcher:get-launch-state'),
  getRecentLaunchLogs: async () =>
    ipcRenderer.invoke('launcher:get-recent-launch-logs'),
  validateRuntime: async (request) =>
    ipcRenderer.invoke('launcher:validate-runtime', request),
  launchGame: async (request) =>
    ipcRenderer.invoke('launcher:launch-game', request),
  stopGame: async () => ipcRenderer.invoke('launcher:stop-game'),
};

contextBridge.exposeInMainWorld('launcherApi', api);
