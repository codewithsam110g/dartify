// JavaScript implementation of probe.d.ts for the dart2js runtime gate.
globalThis.self = globalThis;
class Counter {
  constructor(start, step) {
    this.value = start;
    this.step = step === undefined ? 1 : step;
    this._secret = "hidden";
  }
  increment(by) {
    this.value += by === undefined ? this.step : by;
    return this.value;
  }
  static create() {
    return new Counter(100);
  }
}
class Doubler extends Counter {
  double() {
    return this.value * 2;
  }
}
globalThis.probe = {
  join: (sep, ...values) => `${values.length}:${values.join(sep)}`,
  overloaded: (value) => `${typeof value}:${value}`,
  Counter,
  Doubler,
  makeDict: () => ({ a: 1 }),
  describe: (options) => `${options.name}/${options.size}/${Object.keys(options).sort().join(",")}`,
  delay: (value) => new Promise((resolve) => setTimeout(() => resolve(value * 2), 1)),
  Color: { Red: 0, Green: 1 },
  Config: { version: "1.2.3" },
};
