import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";
import { ParseContext } from "@parser/context";
import { parseParameters, parseTypeParameters } from "@parser/signature";

export function handleFunctionTypes(
  node: ts.FunctionTypeNode,
  depth: number,
  context: ParseContext,
): IRType {
  const params = parseParameters(node, context, depth);
  const retType = node.getReturnTypeNode();
  // `depth + 1`, not a reset to 0. The `depth > 15` guard is the only recursion
  // protection there is, and a type recursing through function return positions
  // used to slip past it entirely (`T-05`).
  const returnIR = parseType(retType, depth + 1, context.child("return"));

  return {
    kind: TypeKind.Function,
    name: TypeKind.Function,
    typeParams: parseTypeParameters(node, context, depth),
    parameters: params,
    isNullable: false,
    returnType: returnIR,
  };
}
