export type LauncherSettings = {
  minRamMb: number;
  maxRamMb: number;
  javaPath: string;
  instancePath: string;
  debugMode: boolean;
};

export const defaultSettings: LauncherSettings = {
  minRamMb: 2048,
  maxRamMb: 4096,
  javaPath: 'C:\\Program Files\\Java\\bin\\java.exe',
  instancePath: 'C:\\KaernaLauncher\\instance',
  debugMode: false,
};

export const normalizeSettings = (
  input?: Partial<LauncherSettings>,
): LauncherSettings => ({
  minRamMb: input?.minRamMb ?? defaultSettings.minRamMb,
  maxRamMb:
    input?.maxRamMb && input.maxRamMb >= (input.minRamMb ?? defaultSettings.minRamMb)
      ? input.maxRamMb
      : defaultSettings.maxRamMb,
  javaPath: input?.javaPath?.trim() || defaultSettings.javaPath,
  instancePath: input?.instancePath?.trim() || defaultSettings.instancePath,
  debugMode: input?.debugMode ?? defaultSettings.debugMode,
});
