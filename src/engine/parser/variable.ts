import * as ts from "ts-morph";
import { IRVariable } from "@ir/variable";
import { parseType } from "@typeParser/type";
import { IRDeclKind } from "@ir/index";
import { ParseContext } from "./context";
import { declarationModifiersOf, nodeMetadata } from "./metadata";

export function parseVariableStmt(
  fqnPrefix: string,
  statement: ts.VariableStatement,
  context: ParseContext = new ParseContext(fqnPrefix),
): IRVariable[] {
  const declarationList = statement.getDeclarationList();
  const declarationKind = declarationList.getDeclarationKind();
  const kind =
    declarationKind === ts.VariableDeclarationKind.Const
      ? "const"
      : declarationKind === ts.VariableDeclarationKind.Let
        ? "let"
        : "var";

  return declarationList.getDeclarations().map((declaration) => {
    const name = declaration.getName();
    const fqn = fqnPrefix + name;
    const statementJsDoc = nodeMetadata(statement).jsDoc;
    return {
      ...nodeMetadata(declaration),
      ...(statementJsDoc ? { jsDoc: statementJsDoc } : {}),
      kind: IRDeclKind.Variable,
      modifiers: declarationModifiersOf(statement),
      name,
      type: parseType(declaration.getTypeNode(), 0, context.atFQN(fqn)),
      declarationKind: kind,
      isConst: kind === "const",
    };
  });
}
