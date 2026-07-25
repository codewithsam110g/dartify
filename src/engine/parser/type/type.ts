import * as ts from "ts-morph";
import { IRType, TypeKind, IRParameter, IRProperty } from "@ir/type";
import { handleLiteralType } from "./literals";
import { handleUnionType } from "./unions";
import { handleDirectArrayType } from "./array";
import { handleTypeReferences } from "./typeRefernce";
import { handleFunctionTypes } from "./function";
import { handleTypeLiterals } from "./typeLiterals";
import { handleTupleType } from "./tuple";
import { handleIntersectionType } from "./intersection";
import { handleRestType } from "./restType";

/**
 * Parses `ts.TypeNode`s into `IRType`.
 *
 * **There is deliberately no memoisation here.** An earlier version cached on
 * `${typeNode.getText()}_depth_${depth}`, which was wrong three ways and worth
 * less than it cost:
 *
 * - handlers mutated the objects it handed back, so `[x?: string]` made a later
 *   `[string]` optional (`T-03`);
 * - the key had no file or scope component, so identical text in different
 *   files shared an entry (`T-04`);
 * - parsing has a side effect — `collectTypeDep` — and a cache hit skipped it
 *   for every nested node, so the *second* occurrence of `Map<Foo, Bar>` in a
 *   file contributed no dependency edges at all (`T-13`).
 *
 * Measured cost of removal: `analyze()` over three.js (420 files, the largest
 * thing in the corpus) went 836ms → 987ms; leaflet was unchanged at 31ms. A
 * correct key would have had to include file + `currentFQN`, and `currentFQN`
 * changes per declaration, so the hit rate would have collapsed to "same type
 * twice in one declaration" and bought back almost none of that 151ms anyway.
 * Re-introduce only against a fresh measurement.
 */
export class TypeParser {
  private static instance: TypeParser;

  private constructor() { }

  public static getInstance(): TypeParser {
    if (!TypeParser.instance) {
      TypeParser.instance = new TypeParser();
    }
    return TypeParser.instance;
  }

  public parseType(
    typeNode: ts.TypeNode | undefined,
    depth: number = 0,
  ): IRType {
    if (typeNode == undefined) {
      return {
        kind: TypeKind.Any,
        name: TypeKind.Any,
        isNullable: false,
      };
    }

    if (depth > 15) {
      console.log("Recursion Depth Reached: ", typeNode.getText());
      return {
        kind: TypeKind.Any,
        name: TypeKind.Any,
        isNullable: false,
      };
    }

    let result: IRType;

    switch (typeNode.getKind()) {
      // Primitive Keywords: direct keywords like let abc: string;
      case ts.SyntaxKind.StringKeyword:
        result = {
          kind: TypeKind.String,
          name: TypeKind.String,
          isNullable: false,
        };
        break;

      case ts.SyntaxKind.NumberKeyword:
        result = {
          kind: TypeKind.Number,
          name: TypeKind.Number,
          isNullable: false,
        };
        break;

      case ts.SyntaxKind.BigIntKeyword:
        result = {
          kind: TypeKind.BigInt,
          name: TypeKind.BigInt,
          isNullable: false,
        };
        break;

      case ts.SyntaxKind.BooleanKeyword:
        result = {
          kind: TypeKind.Boolean,
          name: TypeKind.Boolean,
          isNullable: false,
        };
        break;

      case ts.SyntaxKind.UndefinedKeyword:
      case ts.SyntaxKind.NullKeyword:
        result = {
          kind: TypeKind.Undefined,
          name: TypeKind.Undefined,
          isNullable: true,
        };
        break;

      case ts.SyntaxKind.VoidKeyword:
        result = {
          kind: TypeKind.Void,
          name: TypeKind.Void,
          isNullable: false,
        };
        break;

      case ts.SyntaxKind.AnyKeyword:
      case ts.SyntaxKind.UnknownKeyword:
        result = { kind: TypeKind.Any, name: TypeKind.Any, isNullable: false };
        break;

      case ts.SyntaxKind.NeverKeyword:
        result = { kind: TypeKind.Never, name: "Never", isNullable: false };
        break;

      case ts.SyntaxKind.ObjectKeyword:
        result = { kind: TypeKind.Object, name: "Object", isNullable: false };
        break;

      // Literals: "abc", 1, -2n, false
      case ts.SyntaxKind.LiteralType:
        result = handleLiteralType(typeNode as ts.LiteralTypeNode, depth);
        break;

      // Unions: str | null, str | num | null
      case ts.SyntaxKind.UnionType:
        result = handleUnionType(typeNode as ts.UnionTypeNode, depth);
        break;

      // Tuples: [string, number], [number, number]
      case ts.SyntaxKind.TupleType:
        result = handleTupleType(typeNode as ts.TupleTypeNode, depth);
        break;

      // Intersection: T1 & T2
      case ts.SyntaxKind.IntersectionType:
        result = handleIntersectionType(
          typeNode as ts.IntersectionTypeNode,
          depth,
        );
        break;

      // Direct Arrays: T[] => string[], num[], (str | num)[]
      case ts.SyntaxKind.ArrayType:
        result = handleDirectArrayType(typeNode as ts.ArrayTypeNode, depth);
        break;

      // ParenthesizedType: (str | num) is not union, it has union internally tho
      // Just unwrap it and process it again
      case ts.SyntaxKind.ParenthesizedType:
        result = this.parseType(
          (typeNode as ts.ParenthesizedTypeNode).getTypeNode(),
          depth,
        );
        break;

      // TypeReferenceType: Array,Promise,Record,Set,Map and other User Defined ones
      case ts.SyntaxKind.TypeReference:
        result = handleTypeReferences(typeNode as ts.TypeReferenceNode, depth);
        break;

      // FunctionType: what do you want me to say, they are funcs god dammit
      case ts.SyntaxKind.FunctionType:
        result = handleFunctionTypes(typeNode as ts.FunctionTypeNode, depth);
        break;

      // TypeLiterals are raw inline interface / objects
      case ts.SyntaxKind.TypeLiteral:
        result = handleTypeLiterals(typeNode as ts.TypeLiteralNode, depth);
        break;

      // Rest Type: ...number[] with internal type being number[]
      case ts.SyntaxKind.RestType:
        result = handleRestType(typeNode as ts.RestTypeNode, depth);
        break;

      default:
        result = { kind: TypeKind.Any, name: TypeKind.Any, isNullable: false };
        break;
    }

    return result;
  }
}

// The parser is stateless; the singleton exists only to keep the historical
// import surface stable.
const globalTypeParser = TypeParser.getInstance();

// Export a convenience function that maintains backward compatibility
export function parseType(
  typeNode: ts.TypeNode | undefined,
  depth: number = 0,
): IRType {
  return globalTypeParser.parseType(typeNode, depth);
}

// Export the global instance for direct use when maximum performance is needed
export { globalTypeParser };
