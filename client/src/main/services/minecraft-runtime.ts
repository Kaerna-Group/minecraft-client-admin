import { app } from 'electron';
import { copyFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

import type {
  LauncherRuntimeRequest,
  LauncherRuntimeState,
} from '../../shared/launcher-api';
import { detectJavaPath, parseJavaVersion } from './java-runtime';
import { TARGET_NEOFORGE_VERSION } from './minecraft-bootstrap';

const execFileAsync = promisify(execFile);
const MAX_LOG_LINES = 250;
const DEFAULT_MIN_RAM_MB = 2048;
const DEFAULT_MAX_RAM_MB = 4096;

type VersionArgument =
  | string
  | { rules?: VersionRule[]; value?: string | string[] };
type VersionRule = {
  action: 'allow' | 'disallow';
  os?: { name?: string; arch?: string };
  features?: Record<string, boolean>;
};

type VersionLibrary = {
  name: string;
  rules?: VersionRule[];
  downloads?: {
    artifact?: { path?: string };
    classifiers?: Record<string, { path?: string }>;
  };
  natives?: Record<string, string>;
};

type VersionManifest = {
  id: string;
  mainClass?: string;
  type?: string;
  assetIndex?: { id?: string };
  javaVersion?: { majorVersion?: number };
  libraries?: VersionLibrary[];
  arguments?: {
    game?: VersionArgument[];
    jvm?: VersionArgument[];
  };
  minecraftArguments?: string;
};

type LaunchContext = {
  javaPath: string;
  javaVersion: string;
  versionId: string;
  versionManifest: VersionManifest;
  versionRoot: string;
  versionJarPath: string;
  assetsRoot: string;
  assetIndexName: string;
  librariesRoot: string;
  mainClass: string;
  classpath: string;
  nativesDir: string;
  jvmArgs: string[];
  gameArgs: string[];
  cwd: string;
};

const initialRuntimeState: LauncherRuntimeState = {
  phase: 'idle',
  javaPath: null,
  javaVersion: null,
  processId: null,
  message: 'Runtime validation has not started yet.',
  lastError: '',
  logs: [],
  canLaunch: false,
};

let runtimeState: LauncherRuntimeState = { ...initialRuntimeState };
let currentProcess: ChildProcessWithoutNullStreams | null = null;
let currentNativesDir: string | null = null;

function getUserDataPath() {
  return app.getPath('userData');
}

function updateRuntimeState(patch: Partial<LauncherRuntimeState>) {
  runtimeState = { ...runtimeState, ...patch };
}

function appendRuntimeLog(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  const nextLogs = [...runtimeState.logs, trimmed].slice(-MAX_LOG_LINES);
  runtimeState = {
    ...runtimeState,
    logs: nextLogs,
  };
}

async function pathExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function matchesRule(rule: VersionRule) {
  const osName =
    process.platform === 'win32'
      ? 'windows'
      : process.platform === 'darwin'
        ? 'osx'
        : 'linux';
  const arch = process.arch === 'x64' ? 'x64' : process.arch;

  if (rule.os?.name && rule.os.name !== osName) {
    return false;
  }

  if (rule.os?.arch && rule.os.arch !== arch) {
    return false;
  }

  if (
    rule.features &&
    Object.values(rule.features).some((value) => value === true)
  ) {
    return false;
  }

  return true;
}

function isRuleAllowed(rules?: VersionRule[]) {
  if (!rules || rules.length === 0) {
    return true;
  }

  let allowed = false;
  for (const rule of rules) {
    if (!matchesRule(rule)) {
      continue;
    }

    allowed = rule.action === 'allow';
  }

  return allowed;
}

function buildLibraryPath(name: string) {
  const segments = name.split(':');
  if (segments.length < 3) {
    throw new Error(`Unsupported library coordinate: ${name}`);
  }

  const [group, artifact, version, classifier] = segments;
  const fileName = `${artifact}-${version}${classifier ? `-${classifier}` : ''}.jar`;
  return join(...group.split('.'), artifact, version, fileName);
}

function substituteArgumentTemplates(
  input: string,
  values: Record<string, string>,
) {
  return input.replace(/\$\{([^}]+)\}/g, (_match, key) => values[key] ?? '');
}

