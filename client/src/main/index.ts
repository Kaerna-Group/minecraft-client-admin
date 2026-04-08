import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'node:path';

import { checkBuildStatus, getInstallState, installBuild, retryInstall } from './services/build-installer';

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#10141f',
    title: 'Kaerna Launcher',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
};

app.whenReady().then(() => {
  ipcMain.handle('launcher:get-app-info', () => ({
    name: 'Kaerna Launcher',
    version: app.getVersion(),
    platform: process.platform,
  }));

  ipcMain.handle('launcher:get-install-state', async () => getInstallState());
  ipcMain.handle('launcher:check-build-status', async (_event, release, settings) => checkBuildStatus(release, settings));
  ipcMain.handle('launcher:install-build', async (_event, request) => installBuild(request));
  ipcMain.handle('launcher:retry-install', async () => retryInstall());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
