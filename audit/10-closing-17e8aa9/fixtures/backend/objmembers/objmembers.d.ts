// Members that collide with dart:core Object members.
export declare class Big {
  toString(base: number): string;
  hashCode: string;
  runtimeType: number;
  noSuchMethod(x: number): void;
}
export interface Formatter {
  toString(radix: number): string;
}