function normalizeArgumentList(
  argumentsList: VersionArgument[] | undefined,
  values: Record<string, string>,
) {
  if (!argumentsList) {
    return [] as string[];
  }

  return argumentsList.flatMap((entry) => {
    if (typeof entry === 'string') {
      return [substituteArgumentTemplates(entry, values)];
    }

    if (!isRuleAllowed(entry.rules)) {
      return [];
    }

    if (typeof entry.value === 'string') {
      return [substituteArgumentTemplates(entry.value, values)];
    }

    return (entry.value ?? []).map((value) =>
      substituteArgumentTemplates(value, values),
    );
  });
}

function getPreferredVersionCandidates(preferredVersion?: string | null) {
  const candidates = new Set<string>();
  if (preferredVersion) {
    candidates.add(preferredVersion);
    candidates.add(preferredVersion.replace(/^v/i, ''));
  }

  candidates.add(`neoforge-${TARGET_NEOFORGE_VERSION}`);
  candidates.add(`${TARGET_NEOFORGE_VERSION}-neoforge`);
  return [...candidates].filter(Boolean);
}

export async function resolveVersionManifest(
  instancePath: string,
  preferredVersion?: string | null,
) {
  const versionsRoot = join(instancePath, 'versions');
  if (!(await pathExists(versionsRoot))) {
    throw new Error('Installed build is missing the versions directory.');
  }

  for (const candidate of getPreferredVersionCandidates(preferredVersion)) {
    const candidateRoot = join(versionsRoot, candidate);
    if (await pathExists(candidateRoot)) {
      const manifestPath = join(candidateRoot, `${candidate}.json`);
      const jarPath = join(candidateRoot, `${candidate}.jar`);
      if ((await pathExists(manifestPath)) && (await pathExists(jarPath))) {
        const raw = await readFile(manifestPath, 'utf8');
        return {
          versionId: candidate,
          versionRoot: candidateRoot,
          versionJarPath: jarPath,
          manifest: JSON.parse(raw) as VersionManifest,
        };
      }
    }
  }

  const entries = (await readdir(versionsRoot, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory(),
  );

  const orderedEntries = [
    ...entries.filter((entry) => entry.name.toLowerCase().includes('neoforge')),
    ...entries.filter((entry) => !entry.name.toLowerCase().includes('neoforge')),
  ];

  for (const entry of orderedEntries) {
    const candidateRoot = join(versionsRoot, entry.name);
    const manifestPath = join(candidateRoot, `${entry.name}.json`);
    const jarPath = join(candidateRoot, `${entry.name}.jar`);

    if (!(await pathExists(manifestPath)) || !(await pathExists(jarPath))) {
      continue;
    }

    const raw = await readFile(manifestPath, 'utf8');
    return {
      versionId: entry.name,
      versionRoot: candidateRoot,
      versionJarPath: jarPath,
      manifest: JSON.parse(raw) as VersionManifest,
    };
  }

  throw new Error(
    'Installed build does not contain a launchable Minecraft version manifest.',
  );
}

async function collectLibraryArtifacts(
  librariesRoot: string,
  libraries: VersionLibrary[] | undefined,
) {
  const classpathEntries: string[] = [];
  const nativeArchives: string[] = [];

  for (const library of libraries ?? []) {
    if (!isRuleAllowed(library.rules)) {
      continue;
    }

    const artifactRelativePath =
      library.downloads?.artifact?.path ?? buildLibraryPath(library.name);
    const artifactPath = join(librariesRoot, artifactRelativePath);

    if (await pathExists(artifactPath)) {
      classpathEntries.push(artifactPath);
    }

    const nativeKeyCandidates = [
      'natives-windows-64',
      'natives-windows',
      'natives-windows-32',
    ];
    const nativeEntry = nativeKeyCandidates
      .map((key) => library.downloads?.classifiers?.[key])
      .find(Boolean);

    if (nativeEntry?.path) {
      const nativePath = join(librariesRoot, nativeEntry.path);
      if (await pathExists(nativePath)) {
        nativeArchives.push(nativePath);
      }
    }
  }

  return {
    classpathEntries,
    nativeArchives,
  };
}

async function extractNativeArchives(
  nativeArchives: string[],
  nativesDir: string,
) {
  await rm(nativesDir, { recursive: true, force: true });
  await mkdir(nativesDir, { recursive: true });

  for (const archivePath of nativeArchives) {
    const zipProxyPath = join(
      dirname(archivePath),
      `${Date.now()}-${Math.random().toString(16).slice(2)}.zip`,
    );
    await copyFile(archivePath, zipProxyPath);

    const command = `Expand-Archive -LiteralPath '${zipProxyPath.replace(/'/g, "''")}' -DestinationPath '${nativesDir.replace(/'/g, "''")}' -Force`;
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      command,
    ]);
    await rm(zipProxyPath, { force: true });
  }

  await rm(join(nativesDir, 'META-INF'), { recursive: true, force: true });
}

