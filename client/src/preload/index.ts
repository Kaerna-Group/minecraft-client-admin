import { contextBridge, ipcRenderer } from 'electron';

import type { LauncherApi } from '../shared/launcher-api';

const api: LauncherApi = {
  getAppInfo: async () => ipcRenderer.invoke('launcher:get-app-info'),
  ping: async () => 'pong',
  getInstallState: async () => ipcRenderer.invoke('launcher:get-install-state'),
  checkBuildStatus: async (release, settings) => ipcRenderer.invoke('launcher:check-build-status', release, settings),
  installBuild: async (request) => ipcRenderer.invoke('launcher:install-build', request),
  retryInstall: async () => ipcRenderer.invoke('launcher:retry-install'),
};

contextBridge.exposeInMainWorld('launcherApi', api);
