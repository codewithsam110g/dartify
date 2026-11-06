// The lodash shape: the module is the function, and a merged namespace
// supplies its properties. `Callable` is the module object itself.
declare function callable(x: number): number;
declare namespace callable {
  function member(y: number): number;
  const LEVEL: string;
}
export = callable;
export as namespace Callable;
