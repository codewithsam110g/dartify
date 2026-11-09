// JavaScript for the cross-file global fixtures (`merge/`, `augment/`), loaded
// by `pnpm test:dart` before the dart2js output runs.
globalThis.self = globalThis;
// dart:html reaches the page's global through `window`.
globalThis.window = globalThis;

// merge/: Settings is declared in three script files, so Dart has one class.
const sorted = (value) => JSON.stringify(value, Object.keys(value).sort());
globalThis.configure = (settings) => {
  console.log(`configure ${sorted(settings)}`);
};
globalThis.describeSettings = (settings) =>
  `${settings.theme}/${settings.size}/${settings.locale}/${settings.extra}`;

// augment/: members the extension on dart:html's Window reads, writes and calls.
globalThis.myProp = "hello";
globalThis.version = 7;
globalThis.other = true;
globalThis.ping = function (n, label) {
  return `${arguments.length}:${n}:${label}`;
};
globalThis.add = (a, b) => a + b;

// core/: members of lib types the core lowering maps to Dart SDK types. dart2js
// lists, strings, numbers and booleans are the JavaScript values themselves, so
// the extensions on them reach what is defined on the JavaScript prototypes.
const define = (prototype, name, descriptor) =>
  Object.defineProperty(prototype, name, { configurable: true, enumerable: false, ...descriptor });
define(Array.prototype, "firstOr", {
  value(fallback) {
    return this.length > 0 ? this[0] : fallback;
  },
});
define(Array.prototype, "chunks", {
  value(size) {
    const groups = [];
    for (let at = 0; at < this.length; at += size) groups.push(this.slice(at, at + size));
    return groups;
  },
});
define(Array.prototype, "labels", {
  get() {
    return this.map((item) => `L${item}`);
  },
  set(value) {
    console.log(`labels set ${Array.isArray(value)} ${value.join("+")}`);
  },
});
define(Array.prototype, "maybeLabels", {
  get() {
    return this.length === 0 ? undefined : ["m"];
  },
  set(value) {
    console.log(`maybeLabels set ${value === null ? "null" : Array.isArray(value)}`);
  },
});
define(Array.prototype, "words", { value() { return this.map((item) => `${item}`); } });
define(Array.prototype, "numbers", { value() { return this.map((item) => `${item}`.length); } });
define(Array.prototype, "boxes", { value() { return this.map((item) => ({ value: item })); } });
define(Array.prototype, "box", { value() { return { value: this[0] }; } });
define(Array.prototype, "second", { value() { return this[1]; } });
define(String.prototype, "shout", { value() { return `${this}`.toUpperCase() + "!"; } });
define(String.prototype, "vowels", { get() { return `${this}`.match(/[aeiou]/g) ?? []; } });
define(Number.prototype, "twice", { value() { return Number(this) * 2; } });
define(Boolean.prototype, "flip", { value() { return !this.valueOf(); } });
define(Object.prototype, "who", { value() { return "object"; } });
define(Function.prototype, "tag", { value() { return `fn:${typeof this}`; } });
globalThis.jsFn = function () {};
// What the generated bindings of core/b_use.d.ts call: each must be handed a real array.
globalThis.joinAll = (parts, extra) => {
  if (!Array.isArray(parts) || !Array.isArray(extra)) throw new Error("not an array");
  return `${parts.join("+")}/${extra.join("+")}`;
};
globalThis.shoutAll = (parts) => parts.map((part) => part.toUpperCase());
globalThis.describe = (text) => `<${text}>`;

// companion/: a member of the Window global, read through the extension.
globalThis.companionProp = "cp";

// redeclared/: one binding each for the identically repeated declarations.
globalThis.shared = 42;
globalThis.same = (x) => `same:${x}`;
globalThis.useShared = () => globalThis.shared + 1;

// split/: the constructor and statics of a class whose interface is in another file.
globalThis.Counter = class Counter {
  constructor(start) {
    this.value = start;
  }
  static zero() {
    return new Counter(0);
  }
};
globalThis.Counter.DEFAULT = 7;
globalThis.splitProp = "sp";
