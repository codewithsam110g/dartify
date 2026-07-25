import { expect, test, describe } from "vitest";
import { createTypeNode } from "../test-helper";
import { parseType } from "../../src/engine/parser/type/type";
import { emitType } from "../../src/engine/emitter/old/type/emit";
import { TypeKind } from "../../src/ir/type";
import { Transpiler } from "../../src/transpiler";

/**
 * S1.9 — the IR states the truth rather than leaving the emitter to compensate
 * (`T-05`, `T-08`, `T-12`), plus two defects found while doing it (`T-15`,
 * `T-16`).
 */
describe("union normalisation (T-12)", () => {
  test("a union of one member is that member, not a wrapper", () => {
    const ir = parseType(createTypeNode("string | null"));

    expect(ir.kind).toBe(TypeKind.String);
    expect(ir.isNullable).toBe(true);
    expect(ir.unionTypes).toBeUndefined();
  });

  test("nullability survives the unwrap", () => {
    expect(emitType(parseType(createTypeNode("Foo | undefined")))).toBe("Foo?");
    expect(emitType(parseType(createTypeNode("string[] | null")))).toBe(
      "List<String>?",
    );
  });

  test("a genuine multi-member union keeps its wrapper", () => {
    const ir = parseType(createTypeNode("string | number"));

    expect(ir.kind).toBe(TypeKind.Union);
    expect(ir.unionTypes).toHaveLength(2);
  });

  // `E-17` lives in the branch that survives normalisation: two members that
  // both emit as the same Dart type still collapse, and still must not gain a
  // `?` when that type is `dynamic`.
  test("E-17 still holds for unions that collapse at emit", () => {
    expect(emitType(parseType(createTypeNode('"a" | "b"')))).toBe("String");
    expect(emitType(parseType(createTypeNode("any | null")))).toBe("dynamic");
  });
});

/**
 * The `E-17` guard compared for exact equality with `"dynamic"`, so the
 * commented form slipped through and emitted uncompilable Dart. Three three.js
 * files carried it until S1.9.
 */
describe("nullable dynamic in its commented form (E-17)", () => {
  test.each([
    "(Foo | Bar) | null",
    "Foo | Bar | null",
    "(Foo | Bar) | undefined",
  ])("%s does not gain a ?", (source) => {
    const emitted = emitType(parseType(createTypeNode(source)));

    expect(emitted).toBe("dynamic /* Foo|Bar */");
    expect(emitted).not.toContain("*/?");
  });

  // A minted alias is a typedef for `dynamic`, so a `?` on it is exactly as
  // invalid — and the alias already stands for the nullable expression.
  test("a nullable unrepresentable type gets a bare alias, not `Alias?`", async () => {
    const { content } = await Transpiler.transpileFromString(
      "declare var k: keyof Box<string> | null;",
      { fileName: "t.d.ts" },
    );

    expect(content).toMatch(/external KeyOfBoxStringNull k;/);
    expect(content).not.toContain("?");
  });

  test("representable types still get their ?", () => {
    expect(emitType(parseType(createTypeNode("Foo | null")))).toBe("Foo?");
    expect(emitType(parseType(createTypeNode("(Foo | Foo) | null")))).toBe("Foo?");
  });
});

describe("degenerate unions (T-15)", () => {
  // Filtering `null` and `undefined` out left an empty `unionTypes`, and
  // `emitType` reached straight for `[0]`. The throw was swallowed by the
  // emitter phase, which turned the whole declaration into a comment.
  test("null | undefined emits a nullable dynamic, not an error", async () => {
    const ir = parseType(createTypeNode("null | undefined"));

    expect(ir.kind).toBe(TypeKind.Any);
    expect(emitType(ir)).toBe("dynamic");

    const { content } = await Transpiler.transpileFromString(
      "declare var x: null | undefined;",
      { fileName: "t.d.ts" },
    );
    expect(content).toContain("external dynamic x;");
    expect(content).not.toContain("// ERROR emitting");
  });
});

