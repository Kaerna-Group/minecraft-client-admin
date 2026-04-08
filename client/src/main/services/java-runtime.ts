import { execFile } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type JavaDetectionResult = {
  path: string;
  version: string;
  major: number;
};

export function parseJavaVersion(versionOutput: string) {
  const quotedVersion =
    versionOutput.match(/version\s+"([^"]+)"/i)?.[1] ?? null;
  const fallbackVersion =
    versionOutput.match(/openjdk\s+(\d+(?:\.\d+){0,2})/i)?.[1] ?? null;
  const versionString = quotedVersion ?? fallbackVersion;

  if (!versionString) {
    return null;
  }

  const normalized = versionString.startsWith('1.')
    ? versionString.split('.')[1]
    : versionString.split('.')[0];
  const major = Number.parseInt(normalized ?? '', 10);

  if (!Number.isFinite(major)) {
    return null;
  }

  return {
    version: versionString,
    major,
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

export async function detectJavaPath(preferredPath?: string | null): Promise<JavaDetectionResult> {
  const candidates = new Set<string>();

  const pushCandidate = async (candidate?: string | null) => {
    const normalized = candidate?.trim();
    if (!normalized) {
      return;
    }

    if (await pathExists(normalized)) {
      candidates.add(normalized);
    }
  };

  await pushCandidate(preferredPath ?? null);

  const commonBases = [
    process.env['ProgramFiles'],
    process.env['ProgramFiles(x86)'],
    process.env['JAVA_HOME'],
    process.env['JDK_HOME'],
  ].filter(Boolean) as string[];

  for (const base of commonBases) {
    await pushCandidate(join(base, 'bin', 'java.exe'));

    if (await pathExists(base)) {
      try {
        const entries = await readdir(base, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) {
            continue;
          }

          await pushCandidate(join(base, entry.name, 'bin', 'java.exe'));
        }
      } catch {
        // Ignore scanning errors for missing or protected directories.
      }
    }
  }

  try {
    const { stdout } = await execFileAsync(
      process.platform === 'win32' ? 'where.exe' : 'which',
      ['java'],
    );
    stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => candidates.add(line));
  } catch {
    // Command-line lookup is a fallback and can fail on machines without Java.
  }

  for (const candidate of candidates) {
    try {
      const { stdout, stderr } = await execFileAsync(candidate, ['-version']);
      const parsed = parseJavaVersion(`${stdout}\n${stderr}`);
      if (parsed) {
        return {
          path: candidate,
          version: parsed.version,
          major: parsed.major,
        };
      }
    } catch {
      // Ignore non-working candidates.
    }
  }

  throw new Error('Java runtime was not found. Install Java and try again.');
}
