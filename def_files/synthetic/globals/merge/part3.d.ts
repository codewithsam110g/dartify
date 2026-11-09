// A third script file: TypeScript merges it into the same global Settings too.
interface Settings {
  extra: boolean;
}
declare function describeSettings(settings: Settings): string;
