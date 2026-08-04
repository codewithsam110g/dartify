import { IRDeclaration } from "./declaration";
import { IRType, TypeKind } from "./type";

/** Visits every IRType in a declaration, including nested type members. */
export function forEachIRType(
  declaration: IRDeclaration,
  visit: (type: IRType) => void,
): void {
  const seen = new Set<object>();

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    if (seen.has(node as object)) return;
    seen.add(node as object);

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    const record = node as Record<string, unknown>;
    if (
      typeof record.isNullable === "boolean" &&
      Object.values(TypeKind).includes(record.kind as TypeKind)
    ) {
      visit(record as unknown as IRType);
    }

    for (const value of Object.values(record)) walk(value);
  }

  walk(declaration);
}
