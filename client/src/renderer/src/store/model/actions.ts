import type { Session } from '@supabase/supabase-js';
import type { StoreApi } from 'zustand';

import {
  fetchActiveRelease,
  fetchCurrentBan,
  fetchProfile,
  fetchPublishedNews,
  fetchUserRoles,
} from '@renderer/lib/client-api';
import { isSupabaseConfigured } from '@renderer/lib/env';
import { launcherApi } from '@renderer/lib/launcher-api';
import { normalizeSettings } from '@renderer/lib/settings';
import { supabase } from '@renderer/lib/supabase';
import type {
  LauncherInstallRequest,
  LauncherReleaseDescriptor,
  LauncherRuntimeRequest,
} from '../../../../shared/launcher-api';

import { baseState } from './base-state';
import type { LauncherStore } from './types';

let initializePromise: Promise<void> | null = null;
let authSubscriptionBound = false;
let installPollingTimer: ReturnType<typeof setTimeout> | null = null;
let runtimePollingTimer: ReturnType<typeof setTimeout> | null = null;

function mapReleaseDescriptor(
  release: LauncherStore['activeRelease'],
): LauncherReleaseDescriptor | null {
  if (!release?.zip_url) {
    return null;
  }

  return {
    id: release.id,
    version: release.version,
    zipUrl: release.zip_url,
    changelog: release.changelog,
    publishedAt: release.published_at,
    githubReleaseTag: release.github_release_tag,
  };
}

