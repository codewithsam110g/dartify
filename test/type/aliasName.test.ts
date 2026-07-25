import { expect, test, describe } from "vitest";
import { deriveAliasName } from "../../src/engine/alias/name";
import { AliasRegistry } from "../../src/engine/alias/registry";
import { UnsupportedReason } from "../../src/ir/type";

/**
 * S1.5 Tier B — every construct with no Dart representation gets a *name*
 * instead of a bare `dynamic` (`T-01`, design principle 2).
 *
 * The source texts below are taken verbatim from three.js, leaflet and
 * `synthetic/probe.d.ts`; they are what the corpus actually contains, not
 * invented shapes.
 */
describe("alias name derivation", () => {
  test.each([
    // The example design principle 2 is written against.
    ["keyof Box<string>", UnsupportedReason.KeyOf, "KeyOfBoxString"],
    ["keyof Attributes", UnsupportedReason.KeyOf, "KeyOfAttributes"],
    // `typeof`, not `Typeof` — the keyword table earns its keep here.
    ["typeof FloatType", UnsupportedReason.TypeQuery, "TypeOfFloatType"],
    [
      "typeof Object3DNode.WORLD_MATRIX",
      UnsupportedReason.TypeQuery,
      "TypeOfObject3DNodeWORLD_MATRIX",
    ],
    ["(new() => NodeMaterial)", UnsupportedReason.ConstructorType, "NewNodeMaterial"],
    [
      "string extends number ? true : false",
      UnsupportedReason.Conditional,
      "StringExtendsNumberTrueFalse",
    ],
    [
      "T extends Array<infer U> ? U : never",
      UnsupportedReason.Conditional,
      "TExtendsArrayInferUUNever",
    ],
  ])("%s -> %s", (text, reason, expected) => {
    expect(deriveAliasName(text, reason)).toBe(expected);
  });

  // Without the prefix these read as ordinary type references at the use site,
  // which defeats the point of naming the degradation at all.
  describe("constructs whose text names nothing get told what they are", () => {
    test.each([
      ["Attributes[K]", UnsupportedReason.IndexedAccess, "IndexedAttributesK"],
      ["TEventMap[T]", UnsupportedReason.IndexedAccess, "IndexedTEventMapT"],
      ["{ [K in keyof T]: T[K] }", UnsupportedReason.Mapped, "MappedKInKeyOfTTK"],
      ["`pre-${string}`", UnsupportedReason.TemplateLiteral, "TemplatePreString"],
      // `$` is template syntax here, not part of a name — it must not survive.
      [
        "`${NumberToVec[TNum]}2`",
        UnsupportedReason.TemplateLiteral,
        "TemplateNumberToVecTNum2",
      ],
    ])("%s -> %s", (text, reason, expected) => {
      expect(deriveAliasName(text, reason)).toBe(expected);
    });

    test("an already-prefixed derivation is not prefixed twice", () => {
      expect(deriveAliasName("Indexed[K]", UnsupportedReason.IndexedAccess)).toBe(
        "IndexedK",
      );
    });
  });

  describe("pathological input", () => {
    // three.js has a 21-branch conditional type whose naive derivation is 1,379
    // characters long.
    const monster =
      'TNodeType extends "float" ? FloatExtensions : TNodeType extends "int" ? ' +
      'IntExtensions : TNodeType extends "uint" ? UintExtensions : TNodeType ' +
      'extends "bool" ? BoolExtensions : TNodeType extends "vec2" ? Vec2Extensions : {}';

    test("is truncated to a bounded length", () => {
      const name = deriveAliasName(monster, UnsupportedReason.Conditional);

      expect(name.length).toBeLessThanOrEqual(64);
    });

    test("truncation cuts at a word boundary, not mid-identifier", () => {
      const name = deriveAliasName(monster, UnsupportedReason.Conditional);

      // The hash suffix is the only place a `_` may be introduced here.
      expect(name).toMatch(/^TNodeTypeExtendsFloat[A-Za-z0-9]*_[0-9a-f]{6}$/);
    });

    test("texts sharing a long prefix still get different names", () => {
      const a = deriveAliasName(monster + " & A", UnsupportedReason.Conditional);
      const b = deriveAliasName(monster + " & B", UnsupportedReason.Conditional);

      expect(a).not.toBe(b);
    });

    // A leading underscore is library-private in Dart, so every use site of
    // such a typedef would fail to resolve.
    test.each([
      ["_internal[K]", UnsupportedReason.IndexedAccess],
      ["typeof _hidden", UnsupportedReason.TypeQuery],
      ["[]", UnsupportedReason.Conditional],
      ['"literal-only"', UnsupportedReason.TemplateLiteral],
    ])("%s yields a public identifier", (text, reason) => {
      const name = deriveAliasName(text, reason);

      expect(name).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/);
    });
  });

  test("is a pure function of the text", () => {
    expect(deriveAliasName("keyof Box<string>", UnsupportedReason.KeyOf)).toBe(
      deriveAliasName("keyof Box<string>", UnsupportedReason.KeyOf),
    );
  });
});

