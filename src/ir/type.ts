import { IRLiteral } from "./literal";

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

  // Debug info
  originalText?: string;
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
