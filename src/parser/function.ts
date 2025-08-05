import * as ts from "ts-morph";
import { IRFunction, IRParameter } from "../ir/function";
import { parseType } from "../type/parser/type";
import { IRDeclKind } from "../ir";
export function parseFunction(funcDecl: ts.FunctionDeclaration): IRFunction {
  let name = funcDecl.getName() ?? "anonFunc";
  let returnType = parseType(funcDecl.getReturnTypeNode());
  let returnTypeNode = funcDecl.getReturnTypeNode();
  let params: IRParameter[] = [];
  for (let param of funcDecl.getParameters()) {
    // Do not parse `this` param
    if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

    let name = param.getName();
    let type = parseType(param.getTypeNode());
    let isOptional = param.isOptional();
    let isRest = param.isRestParameter();
    params.push({
      name: name,
      type: type,
      isOptional: isOptional,
      isRest: isRest,
    });
  }
  return {
    kind: IRDeclKind.Function,
    name: name,
    returnType: returnType,
    parameters: params,
  };
}
