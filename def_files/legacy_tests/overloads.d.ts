// Legacy Test Cases: Overloads
// Extracted from js_facade_gen/test/declaration_test.ts & js_interop_test.ts

// 10.1 Simple method overloads (compatible — optional params)
declare class SimpleOverload {
  f(a: string): number;
  f(a: string, b: number): string;
}

// 10.2 Complex method overloads (incompatible types)
declare class ComplexOverload {
  f(a: string): number;
  f(a: number, b: number): number;
  f(c: number[]): number;
}

// 10.3 Class method overloads
declare class MethodOverload {
  F(a: string): number;
  F(a: string, b: string | number): string;
  F(a2: string, b: string, c: number): string;
}

// 10.4 Generic method overloads
declare class GenericMethodOverload<T> {
  createElement<T>(tagName: 'img'): T;
  createElement<T>(tagName: 'video'): T;
  createElement<T>(tagName: string): T;
}

// 10.5 Free function overloads
declare function buildName(
  firstName: string,
  ...restOfName: string[]
): string;

// 10.6 Interface callable + function overloads
interface ScaleLinear<O> {
  (value: number): O;
  domain(): Array<O>;
}
declare function scaleLinear(): ScaleLinear<number>;
declare function scaleLinear<O>(): ScaleLinear<O>;

// 10.7 Event listener overloads
interface SampleAudioNode {
  addEventListener(
    type: 'ended',
    listener: (ev: Event) => any,
    useCapture?: boolean
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    useCapture?: boolean
  ): void;
}
