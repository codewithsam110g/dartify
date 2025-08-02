import * as ts from "ts-morph";
import { IRVariable } from "../ir/variable";
import { parseType } from "../type/parser/type";
import { IRDeclKind } from "../ir";
export function parseVariableStmt(varStmt: ts.VariableStatement): IRVariable[] {
  let varDecls = varStmt.getDeclarationList();
  let res: IRVariable[] = [];
  let isConst =
    varDecls.getDeclarationKind() === ts.VariableDeclarationKind.Const;
  let isReadonly = varDecls.hasModifier(ts.SyntaxKind.ReadonlyKeyword);
  for (let varDecl of varDecls.getDeclarations()) {
    let name = varDecl.getName();
    let typeBefore = varDecl.getTypeNode();
    let typeAfter = parseType(varDecl.getTypeNode());
    res.push({
      kind: IRDeclKind.Variable,
      name: name,
      typeBefore: typeBefore,
      typeAfter: typeAfter,
      isReadonly: isReadonly,
      isConst: isConst,
    });
  }
  return res;
}
