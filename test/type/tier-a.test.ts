import { expect, test, describe } from "vitest";
import {
  createTypeNode,
  createStatementNode,
  createTypeNodeInContext,
} from "../test-helper";
import { parseType } from "../../src/engine/parser/type/type";
import { emitType } from "../../src/engine/emitter/old/type/emit";
import { TypeKind, UnsupportedReason } from "../../src/ir/type";
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
      expect(content).not.toContain("external Anon_Loose m();");
      // Since S1.6 the degradation is a minted typedef rather than a bare
      // `dynamic` — still not an invented owner, just no longer anonymous.
      expect(content).toContain("external This m();");
      expect(content).toContain("typedef This = dynamic;");
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

  /**
   * `T-14`. The construct is opaque in the syntax tree and obvious to the type
   * checker, which is why it was wrongly written off in S1.4.
   */
  describe("typeof x through the checker", () => {
    const parseIn = (context: string, snippet: string) =>
      parseType(createTypeNodeInContext(context, snippet));

    test.each([
      // The enum-as-consts idiom, which is what drives the corpus count.
      ["declare const NearestFilter: 1003;", "typeof NearestFilter", "num"],
      ["declare const BindMode: 'attached';", "typeof BindMode", "String"],
      ["declare const flag: true;", "typeof flag", "bool"],
      // Not a literal type, but still a primitive the checker can name.
      ["declare const n: number;", "typeof n", "num"],
      ["declare const s: string;", "typeof s", "String"],
    ])("%s: %s -> %s", (context, snippet, expected) => {
      expect(emitType(parseIn(context, snippet))).toBe(expected);
    });

    test("keeps the literal value, not just the kind", () => {
      const ir = parseIn("declare const NearestFilter: 1003;", "typeof NearestFilter");

      expect(ir.kind).toBe(TypeKind.NumberLiteral);
      expect(ir.literalValue).toBe(1003);
    });

    // three.js's `src/constants.d.ts` is 221 nodes of exactly this shape.
    test("a union of const typeofs collapses to one primitive", () => {
      const ir = parseIn(
        "declare const A: 0; declare const B: 1; declare const C: 2;",
        "typeof A | typeof B | typeof C",
      );

      expect(emitType(ir)).toBe("num");
    });

    // `typeof Foo` is the *constructor* type, not `Foo`. Emitting `Foo` would
    // be confidently wrong; degrading is correct, and S1.7 gives it a name.
    test.each([
      ["declare class Widget {}", "typeof Widget"],
      ["declare function build(): void;", "typeof build"],
      ["declare const ns: { a: number };", "typeof ns"],
    ])("%s: %s stays unsupported", (context, snippet) => {
      const ir = parseIn(context, snippet);

      expect(ir.kind).toBe(TypeKind.Unsupported);
      expect(ir.unsupportedReason).toBe(UnsupportedReason.TypeQuery);
      expect(ir.originalText).toBe(snippet);
    });

    // The checker answers `any` for a name it cannot resolve. Reporting that
    // as `TypeKind.Any` would claim the author asked for a dynamic type when
    // in fact dartify just failed to look it up — the exact conflation
    // `TypeKind.Unsupported` exists to prevent (`T-01`).
    test("an unresolvable reference is Unsupported, not Any", () => {
      const ir = parseIn("", "typeof doesNotExist");

      expect(ir.kind).toBe(TypeKind.Unsupported);
      expect(ir.unsupportedReason).toBe(UnsupportedReason.TypeQuery);
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