describe("AliasRegistry", () => {
  test("the same expression is one typedef with many use sites (L-05)", () => {
    const registry = new AliasRegistry();

    const first = registry.mint("keyof Box<string>", UnsupportedReason.KeyOf);
    const second = registry.mint("keyof Box<string>", UnsupportedReason.KeyOf);

    expect(second).toBe(first);
    expect(first.useCount).toBe(2);
    expect(registry.size).toBe(1);
  });

  test("distinct expressions that derive to one name are separated", () => {
    const registry = new AliasRegistry();

    // Both derive to `KeyOfBoxString` — the literal's quotes are dropped.
    const plain = registry.mint("keyof Box<string>", UnsupportedReason.KeyOf);
    const literal = registry.mint('keyof Box<"string">', UnsupportedReason.KeyOf);

    expect(plain.name).toBe("KeyOfBoxString");
    expect(literal.name).not.toBe(plain.name);
    expect(registry.size).toBe(2);
  });

  // Shadowing a real declaration with a `dynamic` typedef is a silent
  // miscompile — precisely what design principle 1 forbids.
  test("never shadows a name the symbol table already holds", () => {
    const declared = new Set(["KeyOfBoxString"]);
    const registry = new AliasRegistry((name) => declared.has(name));

    const alias = registry.mint("keyof Box<string>", UnsupportedReason.KeyOf);

    expect(alias.name).not.toBe("KeyOfBoxString");
    expect(alias.name).toMatch(/^KeyOfBoxString_[0-9a-f]{6}$/);
  });

  test("disambiguation does not depend on minting order", () => {
    const declared = new Set(["KeyOfBoxString"]);

    const a = new AliasRegistry((n) => declared.has(n));
    a.mint("keyof Attributes", UnsupportedReason.KeyOf);
    a.mint("keyof Box<string>", UnsupportedReason.KeyOf);

    const b = new AliasRegistry((n) => declared.has(n));
    b.mint("keyof Box<string>", UnsupportedReason.KeyOf);

    expect(a.lookup("keyof Box<string>")!.name).toBe(
      b.lookup("keyof Box<string>")!.name,
    );
  });

  test("all() reports every alias in first-seen order", () => {
    const registry = new AliasRegistry();
    registry.mint("typeof FloatType", UnsupportedReason.TypeQuery);
    registry.mint("keyof Attributes", UnsupportedReason.KeyOf);
    registry.mint("typeof FloatType", UnsupportedReason.TypeQuery);

    expect(registry.all().map((a) => a.name)).toEqual([
      "TypeOfFloatType",
      "KeyOfAttributes",
    ]);
  });

  test("lookup does not mint", () => {
    const registry = new AliasRegistry();

    expect(registry.lookup("keyof Box<string>")).toBeUndefined();
    expect(registry.size).toBe(0);
  });
});