async function buildLaunchContext(request: LauncherRuntimeRequest) {
  if (request.installState.phase !== 'ready') {
    throw new Error(
      'The game build is not installed yet. Install or update the build first.',
    );
  }

  if (!request.release) {
    throw new Error('No active release is available to launch.');
  }

  if (request.banReason) {
    throw new Error(`Play is blocked by ban: ${request.banReason}`);
  }

  const java = await detectJavaPath(request.settings.javaPath);
  const resolved = await resolveVersionManifest(
    request.settings.instancePath,
    request.installState.installedVersion,
  );
  const versionManifest = resolved.manifest;
  const requiredJavaMajor = versionManifest.javaVersion?.majorVersion ?? 17;

  if (java.major < requiredJavaMajor) {
    throw new Error(
      `Java ${requiredJavaMajor}+ is required, but detected Java ${java.version}.`,
    );
  }

  const assetsRoot = join(request.settings.instancePath, 'assets');
  const librariesRoot = join(request.settings.instancePath, 'libraries');

  if (!(await pathExists(assetsRoot))) {
    throw new Error('Installed build is missing the assets directory.');
  }

  if (!(await pathExists(librariesRoot))) {
    throw new Error('Installed build is missing the libraries directory.');
  }

  const assetIndexName = versionManifest.assetIndex?.id ?? resolved.versionId;
  const assetIndexPath = join(assetsRoot, 'indexes', `${assetIndexName}.json`);
  if (!(await pathExists(assetIndexPath))) {
    throw new Error(
      `Installed build is missing assets/indexes/${assetIndexName}.json.`,
    );
  }

  const mainClass = versionManifest.mainClass;
  if (!mainClass) {
    throw new Error('Version manifest does not define a mainClass for launch.');
  }

  const { classpathEntries, nativeArchives } = await collectLibraryArtifacts(
    librariesRoot,
    versionManifest.libraries,
  );
  classpathEntries.push(resolved.versionJarPath);

  if (classpathEntries.length === 0) {
    throw new Error('No classpath entries were resolved for launch.');
  }

  const nativesDir = join(
    getUserDataPath(),
    'runtime',
    'natives',
    resolved.versionId,
  );
  await extractNativeArchives(nativeArchives, nativesDir);

  const launcherName = 'KaernaLauncher';
  const launcherVersion = app.getVersion();
  const memoryMin = request.settings.minRamMb ?? DEFAULT_MIN_RAM_MB;
  const memoryMax = Math.max(
    request.settings.maxRamMb ?? DEFAULT_MAX_RAM_MB,
    memoryMin,
  );
  const replacementValues: Record<string, string> = {
    natives_directory: nativesDir,
    launcher_name: launcherName,
    launcher_version: launcherVersion,
    classpath: classpathEntries.join(process.platform === 'win32' ? ';' : ':'),
    classpath_separator: process.platform === 'win32' ? ';' : ':',
    library_directory: librariesRoot,
    auth_player_name: request.playerName,
    version_name: resolved.versionId,
    game_directory: request.settings.instancePath,
    assets_root: assetsRoot,
    assets_index_name: assetIndexName,
    auth_uuid: request.playerId,
    auth_access_token: 'offline-access-token',
    user_type: 'legacy',
    version_type: versionManifest.type ?? 'release',
    user_properties: '{}',
  };

  const jvmArgs = versionManifest.arguments?.jvm
    ? normalizeArgumentList(versionManifest.arguments.jvm, replacementValues)
    : ['-Djava.library.path=${natives_directory}', '-cp', '${classpath}'].map(
        (value) => substituteArgumentTemplates(value, replacementValues),
      );

  const gameArgs = versionManifest.arguments?.game
    ? normalizeArgumentList(versionManifest.arguments.game, replacementValues)
    : (
        versionManifest.minecraftArguments ??
        '--username ${auth_player_name} --version ${version_name} --gameDir ${game_directory} --assetsDir ${assets_root} --assetIndex ${assets_index_name} --uuid ${auth_uuid} --accessToken ${auth_access_token} --userType ${user_type} --versionType ${version_type}'
      )
        .split(/\s+/)
        .map((value) => substituteArgumentTemplates(value, replacementValues));

  return {
    javaPath: java.path,
    javaVersion: java.version,
    versionId: resolved.versionId,
    versionManifest,
    versionRoot: resolved.versionRoot,
    versionJarPath: resolved.versionJarPath,
    assetsRoot,
    assetIndexName,
    librariesRoot,
    mainClass,
    classpath: replacementValues.classpath,
    nativesDir,
    jvmArgs: [`-Xms${memoryMin}M`, `-Xmx${memoryMax}M`, ...jvmArgs],
    gameArgs,
    cwd: request.settings.instancePath,
  } satisfies LaunchContext;
}

