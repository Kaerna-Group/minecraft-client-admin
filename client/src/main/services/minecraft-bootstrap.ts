import { createWriteStream } from 'node:fs';
import { access, cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { LauncherInstallSettings } from '../../shared/launcher-api';
import { detectJavaPath } from './java-runtime';

const execFileAsync = promisify(execFile);

export const TARGET_MINECRAFT_VERSION = '1.21.1';
export const TARGET_NEOFORGE_VERSION = '21.1.222';
const VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const NEOFORGE_INSTALLER_URL = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${TARGET_NEOFORGE_VERSION}/neoforge-${TARGET_NEOFORGE_VERSION}-installer.jar`;

type ProgressCallback = (progress: number, message: string) => void;

type VersionManifestIndex = {
  versions: Array<{
    id: string;
    url: string;
  }>;
};

type AssetIndex = {
  objects: Record<string, { hash: string; size: number }>;
};

type VersionDownload = {
  url: string;
  path?: string;
};

type MojangLibrary = {
  downloads?: {
    artifact?: VersionDownload;
    classifiers?: Record<string, VersionDownload>;
  };
};

type VersionMetadata = {
  id: string;
  downloads?: {
    client?: VersionDownload;
  };
  assetIndex?: {
    id: string;
    url: string;
  };
  libraries?: MojangLibrary[];
};

type ExecFileFailure = Error & {
  stdout?: string;
  stderr?: string;
};

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

async function finishWrite(stream: ReturnType<typeof createWriteStream>) {
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

async function downloadFile(url: string, targetPath: string) {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  await ensureParentDir(targetPath);
  const fileStream = createWriteStream(targetPath);

  if (response.body.getReader) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        fileStream.write(Buffer.from(value));
      }
    }

    fileStream.end();
    await finishWrite(fileStream);
    return;
  }

  await pipeline(Readable.fromWeb(response.body as never), fileStream);
}

async function downloadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function downloadIfMissing(url: string, targetPath: string) {
  if (await pathExists(targetPath)) {
    return false;
  }

  await downloadFile(url, targetPath);
  return true;
}

async function ensureLauncherProfileShim(instancePath: string) {
  const launcherProfilesPath = join(instancePath, 'launcher_profiles.json');
  if (await pathExists(launcherProfilesPath)) {
    return;
  }

  const profilePayload = {
    profiles: {},
    selectedProfile: '(Default)',
    clientToken: 'kaerna-launcher',
    authenticationDatabase: {},
    settings: {},
    version: 3,
  };

  await writeFile(launcherProfilesPath, JSON.stringify(profilePayload, null, 2), 'utf8');
}

async function bootstrapMinecraft(instancePath: string, onProgress: ProgressCallback) {
  onProgress(8, `Bootstrapping Minecraft ${TARGET_MINECRAFT_VERSION} metadata...`);
  const versionIndex = await downloadJson<VersionManifestIndex>(VERSION_MANIFEST_URL);
  const versionEntry = versionIndex.versions.find((entry) => entry.id === TARGET_MINECRAFT_VERSION);
  if (!versionEntry?.url) {
    throw new Error(`Minecraft ${TARGET_MINECRAFT_VERSION} was not found in the official version manifest.`);
  }

  const versionMetadata = await downloadJson<VersionMetadata>(versionEntry.url);
  const clientDownloadUrl = versionMetadata.downloads?.client?.url;
  const assetIndexUrl = versionMetadata.assetIndex?.url;
  const assetIndexId = versionMetadata.assetIndex?.id ?? TARGET_MINECRAFT_VERSION;

  if (!clientDownloadUrl || !assetIndexUrl) {
    throw new Error(`Minecraft ${TARGET_MINECRAFT_VERSION} metadata is missing required download URLs.`);
  }

  const versionRoot = join(instancePath, 'versions', TARGET_MINECRAFT_VERSION);
  const versionJsonPath = join(versionRoot, `${TARGET_MINECRAFT_VERSION}.json`);
  const versionJarPath = join(versionRoot, `${TARGET_MINECRAFT_VERSION}.jar`);
  const librariesRoot = join(instancePath, 'libraries');
  const assetsRoot = join(instancePath, 'assets');
  const assetIndexPath = join(assetsRoot, 'indexes', `${assetIndexId}.json`);

  await mkdir(versionRoot, { recursive: true });
  await mkdir(librariesRoot, { recursive: true });
  await mkdir(join(assetsRoot, 'indexes'), { recursive: true });
  await mkdir(join(assetsRoot, 'objects'), { recursive: true });

  await writeFile(versionJsonPath, JSON.stringify(versionMetadata, null, 2), 'utf8');
  onProgress(14, `Downloading Minecraft ${TARGET_MINECRAFT_VERSION} client...`);
  await downloadFile(clientDownloadUrl, versionJarPath);

  onProgress(20, `Downloading Minecraft ${TARGET_MINECRAFT_VERSION} asset index...`);
  const assetIndex = await downloadJson<AssetIndex>(assetIndexUrl);
  await writeFile(assetIndexPath, JSON.stringify(assetIndex, null, 2), 'utf8');

  const libraries = versionMetadata.libraries ?? [];
  let processedLibraries = 0;
  const totalLibraries = Math.max(libraries.length, 1);

  for (const library of libraries) {
    const downloads: VersionDownload[] = [];
    if (library.downloads?.artifact?.url && library.downloads.artifact.path) {
      downloads.push(library.downloads.artifact);
    }

    const classifierDownloads = library.downloads?.classifiers ?? {};
    for (const [key, classifier] of Object.entries(classifierDownloads)) {
      if (!classifier.url || !classifier.path) {
        continue;
      }

      if (key.includes('windows')) {
        downloads.push(classifier);
      }
    }

    for (const download of downloads) {
      await downloadIfMissing(download.url, join(librariesRoot, download.path!));
    }

    processedLibraries += 1;
    const libraryProgress = 20 + Math.round((processedLibraries / totalLibraries) * 20);
    onProgress(Math.min(libraryProgress, 40), `Bootstrapping Minecraft libraries (${processedLibraries}/${totalLibraries})`);
  }

  const assetEntries = Object.values(assetIndex.objects ?? {});
  let downloadedAssets = 0;
  const totalAssets = Math.max(assetEntries.length, 1);

  for (const asset of assetEntries) {
    const hash = asset.hash;
    const objectPath = join(assetsRoot, 'objects', hash.slice(0, 2), hash);
    await downloadIfMissing(
      `https://resources.download.minecraft.net/${hash.slice(0, 2)}/${hash}`,
      objectPath,
    );
    downloadedAssets += 1;
    if (downloadedAssets === totalAssets || downloadedAssets % 150 === 0) {
      const assetProgress = 40 + Math.round((downloadedAssets / totalAssets) * 15);
      onProgress(Math.min(assetProgress, 55), `Bootstrapping Minecraft assets (${downloadedAssets}/${totalAssets})`);
    }
  }

  await ensureLauncherProfileShim(instancePath);
}

