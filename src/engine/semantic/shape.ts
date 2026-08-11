import { IRDeclarationUnion } from "@ir/declaration";
import { TypeKind } from "@ir/type";

const EXCLUDED_KEYS = new Set([
  "loc",
  "jsDoc",
  "dartName",
  "jsName",
  "resolvedFQN",
  "resolvedDartName",
  "aliasName",
]);

const UNORDERED_ARRAY_KEYS = new Set([
  "callSignatures",
  "constructSignatures",
  "extends",
  "getAccessors",
  "implements",
  "indexSignatures",
  "intersectionTypes",
  "methods",
  "properties",
  "setAccessors",
  "unionTypes",
]);

/** Stable semantic key for a hoisted anonymous interface. */
export function anonymousShapeKey(declaration: IRDeclarationUnion): string {
  return JSON.stringify(canonicalValue(declaration, undefined, true));
}

/** Metadata-independent comparison key for declaration substructures. */
export function semanticKey(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

function canonicalValue(
  value: unknown,
  parentKey?: string,
  declarationRoot = false,
): unknown {
  if (typeof value === "bigint") return { bigint: value.toString() };
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalValue(item, parentKey));
    if (!parentKey || !UNORDERED_ARRAY_KEYS.has(parentKey)) return items;
    return items.sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
  }

  const record = value as Record<string, unknown>;
  const isUnsupported = record.kind === TypeKind.Unsupported;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    if (EXCLUDED_KEYS.has(key)) continue;
    if (declarationRoot && (key === "name" || key === "modifiers")) continue;
    if (key === "originalText" && !isUnsupported) continue;
    const child = canonicalValue(record[key], key);
    result[key] = child;
  }
  return result;
}
