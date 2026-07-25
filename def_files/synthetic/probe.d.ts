// Synthetic regression fixture — the only hand-written file under def_files/.
//
// Every construct here corresponds to at least one audit finding. It exists so
// that a single run exercises the known-broken surface, rather than needing a
// 400-file library to reproduce a one-line bug.
//
// Covers: E-01 E-02 E-03 E-04 E-05 E-06 E-07 E-09 E-14 E-16
//         P-03 P-04 P-05 T-01 T-07 I-01 I-04 I-05

// ── E-03 type params, E-04 heritage, E-02 constructor overloads ──────────────
declare class Base<T> {
  baseValue: T;
}
interface Holder<T> {
  held: T;
}
interface Named {
  name: string;
}

declare class Box<T> extends Base<T> implements Holder<T>, Named {
  constructor(a: string);
  constructor(a: string, b: number);
  held: T;
  name: string;
  value: T;
  map<U>(fn: (t: T) => U): Box<U>;
  /** E-01: an underscore in a method name must survive into @JS() */
  to_json(): string;
}

// ── E-01: `.split("_")[0]` truncates this to @JS("my") ───────────────────────
declare function my_func(a: string): void;

// ── E-05 / P-05: readonly and const must not emit as mutable fields ──────────
declare const readonly_const: number;
declare var mutable_var: string;

// ── P-03 / I-05: call and construct signatures on interfaces ─────────────────
interface Callable {
  (n: number): boolean;
}
interface Constructable {
  new (n: number): Box<number>;
}

// ── I-04: heritage with generic args and multiple parents ────────────────────
interface Child extends Holder<string>, Named {
  x: string;
}

// ── E-14: index signatures must use their real key/value types ───────────────
interface Dict {
  [key: string]: number;
}
interface ReadonlyDict {
  readonly [key: number]: string;
}

// ── T-01 / E-16: unrepresentable types must become named, documented symbols ─
declare var keyofThing: keyof Box<string>;
declare var tmpl: `pre-${string}`;
declare var cond: string extends number ? true : false;
declare var idx: Box<string>["value"];
declare var predicateHolder: (x: unknown) => x is string;
declare var typeofThing: typeof readonly_const;
type Mapped<T> = { [K in keyof T]: T[K] };
type Inferred<T> = T extends Array<infer U> ? U : never;

// ── T-07: bare null in type position should be Null, not dynamic ─────────────
declare var nullable: string | null;
declare var bareNull: null;

// ── P-07: `this` return type — ~1,100 corpus occurrences, the #1 type gap ────
interface Fluent {
  chain(): this;
}

// ── P-04 / E-06: enum values are not all strings ─────────────────────────────
declare enum E {
  A = 1,
  B,
  C = "see",
}

// ── E-09: Dart reserved words must be escaped, @JS() must keep the original ──
interface Keywords {
  static: boolean;
  class: string;
  extends: number;
}

// ── E-07: hoisted anonymous types need a factory constructor ─────────────────
declare function withOptions(opts: { width: number; height: number }): void;

// ── E-10 / L-11: namespace collisions must not flatten onto each other ───────
declare namespace A {
  interface Opts {
    a: string;
  }
}
declare namespace B {
  interface Opts {
    b: number;
  }
}