describe("the empty type literal (T-16)", () => {
  // `{}` used to synthesise a symbol whose type referred to itself, emitting
  // the cyclic `typedef anon_dynamic = anon_dynamic;`.
  test("{} is dynamic, and mints no symbol", async () => {
    const { content } = await Transpiler.transpileFromString(
      "declare var y: {};\ntype Empty = {};",
      { fileName: "t.d.ts" },
    );

    expect(content).toContain("external dynamic y;");
    expect(content).toContain("typedef Empty = dynamic;");
    expect(content).not.toContain("anon_dynamic");
  });
});

describe("intersection dispatch (T-08)", () => {
  test.each([
    ["Foo & null", "Foo?"],
    ["Foo & undefined", "Foo?"],
    ["Foo & void", "Foo"],
  ])("%s -> %s", (source, expected) => {
    expect(emitType(parseType(createTypeNode(source)))).toBe(expected);
  });

  test("never anywhere in an intersection wins", () => {
    const ir = parseType(createTypeNode("Foo & never"));

    expect(ir.kind).toBe(TypeKind.Never);
  });

  // The old text comparison read `getText()` on each member. A member that is
  // a reference — not the keyword — must not be mistaken for one.
  test("a reference is not confused with the keyword it resembles", () => {
    const ir = parseType(createTypeNode("Foo & Bar"));

    expect(ir.kind).toBe(TypeKind.Intersection);
    expect(ir.intersectionTypes).toHaveLength(2);
  });
});

/**
 * `T-09`. The parser built a correct `Intersection` node with all its members
 * and `emitType` had no case for it, so it fell to `default:` and emitted bare
 * `dynamic` — no name, no comment. That was strictly worse than the tool
 * dartify replaces, which emits the first member plus a comment (§5.3).
 */
describe("intersections reach the output (T-09)", () => {
  test.each([
    ["Foo & Bar", "Foo /* Foo&Bar */"],
    ["Foo & Bar & Baz", "Foo /* Foo&Bar&Baz */"],
    // `Foo & Bar` is a `Foo`, so nullability composes normally; the comment is
    // stripped by the Dart parser, leaving `Foo?`.
    ["(Foo & Bar) | null", "Foo /* Foo&Bar */?"],
  ])("%s -> %s", (source, expected) => {
    expect(emitType(parseType(createTypeNode(source)))).toBe(expected);
  });

  test("members that all emit the same type need no comment", () => {
    expect(emitType(parseType(createTypeNode("Foo & Foo")))).toBe("Foo");
  });

  // The sibling union branch computes a unique set and then joins the original
  // list anyway (`E-18`); this must not repeat that.
  test("the comment is deduped, not just the test that gates it", () => {
    expect(emitType(parseType(createTypeNode("Foo & Bar & Foo")))).toBe(
      "Foo /* Foo&Bar */",
    );
  });

  // `any & T` is `any` in TypeScript. Promoting `T` out of it would hand
  // callers a `T` API over a value the source never promised was one.
  test("the first member is taken as written, not the most specific", () => {
    expect(emitType(parseType(createTypeNode("any & Foo")))).toBe(
      "dynamic /* dynamic&Foo */",
    );
  });

  test("no intersection reaches the output as bare dynamic", async () => {
    const { content } = await Transpiler.transpileFromString(
      "declare function f(): Foo & Bar;",
      { fileName: "t.d.ts" },
    );

    expect(content).toContain("external Foo /* Foo&Bar */ f();");
  });
});

describe("depth propagation through function types (T-05)", () => {
  // The `depth > 15` guard is the only recursion protection there is. Nesting
  // through return positions used to reset depth to 0 and slip past it.
  test("the guard trips on types nested through function returns", () => {
    const nest = (n: number): string =>
      n === 0 ? "string" : `() => ${nest(n - 1)}`;

    const ir = parseType(createTypeNode(nest(30)));

    const reasons: string[] = [];
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      if (record.kind === TypeKind.Unsupported) {
        reasons.push(String(record.unsupportedReason));
      }
      for (const value of Object.values(record)) walk(value);
    };
    walk(ir);

    expect(reasons).toContain("recursionLimit");
  });

  test("shallow function types are unaffected", () => {
    expect(emitType(parseType(createTypeNode("(a: string) => number")))).toBe(
      "num Function(String)",
    );
  });
});
