import * as ts from "ts-morph";
import { IRType, TypeKind, IRParameter } from "@ir/type";
import { parseType } from "./type";

export function handleFunctionTypes(
  node: ts.FunctionTypeNode,
  depth: number,
): IRType {
  let params = node.getParameters().map((e) => handleParamTypes(e, depth));
  let retType = node.getReturnTypeNode();
  // `depth + 1`, not a reset to 0. The `depth > 15` guard is the only recursion
  // protection there is, and a type recursing through function return positions
  // used to slip past it entirely (`T-05`).
  let returnIR = parseType(retType, depth + 1);

  return {
    kind: TypeKind.Function,
    name: TypeKind.Function,
    parameters: params,
    isNullable: false,
    returnType: returnIR,
  };
}

function handleParamTypes(
  param: ts.ParameterDeclaration,
  depth: number,
): IRParameter {
  const isRest = param.isRestParameter();
  const isOptional = param.isOptional();
  const name = param.getName();
  const paramType = parseType(param.getTypeNode(), depth + 1);
  return {
    name: name,
    type: paramType,
    isRestParameter: isRest,
    isOptional: isOptional,
  };
}
