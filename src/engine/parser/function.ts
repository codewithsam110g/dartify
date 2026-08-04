import * as ts from "ts-morph";
import { IRFunction, IRParameter } from "@ir/function";
import { parseType } from "@typeParser/type";
import { IRDeclKind } from "@ir/index";
import { declarationParseContext, ParseContext } from "./context";

export function parseFunction(
  funcDecl: ts.FunctionDeclaration,
  context: ParseContext = declarationParseContext(
    funcDecl,
    funcDecl.getName() ?? "anonFunc",
  ),
): IRFunction {
  let name = funcDecl.getName() ?? "anonFunc";
  let returnType = parseType(
    funcDecl.getReturnTypeNode(),
    0,
    context,
  );
  let params: IRParameter[] = [];
  for (const [paramIndex, param] of funcDecl.getParameters().entries()) {
    // Do not parse `this` param
    if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

    let pName = param.getName();
    const paramContext = context.child(pName);
    let type = parseType(param.getTypeNode(), 0, paramContext);
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
