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
import type { LauncherInstallRequest, LauncherReleaseDescriptor } from '../../../../shared/launcher-api';

import { baseState } from './base-state';
import type { LauncherStore } from './types';

let initializePromise: Promise<void> | null = null;
let authSubscriptionBound = false;
let installPollingTimer: ReturnType<typeof setTimeout> | null = null;

function mapReleaseDescriptor(release: LauncherStore['activeRelease']): LauncherReleaseDescriptor | null {
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

export function createLauncherActions(set: StoreApi<LauncherStore>['setState'], get: StoreApi<LauncherStore>['getState']) {
  const stopInstallPolling = () => {
    if (installPollingTimer) {
      clearTimeout(installPollingTimer);
      installPollingTimer = null;
    }
  };

  const startInstallPolling = () => {
    stopInstallPolling();

    const tick = async () => {
      try {
        const installState = await launcherApi.getInstallState();
        set({ installState });

        if (installState.phase === 'downloading' || installState.phase === 'extracting') {
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

  const clearLauncherData = () => {
    stopInstallPolling();
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
    });
  };

  const syncInstallState = async (releaseOverride?: LauncherStore['activeRelease']) => {
    const state = get();
    const activeRelease = releaseOverride ?? state.activeRelease;
    const installState = await launcherApi.checkBuildStatus(mapReleaseDescriptor(activeRelease), {
      instancePath: state.settings.instancePath,
      debugMode: state.settings.debugMode,
    });
    set({ installState });
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
        dataError: error instanceof Error ? error.message : 'Failed to load launcher data.',
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

    if (nextState.phase === 'downloading' || nextState.phase === 'extracting') {
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
    installActiveRelease: async () => {
      const state = get();
      const release = mapReleaseDescriptor(state.activeRelease);

      if (!release) {
        set((current) => ({
          installState: {
            ...current.installState,
            phase: 'failed',
            lastError: 'No active release with a ZIP URL is available for install.',
            message: 'Install cannot start without an active ZIP release.',
          },
        }));
        return;
      }

      await installWithRequest({
        release,
        settings: {
          instancePath: state.settings.instancePath,
          debugMode: state.settings.debugMode,
        },
      });
    },
    retryInstall: async () => {
      const nextState = await launcherApi.retryInstall();
      set({ installState: nextState });

      if (nextState.phase === 'downloading' || nextState.phase === 'extracting') {
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
        set({ bootstrapping: true, configured: isSupabaseConfigured, authError: '' });

        const [appInfo, installState] = await Promise.all([
          launcherApi.getAppInfo(),
          launcherApi.getInstallState(),
        ]);

        set({
          appVersion: appInfo?.version ?? baseState.appVersion,
          platform: appInfo?.platform ?? 'unknown',
          installState,
        });

        if (!supabase) {
          set({
            shellReady: true,
            bootstrapping: false,
            authError: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
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
        set({ authError: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' });
        return false;
      }

      set({ authBusy: true, authError: '', registerMessage: '' });

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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
        set({ authError: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' });
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
        set({ authBusy: false, registerMessage: 'Registration complete. You are signed in.' });
        return true;
      }

      set({
        authBusy: false,
        registerMessage: 'Registration complete. Check your email if confirmation is enabled, then sign in.',
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


