// Legacy Test Cases: Promise → Future conversion
// Extracted from js_facade_gen/test/declaration_test.ts

// 12.1 Class method returning Promise
declare class PromiseMethodClass {
  randomInRange(start: number, end: number): Promise<number>;
}

// 12.2 Generic class with Promise method
declare class GenericPromiseClass<T> {
  f(a: T): Promise<T>;
}

// 12.3 Class with Promise property (readonly)
declare class PromisePropertyClass {
  readonly two: Promise<number>;
  three: Promise<number>;
}

// 12.4 Generic class with Promise property
declare class GenericPromisePropertyClass<T> {
  aPromise: Promise<T>;
}

// 12.5 Inherited class with Promise method
declare class BasePromiseClass {
  a: number;
}
declare class ChildPromiseClass extends BasePromiseClass {
  f(): Promise<string>;
}

// 12.6 Overloaded Promise methods
declare class OverloadedPromiseClass {
  f(a: string): Promise<number>;
  f(a: string, b: number): Promise<number>;
}

// 12.7 Complex overloaded Promise methods
declare class ComplexPromiseOverload {
  f(a: string): Promise<number>;
  f(a: number, b: number): Promise<number>;
  f(c: number[]): Promise<number>;
}

// 12.8 Interface with Promise method
declare interface PromiseInterface<T> {
  f(a: T): Promise<T>;
}

// 12.9 Inherited interface with Promise method
declare interface BasePromiseInterface {
  a: number;
}
declare interface ChildPromiseInterface extends BasePromiseInterface {
  f(): Promise<string>;
}
