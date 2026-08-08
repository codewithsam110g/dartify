import * as ts from "ts-morph";
import { IRFunction } from "@ir/function";
import { IRDeclKind } from "@ir/index";
import { parseType } from "@typeParser/type";
import { declarationParseContext, ParseContext } from "./context";
import {
  declarationModifiersOf,
  nodeMetadata,
} from "./metadata";
import { parseParameters, parseTypeParameters } from "./signature";

export function parseFunction(
  funcDecl: ts.FunctionDeclaration,
  context: ParseContext = declarationParseContext(
    funcDecl,
    funcDecl.getName() ?? "anonFunc",
  ),
): IRFunction {
  const name = funcDecl.getName() ?? "anonFunc";
  const declarations = funcDecl
    .getSymbol()
    ?.getDeclarations()
    .filter(ts.Node.isFunctionDeclaration) ?? [funcDecl];
  const overloadIndex = Math.max(
    0,
    declarations.findIndex(
      (declaration) => declaration.compilerNode === funcDecl.compilerNode,
    ),
  );
  const signatureContext = context.child(`overload_${overloadIndex}`);
  return {
    ...nodeMetadata(funcDecl),
    kind: IRDeclKind.Function,
    modifiers: declarationModifiersOf(funcDecl),
    name,
    typeParams: parseTypeParameters(funcDecl, signatureContext),
    returnType: parseType(
      funcDecl.getReturnTypeNode(),
      0,
      signatureContext.child("return"),
    ),
    parameters: parseParameters(funcDecl, signatureContext),
  };
}
