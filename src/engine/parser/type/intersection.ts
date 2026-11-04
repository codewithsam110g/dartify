import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";
import { ParseContext } from "@parser/context";
import { isNullOrUndefined, isNever, isVoid } from "./keywords";

/**
 * Whether the checker reduces this intersection to `never` (`T-18`). Asked
 * first because TypeScript's reduction rules — disjoint primitives, `null` or
 * `undefined` against an object type, conflicting literal discriminants — are
 * the checker's to know, not ours to re-derive.
 */
function checkerSaysNever(node: ts.IntersectionTypeNode): boolean {
  try {
    return node.getType().isNever();
  } catch {
    return false;
  }
}

function never(): IRType {
  return { kind: TypeKind.Never, name: TypeKind.Never, isNullable: false };
}

export function handleIntersectionType(
  node: ts.IntersectionTypeNode,
  depth: number,
  context: ParseContext,
): IRType {
  const rawTypes = node.getTypeNodes();
  if (checkerSaysNever(node)) return never();

  // `null`, `undefined` and `void` are not nullability markers inside an
  // intersection: under strict null checks `T & null` has no inhabitants. The
  // earlier code widened `string & null` to `String?` and dropped `void`
  // entirely (`T-18`). Only `any` survives an empty-domain member.
  let hasEmptyDomainMember = false;
  let hasAny = false;
  const intersectionNodes: IRType[] = [];

  for (const [index, typeNode] of rawTypes.entries()) {
    // Dispatched on SyntaxKind, not on `getText()` (`T-08`).
    if (isNullOrUndefined(typeNode) || isVoid(typeNode)) {
      hasEmptyDomainMember = true;
      continue;
    }
    if (isNever(typeNode)) return never();

    const parsed = parseType(
      typeNode,
      depth + 1,
      context.child(`intersection_${index}`),
    );
    if (parsed.kind === TypeKind.Any) hasAny = true;
    intersectionNodes.push(parsed);
  }

  if (hasAny) {
    return { kind: TypeKind.Any, name: TypeKind.Any, isNullable: false };
  }
  if (hasEmptyDomainMember) return never();

  if (intersectionNodes.length === 1) return intersectionNodes[0];

  return {
    kind: TypeKind.Intersection,
    name: TypeKind.Intersection,
    isNullable: false,
    intersectionTypes: intersectionNodes,
  };
}
