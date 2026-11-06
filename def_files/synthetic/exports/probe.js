// JavaScript shaped like what TypeScript and bundlers produce for the
// declarations in `rooted/` and `ambient/`, loaded by `pnpm test:dart` before
// the dart2js output runs.
globalThis.self = globalThis;

class Counter {
  constructor(start) {
    this.value = start;
  }
  next() {
    return ++this.value;
  }
  static zero() {
    return new Counter(0);
  }
}
class Widget {
  constructor(name) {
    this.name = name;
  }
  label() {
    return `widget:${this.name}`;
  }
  static make(name) {
    return new Widget(name);
  }
}
class Stamp {
  mark() {
    return "stamp";
  }
}
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// rooted/entry.d.ts, generated with --js-root Root.
globalThis.Root = {
  default: (x) => x + 100, // export default function run
  publicName: (x) => x + 1, // export { hidden as publicName }
  Counter, // export * from "./core"
  tally: (a, b) => a + b,
  VERSION: "1.0",
  Gadget: Widget, // export { Widget as Gadget }
  util: (text) => `util:${text}`, // export { helper as util }
  Stamp, // import { Stamp }; export { Stamp }
  Tool: (x) => x * 2, // export { default as Tool }
  geometry: { area: (w, h) => w * h, Point }, // export * as geometry
};

// rooted/callable.d.ts: `export = callable` with a merged namespace; the
// module object is the function itself.
const Callable = (x) => x + 1;
Callable.member = (y) => y * 3;
Callable.LEVEL = "lodash";
globalThis.Callable = Callable;

// ambient/ambient.d.ts without a root: bare globals.
globalThis.Widget = class {
  constructor(name) {
    this.name = name;
  }
  label() {
    return `bare:${this.name}`;
  }
};
globalThis.make = () => new globalThis.Widget("made");

// ambient/ambient.d.ts with --js-root PKG.
const PkgWidget = class {
  constructor(name) {
    this.name = name;
  }
  label() {
    return `pkg:${this.name}`;
  }
};
globalThis.PKG = { Widget: PkgWidget, make: () => new PkgWidget("made") };
