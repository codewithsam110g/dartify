import { expect, test, describe } from "vitest";
import { createTypeNode, createStatementNode } from "../test-helper";
import { parseType } from "../../src/engine/parser/type/type";
import { emitType } from "../../src/engine/emitter/old/type/emit";
import { TypeKind } from "../../src/ir/type";
import { Transpiler } from "../../src/transpiler";
import * as ts from "ts-morph";

/**
 * S1.4 Tier A — constructs that *do* have a Dart representation and now get
 * one. Each case cites the `js_facade_gen` section it conforms to, since that
 * tool's output is the de facto spec for v1.
 */
describe("Tier A: constructs with a real Dart representation", () => {
  describe("`this` type → enclosing type (js_facade_gen §3.10)", () => {
    const parseReturnOf = (source: string, memberName: string) => {
      const decl = createStatementNode(source);
      const owner = decl as ts.ClassDeclaration | ts.InterfaceDeclaration;
      const method = owner.getMethodOrThrow(memberName);
      return parseType(method.getReturnTypeNodeOrThrow());
    };

    test("resolves to the enclosing class", () => {
      const ir = parseReturnOf("declare class Builder { setName(): this; }", "setName");

      expect(ir.kind).toBe(TypeKind.TypeReference);
      expect(ir.name).toBe("Builder");
      expect(emitType(ir)).toBe("Builder");
    });

    test("resolves to the enclosing interface", () => {
      const ir = parseReturnOf("interface Chainable { then(): this; }", "then");

      expect(ir.name).toBe("Chainable");
    });

    // Type parameters are not emitted yet (`E-03`), so `Box<T>` would be
    // uncompilable Dart. Revisit when E-03 lands.
    test("drops type arguments on a generic owner", () => {
      const ir = parseReturnOf("declare class Box<T> { self(): this; }", "self");

      expect(emitType(ir)).toBe("Box");
    });

    // Asserted end-to-end because a bare type literal is hoisted at parse
    // time, so its members are not reachable from the returned IRType.
    test("does not invent an owner when there is no enclosing type", async () => {
      const { content } = await Transpiler.transpileFromString(
        "type Loose = { m(): this };",
        { fileName: "loose.d.ts" },
      );

      // `this` inside a bare type literal has no class or interface ancestor.
      // Degrading is correct here; naming the hoisted `Anon_Loose` would be a
      // guess, and a wrong one whenever the literal is used in two places.
      expect(content).toContain("external dynamic m();");
      expect(content).not.toContain("external Anon_Loose m();");
    });
  });

  describe("readonly (js_facade_gen §14.4)", () => {
    test.each([
      ["readonly string[]", "List<String>"],
      ["readonly number[][]", "List<List<num>>"],
      ["ReadonlyArray<number>", "List<num>"],
    ])("%s → %s", (source, expected) => {
      expect(emitType(parseType(createTypeNode(source)))).toBe(expected);
    });
  });

  describe("bare null → Null (js_facade_gen §1.10, T-07)", () => {
    test("null in type position", () => {
      const ir = parseType(createTypeNode("null"));

      expect(ir.kind).toBe(TypeKind.Null);
      expect(emitType(ir)).toBe("Null");
    });

    test("a nullable union is still collapsed, not turned into Null", () => {
      expect(emitType(parseType(createTypeNode("string | null")))).toBe("String?");
    });
  });

  describe("E-17: `dynamic?` is not valid Dart", () => {
    test.each([
      "keyof T | null",
      "any | null",
      "unknown | null",
      "(keyof T) | undefined",
    ])("%s emits bare dynamic", (source) => {
      expect(emitType(parseType(createTypeNode(source)))).toBe("dynamic");
    });

    test.each([
      ["string | null", "String?"],
      ["Foo | null", "Foo?"],
      ["string[] | null", "List<String>?"],
    ])("%s still gets its ? (no over-correction)", (source, expected) => {
      expect(emitType(parseType(createTypeNode(source)))).toBe(expected);
    });
  });
});
