# js_facade_gen Test Cases — Input/Output Reference

Extracted from the official `dart-lang/js_facade_gen` test suite.
This document serves as a reference for `dartify` to achieve feature parity and beyond.

> **Note:** The legacy tool strips `@JS() library ...;` and `import "package:js/js.dart";` from test output for brevity. All outputs assume those are present.

---

## 1. Variables (`declaration_test.ts` / `js_interop_test.ts`)

### 1.1 Variable with type and initializer
```typescript
var a:number = 1;
```
```dart
@JS()
external num get a;
@JS()
external set a(num v);
```

### 1.2 Variable without initializer
```typescript
var a:number;
```
```dart
@JS()
external num get a;
@JS()
external set a(num v);
```

### 1.3 Untyped variable
```typescript
var a;
```
```dart
@JS()
external get a;
@JS()
external set a(v);
```

### 1.4 `any` typed variable
```typescript
var a:any;
```
```dart
@JS()
external dynamic get a;
@JS()
external set a(dynamic v);
```

### 1.5 Custom type variable
```typescript
var a: A;
```
```dart
@JS()
external A get a;
@JS()
external set a(A v);
```

### 1.6 Multi-variable declaration
```typescript
var a, b;
```
```dart
@JS()
external get a;
@JS()
external set a(v);
@JS()
external get b;
@JS()
external set b(v);
```

### 1.7 Multi-variable with mixed types
```typescript
var a: A, untyped;
```
```dart
@JS()
external A get a;
@JS()
external set a(A v);
@JS()
external get untyped;
@JS()
external set untyped(v);
```

### 1.8 Multi-variable with different types
```typescript
var n: number, s: string;
```
```dart
@JS()
external num get n;
@JS()
external set n(num v);
@JS()
external String get s;
@JS()
external set s(String v);
```

### 1.9 Const variables
```typescript
const A = 1 + 2;
```
```dart
@JS()
external get A;
```

```typescript
const A = 1, B = 2;
```
```dart
@JS()
external get A;
@JS()
external get B;
```

```typescript
const A: number = 1;
```
```dart
@JS()
external num get A;
```

### 1.10 Null type variable
```typescript
var foo: null;
```
```dart
@JS()
external Null get foo;
@JS()
external set foo(Null v);
```

---

## 2. Classes (`declaration_test.ts` / `js_interop_test.ts`)

### 2.1 Empty class
```typescript
class X {}
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
}
```

### 2.2 Class extends
```typescript
class X extends Y {}
```
```dart
@JS()
class X extends Y {
  // @Ignore
  X.fakeConstructor$() : super.fakeConstructor$();
}
```

### 2.3 Class implements
```typescript
class X implements Y, Z {}
```
```dart
@JS()
class X implements Y, Z {
  // @Ignore
  X.fakeConstructor$();
}
```

### 2.4 Class extends + implements
```typescript
class X extends Y implements Z {}
```
```dart
@JS()
class X extends Y implements Z {
  // @Ignore
  X.fakeConstructor$() : super.fakeConstructor$();
}
```

### 2.5 Abstract class
```typescript
abstract class X {}
```
```dart
@JS()
abstract class X {
  // @Ignore
  X.fakeConstructor$();
}
```

### 2.6 Class fields
```typescript
class X { x: number; y: string; }
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
  external num get x;
  external set x(num v);
  external String get y;
  external set y(String v);
}
```

### 2.7 Class with constructor
```typescript
class X { constructor() {} }
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
  external factory X();
}
```

### 2.8 Static fields
```typescript
class X { static x: number = 42; }
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
  external static num get x;
  external static set x(num v);
}
```

### 2.9 Methods
```typescript
class X { x() { return 42; } }
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
  external x();
}
```

### 2.10 Method with return type and params
```typescript
class X { x( a : number, b : string ) { return 42; } }
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
  external x(num a, String b);
}
```

### 2.11 Getter
```typescript
class X { get y(): number {} }
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
  external num get y;
}
```

### 2.12 Setter
```typescript
class X { set y(n: number) {} }
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
  external set y(num n);
}
```

### 2.13 Private/underscore fields
```typescript
class X { private _x; x; }
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
  external get JS$_x;
  external set JS$_x(v);
  external get x;
  external set x(v);
}
```