function formatInstallerFailureDetails(args: string[], error: unknown) {
  if (!(error instanceof Error)) {
    return `${args.slice(2).join(' ')} => NeoForge installer failed.`;
  }

  const failure = error as ExecFileFailure;
  const detail = [failure.stderr, failure.stdout, failure.message]
    .filter(Boolean)
    .map((value) => value?.trim())
    .find(Boolean);

  return `${args.slice(2).join(' ')} => ${detail ?? failure.message}`;
}

async function tryNeoForgeInstall(javaPath: string, installerJarPath: string, instancePath: string) {
  const attemptMatrix = [
    ['-jar', installerJarPath, '--install-client', instancePath],
    ['-jar', installerJarPath, '--installClient', instancePath],
    ['-jar', installerJarPath, '--install-client'],
    ['-jar', installerJarPath, '--installClient'],
  ];

  const failures: string[] = [];

  for (const args of attemptMatrix) {
    try {
      await execFileAsync(javaPath, args, { cwd: instancePath });
      return;
    } catch (error) {
      failures.push(formatInstallerFailureDetails(args, error));
    }
  }

  throw new Error(`NeoForge installer failed for ${TARGET_NEOFORGE_VERSION}. Attempts: ${failures.join(' | ')}`);
}

async function bootstrapNeoForge(instancePath: string, tempRoot: string, settings: LauncherInstallSettings, onProgress: ProgressCallback) {
  onProgress(58, `Bootstrapping NeoForge ${TARGET_NEOFORGE_VERSION}...`);
  const java = await detectJavaPath(settings.javaPath);
  const installerJarPath = join(tempRoot, `neoforge-${TARGET_NEOFORGE_VERSION}-installer.jar`);
  await downloadIfMissing(NEOFORGE_INSTALLER_URL, installerJarPath);
  await tryNeoForgeInstall(java.path, installerJarPath, instancePath);
}

