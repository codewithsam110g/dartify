// Legacy Test Cases: Types
// Extracted from js_facade_gen/test/type_test.ts

// 5.1 Qualified names
declare var qualified: foo.Bar;

// 5.2 Union types
declare function unionReturn(): number | number[];
declare var unionVar: number | Array<string>;

// 5.3 Intersection types
interface IntersectFoo {
  a: number;
  b: string;
}
interface IntersectBar {
  b: string;
}
declare function intersectionReturn(): IntersectFoo & IntersectBar;

// 5.4 Type literal (object type)
declare var objectLiteral: { x: string; y: number };

// 5.5 Index signatures
declare var indexSigString: { [k: string]: any[] };
declare var indexSigNumber: { [k: number]: number };

// 5.6 Index signature + properties (drops to dynamic)
declare var indexSigMixed: { a: number; [k: string]: number };

// 5.7 Array types
declare var arrayVar: string[];

// 5.8 Function types
declare var fnVar: (a: string) => string;
declare var fnGeneric: Function;

// 5.9 Parenthesized types
declare function parenReturn(): (number | number[]);
declare var parenVar: (number | Array<string>);

// 5.10 Null types
declare function attrWithNull(name: string, value: null): void;
declare var fooNull: null;

// 5.11 True/false return types
declare function returnTrue(): true;
declare function returnFalse(): false;

// 5.12 Conditional types (should warn + fallback to dynamic)
type TypeName<T> = T extends string
  ? 'string'
  : T extends number
    ? 'number'
    : T extends boolean
      ? 'boolean'
      : T extends undefined
        ? 'undefined'
        : T extends Function
          ? 'function'
          : 'object';

declare var condNum: TypeName<number>;
declare var condStr: TypeName<string>;
declare var condBool: TypeName<boolean>;

// 5.13 Partial<X> (mapped type)
interface PartialTarget {
  a: number;
}
declare const partialVar: Partial<PartialTarget>;

// 5.14 Other mapped types (should warn + fallback to dynamic)
interface Todo {
  task: string;
}
type ReadonlyTodo = {
  readonly [P in keyof Todo]: Todo[P];
};
declare const readonlyTodo: ReadonlyTodo;

// 5.15 Type arguments — void and Null
declare var voidGeneric: GenericHolder<void>;
declare var nullGeneric: GenericHolder<null>;
declare var multiGeneric: GenericHolder<void, string>;
interface GenericHolder<T, U = any> {}

// 5.16 keyof and indexed access operator
interface KeyofTarget {
  a: number;
}
declare function keyofFn<K extends keyof KeyofTarget>(
  first: K,
  second: KeyofTarget[K]
): boolean;
