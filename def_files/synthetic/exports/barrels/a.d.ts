export interface A {
  x: string;
  y: number;
}
export declare class Box<T extends A = A> {
  constructor(value: T);
  value: T;
  static of<T extends A>(value: T): Box<T>;
}
export declare function makeA(): A;
export declare const flag: boolean;
