import * as ts from "ts-morph";
import { IRType, TypeKind } from "../../ir/type";
import { parseType } from "./type";

export function handleUnionType(node: ts.UnionTypeNode, depth: number): IRType {
  const unionNodes = node.getTypeNodes();

  const isNullable = unionNodes.some(isNullOrUndefined);
  const nonNullUnionNodes = unionNodes.filter(
    (node) => !isNullOrUndefined(node),
  );

  const unionIRs = nonNullUnionNodes
    .map((uNode) => parseType(uNode, depth + 1))

  return {
    kind: TypeKind.Union,
    name: TypeKind.Union,
    isNullable,
    unionTypes: unionIRs,
  };
}

function isNullOrUndefined(node: ts.TypeNode): boolean {
  if (node.getKind() === ts.SyntaxKind.UndefinedKeyword) {
    return true;
  }

  if (node.getKind() === ts.SyntaxKind.LiteralType) {
    const literal = (node as ts.LiteralTypeNode).getLiteral();
    return literal.getKind() === ts.SyntaxKind.NullKeyword;
  }

  return false;
}
