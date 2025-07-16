import * as ts from "ts-morph";
import { resolveDartType } from "../type";
import { IRVariable } from "../ir/variable";
export function parseVariableStmt(varStmt: ts.VariableStatement): IRVariable[] {
  let varDecls = varStmt.getDeclarationList();
  let res: IRVariable[] = [];
  let isConst =
    varDecls.getDeclarationKind() === ts.VariableDeclarationKind.Const;
  let isReadonly = varDecls.hasModifier(ts.SyntaxKind.ReadonlyKeyword);
  for (let varDecl of varDecls.getDeclarations()) {
    let name = varDecl.getName();
    let typeBefore = varDecl.getTypeNode();
    let typeAfter = resolveDartType(varDecl.getType());
    res.push({
      name: name,
      typeBefore: typeBefore,
      typeAfter: typeAfter,
      isReadonly: isReadonly,
      isConst: isConst,
    });
  }
  return res;
}
