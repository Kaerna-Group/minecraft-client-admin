import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { baseState } from '@renderer/store/model/base-state';
import { createLauncherActions } from '@renderer/store/model/actions';
import type { LauncherStore } from '@renderer/store/model/types';

export const useLauncherStore = create<LauncherStore>()(
  persist(
    (set, get) => ({
      ...baseState,
      ...createLauncherActions(set, get),
    }),
    {
      name: 'kaerna-launcher-shell',
      partialize: (state) => ({
        logsVisible: state.logsVisible,
        settings: state.settings,
      }),
    },
  ),
);
