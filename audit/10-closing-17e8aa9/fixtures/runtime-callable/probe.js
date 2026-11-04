// A JavaScript function object with a property, as TypeScript's Counter describes.
globalThis.makeCounter = () => {
  const counter = (step) => { counter.total += step; return counter.total; };
  counter.total = 0;
  return counter;
};
