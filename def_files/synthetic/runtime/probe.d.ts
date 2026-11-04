/**
 * Runtime interop probe (task 4.15, X-14). Compiled with dart2js and executed
 * against `probe.js` by `pnpm test:dart`; analyzer-clean output is not enough
 * evidence for JavaScript dispatch.
 */
declare namespace probe {
  /** Rest parameters must reach JavaScript as separate arguments (E-31). */
  function join(sep: string, ...values: string[]): string;

  /** Overloads bind distinct Dart names to one JavaScript function. */
  function overloaded(value: string): string;
  function overloaded(value: number): string;

  class Counter {
    constructor(start: number);
    constructor(start: number, step: number);
    value: number;
    readonly _secret: string;
    increment(): number;
    increment(by: number): number;
    static create(): Counter;
  }

  class Doubler extends Counter {
    double(): number;
  }

  interface Dict {
    [key: string]: number;
  }
  function makeDict(): Dict;

  interface Options {
    name: string;
    size?: number;
  }
  function describe(options: Options): string;

  function delay(value: number): Promise<number>;

  enum Color {
    Red,
    Green,
  }

  /** Non-constructable value merge: no implicit Dart constructor (E-35). */
  interface Config {
    instance: string;
  }
  const Config: { readonly version: string };
}

declare const enum Mode {
  A = 1,
  B = A << 2,
}
