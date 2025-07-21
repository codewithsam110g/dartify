import * as ts from "ts-morph";
import { IRType, TypeKind } from "../ir/type";
import { parseType } from "./type";

export function handleTypeReferences(
  node: ts.TypeReferenceNode,
  depth: number,
): IRType {
  const name = node.getTypeName().getText();
  const typeArgs = node.getTypeArguments();
  let genericArgs: IRType[] = [];
  for (let typeArg of typeArgs) {
    let res = parseType(typeArg, depth + 1);
    genericArgs.push(res);
  }
  return {
    kind: TypeKind.TypeReference,
    name: name,
    isNullable: false,
    genericArgs: genericArgs,
  };
}
