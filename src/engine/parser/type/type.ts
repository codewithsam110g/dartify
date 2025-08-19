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

export class TypeParser {
  private static instance: TypeParser;
  private cache: Map<string, IRType> = new Map();

  private constructor() {}

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

    // Generate cache key using the type node text and depth
    const cacheKey = `${typeNode.getText()}_depth_${depth}`;

    // Check cache first
    if (this.cache.has(cacheKey) && typeNode.getKind() != ts.SyntaxKind.TypeLiteral) {
      return this.cache.get(cacheKey)!;
    }

    if (depth > 15) {
      console.log("Recursion Depth Reached: ", typeNode.getText());
      const result = {
        kind: TypeKind.Any,
        name: TypeKind.Any,
        isNullable: false,
      };
      this.cache.set(cacheKey, result);
      return result;
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

    // Cache the result before returning
    this.cache.set(cacheKey, result);
    return result;
  }

  // Utility methods for cache management
  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create a global instance for optimal performance
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
