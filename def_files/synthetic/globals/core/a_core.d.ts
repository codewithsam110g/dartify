// Augmentations of lib types that the core lowering maps to Dart SDK types
// (HD-23): each becomes an extension on the SDK type (`Array<T>` on `List<T>`,
// `String` on `String`), and every use of the lib type elsewhere keeps the SDK
// type. Members typed with collections and generics are read through js_util.
interface Array<T> {
  /** The first element, or `fallback` for an empty array. */
  firstOr(fallback: T): T;
  /** The elements in groups of `size`: a nested collection. */
  chunks(size: number): T[][];
  /** Collection-typed members: a property, an optional one, three methods. */
  labels: string[];
  maybeLabels?: string[];
  words(): string[];
  numbers(): Array<number>;
  boxes(): Box<string>[];
  /** A generic container of a project type. */
  box(): Box<string>;
}
interface ReadonlyArray<T> {
  second(): T;
}
interface String {
  shout(): string;
  readonly vowels: string[];
}
interface Number {
  twice(): number;
}
interface Boolean {
  flip(): boolean;
}
interface Object {
  who(): string;
}
/** A function that came from JavaScript; a Dart closure is not one. */
interface Function {
  tag(): string;
}
interface Box<T> {
  value: T;
}
