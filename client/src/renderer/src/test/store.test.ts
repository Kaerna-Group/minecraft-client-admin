import { useLauncherStore } from '../store/launcher-store';
import { defaultSettings } from '../lib/settings';

describe('launcher store', () => {
  afterEach(() => {
    useLauncherStore.setState({
      configured: false,
      shellReady: false,
      bootstrapping: false,
      authBusy: false,
      dataLoading: false,
      logsVisible: true,
      appVersion: '0.1.0-shell',
      platform: 'unknown',
      serverStatus: 'offline',
      session: null,
      roles: [],
      profile: null,
      activeBan: null,
      news: [],
      activeRelease: null,
      installState: {
        phase: 'idle',
        installedVersion: null,
        remoteVersion: null,
        updateAvailable: false,
        progress: 0,
        message: 'Launcher has not checked the local build yet.',
        instancePath: defaultSettings.instancePath,
        lastInstalledAt: null,
        lastError: '',
        activeReleaseId: null,
      },
      runtimeState: {
        phase: 'idle',
        javaPath: null,
        javaVersion: null,
        processId: null,
        message: 'Runtime validation has not started yet.',
        lastError: '',
        logs: [],
        canLaunch: false,
      },
      authError: '',
      dataError: '',
      registerMessage: '',
    });
  });

  it('starts with shell not ready and no authenticated session', () => {
    const state = useLauncherStore.getState();

    expect(state.shellReady).toBe(false);
    expect(state.session).toBeNull();
    expect(state.roles).toEqual([]);
    expect(state.serverStatus).toBe('offline');
    expect(state.runtimeState.phase).toBe('idle');
  });
});
