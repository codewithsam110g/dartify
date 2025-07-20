import * as ts from "ts-morph";
import { IRType, TypeKind, IRParameter } from "../ir/type";
import { parseType } from "./type";

export function handleFunctionTypes(
  node: ts.FunctionTypeNode,
  depth: number,
): IRType {
  let params = node
    .getParameters()
    .map((e) => handleParamTypes(e, depth))
    .filter((e) => e.name != "");
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
  if (paramType != undefined) {
    return {
      name: name,
      type: paramType,
      isRestParameter: isRest,
      isOptional: isOptional,
    };
  } else {
    return {
      name: "",
      isOptional: false,
      isRestParameter: false,
      type: {
        kind: TypeKind.Unknown,
        name: TypeKind.Unknown,
        isNullable: false,
      },
    };
  }
}
