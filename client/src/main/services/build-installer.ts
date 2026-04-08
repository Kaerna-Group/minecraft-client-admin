import { app } from 'electron';
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import type {
  LauncherInstallRequest,
  LauncherInstallSettings,
  LauncherInstallState,
  LauncherReleaseDescriptor,
} from '../../shared/launcher-api';
import {
  applyModpack,
  bootstrapMinecraftStack,
  TARGET_MINECRAFT_VERSION,
  TARGET_NEOFORGE_VERSION,
} from './minecraft-bootstrap';

const STATE_FILE_NAME = 'install-state.json';
const TEMP_DIR_NAME = '.kaerna-launcher-temp';

type PersistedInstallState = {
  installedVersion: string | null;
  lastInstalledAt: string | null;
  instancePath: string;
  activeReleaseId: string | null;
};

const initialState: LauncherInstallState = {
  phase: 'idle',
  installedVersion: null,
  remoteVersion: null,
  updateAvailable: false,
  progress: 0,
  message: 'No build install detected yet.',
  instancePath: '',
  lastInstalledAt: null,
  lastError: '',
  activeReleaseId: null,
};

let runtimeState: LauncherInstallState = { ...initialState };
let lastRequest: LauncherInstallRequest | null = null;
let runningInstall: Promise<LauncherInstallState> | null = null;

function getUserDataPath() {
  return app.getPath('userData');
}

function getStateFilePath() {
  return join(getUserDataPath(), STATE_FILE_NAME);
}

