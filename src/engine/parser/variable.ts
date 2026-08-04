import * as ts from "ts-morph";
import { IRVariable } from "@ir/variable";
import { parseType } from "@typeParser/type";
import { IRDeclKind } from "@ir/index";
import { ParseContext } from "./context";

export function parseVariableStmt(
  fqnPrefix: string,
  varStmt: ts.VariableStatement,
  context: ParseContext = new ParseContext(fqnPrefix),
): IRVariable[] {
  let varDecls = varStmt.getDeclarationList();
  let res: IRVariable[] = [];
  let isConst =
    varDecls.getDeclarationKind() === ts.VariableDeclarationKind.Const;
  let isReadonly = varDecls.hasModifier(ts.SyntaxKind.ReadonlyKeyword);
  for (const varDecl of varDecls.getDeclarations()) {
    let name = varDecl.getName();
    let fqn = fqnPrefix + name;
    let typeAfter = parseType(
      varDecl.getTypeNode(),
      0,
      context.atFQN(fqn),
    );
    res.push({
      kind: IRDeclKind.Variable,
      name: name,
      type: typeAfter,
      isReadonly: isReadonly,
      isConst: isConst,
    });
  }
  return res;
}
