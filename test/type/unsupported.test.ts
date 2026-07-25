import { expect, test, describe } from "vitest";
import { createTypeNode } from "../test-helper";
import { parseType } from "../../src/engine/parser/type/type";
import { TypeKind, UnsupportedReason } from "../../src/ir/type";

/**
 * Assertions, not snapshots. These are behavioural invariants for the
 * degradation path (`T-01`, `I-03`) — a snapshot would happily record a
 * regression as the new truth, which is exactly the failure mode that let
 * `T-02` sit unnoticed.
 */
describe("unsupported type classification", () => {
  const cases: [label: string, source: string, reason: UnsupportedReason][] = [
    ["this type", "this", UnsupportedReason.ThisType],
    ["keyof", "keyof Box<string>", UnsupportedReason.KeyOf],
    ["readonly array", "readonly string[]", UnsupportedReason.ReadonlyOperator],
    ["unique symbol", "unique symbol", UnsupportedReason.UniqueSymbol],
    ["conditional", "A extends B ? C : D", UnsupportedReason.Conditional],
    ["mapped", "{ [K in keyof T]: T[K] }", UnsupportedReason.Mapped],
    ["template literal", "`pre-${string}`", UnsupportedReason.TemplateLiteral],
    ["indexed access", "Box<string>['value']", UnsupportedReason.IndexedAccess],
    ["type query", "typeof window", UnsupportedReason.TypeQuery],
    ["import type", "import('mod').Thing", UnsupportedReason.ImportType],
    ["constructor type", "new () => T", UnsupportedReason.ConstructorType],
  ];

  test.each(cases)("%s is classified and keeps its text", (_l, source, reason) => {
    const ir = parseType(createTypeNode(source));

    expect(ir.kind).toBe(TypeKind.Unsupported);
    expect(ir.unsupportedReason).toBe(reason);
    // The text is the whole point — without it the emitter has nothing to
    // document and nothing to derive an alias name from.
    expect(ir.originalText).toBe(source);
  });

  // The distinction Unsupported exists to preserve. If these ever come back
  // as Unsupported, dartify would be reporting the author's own `any` as a
  // dartify limitation.
  test.each(["any", "unknown"])("%s stays a genuine Any, not Unsupported", (source) => {
    const ir = parseType(createTypeNode(source));

    expect(ir.kind).toBe(TypeKind.Any);
    expect(ir.unsupportedReason).toBeUndefined();
  });

  // `[string?]` reaches the classifier as a bare OptionalType, which ts-morph
  // still does not wrap as of 26.0.0 (`T-10`). Asserted here so that when the
  // wrapper does land, this test fails and points at the workaround to delete.
  test("positional optional tuple member is named, not left unclassified", () => {
    const ir = parseType(createTypeNode("[string?]"));

    const member = ir.tupleTypes![0];
    expect(member.kind).toBe(TypeKind.Unsupported);
    expect(member.unsupportedReason).toBe(UnsupportedReason.OptionalMember);
    expect(member.isOptional).toBe(true);
  });

  test("nested unsupported types are reachable and keep their own text", () => {
    const ir = parseType(createTypeNode("Map<string, Array<keyof Box>>"));

    const inner = ir.genericArgs![1].genericArgs![0];
    expect(inner.kind).toBe(TypeKind.Unsupported);
    expect(inner.unsupportedReason).toBe(UnsupportedReason.KeyOf);
    expect(inner.originalText).toBe("keyof Box");
  });

  test("every parsed node carries originalText, at every depth (T-02)", () => {
    const ir = parseType(createTypeNode("Map<string, Array<keyof Box>>"));

    const missing: string[] = [];
    const walk = (node: unknown, path: string): void => {
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      if ("kind" in record && "name" in record && !("originalText" in record)) {
        missing.push(path);
      }
      for (const [key, value] of Object.entries(record)) {
        if (Array.isArray(value)) {
          value.forEach((v, i) => walk(v, `${path}.${key}[${i}]`));
        } else if (value && typeof value === "object") {
          walk(value, `${path}.${key}`);
        }
      }
    };
    walk(ir, "root");

    expect(missing).toEqual([]);
  });
});
