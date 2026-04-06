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

import { baseState } from './base-state';
import type { LauncherStore } from './types';

let initializePromise: Promise<void> | null = null;
let authSubscriptionBound = false;

export function createLauncherActions(set: StoreApi<LauncherStore>['setState']) {
  const clearLauncherData = () => {
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
    });
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

  return {
    setLogsVisible: (value: boolean) => set({ logsVisible: value }),
    updateSettings: (value: Partial<LauncherStore['settings']>) =>
      set((state) => ({
        settings: normalizeSettings({
          ...state.settings,
          ...value,
        }),
      })),
    initializeApp: async () => {
      if (initializePromise) {
        return initializePromise;
      }

      initializePromise = (async () => {
        set({ bootstrapping: true, configured: isSupabaseConfigured, authError: '' });

        const appInfo = await launcherApi.getAppInfo();
        set({
          appVersion: appInfo?.version ?? baseState.appVersion,
          platform: appInfo?.platform ?? 'unknown',
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