function isSingleDirectoryRoot(entries: Array<{ isDirectory(): boolean }>) {
  return entries.length === 1 && entries[0].isDirectory();
}

async function resolveExtractedRoot(targetPath: string) {
  const entries = await readdir(targetPath, { withFileTypes: true });
  if (isSingleDirectoryRoot(entries)) {
    return join(targetPath, entries[0].name);
  }

  return targetPath;
}

async function overlayEntry(sourcePath: string, targetPath: string) {
  await rm(targetPath, { recursive: true, force: true });
  await ensureParentDir(targetPath);
  await cp(sourcePath, targetPath, { recursive: true, force: true });
}

export async function extractArchive(archivePath: string, targetPath: string) {
  await rm(targetPath, { recursive: true, force: true });
  await mkdir(targetPath, { recursive: true });

  const command = `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${targetPath.replace(/'/g, "''")}' -Force`;
  await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command]);
}

export async function validateExtractedDirectory(targetPath: string) {
  const directoryStat = await stat(targetPath);
  if (!directoryStat.isDirectory()) {
    throw new Error('Extracted archive did not produce a directory.');
  }

  const validationFile = join(targetPath, '.install-validation.tmp');
  await writeFile(validationFile, 'ok', 'utf8');
  await rm(validationFile, { force: true });
}

export async function applyModpack(instancePath: string, archivePath: string, stagingPath: string, onProgress: ProgressCallback) {
  onProgress(82, 'Applying modpack overlay...');
  await extractArchive(archivePath, stagingPath);
  await validateExtractedDirectory(stagingPath);

  const extractedRoot = await resolveExtractedRoot(stagingPath);
  const entries = await readdir(extractedRoot, { withFileTypes: true });
  if (entries.length === 0) {
    throw new Error('Modpack archive was empty after extraction.');
  }

  let processedEntries = 0;
  const totalEntries = Math.max(entries.length, 1);

  for (const entry of entries) {
    const sourcePath = join(extractedRoot, entry.name);
    const targetPath = join(instancePath, entry.name);
    await overlayEntry(sourcePath, targetPath);
    processedEntries += 1;
    const overlayProgress = 82 + Math.round((processedEntries / totalEntries) * 13);
    onProgress(Math.min(overlayProgress, 95), `Applying modpack overlay (${processedEntries}/${totalEntries})`);
  }
}

export async function bootstrapMinecraftStack(instancePath: string, tempRoot: string, settings: LauncherInstallSettings, onProgress: ProgressCallback) {
  await mkdir(instancePath, { recursive: true });
  await mkdir(tempRoot, { recursive: true });
  await bootstrapMinecraft(instancePath, onProgress);
  await bootstrapNeoForge(instancePath, tempRoot, settings, onProgress);
}
