import { beforeEach, describe, expect, it, vi } from 'vitest';

const { launcherApiMock } = vi.hoisted(() => ({
  launcherApiMock: {
    getAppInfo: vi.fn(),
    ping: vi.fn(),
    getInstallState: vi.fn(),
    checkBuildStatus: vi.fn(),
    installBuild: vi.fn(),
    retryInstall: vi.fn(),
    getLaunchState: vi.fn(),
    getRecentLaunchLogs: vi.fn(),
    validateRuntime: vi.fn(),
    launchGame: vi.fn(),
    stopGame: vi.fn(),
  },
}));

vi.mock('@renderer/lib/launcher-api', () => ({
  launcherApi: launcherApiMock,
}));

vi.mock('@renderer/lib/supabase', () => ({
  supabase: null,
}));

import { useLauncherStore } from '@renderer/store/launcher-store';
import { defaultSettings } from '@renderer/lib/settings';

const readyInstallState = {
  phase: 'ready' as const,
  installedVersion: '1.20.1',
  remoteVersion: 'v0.1.1',
  updateAvailable: false,
  progress: 100,
  message: 'Installed build is up to date.',
  instancePath: 'C:\\KaernaLauncher\\instance',
  lastInstalledAt: '2026-04-08T00:00:00Z',
  lastError: '',
  activeReleaseId: 'release-1',
};

const baseRuntimeState = {
  phase: 'idle' as const,
  javaPath: null,
  javaVersion: null,
  processId: null,
  message: 'Runtime validation has not started yet.',
  lastError: '',
  logs: [] as string[],
  canLaunch: false,
};

function resetStore() {
  useLauncherStore.setState({
    configured: true,
    shellReady: true,
    bootstrapping: false,
    authBusy: false,
    dataLoading: false,
    logsVisible: true,
    appVersion: '0.1.0-shell',
    platform: 'win32',
    serverStatus: 'online',
    session: {
      access_token: 'token',
      refresh_token: 'refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: 'user-1',
        email: 'player@example.com',
      },
    } as never,
    roles: [],
    profile: {
      id: 'user-1',
      nickname: 'PlayerOne',
      avatar_url: null,
      created_at: null,
      last_login_at: null,
    },
    activeBan: null,
    news: [],
    activeRelease: {
      id: 'release-1',
      version: 'v0.1.1',
      zip_url: 'https://example.com/build.zip',
      manifest_url: null,
      changelog: 'Patch notes',
      is_active: true,
      created_at: '2026-04-08T00:00:00Z',
      published_at: '2026-04-08T00:00:00Z',
      github_release_tag: 'v0.1.1',
    },
    installState: { ...readyInstallState },
    runtimeState: { ...baseRuntimeState },
    settings: {
      ...defaultSettings,
      instancePath: 'C:\\KaernaLauncher\\instance',
      debugMode: true,
    },
    authError: '',
    dataError: '',
    registerMessage: '',
  });
}

describe('launcher runtime flow actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
    launcherApiMock.getRecentLaunchLogs.mockResolvedValue(['[launcher] test']);
  });

  it('validateRuntime updates state with detected Java and readiness', async () => {
    launcherApiMock.validateRuntime.mockResolvedValue({
      ...baseRuntimeState,
      phase: 'ready_to_launch',
      javaPath: 'C:\\Java\\bin\\java.exe',
      javaVersion: '17.0.11',
      message: 'Runtime validated.',
      canLaunch: true,
    });

    await useLauncherStore.getState().validateRuntime();

    expect(launcherApiMock.validateRuntime).toHaveBeenCalledTimes(1);
    expect(useLauncherStore.getState().runtimeState.phase).toBe(
      'ready_to_launch',
    );
    expect(useLauncherStore.getState().runtimeState.javaVersion).toBe(
      '17.0.11',
    );
  });

  it('launchGame fails fast when a ban is active', async () => {
    useLauncherStore.setState({
      activeBan: {
        id: 'ban-1',
        user_id: 'user-1',
        is_banned: true,
        reason: 'Cheating',
        banned_until: null,
        created_at: '2026-04-08T00:00:00Z',
      },
    });

    await useLauncherStore.getState().launchGame();

    expect(launcherApiMock.launchGame).not.toHaveBeenCalled();
    expect(useLauncherStore.getState().runtimeState.phase).toBe('failed');
    expect(useLauncherStore.getState().runtimeState.lastError).toContain(
      'Cheating',
    );
  });

  it('launchGame stores running runtime state and logs', async () => {
    launcherApiMock.launchGame.mockResolvedValue({
      ...baseRuntimeState,
      phase: 'running',
      javaPath: 'C:\\Java\\bin\\java.exe',
      javaVersion: '17.0.11',
      processId: 4242,
      message: 'Minecraft is running.',
      canLaunch: false,
    });

    await useLauncherStore.getState().launchGame();

    expect(launcherApiMock.launchGame).toHaveBeenCalledTimes(1);
    expect(useLauncherStore.getState().runtimeState.phase).toBe('running');
    expect(useLauncherStore.getState().runtimeState.logs).toEqual([
      '[launcher] test',
    ]);
  });

  it('stopGame stores the latest stopped runtime state', async () => {
    launcherApiMock.stopGame.mockResolvedValue({
      ...baseRuntimeState,
      phase: 'ready_to_launch',
      javaPath: 'C:\\Java\\bin\\java.exe',
      javaVersion: '17.0.11',
      message: 'Minecraft closed. Ready to launch again.',
      canLaunch: true,
    });

    await useLauncherStore.getState().stopGame();

    expect(launcherApiMock.stopGame).toHaveBeenCalledTimes(1);
    expect(useLauncherStore.getState().runtimeState.phase).toBe(
      'ready_to_launch',
    );
    expect(useLauncherStore.getState().runtimeState.canLaunch).toBe(true);
  });
});
