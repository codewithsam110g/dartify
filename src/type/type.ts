import * as ts from "ts-morph";
import { IRType, TypeKind, IRParameter, IRProperty } from "../ir/type";
import { handleLiteralType } from "./literals";
import { handleUnionType } from "./unions";
import { handleDirectArrayType } from "./array";
import { handleTypeReferences } from "./typeRefernce";
import { handleFunctionTypes } from "./function";
import { handleTypeLiterals } from "./typeLiterals";
import { handleTupleType } from "./tuple";
import { handleIntersectionType } from "./intersection";

export function parseType(
  typeNode: ts.TypeNode | undefined,
  depth: number = 0,
): IRType | undefined {
  if (typeNode == undefined) {
    return {
      kind: TypeKind.Undefined,
      name: TypeKind.Undefined,
      isNullable: false,
    };
  }
  if (depth > 15) {
    console.log("Recursion Depth Reached: ", typeNode.getText());
    return { kind: TypeKind.Any, name: TypeKind.Any, isNullable: false };
  }

  switch (typeNode.getKind()) {
    // Primitive Keywords: direct keywords like let abc: string;
    case ts.SyntaxKind.StringKeyword:
      return {
        kind: TypeKind.String,
        name: TypeKind.String,
        isNullable: false,
      };

    case ts.SyntaxKind.NumberKeyword:
      return {
        kind: TypeKind.Number,
        name: TypeKind.Number,
        isNullable: false,
      };

    case ts.SyntaxKind.BigIntKeyword:
      return {
        kind: TypeKind.BigInt,
        name: TypeKind.BigInt,
        isNullable: false,
      };
    case ts.SyntaxKind.BooleanKeyword:
      return {
        kind: TypeKind.Boolean,
        name: TypeKind.Boolean,
        isNullable: false,
      };
    case ts.SyntaxKind.UndefinedKeyword:
    case ts.SyntaxKind.NullKeyword:
      return {
        kind: TypeKind.Undefined,
        name: TypeKind.Undefined,
        isNullable: true,
      };

    case ts.SyntaxKind.VoidKeyword:
      return { kind: TypeKind.Void, name: TypeKind.Void, isNullable: false };

    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword:
      return { kind: TypeKind.Any, name: TypeKind.Any, isNullable: false };

    // case ts.SyntaxKind.NeverKeyword:
    //   return "Never";
    // case ts.SyntaxKind.ObjectKeyword:
    //   return "Object";
    // case ts.SyntaxKind.SymbolKeyword:
    //   return "Symbol";

    // Literals: "abc", 1, -2n, false
    case ts.SyntaxKind.LiteralType:
      return handleLiteralType(typeNode as ts.LiteralTypeNode, depth);

    // Unions: str | null, str | num | null
    case ts.SyntaxKind.UnionType:
      return handleUnionType(typeNode as ts.UnionTypeNode, depth);

    // Tuples: [string, number], [number, number]
    case ts.SyntaxKind.TupleType:
      return handleTupleType(typeNode as ts.TupleTypeNode, depth);

    // Intersection: T1 & T2
    case ts.SyntaxKind.IntersectionType:
      return handleIntersectionType(typeNode as ts.IntersectionTypeNode, depth)
      
    // Direct Arrays: T[] => string[], num[], (str | num)[]
    case ts.SyntaxKind.ArrayType:
      return handleDirectArrayType(typeNode as ts.ArrayTypeNode, depth);

    // ParenthesizedType: (str | num) is not union, it has union internally tho
    // Just unwrap it and process it again
    case ts.SyntaxKind.ParenthesizedType:
      return parseType(
        (typeNode as ts.ParenthesizedTypeNode).getTypeNode(),
        depth,
      );

    // TypeReferenceType: Array,Promise,Record,Set,Map and other User Defined ones
    case ts.SyntaxKind.TypeReference:
      return handleTypeReferences(typeNode as ts.TypeReferenceNode, depth);

    // FunctionType: what do you want me to say, they are funcs god dammit
    case ts.SyntaxKind.FunctionType:
      return handleFunctionTypes(typeNode as ts.FunctionTypeNode, depth);

    // TypeLiterals are raw inline interface / objects
    case ts.SyntaxKind.TypeLiteral:
      return handleTypeLiterals(typeNode as ts.TypeLiteralNode, depth);
  }
}
