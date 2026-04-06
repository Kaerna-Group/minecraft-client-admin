import { defaultSettings, normalizeSettings } from '../lib/settings';

describe('normalizeSettings', () => {
  it('falls back to defaults for empty input', () => {
    expect(normalizeSettings()).toEqual(defaultSettings);
  });

  it('keeps configured maxRam only when it is not below minRam', () => {
    expect(
      normalizeSettings({
        minRamMb: 4096,
        maxRamMb: 2048,
      }).maxRamMb,
    ).toBe(defaultSettings.maxRamMb);
  });
});
