import * as ts from "ts-morph";
import { IRType, TypeKind, IRParameter } from "../../ir/type";
import { parseType } from "./type";

export function handleFunctionTypes(
  node: ts.FunctionTypeNode,
  depth: number,
): IRType {
  let params = node.getParameters().map((e) => handleParamTypes(e, depth));
  let retType = node.getReturnTypeNode();
  let returnIR = parseType(retType);

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
  const paramType = parseType(param.getTypeNode(), depth);
  return {
    name: name,
    type: paramType,
    isRestParameter: isRest,
    isOptional: isOptional,
  };
}
