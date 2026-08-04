import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";
import { ParseContext } from "@parser/context";

export function handleDirectArrayType(
  node: ts.ArrayTypeNode,
  depth: number,
  context: ParseContext,
): IRType {
  const elementType = node.getElementTypeNode();
  let arg = parseType(elementType, depth + 1, context);
  return {
    kind: TypeKind.Array,
    name: TypeKind.Array,
    isNullable: false,
    elementType: arg,
  };
}
