import * as ts from "ts-morph";
import { IRVariable } from "@ir/variable";
import { parseType } from "@typeParser/type";
import { IRDeclKind } from "@ir/index";
import { transpilerContext } from "@/context";

export function parseVariableStmt(
  fqnPrefix: string,
  varStmt: ts.VariableStatement,
): IRVariable[] {
  let varDecls = varStmt.getDeclarationList();
  let res: IRVariable[] = [];
  let isConst =
    varDecls.getDeclarationKind() === ts.VariableDeclarationKind.Const;
  let isReadonly = varDecls.hasModifier(ts.SyntaxKind.ReadonlyKeyword);
  for (let varDecl of varDecls.getDeclarations()) {
    let name = varDecl.getName();
    let fqn = fqnPrefix + name;
    transpilerContext.currentFQN = fqn;
    let typeAfter = parseType(varDecl.getTypeNode());
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
