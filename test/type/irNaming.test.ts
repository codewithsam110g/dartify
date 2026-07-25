import { expect, test, describe } from "vitest";
import { createTypeNode, createTypeNodeInContext } from "../test-helper";
import { parseType } from "../../src/engine/parser/type/type";
import { IRType, TypeKind } from "../../src/ir/type";

/**
 * `T-06` — `IRType.name` is the TypeScript-side name, never a Dart one.
 *
 * The IR is meant to be output-language agnostic (design principle 3), and it
 * was not: the literal handlers wrote `"double"`, `"String"` and `"bool"`,
 * making the parser a partial emitter and handing any second backend a
 * vocabulary it cannot use.
 *
 * Expressed as an invariant rather than a list of cases, so a new `SyntaxKind`
 * handler cannot quietly reintroduce the problem: for everything except a type
 * reference — the one kind whose name carries information — `name` must equal
 * `kind`.
 */
const walk = (type: IRType, visit: (node: IRType) => void): void => {
  visit(type);
  for (const value of Object.values(type)) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item && typeof item === "object" && "kind" in item) {
          walk(item as IRType, visit);
        } else if (item && typeof item === "object" && "type" in item) {
          walk((item as { type: IRType }).type, visit);
        }
      });
    } else if (value && typeof value === "object" && "kind" in value) {
      walk(value as IRType, visit);
    }
  }
};

describe("IRType.name carries no Dart vocabulary (T-06)", () => {
  const sources = [
    "string",
    "number",
    "boolean",
    "bigint",
    "void",
    "any",
    "unknown",
    "never",
    "object",
    "null",
    "undefined",
    '"literal"',
    "42",
    "-7",
    "10n",
    "-2n",
    "true",
    "false",
    "string[]",
    "Array<number>",
    "[string, number]",
    "string | number",
    "string | null",
    "Map<string, Foo>",
    "(a: string, b?: number) => boolean",
    "keyof Box<string>",
    "{ [K in keyof T]: T[K] }",
    "readonly string[]",
    "Foo & Bar",
    "never & string",
  ];

  test.each(sources)("%s", (source) => {
    const offenders: string[] = [];

    walk(parseType(createTypeNode(source)), (node) => {
      if (node.kind === TypeKind.TypeReference) return;
      if (node.name !== node.kind) {
        offenders.push(`${node.kind} carries name "${node.name}"`);
      }
    });

    expect(offenders).toEqual([]);
  });

  test("checker-resolved typeof is held to the same rule", () => {
    const offenders: string[] = [];

    walk(
      parseType(
        createTypeNodeInContext("declare const x: 1003;", "typeof x"),
      ),
      (node) => {
        if (node.kind !== TypeKind.TypeReference && node.name !== node.kind) {
          offenders.push(`${node.kind} carries name "${node.name}"`);
        }
      },
    );

    expect(offenders).toEqual([]);
  });

  // The old shape used `name: "BigInt"` to distinguish a bigint literal from a
  // number literal, so the emitter — which never reads `name` — saw
  // `NumberLiteral` and emitted `num` for `10n` while emitting `BigInt` for a
  // plain `bigint`. Purging the name forced the distinction into `kind`.
  test("a bigint literal is a BigInt, not a NumberLiteral", () => {
    const ir = parseType(createTypeNode("10n"));

    expect(ir.kind).toBe(TypeKind.BigInt);
    expect(ir.literalValue).toBe(10n);
  });

  test("a negative bigint literal too", () => {
    const ir = parseType(createTypeNode("-2n"));

    expect(ir.kind).toBe(TypeKind.BigInt);
    expect(ir.literalValue).toBe(-2n);
  });

  test("a type reference keeps its declared TypeScript name", () => {
    const ir = parseType(createTypeNode("Map<string, Foo>"));

    expect(ir.name).toBe("Map");
    expect(ir.genericArgs![1].name).toBe("Foo");
  });
});
