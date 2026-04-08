import { app } from 'electron';
import { createWriteStream } from 'node:fs';
import { access, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  LauncherInstallRequest,
  LauncherInstallSettings,
  LauncherInstallState,
  LauncherReleaseDescriptor,
} from '../../shared/launcher-api';

const execFileAsync = promisify(execFile);
const STATE_FILE_NAME = 'install-state.json';

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

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureEmptyDir(targetPath: string) {
  await rm(targetPath, { recursive: true, force: true });
  await mkdir(targetPath, { recursive: true });
}

async function validateExtractedDirectory(targetPath: string) {
  const directoryStat = await stat(targetPath);
  if (!directoryStat.isDirectory()) {
    throw new Error('Extracted archive did not produce a directory.');
  }

  const validationFile = join(targetPath, '.install-validation.tmp');
  await writeFile(validationFile, 'ok', 'utf8');
  await rm(validationFile, { force: true });
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
    throw new Error(`Failed to download build archive: ${response.status} ${response.statusText}`);
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
        const progress = Math.max(5, Math.min(80, Math.round((downloadedBytes / totalBytes) * 80)));
        onProgress(progress, `Downloading build archive (${progress}%)`);
      }
    }

    fileStream.end();
    await finishWrite(fileStream);
    return;
  }

  await pipeline(Readable.fromWeb(response.body as never), fileStream);
  onProgress(80, 'Downloading build archive (80%)');
}

async function extractArchive(archivePath: string, targetPath: string) {
  await ensureEmptyDir(targetPath);

  const command = `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${targetPath.replace(/'/g, "''")}' -Force`;
  await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command]);
}

function updateRuntimeState(patch: Partial<LauncherInstallState>) {
  runtimeState = { ...runtimeState, ...patch };
}

export async function getInstallState() {
  const persistedState = await readPersistedState();
  runtimeState = {
    ...runtimeState,
    installedVersion: persistedState.installedVersion,
    lastInstalledAt: persistedState.lastInstalledAt,
    instancePath: persistedState.instancePath,
    activeReleaseId: persistedState.activeReleaseId,
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
      message: 'No active build release is published yet.',
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
      message: 'Installed build is up to date.',
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
    message: installedVersion ? 'A newer build is available for install.' : 'No local build is installed yet.',
    instancePath: settings.instancePath,
    activeReleaseId: activeRelease.id,
    lastError: '',
  };
}

export async function checkBuildStatus(activeRelease: LauncherReleaseDescriptor | null, settings: LauncherInstallSettings) {
  updateRuntimeState({ phase: 'checking', message: 'Checking local build status...', progress: 0, instancePath: settings.instancePath });

  const persistedState = await readPersistedState();
  const derivedState = derivePhase(activeRelease, persistedState.installedVersion, settings);
  runtimeState = {
    ...derivedState,
    installedVersion: persistedState.installedVersion,
    lastInstalledAt: persistedState.lastInstalledAt,
    instancePath: settings.instancePath,
    activeReleaseId: activeRelease?.id ?? persistedState.activeReleaseId,
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
    const userDataPath = getUserDataPath();
    const tempRoot = join(userDataPath, 'build-temp');
    const timestamp = Date.now().toString();
    const archivePath = join(tempRoot, `${release.version}-${timestamp}.zip`);
    const stagingPath = join(tempRoot, `staging-${release.version}-${timestamp}`);
    const backupPath = join(tempRoot, `backup-${release.version}-${timestamp}`);
    const livePath = settings.instancePath;

    updateRuntimeState({
      phase: 'downloading',
      remoteVersion: release.version,
      progress: 1,
      message: 'Downloading build archive...',
      instancePath: settings.instancePath,
      activeReleaseId: release.id,
      lastError: '',
    });

    try {
      await mkdir(tempRoot, { recursive: true });

      await downloadReleaseArchive(release.zipUrl, archivePath, (progress, message) => {
        updateRuntimeState({ progress, message, phase: 'downloading' });
      });

      updateRuntimeState({ phase: 'extracting', progress: 85, message: 'Extracting build archive...' });
      await extractArchive(archivePath, stagingPath);
      await validateExtractedDirectory(stagingPath);

      let backupCreated = false;
      if (await pathExists(livePath)) {
        await rm(backupPath, { recursive: true, force: true });
        await rename(livePath, backupPath);
        backupCreated = true;
      }

      try {
        await rm(livePath, { recursive: true, force: true });
        await rename(stagingPath, livePath);
      } catch (swapError) {
        if (backupCreated && !(await pathExists(livePath))) {
          await rename(backupPath, livePath);
        }
        throw swapError;
      }

      await rm(backupPath, { recursive: true, force: true });
      await rm(archivePath, { force: true });
      await rm(stagingPath, { recursive: true, force: true });

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
        message: 'Build installed successfully.',
        instancePath: settings.instancePath,
        lastInstalledAt: nextPersistedState.lastInstalledAt,
        lastError: '',
        activeReleaseId: release.id,
      };

      return runtimeState;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to install build.';

      runtimeState = {
        ...runtimeState,
        phase: 'failed',
        installedVersion: persistedState.installedVersion,
        remoteVersion: release.version,
        updateAvailable: true,
        progress: 0,
        message: 'Build install failed.',
        instancePath: settings.instancePath,
        lastInstalledAt: persistedState.lastInstalledAt,
        lastError: message,
        activeReleaseId: release.id,
      };

      await rm(archivePath, { force: true }).catch(() => undefined);
      await rm(stagingPath, { recursive: true, force: true }).catch(() => undefined);
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
