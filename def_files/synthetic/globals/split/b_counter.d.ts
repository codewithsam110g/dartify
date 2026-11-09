// The value half of Counter: one class owned by a_counter.d.ts, with this file's
// constructor and statics (HD-06).
declare var Counter: {
  prototype: Counter;
  new (start: number): Counter;
  zero(): Counter;
  DEFAULT: number;
};
