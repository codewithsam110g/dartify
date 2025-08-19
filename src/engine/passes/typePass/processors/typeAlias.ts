import * as ts from "ts-morph";
import { IRType } from "@ir/type";
import { parseType } from "@typeParser/type";


export function processTypeAliasStmtTypes(
  node: ts.TypeAliasDeclaration,
  typeMap: Map<string, IRType>,
  modulePrefix: string,
): void {
  const aliasName = node.getName();
  const fullName = modulePrefix + aliasName;

  const typeNode = node.getTypeNode();
  if (typeNode) {
    const irType = parseType(typeNode);
    typeMap.set(fullName, irType);
  }
}
