import { beforeEach, describe, expect, it, vi } from 'vitest';

const { launcherApiMock } = vi.hoisted(() => ({
  launcherApiMock: {
    getAppInfo: vi.fn(),
    ping: vi.fn(),
    getInstallState: vi.fn(),
    checkBuildStatus: vi.fn(),
    installBuild: vi.fn(),
    retryInstall: vi.fn(),
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

const baseInstallState = {
  phase: 'idle' as const,
  installedVersion: null,
  remoteVersion: null,
  updateAvailable: false,
  progress: 0,
  message: 'idle',
  instancePath: defaultSettings.instancePath,
  lastInstalledAt: null,
  lastError: '',
  activeReleaseId: null,
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
    session: null,
    roles: [],
    profile: null,
    activeBan: null,
    news: [],
    activeRelease: null,
    installState: { ...baseInstallState },
    settings: { ...defaultSettings, instancePath: 'C:\\KaernaLauncher\\instance', debugMode: true },
    authError: '',
    dataError: '',
    registerMessage: '',
  });
}

describe('launcher install flow actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it('refreshInstallState maps the active release into desktop build status check', async () => {
    launcherApiMock.checkBuildStatus.mockResolvedValue({
      ...baseInstallState,
      phase: 'update_available',
      remoteVersion: '1.2.0',
      updateAvailable: true,
      message: 'Update available',
      activeReleaseId: 'release-1',
    });

    useLauncherStore.setState({
      activeRelease: {
        id: 'release-1',
        version: '1.2.0',
        zip_url: 'https://example.com/build.zip',
        manifest_url: null,
        changelog: 'Patch notes',
        is_active: true,
        created_at: '2026-04-08T00:00:00Z',
        published_at: '2026-04-08T00:00:00Z',
        github_release_tag: 'v1.2.0',
      },
    });

    await useLauncherStore.getState().refreshInstallState();

    expect(launcherApiMock.checkBuildStatus).toHaveBeenCalledWith(
      {
        id: 'release-1',
        version: '1.2.0',
        zipUrl: 'https://example.com/build.zip',
        changelog: 'Patch notes',
        publishedAt: '2026-04-08T00:00:00Z',
        githubReleaseTag: 'v1.2.0',
      },
      {
        instancePath: 'C:\\KaernaLauncher\\instance',
        debugMode: true,
      },
    );
    expect(useLauncherStore.getState().installState.phase).toBe('update_available');
  });

  it('installActiveRelease fails fast when there is no ZIP URL', async () => {
    useLauncherStore.setState({
      activeRelease: {
        id: 'release-1',
        version: '1.2.0',
        zip_url: null,
        manifest_url: null,
        changelog: 'Patch notes',
        is_active: true,
        created_at: '2026-04-08T00:00:00Z',
        published_at: '2026-04-08T00:00:00Z',
        github_release_tag: 'v1.2.0',
      },
    });

    await useLauncherStore.getState().installActiveRelease();

    expect(launcherApiMock.installBuild).not.toHaveBeenCalled();
    expect(useLauncherStore.getState().installState.phase).toBe('failed');
    expect(useLauncherStore.getState().installState.lastError).toContain('ZIP URL');
  });

  it('installActiveRelease updates store after a successful desktop install', async () => {
    launcherApiMock.installBuild.mockResolvedValue({
      ...baseInstallState,
      phase: 'ready',
      installedVersion: '1.2.0',
      remoteVersion: '1.2.0',
      progress: 100,
      updateAvailable: false,
      message: 'Build installed successfully.',
      activeReleaseId: 'release-1',
    });

    launcherApiMock.checkBuildStatus.mockResolvedValue({
      ...baseInstallState,
      phase: 'ready',
      installedVersion: '1.2.0',
      remoteVersion: '1.2.0',
      progress: 100,
      updateAvailable: false,
      message: 'Installed build is up to date.',
      activeReleaseId: 'release-1',
    });

    useLauncherStore.setState({
      activeRelease: {
        id: 'release-1',
        version: '1.2.0',
        zip_url: 'https://example.com/build.zip',
        manifest_url: null,
        changelog: 'Patch notes',
        is_active: true,
        created_at: '2026-04-08T00:00:00Z',
        published_at: '2026-04-08T00:00:00Z',
        github_release_tag: 'v1.2.0',
      },
    });

    await useLauncherStore.getState().installActiveRelease();

    expect(launcherApiMock.installBuild).toHaveBeenCalledTimes(1);
    expect(useLauncherStore.getState().installState.phase).toBe('ready');
    expect(useLauncherStore.getState().installState.installedVersion).toBe('1.2.0');
  });

  it('retryInstall replaces failed state with desktop retry result', async () => {
    launcherApiMock.retryInstall.mockResolvedValue({
      ...baseInstallState,
      phase: 'ready',
      installedVersion: '1.2.0',
      remoteVersion: '1.2.0',
      progress: 100,
      updateAvailable: false,
      message: 'Build installed successfully.',
      activeReleaseId: 'release-1',
    });

    launcherApiMock.checkBuildStatus.mockResolvedValue({
      ...baseInstallState,
      phase: 'ready',
      installedVersion: '1.2.0',
      remoteVersion: '1.2.0',
      progress: 100,
      updateAvailable: false,
      message: 'Installed build is up to date.',
      activeReleaseId: 'release-1',
    });

    useLauncherStore.setState({
      activeRelease: {
        id: 'release-1',
        version: '1.2.0',
        zip_url: 'https://example.com/build.zip',
        manifest_url: null,
        changelog: 'Patch notes',
        is_active: true,
        created_at: '2026-04-08T00:00:00Z',
        published_at: '2026-04-08T00:00:00Z',
        github_release_tag: 'v1.2.0',
      },
      installState: {
        ...baseInstallState,
        phase: 'failed',
        lastError: 'network error',
        activeReleaseId: 'release-1',
      },
    });

    await useLauncherStore.getState().retryInstall();

    expect(launcherApiMock.retryInstall).toHaveBeenCalledTimes(1);
    expect(useLauncherStore.getState().installState.phase).toBe('ready');
    expect(useLauncherStore.getState().installState.lastError).toBe('');
  });
});
