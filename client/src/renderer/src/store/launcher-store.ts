import { persist } from 'zustand/middleware';
import { create } from 'zustand';

import {
  defaultSettings,
  normalizeSettings,
  type LauncherSettings,
} from '../lib/settings';

type MockSession = {
  isAuthenticated: boolean;
  email: string;
};

type LauncherStore = {
  shellReady: boolean;
  logsVisible: boolean;
  appVersion: string;
  updateStatus: string;
  buildStatus: string;
  serverStatus: 'online' | 'degraded' | 'offline';
  mockSession: MockSession;
  settings: LauncherSettings;
  setShellReady: (value: boolean) => void;
  setLogsVisible: (value: boolean) => void;
  updateSettings: (value: Partial<LauncherSettings>) => void;
  signInPlaceholder: (email: string) => void;
  signOutPlaceholder: () => void;
};

export const useLauncherStore = create<LauncherStore>()(
  persist(
    (set) => ({
      shellReady: false,
      logsVisible: true,
      appVersion: '0.1.0-shell',
      updateStatus: 'Launcher updates are mocked for this phase.',
      buildStatus: 'Build delivery is mocked until Phase 4.',
      serverStatus: 'degraded',
      mockSession: {
        isAuthenticated: false,
        email: 'guest@local',
      },
      settings: defaultSettings,
      setShellReady: (value) => set({ shellReady: value }),
      setLogsVisible: (value) => set({ logsVisible: value }),
      updateSettings: (value) =>
        set((state) => ({
          settings: normalizeSettings({
            ...state.settings,
            ...value,
          }),
        })),
      signInPlaceholder: (email) =>
        set({
          mockSession: {
            isAuthenticated: true,
            email,
          },
          serverStatus: 'online',
        }),
      signOutPlaceholder: () =>
        set({
          mockSession: {
            isAuthenticated: false,
            email: 'guest@local',
          },
        }),
    }),
    {
      name: 'kaerna-launcher-shell',
      partialize: (state) => ({
        logsVisible: state.logsVisible,
        settings: state.settings,
        mockSession: state.mockSession,
      }),
    },
  ),
);
