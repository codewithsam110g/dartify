// Legacy Test Cases: Type Aliases
// Extracted from js_facade_gen/test/type_test.ts & js_interop_test.ts

// 9.1 Simple type alias (should be inlined)
type MyNumber = number;
declare function add(x: MyNumber, y: MyNumber): MyNumber;

// 9.2 Type alias for object literal → class
/**
 * Event Parameters.
 */
type EventParameters = {
  bubbles: boolean;
  /**
   * Is cancelable.
   */
  cancelable: boolean;
};
declare function dispatch(parameters: EventParameters): void;

// 9.3 Generic type alias literal → generic class
/**
 * Event Parameters.
 */
type GenericEventParameters<T> = {
  bubbles: T;
  /**
   * Is cancelable.
   */
  cancelable: T;
};
declare function dispatchGeneric(
  parameters: GenericEventParameters<string>
): void;

// 9.4 Type alias for function → typedef
type ValueFn<A, B, T> = (this: T, a: A, b: B) => A;
type SimpleValueFn<A, B> = (a: A, b: B) => A;

// 9.5 Tuple type aliases (non-Dart-compatible, commented out)
type Triangle<G> = [G, G, G];
type ListOfLists<G> = [G[]];
declare function triangles<T>(): Triangle<T>[];

// 9.6 Union function type aliases
type Listener1 = () => boolean;
type Listener2 = (e: string) => boolean;
declare function addEventListener(
  listener: Listener1 | Listener2
): void;
