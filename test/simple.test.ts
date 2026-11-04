/**
 * Tier 1 — sanity.
 *
 * The smallest possible end-to-end assertions on `transpileFromString`.
 * These deliberately assert on *structure* rather than byte-exact output,
 * because the file header and layout are rewritten in S5; a test that pins the
 * exact bytes would have to be rewritten alongside the emitter and would catch
 * nothing extra in the meantime. The one byte-exact check lives in the smoke
 * snapshots.
 */

import { Transpiler } from "../src/transpiler";
import { expect, test, describe } from "vitest";

describe("transpileFromString", () => {
  test("emits an external binding for a declared variable", async () => {
    const result = await Transpiler.transpileFromString(
      "declare var a: number;",
    );

    expect(result.errors).toEqual([]);
    expect(result.content).toContain('@JS("a")');
    expect(result.content).toContain("external num get a;");
    expect(result.content).toContain("import 'package:js/js.dart';");
  });

  test("derives the library name from the virtual file name", async () => {
    const result = await Transpiler.transpileFromString(
      "declare var a: number;",
      { fileName: "test.d.ts" },
    );

    expect(result.content).toContain("from test.d.ts");
    expect(result.content).toContain("library test;");
  });

  test("defaults the virtual file name to virtual.d.ts", async () => {
    const result = await Transpiler.transpileFromString(
      "declare var a: number;",
    );

    expect(result.content).toContain("library virtual;");
  });

  test("reports syntax errors instead of silently emitting nothing", async () => {
    const result = await Transpiler.transpileFromString(
      "invalid typescript code",
    );

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].code).toMatch(/^TS\d+$/);
  });

  test("handles multiple declarations in one source", async () => {
    const result = await Transpiler.transpileFromString(`
declare var a: number;
declare var b: string;
`);

    expect(result.content).toContain('@JS("a")');
    expect(result.content).toContain("external num get a;");
    expect(result.content).toContain('@JS("b")');
    expect(result.content).toContain("external String get b;");
  });

  /**
   * Regression guard for R-11/R-14: every call owns its symbol table, so the
   * second call cannot inherit the first call's symbols.
   */
  test("does not leak symbols between calls", async () => {
    await Transpiler.transpileFromString("declare var leaked: number;");
    const second = await Transpiler.transpileFromString(
      "declare var fresh: string;",
    );

    expect(second.content).toContain("external String get fresh;");
    expect(second.content).not.toContain("leaked");
  });
});
