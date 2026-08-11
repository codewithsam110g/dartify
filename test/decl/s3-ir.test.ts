import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, test } from "vitest";
import * as ts from "ts-morph";
import { transpilerContext } from "../../src/context";
import { parseFunction } from "../../src/engine/parser/function";
import { TypeKind } from "../../src/ir/type";
import {
  deepCloneIRDeclaration,
  IRClass,
  IREnum,
  IRFunction,
  IRInterface,
  IRTypeAlias,
  IRVariable,
} from "../../src/ir";
import { Transpiler } from "../../src/transpiler";
import { createStatementNode } from "../test-helper";

const fixture = resolve("def_files/synthetic/s3-complete.d.ts");

async function parseFixture() {
  const analysis = await new Transpiler({ files: [fixture] }).analyze();
  const symbols = transpilerContext.symbolTable.getSymbolTable();
  const declarations = (name: string) =>
    symbols
      .get(`${fixture}::${name}`)
      ?.flatMap((symbol) => symbol.facets.map((facet) => facet.ir)) ?? [];

  return { analysis, declarations, symbols };
}

describe("Stage 3 complete declaration IR", () => {
  test("retains generic constraints/defaults and links their dependencies", async () => {
    const { analysis, declarations, symbols } = await parseFixture();
    const box = declarations("Box")[0] as IRClass;
    const callable = declarations("Callable")[0] as IRInterface;
    const create = declarations("create")[0] as IRFunction;
    const container = declarations("Container")[0] as IRTypeAlias;
    const mapper = declarations("Mapper")[0] as IRTypeAlias;

    for (const parameter of [
      box.typeParams[0],
      callable.typeParams[0],
      create.typeParams[0],
      container.typeParams[0],
    ]) {
      expect(parameter.name).toBe("T");
      expect(parameter.constraint?.name).toBe("Base");
      expect(parameter.default?.name).toBe("Default");
      expect(parameter.loc).toEqual(
        expect.objectContaining({ file: fixture, line: expect.any(Number) }),
      );
    }

    expect(box.methods[0].typeParams[0]).toEqual(
      expect.objectContaining({ name: "U" }),
    );
    expect(mapper.type.typeParams?.[0]).toEqual(
      expect.objectContaining({ name: "T" }),
    );
    expect(analysis.link.broken).toBe(0);
    expect(symbols.get(`${fixture}::Box`)?.[0].resolvedDeps).toEqual(
      expect.arrayContaining([
        `${fixture}::Base`,
        `${fixture}::Default`,
      ]),
    );
  });

  test("preserves all call, construct, constructor, and class index signatures", async () => {
    const { declarations } = await parseFixture();
    const box = declarations("Box")[0] as IRClass;
    const callable = declarations("Callable")[0] as IRInterface;

    expect(box.constructors).toHaveLength(1);
    expect(box.constructors[0]).not.toHaveProperty("name");
    expect(box.constructors[0].returnType).toBeUndefined();
    expect(box.constructors[0].visibility).toBe("protected");
    expect(box.indexSignatures).toHaveLength(1);
    expect(box.indexSignatures[0]).toEqual(
      expect.objectContaining({ isReadonly: true }),
    );

    expect(callable.callSignatures).toHaveLength(2);
    expect(callable.constructSignatures).toHaveLength(2);
    expect(callable.callSignatures[0].typeParams[0].name).toBe("U");
    expect(callable.callSignatures[0].parameters[0].isRest).toBe(true);
    expect(callable.constructSignatures[0].returnType?.name).toBe("Box");
  });

  test("retains docs, locations, declaration modifiers, and member visibility", async () => {
    const { declarations } = await parseFixture();
    const box = declarations("Box")[0] as IRClass;
    const create = declarations("create")[0] as IRFunction;

    expect(box.jsDoc).toContain("generic class");
    expect(box.loc).toEqual({ file: fixture, line: 12, column: 1 });
    expect(box.modifiers).toEqual({
      exportKind: "default",
      isDeclare: false,
      isAmbient: true,
    });
    expect(box.properties.map((property) => property.visibility)).toEqual([
      "public",
      "protected",
      "private",
    ]);
    expect(box.properties[1]).toEqual(
      expect.objectContaining({ isReadonly: true, isStatic: true }),
    );
    expect(box.methods[0].isAbstract).toBe(true);
    expect(create.modifiers).toEqual({
      exportKind: "named",
      isDeclare: true,
      isAmbient: true,
    });
    expect(create.parameters[0].jsDoc).toContain("@param value");
    expect(create.parameters[1].jsDoc).toContain("@param fallback");
  });

  test("distinguishes enum initializer semantics and clones bigint safely", async () => {
    const { declarations } = await parseFixture();
    const mixed = declarations("Mixed")[0] as IREnum;
    const huge = declarations("Huge")[0] as IRTypeAlias;

    expect(mixed.members.map((member) => member.initializer)).toEqual([
      { kind: "implicit", computedValue: 0 },
      { kind: "number", text: "2", value: 2 },
      { kind: "string", text: '"text"', value: "text" },
      { kind: "computed", text: "Numeric << 1", computedValue: 4 },
    ]);
    expect(huge.type.literalValue).toBe(9007199254740993n);

    const clone = deepCloneIRDeclaration(huge);
    expect(clone).not.toBe(huge);
    expect(clone.type).not.toBe(huge.type);
    expect(clone.type.literalValue).toBe(9007199254740993n);
  });

  test("records var/let/const and binding-pattern/default parameter facts", async () => {
    const { declarations } = await parseFixture();
    expect((declarations("mutableValue")[0] as IRVariable).declarationKind).toBe(
      "var",
    );
    expect(
      (declarations("replaceableValue")[0] as IRVariable).declarationKind,
    ).toBe("let");
    expect((declarations("fixedValue")[0] as IRVariable)).toEqual(
      expect.objectContaining({ declarationKind: "const", isConst: true }),
    );

    const node = createStatementNode(
      "function unpack({ value }: { value: string } = { value: 'x' }, [first]: string[] = []): void {}",
    ) as ts.FunctionDeclaration;
    const ir = parseFunction(node);

    expect(ir.parameters[0]).toEqual(
      expect.objectContaining({
        bindingPattern: { kind: "object", text: "{ value }" },
        initializerText: "{ value: 'x' }",
      }),
    );
    expect(ir.parameters[1]).toEqual(
      expect.objectContaining({
        bindingPattern: { kind: "array", text: "[first]" },
        initializerText: "[]",
      }),
    );
  });

  test("uses collision-free overload scopes for hoisted inline types", async () => {
    const { declarations, symbols } = await parseFixture();
    const overloads = declarations("convert") as IRFunction[];

    expect(overloads).toHaveLength(2);
    expect(
      [...symbols.keys()]
        .filter((fqn) => fqn.includes("::Anon_convert_overload_"))
        .sort(),
    ).toEqual([
      `${fixture}::Anon_convert_overload_0_param_0_value`,
      `${fixture}::Anon_convert_overload_0_return`,
      `${fixture}::Anon_convert_overload_1_param_0_value`,
      `${fixture}::Anon_convert_overload_1_return`,
    ]);
    expect(overloads[0].returnType.kind).toBe(TypeKind.TypeReference);
    expect(overloads[1].returnType.kind).toBe(TypeKind.TypeReference);
  });
});
