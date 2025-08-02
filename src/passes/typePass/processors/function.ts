import * as ts from "ts-morph";
import { IRType } from "../../../ir/type";
import { parseType } from "../../../type/parser/type";

export function processFunctionStmtTypes(
  node: ts.FunctionDeclaration,
  typeMap: Map<string, IRType>,
  modulePrefix: string,
): void {
  const functionName = node.getName();
  if (!functionName) return;

  const fullName = modulePrefix + functionName;

  // Process return type
  const returnTypeNode = node.getReturnTypeNode();
  if (returnTypeNode) {
    const irType = parseType(returnTypeNode);
    const returnKey = `${fullName}.return`;
    typeMap.set(returnKey, irType);
  }

  // Process parameters
  for (const param of node.getParameters()) {
    const paramTypeNode = param.getTypeNode();
    if (paramTypeNode) {
      const irType = parseType(paramTypeNode);
      const paramKey = `${fullName}.param.${param.getName()}`;
      typeMap.set(paramKey, irType);
    }
  }
}