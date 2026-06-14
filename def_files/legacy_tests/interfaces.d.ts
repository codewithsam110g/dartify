// Legacy Test Cases: Interfaces
// Extracted from js_facade_gen/test/declaration_test.ts & js_interop_test.ts

// 3.1 Empty interface
interface EmptyInterface {}

// 3.2 Interface extends
interface ExtendedInterface extends BaseA, BaseB {}
interface BaseA {}
interface BaseB {}

// 3.3 Interface with properties (property bag)
interface PropertyBag {
  x: string;
  y: any;
}

// 3.4 Interface with methods
interface MethodInterface {
  doWork(): void;
}

// 3.5 Property bag with inheritance
interface ShapeConfig {
  a: string;
  b: number;
  c: ShapeConfig;
}

interface ExtendedShapeConfig extends ShapeConfig {
  d: number;
  /** example comment */
  e: any;
}

// 3.6 Callable interface (single call signature)
interface SingleCallable {
  (n: number): boolean;
}

// 3.7 Generic callable interface
interface GenericCallable<A, B> {
  (a: A): B;
}

// 3.8 Callable interface with methods
interface CallableWithMethods<T> {
  (a: T): T;
  process(): T;
}

// 3.9 Interface with invalid property names
interface InvalidPropNames {
  '!@#$%^&*': string;
}

// 3.10 Interface with numeric-start property name
interface NumericStartProp {
  '5abcde': string;
}

// 3.11 Interface with underscore property name
interface UnderscoreProp {
  '_wxyz': string;
}

// 3.12 Interface with valid quoted property
interface ValidQuotedProp {
  'foo_34_81$': string;
}

// 3.13 this return type
interface FluentInterface {
  bar(): this;
}

// 3.14 Generic interface with properties
interface GenericPropertyBag<A> {
  a: A;
  b: number;
  c: GenericPropertyBag<A>;
}

interface ExtendedGenericBag<A, B> extends GenericPropertyBag<A> {
  d: B;
  e: any;
}
