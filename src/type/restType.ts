import * as ts from "ts-morph";
import { IRType, TypeKind } from "../ir/type";
import { parseType } from "./type";

export function handleRestType(node: ts.RestTypeNode, depth: number): IRType {
  let res = parseType(node.getTypeNode(), depth + 1);
    res.isRestParameter = true;
    return res;
}
