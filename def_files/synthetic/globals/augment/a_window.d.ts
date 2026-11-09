// A script file augmenting a browser type: TypeScript merges these members
// into lib.dom's Window. Dart gets an extension on dart:html's Window.
interface Window {
  myProp: string;
  readonly version: number;
  /** Optional parameters: JavaScript must see exactly the arguments given. */
  ping(n?: number, label?: string): string;
  add(a: number, b: number): number;
  // Not expressible on an SDK type: reported, not bound.
  [key: string]: any;
}
