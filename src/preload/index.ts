import { contextBridge, ipcRenderer } from 'electron';

import type { LauncherApi } from '../shared/launcher-api';

const api: LauncherApi = {
  getAppInfo: async () => ipcRenderer.invoke('launcher:get-app-info'),
  ping: async () => 'pong',
};

contextBridge.exposeInMainWorld('launcherApi', api);
