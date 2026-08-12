/**
 * Dart 3 keyword classes from https://dart.dev/language/keywords.
 *
 * Reserved words are illegal in generated declaration/member positions.
 * `await` and `yield` are context-sensitive, but prefixing them keeps generated
 * signatures valid if the surrounding backend later becomes async. Built-in
 * identifiers are legal values/members but illegal type and type-parameter
 * names.
 */
export const DART_RESERVED_WORDS = new Set([
  "assert",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "else",
  "enum",
  "extends",
  "false",
  "final",
  "finally",
  "for",
  "if",
  "in",
  "is",
  "new",
  "null",
  "rethrow",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

export const DART_BUILT_IN_IDENTIFIERS = new Set([
  "Function",
  "abstract",
  "as",
  "covariant",
  "deferred",
  "dynamic",
  "export",
  "extension",
  "external",
  "factory",
  "get",
  "implements",
  "import",
  "interface",
  "late",
  "library",
  "mixin",
  "operator",
  "part",
  "required",
  "set",
  "static",
  "type",
  "typedef",
]);

/**
 * Unqualified names emitted by the package:js backend itself.
 *
 * A source declaration with one of these names would capture primitive,
 * collection, async, or annotation references in the same Dart library. They
 * are reserved only for top-level type/value allocation; members and
 * parameters may legally use the same spelling.
 */
export const DART_BACKEND_RESERVED_NAMES = new Set([
  "BigInt",
  "DateTime",
  "Future",
  "JS",
  "List",
  "Map",
  "Null",
  "Object",
  "Record",
  "Set",
  "String",
  "anonymous",
  "bool",
  "double",
  "dynamic",
  "int",
  "num",
  "void",
]);

export type DartIdentifierContext = "type" | "value" | "member" | "parameter";

export function legalDartName(
  sourceName: string,
  context: DartIdentifierContext,
): string {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(sourceName)) {
    const sanitized = sourceName
      .replace(/[^A-Za-z0-9_$]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return `JS$${sanitized || "binding"}`;
  }
  const illegal =
    DART_RESERVED_WORDS.has(sourceName) ||
    (context === "type" && DART_BUILT_IN_IDENTIFIERS.has(sourceName)) ||
    ((context === "type" || context === "value") &&
      DART_BACKEND_RESERVED_NAMES.has(sourceName));
  return illegal ? `JS$${sourceName}` : sourceName;
}
