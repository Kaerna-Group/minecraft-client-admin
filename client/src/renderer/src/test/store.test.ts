import { useLauncherStore } from '../store/launcher-store';

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
  });
});
