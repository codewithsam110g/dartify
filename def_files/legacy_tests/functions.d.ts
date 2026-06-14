// Legacy Test Cases: Functions
// Extracted from js_facade_gen/test/function_test.ts

// 6.1 Simple function declaration
declare function simpleFunc(): void;

// 6.2 Default parameter values (become optional)
declare function defaultParams(a?: number, b?: number): number;

// 6.3 Optional parameters
declare function optionalParams(a?: number, b?: number): number;

// 6.4 Mixed required + optional
declare function mixedParams(p1: string, a?: number, b?: number): number;

// 6.5 Rest parameters
declare function restParams(...a: number[]): number;

// 6.6 Named rest parameters
declare function namedRest(firstName: string, ...restOfName: string[]): string;

// 6.7 Function parameters (callback)
declare function withCallback(fn: (a: string, b: number) => boolean): void;

// 6.8 Recursive function parameters
declare function recursiveCallback(fn: (a: (b: string) => number) => boolean): void;

// 6.9 Generic-typed function parameters
declare function genericCallback<T, U>(fn: (a: T, b: U) => T): void;

// 6.10 Function taking rest parameter callback → untyped Function
declare function restCallback(fn: (...a: string[]) => number): void;

// 6.11 Type predicate
declare function isArrayBuffer(value?: any): value is ArrayBuffer;

// 6.12 Generic functions
declare function sort<T, U>(xs: T[]): T[];
declare function wobble<T, U>(u: U): T;
declare function wobbleSingle<T>(foo: T): T;

// 6.13 Return type void
declare function voidReturn(): void;

// 6.14 No return type
declare function noReturn(): any;
