import * as ts from "ts-morph";
import { IRType } from "@ir/type";
import { parseType } from "@typeParser/type";


export function processVariableStmtTypes(
  node: ts.VariableStatement,
  typeMap: Map<string, IRType>,
  modulePrefix: string,
) {
  let varDecls = node.getDeclarationList();
  for (let varDecl of varDecls.getDeclarations()) {
    let name = varDecl.getName();
    let type = parseType(varDecl.getTypeNode());
    const fullName = modulePrefix + name;
    typeMap.set(fullName, type);
  }
}
