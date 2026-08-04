import * as ts from "ts-morph";
import { IRType, TypeKind, UnsupportedReason } from "@ir/type";
import { handleLiteralType } from "./literals";
import { handleUnionType } from "./unions";
import { handleDirectArrayType } from "./array";
import { handleTypeReferences } from "./typeRefernce";
import { handleFunctionTypes } from "./function";
import { handleTypeLiterals } from "./typeLiterals";
import { handleTupleType } from "./tuple";
import { handleIntersectionType } from "./intersection";
import { handleRestType } from "./restType";
import { sourceTextOf } from "./sourceText";
import { makeUnsupported } from "./unsupported";
import { handleThisType } from "./thisType";
import { handleTypeOperator, handleTypePredicate } from "./typeOperator";
import { handleTypeQuery } from "./typeQuery";
import { ParseContext, typeParseContext } from "@parser/context";

export type ParseableTypeNode =
  | ts.TypeNode
  | ts.ExpressionWithTypeArguments;

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
 * correct key would have had to include file + parse scope, and that scope
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
    typeNode: ParseableTypeNode | undefined,
    depth: number = 0,
    context: ParseContext = typeParseContext(typeNode),
  ): IRType {
    if (typeNode == undefined) {
      return {
        kind: TypeKind.Any,
        name: TypeKind.Any,
        isNullable: false,
      };
    }

    if (depth > 15) {
      // Recorded in the IR rather than logged to stdout: an Unsupported node
      // carrying RecursionLimit surfaces as a documented typedef at emit
      // (`E-16`), which beats a console.log a library consumer cannot suppress.
      return makeUnsupported(typeNode, UnsupportedReason.RecursionLimit);
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
        result = { kind: TypeKind.Never, name: TypeKind.Never, isNullable: false };
        break;

      case ts.SyntaxKind.ObjectKeyword:
        result = { kind: TypeKind.Object, name: TypeKind.Object, isNullable: false };
        break;

      // Literals: "abc", 1, -2n, false
      case ts.SyntaxKind.LiteralType:
        result = handleLiteralType(typeNode as ts.LiteralTypeNode, depth);
        break;

      // Unions: str | null, str | num | null
      case ts.SyntaxKind.UnionType:
        result = handleUnionType(typeNode as ts.UnionTypeNode, depth, context);
        break;

      // Tuples: [string, number], [number, number]
      case ts.SyntaxKind.TupleType:
        result = handleTupleType(typeNode as ts.TupleTypeNode, depth, context);
        break;

      // Intersection: T1 & T2
      case ts.SyntaxKind.IntersectionType:
        result = handleIntersectionType(
          typeNode as ts.IntersectionTypeNode,
          depth,
          context,
        );
        break;

      // Direct Arrays: T[] => string[], num[], (str | num)[]
      case ts.SyntaxKind.ArrayType:
        result = handleDirectArrayType(typeNode as ts.ArrayTypeNode, depth, context);
        break;

      // ParenthesizedType: (str | num) is not union, it has union internally tho
      // Just unwrap it and process it again.
      //
      // `depth + 1`, not `depth`. Passing `depth` made this the one path the
      // recursion guard could not see: `(((…)))` nested to any depth never
      // tripped it, because unwrapping consumed a level without charging for
      // one (`T-17`). Verified — 40 nested parens used to sail straight past.
      case ts.SyntaxKind.ParenthesizedType:
        result = this.parseType(
          (typeNode as ts.ParenthesizedTypeNode).getTypeNode(),
          depth + 1,
          context,
        );
        break;

      // TypeReferenceType: Array,Promise,Record,Set,Map and other User Defined ones
      case ts.SyntaxKind.TypeReference:
        result = handleTypeReferences(typeNode as ts.TypeReferenceNode, depth, context);
        break;

      case ts.SyntaxKind.ExpressionWithTypeArguments:
        result = handleTypeReferences(
          typeNode as ts.ExpressionWithTypeArguments,
          depth,
          context,
        );
        break;

      // FunctionType: what do you want me to say, they are funcs god dammit
      case ts.SyntaxKind.FunctionType:
        result = handleFunctionTypes(typeNode as ts.FunctionTypeNode, depth, context);
        break;

      // TypeLiterals are raw inline interface / objects
      case ts.SyntaxKind.TypeLiteral:
        result = handleTypeLiterals(typeNode as ts.TypeLiteralNode, depth, context);
        break;

      // Rest Type: ...number[] with internal type being number[]
      case ts.SyntaxKind.RestType:
        result = handleRestType(typeNode as ts.RestTypeNode, depth, context);
        break;

      // `this` — resolves to the enclosing class/interface (P-07, 900 sites)
      case ts.SyntaxKind.ThisType:
        result = handleThisType(typeNode);
        break;

      // readonly T[] → List<T>; keyof / unique symbol stay Unsupported
      case ts.SyntaxKind.TypeOperator:
        result = handleTypeOperator(typeNode as ts.TypeOperatorTypeNode, depth, context);
        break;

      // x is T → bool (js_facade_gen §6.6)
      case ts.SyntaxKind.TypePredicate:
        result = handleTypePredicate();
        break;

      // typeof x → whatever the checker says x is, when that is a primitive
      case ts.SyntaxKind.TypeQuery:
        result = handleTypeQuery(typeNode as ts.TypeQueryNode);
        break;

      // Everything with no case above. Previously this collapsed to `Any`,
      // making a genuine `any` in the source indistinguishable from a
      // construct dartify simply could not handle (`T-01`).
      default:
        result = makeUnsupported(typeNode as ts.TypeNode);
        break;
    }

    // T-02: every node carries the text it was written as, at every depth.
    // Set here rather than in the handlers so no `SyntaxKind` can be added
    // later that forgets to record it — including the `default:` branch, where
    // losing the text is exactly the bug.
    result.originalText = sourceTextOf(typeNode);
    return result;
  }
}

// The parser is stateless; the singleton exists only to keep the historical
// import surface stable.
const globalTypeParser = TypeParser.getInstance();

// Export a convenience function that maintains backward compatibility
export function parseType(
  typeNode: ParseableTypeNode | undefined,
  depth: number = 0,
  context: ParseContext = typeParseContext(typeNode),
): IRType {
  return globalTypeParser.parseType(typeNode, depth, context);
}

// Export the global instance for direct use when maximum performance is needed
export { globalTypeParser };
