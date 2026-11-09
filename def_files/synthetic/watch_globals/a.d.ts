interface Settings {
  theme: string;
}
declare function configure(s: Settings): void;
declare namespace NS {
  interface Opt {
    a: number;
  }
}
