// Legacy Test Cases: Special Identifiers / Dart Keywords
// Extracted from js_facade_gen/test/facade_converter_test.ts

// 11.1 Reserved keyword as variable name
declare var rethrow: number;

// 11.2 Reserved keyword as class member
declare class KeywordMemberClass {
  while: string;
}

// 11.3 Built-in keyword as variable (allowed, not renamed)
declare var abstract: number;

// 11.4 Built-in keyword as function name (allowed)
declare function get(): void;

// 11.5 Built-in keyword as interface property (allowed)
interface BuiltinPropInterface {
  abstract: string;
}

// 11.6 Built-in keyword as interface property (get)
interface GetPropInterface {
  get: number;
}

// 11.7 Built-in keyword as interface NAME (must rename)
interface abstract {
  a: number;
}

// 11.8 Built-in keyword as class NAME (must rename)
declare class covariant {
  x: boolean;
}

// 11.9 Underscore-prefixed identifiers
declare function underscoreFunc(
  _a: number
): boolean;

// 11.10 Double-underscore identifiers
declare function doubleUnderscoreFunc(
  __a: number
): boolean;