function getTempRoot(instancePath: string) {
  return join(dirname(instancePath), TEMP_DIR_NAME);
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureParentDir(filePath: string) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function readPersistedState(): Promise<PersistedInstallState> {
  try {
    const raw = await readFile(getStateFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<PersistedInstallState>;
    return {
      installedVersion: parsed.installedVersion ?? null,
      lastInstalledAt: parsed.lastInstalledAt ?? null,
      instancePath: parsed.instancePath ?? '',
      activeReleaseId: parsed.activeReleaseId ?? null,
    };
  } catch {
    return {
      installedVersion: null,
      lastInstalledAt: null,
      instancePath: '',
      activeReleaseId: null,
    };
  }
}

async function writePersistedState(nextState: PersistedInstallState) {
  const targetPath = getStateFilePath();
  await ensureParentDir(targetPath);
  await writeFile(targetPath, JSON.stringify(nextState, null, 2), 'utf8');
}

async function resolveInstalledVersionForPath(
  persistedState: PersistedInstallState,
  instancePath: string,
) {
  if (!persistedState.installedVersion) {
    return null;
  }

  if (!persistedState.instancePath || persistedState.instancePath !== instancePath) {
    return null;
  }

  const requiredPaths = [
    join(instancePath, 'versions'),
    join(instancePath, 'libraries'),
    join(instancePath, 'assets'),
  ];

  const checks = await Promise.all(requiredPaths.map((targetPath) => pathExists(targetPath)));
  if (checks.some((exists) => !exists)) {
    return null;
  }

  return persistedState.installedVersion;
}

async function finishWrite(stream: ReturnType<typeof createWriteStream>) {
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

async function downloadReleaseArchive(zipUrl: string, archivePath: string, onProgress: (progress: number, message: string) => void) {
  const response = await fetch(zipUrl);

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download modpack archive: ${response.status} ${response.statusText}`);
  }

  await ensureParentDir(archivePath);
  const fileStream = createWriteStream(archivePath);
  const totalBytes = Number(response.headers.get('content-length') ?? 0);
  let downloadedBytes = 0;

  if (response.body.getReader) {
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      downloadedBytes += value.byteLength;
      fileStream.write(Buffer.from(value));

      if (totalBytes > 0) {
        const progress = 82 + Math.min(8, Math.round((downloadedBytes / totalBytes) * 8));
        onProgress(progress, `Downloading modpack archive (${progress}%)`);
      }
    }

    fileStream.end();
    await finishWrite(fileStream);
    return;
  }

  await pipeline(Readable.fromWeb(response.body as never), fileStream);
  onProgress(90, 'Downloading modpack archive (90%)');
}

function updateRuntimeState(patch: Partial<LauncherInstallState>) {
  runtimeState = { ...runtimeState, ...patch };
}

export async function getInstallState() {
  const persistedState = await readPersistedState();
  const installedVersion = await resolveInstalledVersionForPath(
    persistedState,
    persistedState.instancePath,
  );
  runtimeState = {
    ...runtimeState,
    installedVersion,
    lastInstalledAt: installedVersion ? persistedState.lastInstalledAt : null,
    instancePath: persistedState.instancePath,
    activeReleaseId: installedVersion ? persistedState.activeReleaseId : null,
  };

  return runtimeState;
}

function derivePhase(activeRelease: LauncherReleaseDescriptor | null, installedVersion: string | null, settings: LauncherInstallSettings): LauncherInstallState {
  if (!activeRelease) {
    return {
      ...runtimeState,
      phase: 'idle',
      remoteVersion: null,
      updateAvailable: false,
      progress: 0,
      message: 'No active modpack release is published yet.',
      instancePath: settings.instancePath,
      lastError: '',
    };
  }

  if (installedVersion === activeRelease.version) {
    return {
      ...runtimeState,
      phase: 'ready',
      remoteVersion: activeRelease.version,
      updateAvailable: false,
      progress: 100,
      message: `Minecraft ${TARGET_MINECRAFT_VERSION} + NeoForge ${TARGET_NEOFORGE_VERSION} is ready with modpack ${activeRelease.version}.`,
      instancePath: settings.instancePath,
      activeReleaseId: activeRelease.id,
      lastError: '',
    };
  }

  return {
    ...runtimeState,
    phase: 'update_available',
    remoteVersion: activeRelease.version,
    updateAvailable: true,
    progress: 0,
    message: installedVersion
      ? 'A newer modpack release is available for install.'
      : `No local ${TARGET_MINECRAFT_VERSION} / NeoForge ${TARGET_NEOFORGE_VERSION} stack is installed yet.`,
    instancePath: settings.instancePath,
    activeReleaseId: activeRelease.id,
    lastError: '',
  };
}

export async function checkBuildStatus(activeRelease: LauncherReleaseDescriptor | null, settings: LauncherInstallSettings) {
  updateRuntimeState({ phase: 'checking', message: 'Checking local Minecraft stack status...', progress: 0, instancePath: settings.instancePath });

  const persistedState = await readPersistedState();
  const installedVersion = await resolveInstalledVersionForPath(
    persistedState,
    settings.instancePath,
  );
  const derivedState = derivePhase(activeRelease, installedVersion, settings);
  runtimeState = {
    ...derivedState,
    installedVersion,
    lastInstalledAt: installedVersion ? persistedState.lastInstalledAt : null,
    instancePath: settings.instancePath,
    activeReleaseId: installedVersion ? activeRelease?.id ?? persistedState.activeReleaseId : activeRelease?.id ?? null,
  };

  return runtimeState;
}

export async function installBuild(request: LauncherInstallRequest) {
  lastRequest = request;

  if (runningInstall) {
    return runningInstall;
  }

  runningInstall = (async () => {
    const release = request.release;
    const settings = request.settings;
    const persistedState = await readPersistedState();
    const tempRoot = getTempRoot(settings.instancePath);
    const timestamp = Date.now().toString();
    const modpackArchivePath = join(tempRoot, `${release.version}-${timestamp}.zip`);
    const modpackStagingPath = join(tempRoot, `modpack-${release.version}-${timestamp}`);

    updateRuntimeState({
      phase: 'bootstrapping_minecraft',
      remoteVersion: release.version,
      progress: 1,
      message: `Bootstrapping Minecraft ${TARGET_MINECRAFT_VERSION}...`,
      instancePath: settings.instancePath,
      activeReleaseId: release.id,
      lastError: '',
    });

    try {
      await mkdir(tempRoot, { recursive: true });

      await bootstrapMinecraftStack(settings.instancePath, tempRoot, settings, (progress, message) => {
        const phase = progress < 56 ? 'bootstrapping_minecraft' : 'bootstrapping_neoforge';
        updateRuntimeState({ progress, message, phase });
      });

      updateRuntimeState({ phase: 'applying_modpack', progress: 82, message: 'Downloading modpack archive...' });
      await downloadReleaseArchive(release.zipUrl, modpackArchivePath, (progress, message) => {
        updateRuntimeState({ progress, message, phase: 'applying_modpack' });
      });
      await applyModpack(settings.instancePath, modpackArchivePath, modpackStagingPath, (progress, message) => {
        updateRuntimeState({ progress, message, phase: 'applying_modpack' });
      });

      await rm(modpackArchivePath, { force: true });
      await rm(modpackStagingPath, { recursive: true, force: true });

      const nextPersistedState: PersistedInstallState = {
        installedVersion: release.version,
        lastInstalledAt: new Date().toISOString(),
        instancePath: settings.instancePath,
        activeReleaseId: release.id,
      };
      await writePersistedState(nextPersistedState);

      runtimeState = {
        ...runtimeState,
        phase: 'ready',
        installedVersion: release.version,
        remoteVersion: release.version,
        updateAvailable: false,
        progress: 100,
        message: `Minecraft ${TARGET_MINECRAFT_VERSION} + NeoForge ${TARGET_NEOFORGE_VERSION} is ready with modpack ${release.version}.`,
        instancePath: settings.instancePath,
        lastInstalledAt: nextPersistedState.lastInstalledAt,
        lastError: '',
        activeReleaseId: release.id,
      };

      return runtimeState;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to install modpack build.';

      const installedVersion = await resolveInstalledVersionForPath(
        persistedState,
        settings.instancePath,
      );

      runtimeState = {
        ...runtimeState,
        phase: 'failed',
        installedVersion,
        remoteVersion: release.version,
        updateAvailable: true,
        progress: 0,
        message: 'Minecraft stack install failed.',
        instancePath: settings.instancePath,
        lastInstalledAt: installedVersion ? persistedState.lastInstalledAt : null,
        lastError: message,
        activeReleaseId: release.id,
      };

      await rm(modpackArchivePath, { force: true }).catch(() => undefined);
      await rm(modpackStagingPath, { recursive: true, force: true }).catch(() => undefined);
      return runtimeState;
    } finally {
      runningInstall = null;
    }
  })();

  return runningInstall;
}

export async function retryInstall() {
  if (!lastRequest) {
    throw new Error('No previous install request is available for retry.');
  }

  return installBuild(lastRequest);
}
