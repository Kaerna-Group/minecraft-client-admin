export type LauncherAppInfo = {
  name: string;
  version: string;
  platform: string;
};

export type LauncherApi = {
  getAppInfo: () => Promise<LauncherAppInfo>;
  ping: () => Promise<string>;
};