function resetRuntimeLogs(message?: string) {
  runtimeState = {
    ...runtimeState,
    logs: [],
    message: message ?? runtimeState.message,
    lastError: '',
  };
}

async function cleanupNativesDir() {
  if (!currentNativesDir) {
    return;
  }

  await rm(currentNativesDir, { recursive: true, force: true }).catch(
    () => undefined,
  );
  currentNativesDir = null;
}

export async function getLaunchState() {
  return runtimeState;
}

export async function getRecentLaunchLogs() {
  return [...runtimeState.logs];
}

export async function validateRuntime(request: LauncherRuntimeRequest) {
  updateRuntimeState({
    phase: 'validating',
    message: 'Validating Minecraft runtime...',
    lastError: '',
  });

  try {
    const context = await buildLaunchContext(request);
    currentNativesDir = context.nativesDir;
    runtimeState = {
      ...runtimeState,
      phase: 'ready_to_launch',
      javaPath: context.javaPath,
      javaVersion: context.javaVersion,
      processId: null,
      message: `Runtime validated. Minecraft ${context.versionId} is ready to launch.`,
      lastError: '',
      canLaunch: true,
    };
  } catch (error) {
    runtimeState = {
      ...runtimeState,
      phase: 'failed',
      javaPath: null,
      javaVersion: null,
      processId: null,
      message: 'Runtime validation failed.',
      lastError:
        error instanceof Error ? error.message : 'Runtime validation failed.',
      canLaunch: false,
    };
  }

  return runtimeState;
}