### 2.14 Parameter properties
```typescript
class X {
  c: number;
  constructor(private _bar: B, public foo: string = "hello", private _goggles: boolean = true) {}
}
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
  external B get JS$_bar;
  external set JS$_bar(B v);
  external String get foo;
  external set foo(String v);
  external bool get JS$_goggles;
  external set JS$_goggles(bool v);
  external num get c;
  external set c(num v);
  external factory X(B JS$_bar, [String foo, bool JS$_goggles]);
}
```

### 2.15 Readonly fields
```typescript
export class Person {
  readonly x: number;
  readonly y: string;
  readonly z: boolean;
}
```
```dart
@JS()
class Person {
  // @Ignore
  Person.fakeConstructor$();
  external num get x;
  external String get y;
  external bool get z;
}
```

### 2.16 Promise method → Future extension
```typescript
declare class MyMath {
  randomInRange(start: number, end: number): Promise<number>;
}
```
```dart
import "package:js/js_util.dart" show promiseToFuture;

@JS()
class MyMath {
  // @Ignore
  MyMath.fakeConstructor$();
}

@JS("MyMath")
abstract class _MyMath {
  external Promise<num> randomInRange(num start, num end);
}

extension MyMathExtensions on MyMath {
  Future<num> randomInRange(num start, num end) {
    final Object t = this;
    final _MyMath tt = t;
    return promiseToFuture(tt.randomInRange(start, end));
  }
}

@JS()
abstract class Promise<T> {
  external factory Promise(
      void executor(void resolve(T result), Function reject));
  external Promise then(void onFulfilled(T result), [Function onRejected]);
}
```

### 2.17 Generic methods
```typescript
class X<T> { static Z<T>(): X<T> {} }
```
```dart
@JS()
class X<T> {
  // @Ignore
  X.fakeConstructor$();
  external static X<dynamic /*T*/ > Z/*<T>*/();
}
```

### 2.18 Method overloads merged
```typescript
class X {
  F(a: string): number;
  F(a: string, b: string|number): string;
  F(a2: string, b: string, c: number): string;
}
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
  /*external num F(String a);*/
  /*external String F(String a, String|num b);*/
  /*external String F(String a2, String b, num c);*/
  external dynamic /*num|String*/ F(String a_a2,
      [dynamic /*String|num*/ b, num c]);
}
```

---

## 3. Interfaces (`declaration_test.ts` / `js_interop_test.ts`)

### 3.1 Empty interface
```typescript
interface X {}
```
```dart
@anonymous
@JS()
abstract class X {}
```

### 3.2 Interface extends
```typescript
interface X extends Y, Z {}
```
```dart
@anonymous
@JS()
abstract class X implements Y, Z {}
```

### 3.3 Interface with properties (property bag)
```typescript
interface X { x: string; y; }
```
```dart
@anonymous
@JS()
abstract class X {
  external String get x;
  external set x(String v);
  external get y;
  external set y(v);
  external factory X({String x, y});
}
```

### 3.4 Interface with methods
```typescript
interface X { x(); }
```
```dart
@anonymous
@JS()
abstract class X {
  external x();
}
```

### 3.5 Property bag with inheritance
```typescript
interface X {
  a: string;
  b: number;
  c: X;
}
interface Y extends X {
  d: number;
  /* example comment */
  e: any;
}
```
```dart
@anonymous
@JS()
abstract class X {
  external String get a;
  external set a(String v);
  external num get b;
  external set b(num v);
  external X get c;
  external set c(X v);
  external factory X({String a, num b, X c});
}

@anonymous
@JS()
abstract class Y implements X {
  external num get d;
  external set d(num v);

  /// example comment
  external dynamic get e;
  external set e(dynamic v);
  external factory Y({num d, dynamic e, String a, num b, X c});
}
```

### 3.6 Callable interface → typedef
```typescript
interface F { (n: number): boolean; }
```
```dart
typedef bool F(num n);
```

### 3.7 Generic callable interface → typedef
```typescript
interface F<A, B> { (a: A): B; }
```
```dart
typedef B F<A, B>(A a);
```

### 3.8 Callable interface with methods
```typescript
interface X<T> { (a:T):T; Y():T; }
```
```dart
@anonymous
@JS()
abstract class X<T> {
  external T call(T a);
  external T Y();
}
```

### 3.9 Invalid property names
```typescript
interface X { '!@#$%^&*': string; }
```
```dart
@anonymous
@JS()
abstract class X {
  /*external String get !@#$%^&*;*/
  /*external set !@#$%^&*(String v);*/
  external factory X();
}
```

### 3.10 `this` return type
```typescript
export interface Foo { bar() : this; }
```
```dart
@anonymous
@JS()
abstract class Foo {
  external Foo bar();
}
```

