import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";
import { makeUnsupported } from "./unsupported";

/**
 * `TypeOperator` covers three unrelated constructs, so it dispatches on the
 * operator token rather than the node kind.
 *
 * - `readonly T[]` → the array itself. Dart's type system has no read-only
 *   list type, so the element type is what survives; `js_facade_gen` §14.4
 *   does the same, emitting `List<num>` with the original spelling in a
 *   trailing comment. The read-only-ness is genuinely lost, but the *shape* is
 *   not, and a `List<T>` is far more useful than a `dynamic` that is merely
 *   honest about it.
 * - `keyof T` and `unique symbol` → unrepresentable. Left as `Unsupported` so
 *   Tier B (S1.5) can mint a named alias.
 */
export function handleTypeOperator(
  node: ts.TypeOperatorTypeNode,
  depth: number,
): IRType {
  if (node.getOperator() === ts.SyntaxKind.ReadonlyKeyword) {
    // `depth + 1`. Unwrapping is still a level of nesting, and the `depth > 15`
    // guard is the only recursion protection there is (`T-17`).
    return parseType(node.getTypeNode(), depth + 1);
  }

  return makeUnsupported(node);
}

/**
 * `x is T` — a type predicate in return position.
 *
 * The function returns a boolean at runtime; the predicate is a compile-time
 * narrowing hint with no Dart counterpart. `js_facade_gen` §6.6 emits `bool`
 * with the predicate in a trailing comment, so `bool` is the established
 * representation, and `originalText` keeps the narrowing readable.
 */
export function handleTypePredicate(): IRType {
  return {
    kind: TypeKind.Boolean,
    name: TypeKind.Boolean,
    isNullable: false,
  };
}
