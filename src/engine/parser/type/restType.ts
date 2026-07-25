import * as ts from "ts-morph";
import { IRType } from "@ir/type";
import { parseType } from "./type";

export function handleRestType(node: ts.RestTypeNode, depth: number): IRType {
  // Spread rather than mutate: the flag belongs to this position, not to the
  // inner type, and `parseType`'s result must never be assumed unshared (T-03).
  return {
    ...parseType(node.getTypeNode(), depth + 1),
    isRestParameter: true,
  };
}
