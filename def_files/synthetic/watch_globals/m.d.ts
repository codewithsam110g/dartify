export {};
declare global {
  interface Settings {
    locale: string;
  }
}
export interface FromModule {
  settings: Settings;
}
