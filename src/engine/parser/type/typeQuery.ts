import * as ts from "ts-morph";
import { IRType, TypeKind, UnsupportedReason } from "@ir/type";
import { makeUnsupported } from "./unsupported";

/**
 * `typeof x` — the type of a *value*, which only the type checker knows.
 *
 * This is the one place in the type parser that leaves the syntax tree, and it
 * is worth it: `typeof` is by far the most common construct dartify could not
 * represent. Over three.js + leaflet + probe, 393 of 449 `typeof` nodes (87%)
 * resolve to a primitive — 199 number literals, 191 string literals, 3 plain
 * `number`. The idiom driving that count is the enum-as-consts pattern:
 *
 * ```ts
 * export const NearestFilter: 1003;
 * export const LinearFilter: 1006;
 * export type TextureFilter = typeof NearestFilter | typeof LinearFilter;
 * ```
 *
 * Syntactically `typeof NearestFilter` is opaque; resolved, it is `1003`, and
 * the whole alias collapses to `num`.
 *
 * The 56 that do not resolve to a primitive are function values (28),
 * namespace objects like `typeof L.DomEvent` (21) and class constructors like
 * `typeof L.Class` (7). Those stay Unsupported and pick up a minted alias
 * (`E-16`) — deliberately, because `typeof Foo` on a class is the constructor
 * type, *not* `Foo`, and emitting `Foo` would be confidently wrong rather than
 * honestly degraded.
 */
export function handleTypeQuery(node: ts.TypeQueryNode): IRType {
  let resolved: ts.Type;
  try {
    resolved = node.getType();
  } catch {
    // Not the unresolved-reference path — that comes back as `any` and falls
    // through to the bottom of this function (verified). This is here only so
    // a checker crash degrades one node instead of taking down a whole-corpus
    // run, which the stress tier asserts never happens.
    return makeUnsupported(node, UnsupportedReason.TypeQuery);
  }

  if (resolved.isNumberLiteral()) {
    return {
      kind: TypeKind.NumberLiteral,
      name: "double",
      literalValue: resolved.getLiteralValue() as number,
      isNullable: false,
    };
  }

  if (resolved.isStringLiteral()) {
    return {
      kind: TypeKind.StringLiteral,
      name: "String",
      literalValue: resolved.getLiteralValue() as string,
      isNullable: false,
    };
  }

  // Boolean literal types carry no literal value in the checker API; the type
  // *is* `true` or `false`.
  if (resolved.isBooleanLiteral()) {
    return {
      kind: TypeKind.BooleanLiteral,
      name: "bool",
      literalValue: resolved.getText() === "true",
      isNullable: false,
    };
  }

  if (resolved.isNumber()) {
    return { kind: TypeKind.Number, name: TypeKind.Number, isNullable: false };
  }

  if (resolved.isString()) {
    return { kind: TypeKind.String, name: TypeKind.String, isNullable: false };
  }

  if (resolved.isBoolean()) {
    return { kind: TypeKind.Boolean, name: TypeKind.Boolean, isNullable: false };
  }

  return makeUnsupported(node, UnsupportedReason.TypeQuery);
}