export async function launchGame(request: LauncherRuntimeRequest) {
  if (currentProcess) {
    return {
      ...runtimeState,
      message: 'Minecraft is already running.',
      phase: 'running',
      canLaunch: false,
    };
  }

  resetRuntimeLogs('Preparing Minecraft launch...');
  const validatedState = await validateRuntime(request);
  if (validatedState.phase !== 'ready_to_launch') {
    return validatedState;
  }

  try {
    const context = await buildLaunchContext(request);
    currentNativesDir = context.nativesDir;

    appendRuntimeLog(`[launcher] Java: ${context.javaPath}`);
    appendRuntimeLog(`[launcher] Version: ${context.versionId}`);
    appendRuntimeLog(`[launcher] Working directory: ${context.cwd}`);

    currentProcess = spawn(
      context.javaPath,
      [...context.jvmArgs, context.mainClass, ...context.gameArgs],
      {
        cwd: context.cwd,
        stdio: 'pipe',
        windowsHide: false,
      },
    );

    updateRuntimeState({
      phase: 'launching',
      processId: currentProcess.pid ?? null,
      message: 'Launching Minecraft...',
      lastError: '',
      canLaunch: false,
      javaPath: context.javaPath,
      javaVersion: context.javaVersion,
    });

    currentProcess.stdout.on('data', (chunk) => {
      appendRuntimeLog(`[stdout] ${chunk.toString('utf8').trimEnd()}`);
      if (runtimeState.phase === 'launching') {
        updateRuntimeState({
          phase: 'running',
          message: 'Minecraft is running.',
        });
      }
    });

    currentProcess.stderr.on('data', (chunk) => {
      appendRuntimeLog(`[stderr] ${chunk.toString('utf8').trimEnd()}`);
      if (runtimeState.phase === 'launching') {
        updateRuntimeState({
          phase: 'running',
          message: 'Minecraft is running.',
        });
      }
    });

    currentProcess.on('error', (error) => {
      appendRuntimeLog(`[error] ${error.message}`);
      runtimeState = {
        ...runtimeState,
        phase: 'failed',
        processId: null,
        message: 'Minecraft process failed to start.',
        lastError: error.message,
        canLaunch: false,
      };
      currentProcess = null;
      void cleanupNativesDir();
    });

    currentProcess.on('exit', (code, signal) => {
      appendRuntimeLog(
        `[launcher] Minecraft exited with code ${code ?? 'null'}${signal ? `, signal ${signal}` : ''}.`,
      );
      runtimeState = {
        ...runtimeState,
        phase: code === 0 || code === null ? 'ready_to_launch' : 'failed',
        processId: null,
        message:
          code === 0 || code === null
            ? 'Minecraft closed. Ready to launch again.'
            : 'Minecraft exited unexpectedly.',
        lastError:
          code === 0 || code === null
            ? ''
            : `Minecraft exited with code ${code ?? 'null'}.`,
        canLaunch: code === 0 || code === null,
      };
      currentProcess = null;
      void cleanupNativesDir();
    });

    return runtimeState;
  } catch (error) {
    runtimeState = {
      ...runtimeState,
      phase: 'failed',
      processId: null,
      message: 'Minecraft launch failed.',
      lastError:
        error instanceof Error ? error.message : 'Minecraft launch failed.',
      canLaunch: false,
    };
    await cleanupNativesDir();
    return runtimeState;
  }
}

export async function stopGame() {
  if (!currentProcess?.pid) {
    runtimeState = {
      ...runtimeState,
      phase: runtimeState.canLaunch ? 'ready_to_launch' : 'idle',
      message: 'Minecraft is not running.',
      processId: null,
    };
    return runtimeState;
  }

  updateRuntimeState({
    phase: 'stopping',
    message: 'Stopping Minecraft...',
    canLaunch: false,
  });

  const pid = currentProcess.pid;

  try {
    if (process.platform === 'win32') {
      await execFileAsync('taskkill.exe', ['/pid', String(pid), '/t', '/f']);
    } else {
      currentProcess.kill('SIGTERM');
    }
  } catch (error) {
    runtimeState = {
      ...runtimeState,
      phase: 'failed',
      message: 'Failed to stop Minecraft cleanly.',
      lastError:
        error instanceof Error
          ? error.message
          : 'Failed to stop Minecraft cleanly.',
      canLaunch: false,
    };
  }

  return runtimeState;
}

export { parseJavaVersion };
