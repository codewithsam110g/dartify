interface Settings {
  size: number;
}
declare function configure(s: Settings, extra: string): void;
declare namespace NS {
  interface Opt {
    b: string;
  }
  function make(): Opt;
}