---

## 4. Interface + Variable Merging (Declaration Augmentation)

### 4.1 Simple merge
```typescript
declare interface XType {
  a: string;
  b: number;
  c(): boolean;
}

declare var X: {
  prototype: XType,
  new(a: string, b: number): XType
};
```
```dart
@JS()
abstract class X {
  external String get a;
  external set a(String v);
  external num get b;
  external set b(num v);
  external bool c();
  external factory X(String a, num b);
}
```

### 4.2 Merge with static members
```typescript
declare interface XType {
  a: string;
  b: number;
  c(): boolean;
}

declare var X: {
  b: number;
  prototype: XType,
  new(a: string, b: number): XType
};
```
```dart
@JS()
abstract class X {
  external String get a;
  external set a(String v);
  external static num get b;
  external static set b(num v);
  external bool c();
  external factory X(String a, num b);
}
```

### 4.3 Interface + variable merge (default)
```typescript
interface X {
  a: string;
  b: number;
  c(): boolean;
}

declare var X: { d: number[] };

declare var x: X;
```
```dart
@anonymous
@JS()
abstract class X {
  external String get a;
  external set a(String v);
  external num get b;
  external set b(num v);
  external bool c();
  external static List<num> get d;
  external static set d(List<num> v);
}

@JS()
external X get x;
@JS()
external set x(X v);
```

---

## 5. Types (`type_test.ts`)

### 5.1 Qualified names
```typescript
var x: foo.Bar;
```
```dart
@JS()
external foo.Bar get x;
@JS()
external set x(foo.Bar v);
```

### 5.2 Union types
```typescript
function foo() : number | number[];
```
```dart
@JS()
external dynamic /*num|List<num>*/ foo();
```

### 5.3 Intersection types
```typescript
interface Foo { a: number, b: string }
interface Bar { b: string }

function foo() : Foo & Bar;
```
```dart
@anonymous
@JS()
abstract class Foo {
  external num get a;
  external set a(num v);
  external String get b;
  external set b(String v);
  external factory Foo({num a, String b});
}

@anonymous
@JS()
abstract class Bar {
  external String get b;
  external set b(String v);
  external factory Bar({String b});
}

@JS()
external Foo /*Foo&Bar*/ foo();
```

### 5.4 Type literal (object type) → dynamic
```typescript
var x: {x: string, y: number};
```
```dart
@JS()
external dynamic /*{x: string, y: number}*/ get x;
@JS()
external set x(dynamic /*{x: string, y: number}*/ v);
```

### 5.5 Index signatures
```typescript
var x: {[k: string]: any[]};
```
```dart
@JS()
external dynamic /*JSMap of <String,List<dynamic>>*/ get x;
@JS()
external set x(dynamic /*JSMap of <String,List<dynamic>>*/ v);
```

### 5.6 Array types
```typescript
var x: string[] = [];
```
```dart
@JS()
external List<String> get x;
@JS()
external set x(List<String> v);
```

### 5.7 Function types
```typescript
var x: (a: string) => string;
```
```dart
@JS()
external String Function(String) get x;
@JS()
external set x(String Function(String) v);
```

### 5.8 Conditional types → dynamic warning
```typescript
type TypeName<T> = T extends string ? "string" :
T extends number ? "number" :
T extends boolean ? "boolean" :
T extends undefined ? "undefined" :
T extends Function ? "function" :
"object";

declare var x: TypeName<number>;
```
```dart
/*Warning: Conditional types are not supported in Dart. Uses of this type will be replaced by dynamic.
type TypeName<T> = ...
*/
@JS()
external dynamic /*TypeName<num>*/ get x;
@JS()
external set x(dynamic /*TypeName<num>*/ v);
```

### 5.9 Partial<X> → X
```typescript
interface X { a: number; } declare const x: Partial<X>;
```
```dart
@anonymous
@JS()
abstract class X {
  external num get a;
  external set a(num v);
  external factory X({num a});
}

@JS()
external X /*Partial<X>*/ get x;
```

### 5.10 True/false return types
```typescript
export function f(): true;
```
```dart
@JS()
external bool /*true*/ f();
```

### 5.11 Type alias literal → class
```typescript
export type EventParameters = {
    bubbles: boolean;
    cancelable: boolean;
};

export function dispatch(parameters: EventParameters): void;
```
```dart
@anonymous
@JS()
abstract class EventParameters {
  external bool get bubbles;
  external set bubbles(bool v);
  external bool get cancelable;
  external set cancelable(bool v);
  external factory EventParameters({bool bubbles, bool cancelable});
}

@JS()
external void dispatch(EventParameters parameters);
```

