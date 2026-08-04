import { IRLiteral } from "./literal";

export type IRReferenceLookup =
  | { kind: "checker"; candidates: string[] }
  | {
      kind: "syntax";
      pseudoFQN: string;
      checkerError?: string;
    };

/** Linkable identity carried by a specific reference use site. */
export interface IRReferenceTarget {
  /** Name exactly as written in TypeScript, including aliases/qualification. */
  writtenName: string;
  /** Exact checker candidates, or a syntax fallback when no target is known. */
  lookup: IRReferenceLookup;
  /** Written by the linker after the target is proven to exist. */
  resolvedFQN?: string;
}

/**
 * IR structure for TypeScript .d.ts types to generate Dart bindings
 */
export interface IRType {
  // Core type identification
  kind: TypeKind;
  name: string;

  // Nullability for Dart null safety
  isNullable: boolean;
  isOptional?: boolean;
  isRestParameter?: boolean;

  // Generic types: Map<string, number>
  genericArgs?: IRType[];

  // Union types: string | number | null
  unionTypes?: IRType[];

  // Tuple types: [string, number]
  tupleTypes?: IRType[];

  // Intersection types: class1 & class2
  intersectionTypes?: IRType[];

  // Array handling: T[] or Array<T>
  elementType?: IRType;

  // Object/Interface structure: { name: string; age: number }
  objectLiteral?: IRLiteral;

  // Function types: (x: string, y?: number) => boolean
  parameters?: IRParameter[];
  returnType?: IRType;

  // Literal types: "success" | 42 | true
  literalValue?: string | number | bigint | boolean;

  /**
   * The source text this node was written as, whitespace-normalised to one
   * line. Written by `parseType` for every node at every depth (`T-02`).
   *
   * Not debug info: it is the body of the degradation comment
   * (`/// Unrepresentable in Dart: keyof Box<string>`) and the input to the
   * name derivation for minted aliases. Optional only because IR nodes
   * synthesised by the linker rather than parsed have no source text.
   */
  originalText?: string;

  /**
   * Why this node could not be represented. Set if and only if
   * `kind === TypeKind.Unsupported` (`I-03`).
   *
   * Machine-readable on purpose: the emitter groups the type-definitions
   * section by it, and it lets "how many `keyof`s are we still degrading?" be
   * answered by a query rather than by grepping generated Dart.
   */
  unsupportedReason?: UnsupportedReason;

  /**
   * The minted typedef this use site refers to, e.g. `KeyOfBoxString`.
   *
   * Written by the linker, not the parser — the name has to be unique against
   * the whole file's symbol table, which no single parse knows (`L-05`,
   * `E-16`). Set only on `Unsupported` nodes at *use* sites; the alias
   * declaration's own type deliberately leaves it unset, or the typedef would
   * refer to itself.
   */
  aliasName?: string;

  /** Present on non-stdlib, non-type-parameter reference use sites. */
  reference?: IRReferenceTarget;
}

/**
 * Why a TypeScript type has no Dart representation *yet*.
 *
 * A value here is not a permanent verdict — it is a statement about the
 * current backend. When a construct gains a real representation its reason
 * stops appearing in output; the member stays so the classifier keeps a total
 * function over `SyntaxKind`. That is the intended direction of travel for
 * every member, and S1.4 already retired four of them.
 */
export enum UnsupportedReason {
  /**
   * `this` as a type. Retired in S1.4 — resolved to the enclosing class or
   * interface. Still reachable for a `this` with no such ancestor.
   */
  ThisType = "thisType",
  /** `keyof T` */
  KeyOf = "keyOf",
  /**
   * `readonly T[]`. Retired in S1.4: Dart has no read-only list, so this
   * collapses to the inner type the way `ReadonlyArray<T>` does.
   */
  ReadonlyOperator = "readonlyOperator",
  /** `unique symbol` */
  UniqueSymbol = "uniqueSymbol",
  /** `T extends U ? A : B` */
  Conditional = "conditional",
  /** `{ [K in keyof T]: V }` */
  Mapped = "mapped",
  /** `` `pre-${T}` `` */
  TemplateLiteral = "templateLiteral",
  /** `infer U` */
  Infer = "infer",
  /** `T[K]` */
  IndexedAccess = "indexedAccess",
  /** `x is T`. Retired in S1.4 — a type predicate is a `bool` at runtime. */
  TypePredicate = "typePredicate",
  /** `typeof x` */
  TypeQuery = "typeQuery",
  /** `import("mod").T` */
  ImportType = "importType",
  /** `new () => T` — a constructor signature used as a type. */
  ConstructorType = "constructorType",
  /**
   * `[string?]` — an optional tuple member written positionally.
   *
   * Distinct from the `[a?: string]` spelling, which ts-morph exposes as a
   * `NamedTupleMember` and the tuple handler reads directly. Retired in S1.4
   * by the ts-morph 26 → 28 upgrade, which added the `OptionalTypeNode`
   * wrapper that makes the inner type reachable (`T-10`).
   */
  OptionalMember = "optionalMember",
  /** Parser hit its depth guard before reaching a representable node. */
  RecursionLimit = "recursionLimit",
  /** A `SyntaxKind` with no classifier entry — the catch-all. */
  Unclassified = "unclassified",
}

export enum TypeKind {
  // Primitives
  String = "string",
  Number = "number",
  BigInt = "bigInt",
  Boolean = "boolean",
  Undefined = "undefined",
  Null = "null",
  Void = "void",
  Any = "any",
  Unknown = "unknown",
  Never = "never",

  // Complex types
  Array = "array",
  Tuple = "tuple",
  Object = "object",
  Function = "function",
  Union = "union",
  Intersection = "intersection",

  // Literals
  StringLiteral = "stringLiteral",
  NumberLiteral = "numberLiteral",
  BooleanLiteral = "booleanLiteral",

  TypeLiteral = "typeLiteral",

  // References
  TypeReference = "typeReference",

  /**
   * A TypeScript construct with no Dart representation yet.
   *
   * Distinct from `Any` on purpose. `Any` means the source said `any` or
   * `unknown` — the author asked for a dynamic type. `Unsupported` means
   * dartify could not do better, and carries `originalText` plus an
   * `unsupportedReason` so the emitter can mint a named typedef documenting
   * exactly what was lost (`T-01`, `I-03`, design principle 1). Collapsing the
   * two is how the information used to get destroyed.
   */
  Unsupported = "unsupported",
}

export interface IRProperty {
  name: string;
  type: IRType;
  isOptional: boolean;
  isReadonly: boolean;
}

export interface IRParameter {
  name: string;
  type: IRType;
  isOptional: boolean;
  isRestParameter: boolean;
}
