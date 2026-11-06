import { describe, expect, test } from "vitest";
import { createTypeNode } from "../test-helper";
import { parseType } from "../../src/engine/parser/type/type";
import { TypeKind } from "../../src/ir/type";
import { Transpiler } from "../../src/transpiler";

/**
 * Numeric separators are valid in number and bigint literal types
 * (`1_000`, `0x1_0n`). The literal's value is read from its source text, so
 * `Number("1_000")` was `NaN` and `BigInt("1_000")` threw, which aborted the
 * whole run.
 */
describe("numeric separators in literal types", () => {
  const bigints: [string, bigint][] = [
    ["1_000n", 1000n],
    ["0x1_0n", 16n],
    ["0b1_0n", 2n],
    ["-1_000n", -1000n],
    ["1000n", 1000n],
  ];
  test.each(bigints)("bigint %s has the value %s", (source, value) => {
    const ir = parseType(createTypeNode(source));
    expect(ir.kind).toBe(TypeKind.BigInt);
    expect(ir.literalValue).toBe(value);
  });

  const numbers: [string, number][] = [
    ["1_000", 1000],
    ["0x1_0", 16],
    ["0b1_0", 2],
    ["0xFF_FF", 65535],
    ["1_000.5_5", 1000.55],
    ["-1_000", -1000],
    ["1000", 1000],
  ];
  test.each(numbers)("number %s has the value %s", (source, value) => {
    const ir = parseType(createTypeNode(source));
    expect(ir.kind).toBe(TypeKind.NumberLiteral);
    expect(ir.literalValue).toBe(value);
  });

  test("a bigint literal with separators no longer aborts the run", async () => {
    const result = await Transpiler.transpileFromString(
      "export declare const big: 1_000n;\nexport declare function f(x: 1_000 | 0x1_0n): void;\n",
      { fileName: "/sep.d.ts" },
    );
    expect(result.errors).toEqual([]);
    expect(result.content).toContain("big");
    expect(result.content).toContain("void f(");
  });
});