### 5.12 Type alias function → typedef
```typescript
export type ValueFn<A, B, T> = (this: T, a: A, b: B) => A;
export type SimpleValueFn<A, B> = (a: A, b: B) => A;

export function dispatch(callback: ValueFn<string, number, Element>): void;
export function dispatchSimple(callback: SimpleValueFn<string, number>): void;
```
```dart
typedef A ValueFn<A, B, T>(/*T this*/ A a, B b);
typedef A SimpleValueFn<A, B>(A a, B b);
@JS()
external void dispatch(ValueFn<String, num, Element> callback);
@JS()
external void dispatchSimple(SimpleValueFn<String, num> callback);
```

### 5.13 Generic type arguments
```typescript
class X<A, B> { a: A; }
```
```dart
@JS()
class X<A, B> {
  // @Ignore
  X.fakeConstructor$();
  external A get a;
  external set a(A v);
}
```

### 5.14 keyof and indexed access
```typescript
export interface A {
  a: number;
}
export function f<K extends keyof A>(first: K, second: A[K]): boolean;
```
```dart
@anonymous
@JS()
abstract class A {
  external num get a;
  external set a(num v);
  external factory A({num a});
}

@JS()
external bool f/*<K extends keyof A>*/(
    dynamic /*K*/ first, dynamic /*A[K]*/ second);
```

---

## 6. Functions (`function_test.ts`)

### 6.1 Simple function
```typescript
function x() {}
```
```dart
@JS()
external x();
```

### 6.2 Default parameter values
```typescript
function x(a = 42, b = 1) { return 42; }
```
```dart
@JS()
external x([a, b]);
```

### 6.3 Optional parameters
```typescript
function x(a?: number, b?: number) { return 42; }
```
```dart
@JS()
external x([num a, num b]);
```

### 6.4 Rest parameters (polyfilled)
```typescript
function x(...a: number[]) { return 42; }
```
```dart
@JS()
external x([num a1, num a2, num a3, num a4, num a5]);
```

### 6.5 Function parameters
```typescript
function f(fn: (a: A, b: B) => C) {}
```
```dart
@JS()
external f(C fn(A a, B b));
```

### 6.6 Type predicate
```typescript
function isArrayBuffer(value?: any): value is ArrayBuffer;
```
```dart
@JS()
external bool /*value is ByteBuffer*/ isArrayBuffer([dynamic value]);
```

### 6.7 Generic functions → dynamic
```typescript
function sort<T, U>(xs: T[]): T[] { return xs; }
```
```dart
@JS()
external List<dynamic /*T*/ > sort/*<T, U>*/(List<dynamic /*T*/ > xs);
```

---

## 7. Enums (`declaration_test.ts`)

### 7.1 Basic enum
```typescript
enum Color { Red, Green, Blue }
```
```dart
@JS()
class Color {
  external static num get Red;
  external static num get Green;
  external static num get Blue;
}
```

### 7.2 Empty enum
```typescript
enum Empty {}
```
```dart
@JS()
class Empty {}
```

### 7.3 Enum with initializers
```typescript
enum Color { Red = 1, Green, Blue = 4 }
```
```dart
@JS()
class Color {
  external static num get Red;
  external static num get Green;
  external static num get Blue;
}
```

---

## 8. Modules / Namespaces (`module_test.ts` / `js_interop_test.ts`)

### 8.1 Import equals
```typescript
import x = require("y");
```
```dart
import "y.dart" as x;
```

### 8.2 Export re-export
```typescript
export * from "X";
```
```dart
export "X.dart";
```

### 8.3 Named export
```typescript
export {a, b} from "X";
```
```dart
export "X.dart" show a, b;
```

### 8.4 Namespace rename collision
```typescript
declare namespace m1 {
  interface A { x(); }
}
declare namespace m2 {
  interface A { y(); }
}
```
```dart
// Module m1
@anonymous
@JS()
abstract class A {
  external x();
}

// End module m1

// Module m2
@anonymous
@JS()
abstract class m2_A {
  external y();
}

// End module m2
```

### 8.5 Namespace with functions
```typescript
declare namespace foo.m1 {
  function x(): number;
}
declare namespace foo.m2 {
  function x(): string;
}
declare namespace m2 {
  function x(): string[];
}
```
```dart
// Module foo.m1
@JS("foo.m1.x")
external num x();
// End module foo.m1

// Module foo.m2
@JS("foo.m2.x")
external String m2_x();
// End module foo.m2

// Module m2
@JS("m2.x")
external List<String> x2();
// End module m2
```

