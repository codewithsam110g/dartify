import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";

export function handleDirectArrayType(
  node: ts.ArrayTypeNode,
  depth: number,
): IRType {
  const elementType = node.getElementTypeNode();
  let arg = parseType(elementType, depth + 1);
  return {
    kind: TypeKind.Array,
    name: TypeKind.Array,
    isNullable: false,
    elementType: arg,
  };
}
