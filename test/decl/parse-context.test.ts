import { describe, expect, test } from "vitest";
import * as ts from "ts-morph";
import { IRDeclaration } from "../../src/ir/declaration";
import { ParseContext } from "../../src/engine/parser/context";
import { parseFunction } from "../../src/engine/parser/function";
import { createStatementNode } from "../test-helper";

describe("immutable parse context", () => {
  test("derives child scopes without mutating the parent", () => {
    const parent = new ParseContext("/types.d.ts::Box");
    const child = parent.child("method_0_map").child("return");

    expect(parent.scopeFQN).toBe("/types.d.ts::Box");
    expect(child.scopeFQN).toBe(
      "/types.d.ts::Box|method_0_map|return",
    );
  });

  test("gives return and parameter type literals distinct hoist scopes", () => {
    const declaration = createStatementNode(
      "declare function convert(input: { value: string }): { ok: boolean };",
    ) as ts.FunctionDeclaration;
    const hoisted = new Map<string, IRDeclaration>();
    const context = new ParseContext(
      `${declaration.getSourceFile().getFilePath()}::convert`,
      (fqn, ir) => hoisted.set(fqn, ir),
    );

    parseFunction(declaration, context);

    expect([...hoisted.keys()].sort()).toEqual([
      `${declaration.getSourceFile().getFilePath()}::Anon_convert`,
      `${declaration.getSourceFile().getFilePath()}::Anon_convert_input`,
    ]);
  });
});
