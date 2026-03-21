import * as ts from "ts-morph";
import { IRFunction, IRParameter } from "@ir/function";
import { parseType } from "@typeParser/type";
import { IRDeclKind } from "@ir/index";
import { transpilerContext } from "@/context";

export function parseFunction(funcDecl: ts.FunctionDeclaration): IRFunction {
  let name = funcDecl.getName() ?? "anonFunc";
  let returnType = parseType(funcDecl.getReturnTypeNode());
  let returnTypeNode = funcDecl.getReturnTypeNode();
  let params: IRParameter[] = [];
  for (let param of funcDecl.getParameters()) {
    // Do not parse `this` param
    if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

    let pName = param.getName();
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|" + pName;
    let type = parseType(param.getTypeNode());
    transpilerContext.currentFQN = prevFQN;
    let isOptional = param.isOptional();
    let isRest = param.isRestParameter();
    params.push({
      name: pName,
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
