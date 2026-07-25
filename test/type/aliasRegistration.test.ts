import { expect, test, describe } from "vitest";
import { Transpiler } from "../../src/transpiler";

/**
 * S1.6 — minted aliases become real symbols, so a degraded type is a *named*
 * type at its use site (`L-05`, `E-16`, design principle 2).
 *
 * End-to-end through `transpileFromString` rather than against the registry
 * directly: the thing worth protecting is that the use site and the typedef
 * agree, and only the full pipeline can get that wrong.
 */
const render = async (source: string) =>
  (await Transpiler.transpileFromString(source, { fileName: "t.d.ts" })).content;

describe("alias registration", () => {
  test("a use site names its degradation and the name is declared", async () => {
    const content = await render("declare var k: keyof Box<string>;");

    expect(content).toContain("external KeyOfBoxString k;");
    expect(content).toContain("typedef KeyOfBoxString = dynamic;");
  });

  test("one typedef serves every occurrence of the same expression (L-05)", async () => {
    const content = await render(`
      declare var a: keyof Box<string>;
      declare var b: keyof Box<string>;
      declare function f(x: keyof Box<string>): void;
    `);

    expect(content.match(/typedef KeyOfBoxString = dynamic;/g)).toHaveLength(1);
    expect(content.match(/KeyOfBoxString/g)).toHaveLength(4); // 3 uses + 1 typedef
  });

  test("different expressions get different typedefs", async () => {
    const content = await render(`
      declare var a: keyof Box<string>;
      declare var b: keyof Attributes;
    `);

    expect(content).toContain("typedef KeyOfBoxString = dynamic;");
    expect(content).toContain("typedef KeyOfAttributes = dynamic;");
  });

  test("degraded types nested inside other types are reached", async () => {
    const content = await render(
      "declare function f(): Map<string, Array<keyof Box>>;",
    );

    expect(content).toContain("Map<String, List<KeyOfBox>>");
    expect(content).toContain("typedef KeyOfBox = dynamic;");
  });

  // `type X = <unrepresentable>` is already a named degradation — the author
  // named it. A minted second name would add `typedef X = MappedKInKeyOfTTK;`
  // on top of `typedef MappedKInKeyOfTTK = dynamic;`, a hop naming nothing new.
  test("an author's own alias is not given a second name", async () => {
    const content = await render("type Mapped<T> = { [K in keyof T]: T[K] };");

    expect(content).toContain("typedef Mapped = dynamic;");
    expect(content).not.toContain("MappedKInKeyOfTTK");
  });

  // Shadowing a real declaration with a `dynamic` typedef is a silent
  // miscompile — design principle 1.
  test("a minted name never shadows a declaration in the same file", async () => {
    const content = await render(`
      declare class KeyOfBoxString {}
      declare var k: keyof Box<string>;
    `);

    expect(content).toMatch(/typedef KeyOfBoxString_[0-9a-f]{6} = dynamic;/);
    expect(content).not.toContain("typedef KeyOfBoxString = dynamic;");
  });

  test("the typedef's own right-hand side does not refer to itself", async () => {
    const content = await render("declare var k: keyof Box<string>;");

    expect(content).not.toContain("typedef KeyOfBoxString = KeyOfBoxString;");
  });

  test("nothing is minted for a file with no degraded types", async () => {
    const content = await render("declare function f(x: string): number;");

    expect(content).not.toContain("typedef");
  });

  describe("the type-definitions section (E-16)", () => {
    test("each typedef records what it stood in for", async () => {
      const content = await render("declare var k: keyof Box<string>;");

      expect(content).toContain(
        "/// Unrepresentable in Dart: `keyof Box<string>`\ntypedef KeyOfBoxString = dynamic;",
      );
    });

    test("the section is introduced, and only when there is one", async () => {
      const withDegradation = await render("declare var k: keyof Box<string>;");
      const without = await render("declare function f(x: string): number;");

      expect(withDegradation).toContain("// Type definitions");
      expect(without).not.toContain("// Type definitions");
    });

    // Minted typedefs go to the bottom; an author's own alias stays where they
    // wrote it. Both are documented — the flag is about placement, not prose.
    test("an author's alias is documented in place, not moved", async () => {
      const content = await render(`
        type Mapped<T> = { [K in keyof T]: T[K] };
        declare var k: keyof Box<string>;
      `);

      const authorAlias = content.indexOf("typedef Mapped = dynamic;");
      const sectionHeader = content.indexOf("// Type definitions");

      expect(content).toContain(
        "/// Unrepresentable in Dart: `{ [K in keyof T]: T[K] }`",
      );
      expect(authorAlias).toBeLessThan(sectionHeader);
    });

    // A template literal type carries backticks, so a single-backtick code
    // span renders wrong. Markdown wants a longer fence plus padding.
    test("source text containing backticks is fenced correctly", async () => {
      const content = await render("declare var t: `pre-${string}`;");

      expect(content).toContain(
        "/// Unrepresentable in Dart: `` `pre-${string}` ``",
      );
    });

    test("the section is ordered deterministically, not by parse order", async () => {
      const content = await render(`
        declare var z: keyof Zeta;
        declare var a: keyof Alpha;
      `);

      expect(content.indexOf("typedef KeyOfAlpha")).toBeLessThan(
        content.indexOf("typedef KeyOfZeta"),
      );
    });
  });

  // Asserted as an invariant rather than against fixed counts, so editing the
  // probe fixture does not break the test for the wrong reason. Dedup can only
  // ever reduce typedefs relative to use sites, never the other way round.
  test("the link report accounts for what was minted", async () => {
    const transpiler = new Transpiler({
      files: ["def_files/synthetic/probe.d.ts"],
      outDir: "/tmp/dartify-alias-report",
    });

    const report = await transpiler.analyze();

    expect(report.aliasesMinted).toBeGreaterThan(0);
    expect(report.aliasUseSites).toBeGreaterThanOrEqual(report.aliasesMinted);
  });
});
