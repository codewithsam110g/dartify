export declare class Counter {
  constructor(start: number);
  value: number;
  next(): number;
  static zero(): Counter;
}

export declare function tally(a: number, b: number): number;

export declare const VERSION: string;
