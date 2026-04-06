import { useLauncherStore } from '../store/launcher-store';

describe('launcher store', () => {
  it('starts with shell not ready and placeholder statuses', () => {
    const state = useLauncherStore.getState();

    expect(state.shellReady).toBe(false);
    expect(state.updateStatus).toContain('mocked');
    expect(state.buildStatus).toContain('Phase 4');
  });
});
