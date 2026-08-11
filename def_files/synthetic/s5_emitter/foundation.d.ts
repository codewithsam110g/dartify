/** A generic base with a constrained and defaulted identifier type. */
export interface Entity<TId extends string | number = string> {
  readonly id: TId;
  metadata?: Record<string, unknown>;
}

/** Reopened declarations must become one Dart-visible interface. */
export interface Reopened {
  first: string;
}
export interface Reopened {
  second(value?: number): boolean;
}

/** A class/interface merge must retain members from both declarations. */
export declare class Service {
  constructor(url: string);
  readonly url: string;
  start(): void;
}
export interface Service {
  mergedFlag: boolean;
}

export interface WidgetOptions {
  label?: string;
  size: readonly [number, number];
  mode: "compact" | "full";
}

/** Constructor-companion pattern: interface instance plus variable value. */
export interface WidgetType extends Entity<number> {
  name: string;
  configure(options: WidgetOptions): this;
  configure(label: string, size?: number): this;
}
export declare var Widget: {
  readonly prototype: WidgetType;
  new (name: string): WidgetType;
  new (name: string, options: WidgetOptions): WidgetType;
  readonly version: string;
  create(options?: WidgetOptions): WidgetType;
};

/** Same-name interface and value retain distinct type/value facets. */
export interface Codec {
  encode(value: string): Uint8Array;
}
export declare const Codec: {
  parse(bytes: Uint8Array): Codec;
  readonly defaultEncoding: string;
};

/** Callable, constructable, indexable interface with accessors and overloads. */
export interface Registry<T extends Entity = Entity> {
  (value: T): boolean;
  new (value: T): Registry<T>;
  readonly [key: string]: T;
  get current(): T | undefined;
  set current(value: T | undefined);
  lookup(id: string): T | undefined;
  lookup(id: number): T | undefined;
}

/** Free-function overloads need stable Dart names and one exact JS name. */
export declare function select(value: string): WidgetType;
export declare function select(value: number, strict?: boolean): WidgetType;

/** Reopened namespaces retain distinct nested declarations and value members. */
export declare namespace Toolkit {
  interface Options {
    retries?: number;
  }
  function create(options?: Options): WidgetType;
}
export declare namespace Toolkit {
  const version: string;
  namespace Nested {
    interface Options {
      trace: boolean;
    }
  }
}

/** Reserved and computed JS member names require explicit Dart-safe names. */
export interface OddNames {
  class: string;
  static(): boolean;
  "kebab-name": number;
  [Symbol.iterator](): Iterator<string>;
}

/** Enum initializers exercise implicit, numeric, string, and computed forms. */
export enum State {
  Idle,
  Ready = 2,
  Label = "ready",
  Mask = Ready << 1,
}

export declare const immutableCount: number;
export declare let mutableLabel: string;
export declare var replaceableWidget: WidgetType;

/** Type forms with explicit S5 lowering policy. */
export type PrimitiveUnion = string | number | null;
export type Pair = readonly [name: string, count?: number];
export type Combined = Reopened & { extra: boolean };
export type Keys = keyof WidgetOptions;
export type TemplateKey = `widget-${string}`;
export type ValueOf<T> = T[keyof T];
export type Conditional<T> = T extends Entity ? T["id"] : never;
export type Mapped<T> = { readonly [K in keyof T]?: T[K] };

/** Inline structural types must be hoisted and reused deterministically. */
export declare function withInline(
  options: { width: number; nested: { enabled: boolean } },
  equivalent: { width: number; nested: { enabled: boolean } },
): { ok: true; value: WidgetType };