export function createLauncherActions(
  set: StoreApi<LauncherStore>['setState'],
  get: StoreApi<LauncherStore>['getState'],
) {
  const stopInstallPolling = () => {
    if (installPollingTimer) {
      clearTimeout(installPollingTimer);
      installPollingTimer = null;
    }
  };

  const stopRuntimePolling = () => {
    if (runtimePollingTimer) {
      clearTimeout(runtimePollingTimer);
      runtimePollingTimer = null;
    }
  };

  const shouldPollRuntime = (phase: LauncherStore['runtimeState']['phase']) =>
    phase === 'validating' ||
    phase === 'launching' ||
    phase === 'running' ||
    phase === 'stopping';

  const startInstallPolling = () => {
    stopInstallPolling();

    const tick = async () => {
      try {
        const installState = await launcherApi.getInstallState();
        set({ installState });

        if (
          installState.phase === 'bootstrapping_minecraft' ||
          installState.phase === 'bootstrapping_neoforge' ||
          installState.phase === 'applying_modpack'
        ) {
          installPollingTimer = setTimeout(() => {
            void tick();
          }, 900);
          return;
        }

        stopInstallPolling();
      } catch {
        stopInstallPolling();
      }
    };

    void tick();
  };

  const startRuntimePolling = () => {
    stopRuntimePolling();

    const tick = async () => {
      try {
        const [runtimeState, runtimeLogs] = await Promise.all([
          launcherApi.getLaunchState(),
          launcherApi.getRecentLaunchLogs(),
        ]);

        set({ runtimeState: { ...runtimeState, logs: runtimeLogs } });

        if (shouldPollRuntime(runtimeState.phase)) {
          runtimePollingTimer = setTimeout(() => {
            void tick();
          }, 900);
          return;
        }

        stopRuntimePolling();
      } catch {
        stopRuntimePolling();
      }
    };

    void tick();
  };

  const getPlayerName = () => {
    const state = get();
    const nickname = state.profile?.nickname?.trim();
    if (nickname) {
      return nickname;
    }

    const email = state.session?.user.email?.trim();
    if (email) {
      return email.split('@')[0] || 'Player';
    }

    return 'Player';
  };

  const buildRuntimeRequest = (): LauncherRuntimeRequest | null => {
    const state = get();
    if (!state.session?.user.id) {
      return null;
    }

    return {
      release: mapReleaseDescriptor(state.activeRelease),
      settings: {
        instancePath: state.settings.instancePath,
        debugMode: state.settings.debugMode,
        minRamMb: state.settings.minRamMb,
        maxRamMb: state.settings.maxRamMb,
        javaPath: state.settings.javaPath,
      },
      playerName: getPlayerName(),
      playerId: state.session.user.id,
      installState: state.installState,
      banReason: state.activeBan?.reason ?? null,
    };
  };

  const clearLauncherData = () => {
    stopInstallPolling();
    stopRuntimePolling();
    set({
      session: null,
      roles: [],
      profile: null,
      activeBan: null,
      news: [],
      activeRelease: null,
      authError: '',
      dataError: '',
      registerMessage: '',
      dataLoading: false,
      serverStatus: 'offline',
      installState: {
        ...baseState.installState,
        instancePath: get().settings.instancePath,
      },
      runtimeState: { ...baseState.runtimeState },
    });
  };

  const validateRuntimeIfPossible = async () => {
    const request = buildRuntimeRequest();
    if (!request || request.installState.phase !== 'ready') {
      set({
        runtimeState: {
          ...baseState.runtimeState,
          message: request
            ? 'Install a ready build before validating runtime.'
            : baseState.runtimeState.message,
        },
      });
      return;
    }

    const runtimeState = await launcherApi.validateRuntime(request);
    const runtimeLogs = await launcherApi.getRecentLaunchLogs();
    set({ runtimeState: { ...runtimeState, logs: runtimeLogs } });

    if (shouldPollRuntime(runtimeState.phase)) {
      startRuntimePolling();
    } else {
      stopRuntimePolling();
    }
  };

  const syncInstallState = async (
    releaseOverride?: LauncherStore['activeRelease'],
  ) => {
    const state = get();
    const activeRelease = releaseOverride ?? state.activeRelease;
    const installState = await launcherApi.checkBuildStatus(
      mapReleaseDescriptor(activeRelease),
      {
        instancePath: state.settings.instancePath,
        debugMode: state.settings.debugMode,
        minRamMb: state.settings.minRamMb,
        maxRamMb: state.settings.maxRamMb,
        javaPath: state.settings.javaPath,
      },
    );
    set({ installState });

    if (installState.phase === 'ready') {
      await validateRuntimeIfPossible();
    } else {
      set({
        runtimeState: {
          ...baseState.runtimeState,
          message: 'Install or update the build before launching Minecraft.',
        },
      });
    }
  };

  const loadLauncherData = async (userId: string) => {
    set({ dataLoading: true, dataError: '' });

    try {
      const roles = await fetchUserRoles(userId);
      const activeBan = await fetchCurrentBan(userId);
      const profile = await fetchProfile(userId);
      const news = await fetchPublishedNews();
      const activeRelease = await fetchActiveRelease();

      set({
        roles: roles.map((entry) => entry.role),
        activeBan,
        profile,
        news,
        activeRelease,
        serverStatus: 'online',
      });

      await syncInstallState(activeRelease);
    } catch (error) {
      set({
        dataError:
          error instanceof Error
            ? error.message
            : 'Failed to load launcher data.',
        roles: [],
        activeBan: null,
        profile: null,
        news: [],
        activeRelease: null,
        serverStatus: 'degraded',
      });
    } finally {
      set({ dataLoading: false });
    }
  };

  const syncSession = async (session: Session | null) => {
    set({ session, authError: '', registerMessage: '' });

    if (!session?.user.id) {
      clearLauncherData();
      return;
    }

    set({ session, serverStatus: 'degraded' });
    await loadLauncherData(session.user.id);
  };

  const installWithRequest = async (request: LauncherInstallRequest) => {
    const nextState = await launcherApi.installBuild(request);
    set({ installState: nextState });

    if (
      nextState.phase === 'bootstrapping_minecraft' ||
      nextState.phase === 'bootstrapping_neoforge' ||
      nextState.phase === 'applying_modpack'
    ) {
      startInstallPolling();
      return;
    }

    if (nextState.phase === 'ready') {
      await syncInstallState();
    }
  };

  return {
    setLogsVisible: (value: boolean) => set({ logsVisible: value }),
    updateSettings: (value: Partial<LauncherStore['settings']>) => {
      const nextSettings = normalizeSettings({
        ...get().settings,
        ...value,
      });

      set({ settings: nextSettings });
      void syncInstallState();
    },
    refreshInstallState: async () => {
      await syncInstallState();
    },
    validateRuntime: async () => {
      await validateRuntimeIfPossible();
    },
    launchGame: async () => {
      const request = buildRuntimeRequest();
      if (!request) {
        return;
      }

      if (request.banReason) {
        set({
          runtimeState: {
            ...get().runtimeState,
            phase: 'failed',
            lastError: `Play is blocked by ban: ${request.banReason}`,
            message: 'Minecraft launch is blocked by an active ban.',
            canLaunch: false,
          },
        });
        return;
      }

      if (request.installState.phase !== 'ready') {
        set({
          runtimeState: {
            ...get().runtimeState,
            phase: 'failed',
            lastError:
              'Build stack is not ready. Bootstrap or update before launching.',
            message: 'Minecraft launch is blocked until the build is ready.',
            canLaunch: false,
          },
        });
        return;
      }

      const runtimeState = await launcherApi.launchGame(request);
      const runtimeLogs = await launcherApi.getRecentLaunchLogs();
      set({ runtimeState: { ...runtimeState, logs: runtimeLogs } });

      if (shouldPollRuntime(runtimeState.phase)) {
        startRuntimePolling();
      }
    },
    stopGame: async () => {
      const runtimeState = await launcherApi.stopGame();
      const runtimeLogs = await launcherApi.getRecentLaunchLogs();
      set({ runtimeState: { ...runtimeState, logs: runtimeLogs } });

      if (shouldPollRuntime(runtimeState.phase)) {
        startRuntimePolling();
      }
    },
    installActiveRelease: async () => {
      const state = get();
      const release = mapReleaseDescriptor(state.activeRelease);

      if (!release) {
        set((current) => ({
          installState: {
            ...current.installState,
            phase: 'failed',
            lastError:
              'No active release with a modpack ZIP URL is available for install.',
            message: 'Install cannot start without an active modpack ZIP release.',
          },
        }));
        return;
      }

      await installWithRequest({
        release,
        settings: {
          instancePath: state.settings.instancePath,
          debugMode: state.settings.debugMode,
          minRamMb: state.settings.minRamMb,
          maxRamMb: state.settings.maxRamMb,
          javaPath: state.settings.javaPath,
        },
      });
    },
    retryInstall: async () => {
      const nextState = await launcherApi.retryInstall();
      set({ installState: nextState });

      if (
        nextState.phase === 'bootstrapping_minecraft' ||
        nextState.phase === 'bootstrapping_neoforge' ||
        nextState.phase === 'applying_modpack'
      ) {
        startInstallPolling();
        return;
      }

      if (nextState.phase === 'ready') {
        await syncInstallState();
      }
    },
    initializeApp: async () => {
      if (initializePromise) {
        return initializePromise;
      }

      initializePromise = (async () => {
        set({
          bootstrapping: true,
          configured: isSupabaseConfigured,
          authError: '',
        });

        const [appInfo, installState, runtimeState] = await Promise.all([
          launcherApi.getAppInfo(),
          launcherApi.getInstallState(),
          launcherApi.getLaunchState(),
        ]);

        set({
          appVersion: appInfo?.version ?? baseState.appVersion,
          platform: appInfo?.platform ?? 'unknown',
          installState,
          runtimeState,
        });

        if (!supabase) {
          set({
            shellReady: true,
            bootstrapping: false,
            authError:
              'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
            serverStatus: 'offline',
          });
          return;
        }

        if (!authSubscriptionBound) {
          authSubscriptionBound = true;
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            void syncSession(session);
          });

          void subscription;
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          set({ authError: error.message, serverStatus: 'degraded' });
        }

        await syncSession(data.session);
        set({ shellReady: true, bootstrapping: false });
      })().finally(() => {
        initializePromise = null;
      });

      return initializePromise;
    },
    signIn: async (email: string, password: string) => {
      if (!supabase) {
        set({
          authError:
            'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        });
        return false;
      }

      set({ authBusy: true, authError: '', registerMessage: '' });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ authBusy: false, authError: error.message });
        return false;
      }

      await syncSession(data.session);
      set({ authBusy: false, serverStatus: 'online' });
      return true;
    },
    signUp: async (email: string, password: string) => {
      if (!supabase) {
        set({
          authError:
            'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        });
        return false;
      }

      set({ authBusy: true, authError: '', registerMessage: '' });

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        set({ authBusy: false, authError: error.message });
        return false;
      }

      if (data.session) {
        await syncSession(data.session);
        set({
          authBusy: false,
          registerMessage: 'Registration complete. You are signed in.',
        });
        return true;
      }

      set({
        authBusy: false,
        registerMessage:
          'Registration complete. Check your email if confirmation is enabled, then sign in.',
      });
      return true;
    },
    signOut: async () => {
      if (supabase) {
        await supabase.auth.signOut();
      }

      clearLauncherData();
    },
  };
}



