import { IRDeclaration } from "./declaration";
import { IRType, TypeKind } from "./type";

const TYPE_KINDS: ReadonlySet<string> = new Set(Object.values(TypeKind));

/**
 * Keys that never contain an `IRType`. Skipping them keeps the structural walk
 * from descending into source locations, docs and plain strings; it runs over
 * every declaration several times per build and is on the watch-mode hot path.
 */
const LEAF_KEYS: ReadonlySet<string> = new Set([
  "loc",
  "jsDoc",
  "name",
  "dartName",
  "jsName",
  "originalText",
  "modifiers",
  "initializer",
  "initializerText",
  "bindingPattern",
  "host",
  "reference",
  "literalValue",
  "unsupportedReason",
  "aliasName",
]);

/** Visits every IRType in a declaration, including nested type members. */
export function forEachIRType(
  declaration: IRDeclaration,
  visit: (type: IRType) => void,
): void {
  // IR is an acyclic tree (it is structured-cloneable and the parser builds
  // fresh nodes), so no visited-set is needed on this hot path.
  function walk(node: unknown): void {
    if (node === null || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (let index = 0; index < node.length; index++) walk(node[index]);
      return;
    }

    const record = node as Record<string, unknown>;
    if (typeof record.isNullable === "boolean" && TYPE_KINDS.has(record.kind as string)) {
      visit(record as unknown as IRType);
    }
    for (const key in record) {
      if (LEAF_KEYS.has(key)) continue;
      const value = record[key];
      if (value !== null && typeof value === "object") walk(value);
    }
  }

  walk(declaration);
}
