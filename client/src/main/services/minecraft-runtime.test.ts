// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

vi.mock('electron', () => ({
  app: {
    getPath: () => join(process.cwd(), 'tmp-electron-user-data'),
    getVersion: () => '0.1.0-test',
  },
}));

import { parseJavaVersion, resolveVersionManifest } from './minecraft-runtime';

const tempRoot = join(process.cwd(), 'tmp-runtime-test');

describe('minecraft runtime helpers', () => {
  it('parses modern Java version output', () => {
    const parsed = parseJavaVersion('openjdk version "17.0.11" 2024-04-16');

    expect(parsed).toEqual({
      version: '17.0.11',
      major: 17,
    });
  });

  it('resolves a launchable version manifest from the instance versions directory', async () => {
    const instancePath = join(tempRoot, 'instance-a');
    const versionRoot = join(instancePath, 'versions', '1.20.1');

    await rm(instancePath, { recursive: true, force: true });
    await mkdir(versionRoot, { recursive: true });
    await writeFile(join(versionRoot, '1.20.1.jar'), 'jar', 'utf8');
    await writeFile(
      join(versionRoot, '1.20.1.json'),
      JSON.stringify({
        id: '1.20.1',
        mainClass: 'net.minecraft.client.main.Main',
      }),
      'utf8',
    );

    const resolved = await resolveVersionManifest(instancePath, '1.20.1');

    expect(resolved.versionId).toBe('1.20.1');
    expect(resolved.manifest.mainClass).toBe('net.minecraft.client.main.Main');

    await rm(instancePath, { recursive: true, force: true });
  });

  it('prefers the neoforge version manifest when vanilla and neoforge are both installed', async () => {
    const instancePath = join(tempRoot, 'instance-b');
    const vanillaRoot = join(instancePath, 'versions', '1.21.1');
    const neoforgeRoot = join(instancePath, 'versions', 'neoforge-21.1.222');

    await rm(instancePath, { recursive: true, force: true });
    await mkdir(vanillaRoot, { recursive: true });
    await mkdir(neoforgeRoot, { recursive: true });

    await writeFile(join(vanillaRoot, '1.21.1.jar'), 'jar', 'utf8');
    await writeFile(
      join(vanillaRoot, '1.21.1.json'),
      JSON.stringify({
        id: '1.21.1',
        mainClass: 'net.minecraft.client.main.Main',
      }),
      'utf8',
    );

    await writeFile(join(neoforgeRoot, 'neoforge-21.1.222.jar'), 'jar', 'utf8');
    await writeFile(
      join(neoforgeRoot, 'neoforge-21.1.222.json'),
      JSON.stringify({
        id: 'neoforge-21.1.222',
        mainClass: 'cpw.mods.bootstraplauncher.BootstrapLauncher',
      }),
      'utf8',
    );

    const resolved = await resolveVersionManifest(instancePath, 'v0.1.1');

    expect(resolved.versionId).toBe('neoforge-21.1.222');
    expect(resolved.manifest.mainClass).toBe(
      'cpw.mods.bootstraplauncher.BootstrapLauncher',
    );

    await rm(instancePath, { recursive: true, force: true });
  });
});
