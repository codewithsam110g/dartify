import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";

export function handleIntersectionType(
  node: ts.IntersectionTypeNode,
  depth: number,
): IRType {
  const rawTypes = node.getTypeNodes();

  let isNullable = false;
  let hasNever = false;

  const intersectionNodes: IRType[] = [];

  for (const typeNode of rawTypes) {
    const text = typeNode.getText().trim();

    if (text === "null" || text === "undefined") {
      isNullable = true;
      continue; // skip in intersection
    }

    if (text === "never") {
      hasNever = true;
      continue; // handled separately
    }

    if (text === "void") {
      // Only include void in return context — if needed, pass context flag
      continue; // skip by default
    }

    const parsed = parseType(typeNode, depth + 1);
    if (parsed) {
      intersectionNodes.push(parsed);
    }
  }

  if (hasNever) {
    return {
      kind: TypeKind.Never,
      name: "Never",
      isNullable,
    };
  }

  if (intersectionNodes.length === 0) {
    // Only null/undefined/void/never were present
    return {
      kind: TypeKind.Any,
      name: TypeKind.Any,
      isNullable,
    };
  }

  if (intersectionNodes.length === 1) {
    // Reduce T & null/undefined to T?
    return {
      ...intersectionNodes[0],
      isNullable: intersectionNodes[0].isNullable || isNullable,
    };
  }

  return {
    kind: TypeKind.Intersection,
    name: TypeKind.Intersection,
    isNullable,
    intersectionTypes: intersectionNodes,
  };
}