---

## 9. Type Aliases (`js_interop_test.ts`)

### 9.1 Simple type alias → inlined
```typescript
type MyNumber = number;
export function add(x: MyNumber, y: MyNumber): MyNumber;
```
```dart
/*type MyNumber = number;*/
@JS()
external num add(num x, num y);
```

### 9.2 Union type aliases
```typescript
type listener1 = ()=>boolean;
type listener2 = (e:string)=>boolean;
function addEventListener(listener: listener1|listener2);
```
```dart
typedef bool listener1();
typedef bool listener2(String e);
@JS()
external addEventListener(dynamic /*listener1|listener2*/ listener);
```

---

## 10. Special Identifiers / Dart Keywords (`facade_converter_test.ts`)

### 10.1 Reserved keyword rename
```typescript
declare var rethrow: number;
```
```dart
@JS()
external num get JS$rethrow;
@JS()
external set JS$rethrow(num v);
```

### 10.2 Built-in keyword as class name
```typescript
interface abstract { a: number; }
```
```dart
@anonymous
@JS()
abstract class JS$abstract {
  external num get a;
  external set a(num v);
  external factory JS$abstract({num a});
}
```

### 10.3 Built-in keyword as property (allowed)
```typescript
interface X { abstract: string; }
```
```dart
@anonymous
@JS()
abstract class X {
  external String get abstract;
  external set abstract(String v);
  external factory X({String abstract});
}
```

---

## 11. Comments (`main_test.ts`)

### 11.1 Leading block comments
```typescript
/* A */ var a;
/* B */ var b;
```
```dart
/// A
@JS()
external get a;
@JS()
external set a(v);

/// B
@JS()
external get b;
@JS()
external set b(v);
```

### 11.2 Constructor comments
```typescript
/** A */ class A {
 /** ctor */ constructor() {}
}
```
```dart
/// A
@JS()
class A {
  // @Ignore
  A.fakeConstructor$();

  /// ctor
  external factory A();
}
```

### 11.3 JSDoc link translation
```typescript
/** {@link this/place} */ var a
```
```dart
/// [this/place]
@JS()
external get a;
@JS()
external set a(v);
```

### 11.4 JSDoc tag stripping (@param, @return, @throws)
```typescript
/**
 * Method to do blah.
 * @param doc Document.
 */
```
```dart
/// Method to do blah.
```

---

## 12. Calls (`call_test.ts`)

### 12.1 Destructuring parameters
```typescript
function x({p = null, d = false} = {}) {}
```
```dart
@JS()
external x(Object p_d /*{p = null, d = false}*/);
```

### 12.2 Suppressed calls and expressions
```typescript
f(x, {a: 12, b: 4});    // → (empty)
foo();                    // → (empty)
new Foo();                // → (empty)
```

---

## 13. Decorators (`decorator_test.ts`)

### 13.1 Decorators are ignored
```typescript
@A class X {}
```
```dart
@JS()
class X {
  // @Ignore
  X.fakeConstructor$();
}
```

### 13.2 Decorator on function
```typescript
@A function f() {}
```
```dart
@JS()
external f();
```

---

## 14. Dart Type Substitutions (`facade_converter_test.ts`)

### 14.1 DOM types → dart:html
```typescript
const n: Node;
```
```dart
import "dart:html" show Node;

@JS()
external Node get n;
```

### 14.2 XMLHttpRequest → HttpRequest
```typescript
const xhr: XMLHttpRequest;
```
```dart
import "dart:html" show HttpRequest;

@JS()
external HttpRequest get xhr;
```

### 14.3 Typed arrays → dart:typed_data
```typescript
const intArray: Uint8Array;
```
```dart
import "dart:typed_data" show Uint8List;

@JS()
external Uint8List get intArray;
```

### 14.4 ReadonlyArray → List
```typescript
declare const a : ReadonlyArray<number>;
```
```dart
@JS()
external List<num> /*ReadonlyArray<num>*/ get a;
```

### 14.5 Array extends
```typescript
export interface DSVParsedArray<T> extends Array<T> {
  columns: Array<string>;
}
```
```dart
@anonymous
@JS()
abstract class DSVParsedArray<T> implements List<T> {
  external List<String> get columns;
  external set columns(List<String> v);
}
```
