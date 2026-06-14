// Legacy Test Cases: Variables
// Extracted from js_facade_gen/test/declaration_test.ts & js_interop_test.ts

// 1.1 Variable with type and initializer
declare var a_typed_init: number;

// 1.2 Variable without initializer
declare var a_typed: number;

// 1.3 Untyped variable
declare var a_untyped: any;

// 1.4 any typed variable
declare var a_any: any;

// 1.5 Custom type variable
declare var a_custom: SomeType;

// 1.6 Multi-variable declarations
declare var multi_a: number;
declare var multi_b: string;

// 1.7 Mixed typed and untyped
declare var mixed_typed: SomeType;
declare var mixed_untyped: any;

// 1.8 Different types
declare var n: number;
declare var s: string;

// 1.9 Const variables
declare const CONST_A: number;
declare const CONST_B: number;

// 1.10 Null type variable
declare var foo_null: null;

// 1.11 String literal union type
declare function style(name: string, priority?: 'regular' | 'important'): void;

// 1.12 Null union
declare function styleNullable(name: string, priority?: null | 'important'): void;
