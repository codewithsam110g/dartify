import { resolve } from "path";
import { describe, expect, test } from "vitest";
import { transpilerContext } from "../../src/context";
import { IRFunction } from "../../src/ir/function";
import { IRClass } from "../../src/ir/class";
import { IRInterface } from "../../src/ir/interface";
import { TypeKind } from "../../src/ir/type";
import { Transpiler } from "../../src/transpiler";
import { renderTestProject, withTestProject } from "./test-project";

describe("Stage 4 parser identities", () => {
  test("gives sibling structural positions distinct anonymous identities", async () => {
    await Transpiler.transpileFromString(
      "declare function f(x: { a: string } | { b: number }): void;",
      { fileName: "/p13.d.ts" },
    );

    const table = transpilerContext.symbolTable.getSymbolTable();
    const anonymousFQNs = [...table.keys()]
      .filter((fqn) => fqn.includes("::Anon_f_overload_0_param_0_x"))
      .sort();
    const declaration = table.get("/p13.d.ts::f")?.[0].facets[0]
      .ir as IRFunction;
    const candidates = declaration.parameters[0].type.unionTypes?.map(
      (type) =>
        type.kind === TypeKind.TypeReference &&
        type.reference?.lookup.kind === "checker"
          ? type.reference.lookup.candidates[0]
          : undefined,
    );

    expect(anonymousFQNs).toEqual([
      "/p13.d.ts::Anon_f_overload_0_param_0_x_union_0",
      "/p13.d.ts::Anon_f_overload_0_param_0_x_union_1",
    ]);
    expect(new Set(candidates).size).toBe(2);
  });

  test("threads identity through arrays, generic arguments, tuples, and intersections", async () => {
    await Transpiler.transpileFromString(
      [
        "interface Box<T> {}",
        "declare function nested(",
        "  array: { a: string }[],",
        "  generic: Box<{ b: number }>,",
        "  tuple: [{ c: boolean }, { d: string }],",
        "  intersection: ({ e: string } & { f: number }),",
        "): void;",
      ].join("\n"),
      { fileName: "/positions.d.ts" },
    );

    const anonymousNames = [...transpilerContext.symbolTable
      .getSymbolTable()
      .keys()]
      .filter((fqn) => fqn.includes("::Anon_nested"))
      .sort();

    expect(anonymousNames).toEqual([
      "/positions.d.ts::Anon_nested_overload_0_param_0_array_array_element",
      "/positions.d.ts::Anon_nested_overload_0_param_1_generic_arg_0",
      "/positions.d.ts::Anon_nested_overload_0_param_2_tuple_tuple_0",
      "/positions.d.ts::Anon_nested_overload_0_param_2_tuple_tuple_1",
      "/positions.d.ts::Anon_nested_overload_0_param_3_intersection_parenthesized_inner_intersection_0",
      "/positions.d.ts::Anon_nested_overload_0_param_3_intersection_parenthesized_inner_intersection_1",
    ]);
  });

  test("canonicalizes equal anonymous shapes within one file and rewrites uses", async () => {
    await Transpiler.transpileFromString(
      "declare function same(a: { value: string }, b: { value: string }): void;",
      { fileName: "/same-shape.d.ts" },
    );

    const table = transpilerContext.symbolTable.getSymbolTable();
    const anonymousFQNs = [...table.keys()].filter((fqn) =>
      fqn.includes("::Anon_same"),
    );
    const declaration = table.get("/same-shape.d.ts::same")?.[0].facets[0]
      .ir as IRFunction;
    const targets = declaration.parameters.map((parameter) =>
      parameter.type.reference?.lookup.kind === "checker"
        ? parameter.type.reference.lookup.candidates[0]
        : undefined,
    );

    expect(anonymousFQNs).toEqual([
      "/same-shape.d.ts::Anon_same_overload_0_param_0_a",
    ]);
    expect(targets).toEqual([
      "/same-shape.d.ts::Anon_same_overload_0_param_0_a",
      "/same-shape.d.ts::Anon_same_overload_0_param_0_a",
    ]);
  });

  test("does not canonicalize equal anonymous shapes across source files", async () => {
    await withTestProject(
      {
        "one.d.ts": "export declare function one(x: { value: string }): void;",
        "two.d.ts": "export declare function two(x: { value: string }): void;",
      },
      ({ analysis, symbols }) => {
        const anonymousFQNs = [...symbols.keys()].filter((fqn) =>
          fqn.includes("::Anon_"),
        );
        expect(anonymousFQNs).toHaveLength(2);
        expect(analysis.link.semantic.anonymousSymbolsCanonicalized).toBe(0);
      },
    );
  });

  test("records namespace, ambient-module, augmentation, and global scopes", async () => {
    await withTestProject(
      {
        "ambient.d.ts":
          'declare module "pkg" { interface AmbientType {} } declare namespace dotted.ns { interface Scoped {} }',
        "target.d.ts": "export interface Target {}",
        "augment.d.ts":
          'export {}; declare global { interface GlobalType {} } declare module "./target" { interface Target { added: string } }',
      },
      ({ analysis, symbols, files }) => {
        const ambientFile = files.get("ambient.d.ts")!;
        const augmentFile = files.get("augment.d.ts")!;

        const ambient = symbols.get(`${ambientFile}::\"pkg\"|AmbientType`)?.[0]
          .facets[0].origin.scopes[0];
        const namespace = symbols.get(`${ambientFile}::dotted.ns|Scoped`)?.[0]
          .facets[0].origin.scopes[0];
        const global = symbols.get(`${augmentFile}::GlobalType`)?.[0]
          .facets[0].origin.scopes[0];
        const augmentationFQN = `${augmentFile}::\"./target\"|Target`;

        expect(ambient).toEqual({
          kind: "externalModule",
          sourceName: '"pkg"',
          specifier: "pkg",
          isAugmentation: false,
          canonicalTarget: "pkg",
        });
        expect(namespace).toEqual({
          kind: "namespace",
          sourceName: "dotted.ns",
          jsSegments: ["dotted", "ns"],
        });
        expect(global).toEqual({ kind: "global", sourceName: "global" });
        expect(symbols.has(`${augmentFile}::global|GlobalType`)).toBe(false);
        expect(symbols.has(augmentationFQN)).toBe(false);
        expect(analysis.link.semantic.suppressedAugmentations).toEqual([
          {
            ownerFQN: augmentationFQN,
            moduleSpecifier: "./target",
            canonicalTarget: "./target",
            declarationKinds: ["interface"],
          },
        ]);
        expect(analysis.link.semantic.diagnostics).toEqual([
          expect.objectContaining({
            code: "EXTERNAL_MODULE_AUGMENTATION_SUPPRESSED",
            ownerFQN: augmentationFQN,
            action: "suppressed",
          }),
        ]);
      },
    );
  });
});

describe("Stage 4 declaration semantics", () => {
  test("merges constructor companions and default interface values", async () => {
    const file = resolve(
      "def_files/legacy_tests/declaration_augmentation.d.ts",
    );
    const analysis = await new Transpiler({ files: [file] }).analyze();
    const symbols = transpilerContext.symbolTable.getSymbolTable();
    const declaration = (name: string) =>
      symbols.get(`${file}::${name}`)?.[0].facets[0];

    expect(symbols.has(`${file}::SimpleType`)).toBe(false);
    const simple = declaration("SimpleX")!;
    expect(simple.ir.kind).toBe("class");
    expect((simple.ir as IRClass).constructors).toHaveLength(1);
    expect((simple.ir as IRClass).properties.map((value) => value.name)).toEqual([
      "a",
      "b",
    ]);

    const staticMerge = declaration("StaticMergeX")!.ir as IRClass;
    expect(
      staticMerge.properties.some(
        (property) => property.name === "b" && property.isStatic,
      ),
    ).toBe(true);

    const defaultMerge = declaration("MergeDefaultX")!;
    expect(defaultMerge.namespace).toBe("both");
    expect(
      (defaultMerge.ir as IRInterface).properties.find(
        (property) => property.name === "d",
      )?.isStatic,
    ).toBe(true);

    expect(declaration("MyCache")!.ir.kind).toBe("class");
    expect(declaration("EventCache")!.ir.kind).toBe("class");
    expect(analysis.link.semantic.declarationGroupsMerged).toBeGreaterThanOrEqual(
      5,
    );
  });

  test("merges interface and class declarations but preserves dual facets", async () => {
    await withTestProject(
      {
        "types.d.ts": [
          "interface Reopened { a: string }",
          "interface Reopened { b(): number }",
          "declare class Combined { own: boolean }",
          "interface Combined { extra: string }",
          "type Dual = string | number;",
          "declare const Dual: { parse(value: string): Dual };",
        ].join("\n"),
      },
      ({ analysis, files, symbols }) => {
        const file = files.get("types.d.ts")!;
        const reopened = symbols.get(`${file}::Reopened`)?.[0];
        const combined = symbols.get(`${file}::Combined`)?.[0];
        const dual = symbols.get(`${file}::Dual`)?.[0];

        expect(reopened?.facets).toHaveLength(1);
        expect((reopened?.facets[0].ir as IRInterface).properties).toHaveLength(1);
        expect((reopened?.facets[0].ir as IRInterface).methods).toHaveLength(1);
        expect(combined?.facets).toHaveLength(1);
        expect((combined?.facets[0].ir as IRClass).properties.map((value) => value.name)).toEqual([
          "own",
          "extra",
        ]);
        expect(dual?.facets.map((facet) => facet.namespace).sort()).toEqual([
          "type",
          "value",
        ]);
        expect(analysis.link.semantic.declarationGroupsMerged).toBe(2);
      },
    );
  });

  test("preserves and diagnoses incompatible interface declarations", async () => {
    await withTestProject(
      {
        "conflict.d.ts":
          "interface Conflict { value: string } interface Conflict { value: number }",
      },
      ({ analysis, files, symbols }) => {
        const fqn = `${files.get("conflict.d.ts")}::Conflict`;
        expect(symbols.get(fqn)?.[0].facets).toHaveLength(2);
        expect(
          symbols.get(fqn)?.[0].facets.map((facet) => ({
            dartName: facet.ir.dartName,
            jsName: facet.ir.jsName,
          })),
        ).toEqual([
          { dartName: "Conflict", jsName: "Conflict" },
          { dartName: "Conflict_2", jsName: "Conflict" },
        ]);
        expect(analysis.link.semantic.diagnostics).toContainEqual(
          expect.objectContaining({
            code: "DECLARATION_MERGE_CONFLICT",
            ownerFQN: fqn,
            action: "preservedUnmerged",
          }),
        );
      },
    );
  });

  test("preserves callable and constructable constructor targets instead of losing signatures", async () => {
    await withTestProject(
      {
        "callable-companion.d.ts": [
          "interface CallableTarget { (value: string): number }",
          "declare var Callable: {",
          "  prototype: CallableTarget;",
          "  new (): CallableTarget;",
          "};",
          "interface ConstructableTarget { new (value: string): CallableTarget }",
          "declare var Constructable: {",
          "  prototype: ConstructableTarget;",
          "  new (): ConstructableTarget;",
          "};",
        ].join("\n"),
      },
      ({ analysis, files, symbols }) => {
        const file = files.get("callable-companion.d.ts")!;
        const callable = symbols.get(`${file}::CallableTarget`)?.[0]
          .facets[0].ir as IRInterface;
        const constructable = symbols.get(`${file}::ConstructableTarget`)?.[0]
          .facets[0].ir as IRInterface;

        expect(callable.callSignatures).toHaveLength(1);
        expect(constructable.constructSignatures).toHaveLength(1);
        expect(symbols.get(`${file}::Callable`)?.[0].facets[0].ir.kind).toBe(
          "variable",
        );
        expect(
          symbols.get(`${file}::Constructable`)?.[0].facets[0].ir.kind,
        ).toBe("variable");
        expect(
          analysis.link.semantic.diagnostics.map((diagnostic) =>
            diagnostic.message
          ),
        ).toEqual(
          expect.arrayContaining([
            "Callable constructor targets cannot be folded into IRClass",
            "Constructable constructor targets cannot be folded into IRClass",
          ]),
        );
      },
    );
  });

  test("preserves value-side index signatures when static folding is unsupported", async () => {
    await withTestProject(
      {
        "indexed-value.d.ts": [
          "interface Catalog { own: string }",
          "declare var Catalog: { [key: string]: number };",
        ].join("\n"),
      },
      ({ analysis, files, symbols }) => {
        const file = files.get("indexed-value.d.ts")!;
        const catalog = symbols.get(`${file}::Catalog`)?.[0];
        const anonymous = [...symbols.entries()].find(
          ([fqn, group]) =>
            fqn.includes("::Anon_Catalog") &&
            group[0].facets[0].synthetic === "anonymousType",
        )?.[1][0].facets[0].ir as IRInterface | undefined;

        expect(catalog?.facets.map((facet) => facet.ir.kind).sort()).toEqual([
          "interface",
          "variable",
        ]);
        expect(anonymous?.indexSignatures).toHaveLength(1);
        expect(analysis.link.semantic.diagnostics).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: "DECLARATION_MERGE_CONFLICT",
              ownerFQN: `${file}::Catalog`,
              action: "preservedUnmerged",
            }),
          ]),
        );
      },
    );
  });

  test("never canonicalizes author declarations that merely start with Anon_", async () => {
    await withTestProject(
      {
        "author-anon.d.ts": [
          "interface Anon_A { value: string }",
          "interface Anon_B { value: string }",
          "declare let a: Anon_A;",
          "declare let b: Anon_B;",
        ].join("\n"),
      },
      ({ analysis, files, symbols }) => {
        const file = files.get("author-anon.d.ts")!;
        expect(symbols.has(`${file}::Anon_A`)).toBe(true);
        expect(symbols.has(`${file}::Anon_B`)).toBe(true);
        expect(symbols.get(`${file}::Anon_A`)?.[0].facets[0].synthetic).toBe(
          undefined,
        );
        expect(symbols.get(`${file}::Anon_B`)?.[0].facets[0].synthetic).toBe(
          undefined,
        );
        expect(analysis.link.semantic.anonymousSymbolsCanonicalized).toBe(0);
        expect(analysis.link.semantic.redirects).toEqual([]);
      },
    );
  });
});

describe("Stage 4 Dart name allocation", () => {
  test("renames every overload while preserving its JavaScript spelling", async () => {
    await withTestProject(
      {
        "overloads.d.ts": [
          "declare function parse(value: string): string;",
          "declare function parse(value: number): number;",
          "interface Parser {",
          "  parse(value: string): string;",
          "  parse(value: number): number;",
          "}",
          "declare class Mixed {",
          "  run(value: string): string;",
          "  run(value: number): number;",
          "  static run(value: boolean): boolean;",
          "  static run(value: Date): Date;",
          "}",
        ].join("\n"),
      },
      ({ analysis, files, symbols }) => {
        const file = files.get("overloads.d.ts")!;
        const functions = symbols
          .get(`${file}::parse`)![0]
          .facets.map((facet) => facet.ir as IRFunction);
        const parser = symbols.get(`${file}::Parser`)![0].facets[0]
          .ir as IRInterface;
        const mixed = symbols.get(`${file}::Mixed`)![0].facets[0]
          .ir as IRClass;

        expect(functions.map((value) => value.dartName)).toEqual([
          "parse_1",
          "parse_2",
        ]);
        expect(functions.map((value) => value.jsName)).toEqual([
          "parse",
          "parse",
        ]);
        expect(parser.methods.map((value) => value.dartName)).toEqual([
          "parse_1",
          "parse_2",
        ]);
        expect(parser.methods.map((value) => value.jsName)).toEqual([
          "parse",
          "parse",
        ]);
        expect(mixed.methods.map((value) => value.dartName)).toEqual([
          "run_1",
          "run_2",
          "run_1_2",
          "run_2_2",
        ]);
        expect(mixed.methods.map((value) => value.jsName)).toEqual([
          "run",
          "run",
          "run",
          "run",
        ]);
        expect(analysis.link.semantic.overloadGroupsRenamed).toBe(4);
        expect(analysis.link.semantic.overloadsRenamed).toBe(8);
      },
    );
  });

  test("allocates legal keyword, member, parameter, and dual-facet names", async () => {
    await withTestProject(
      {
        "keywords.d.ts": [
          "interface abstract<covariant> {",
          "  while: string;",
          "  get(value: string): void;",
          "  set(rethrow: number): void;",
          "}",
          "declare const rethrow: string;",
          "type Dual = string | number;",
          "declare const Dual: { parse(value: string): Dual };",
        ].join("\n"),
      },
      ({ files, symbols }) => {
        const file = files.get("keywords.d.ts")!;
        const keywordType = symbols.get(`${file}::abstract`)![0].facets[0]
          .ir as IRInterface;
        const keywordValue = symbols.get(`${file}::rethrow`)![0].facets[0]
          .ir;
        const dual = symbols.get(`${file}::Dual`)![0].facets;

        expect(keywordType.dartName).toBe("JS$abstract");
        expect(keywordType.jsName).toBe("abstract");
        expect(keywordType.typeParams[0].dartName).toBe("JS$covariant");
        expect(keywordType.properties[0]).toMatchObject({
          dartName: "JS$while",
          jsName: "while",
        });
        expect(keywordType.methods.map((method) => method.dartName)).toEqual([
          "get",
          "set",
        ]);
        expect(keywordType.methods[1].parameters[0]).toMatchObject({
          dartName: "JS$rethrow",
          jsName: "rethrow",
        });
        expect(keywordValue).toMatchObject({
          dartName: "JS$rethrow",
          jsName: "rethrow",
        });
        expect(dual.find((facet) => facet.namespace === "type")?.ir).toMatchObject(
          { dartName: "Dual", jsName: "Dual" },
        );
        expect(dual.find((facet) => facet.namespace === "value")?.ir).toMatchObject(
          { dartName: "JS$Dual", jsName: "Dual" },
        );
      },
    );
  });

  test("prefers top-level names and expands the shortest namespace suffix", async () => {
    await withTestProject(
      {
        "namespaces.d.ts": [
          "interface A {}",
          "declare namespace one { interface A {} }",
          "declare namespace deep.one { interface Item {} }",
          "declare namespace other.one { interface Item {} }",
        ].join("\n"),
      },
      ({ files, symbols }) => {
        const file = files.get("namespaces.d.ts")!;
        const dartName = (fqn: string) =>
          symbols.get(fqn)![0].facets[0].ir.dartName;

        expect(dartName(`${file}::A`)).toBe("A");
        expect(dartName(`${file}::one|A`)).toBe("one_A");
        expect(dartName(`${file}::deep.one|Item`)).toBe("Item");
        expect(dartName(`${file}::other.one|Item`)).toBe("one_Item");
      },
    );
  });

  test("publishes resolved Dart target names on references", async () => {
    await withTestProject(
      {
        "references.d.ts": [
          "interface abstract {}",
          "declare function consume(value: abstract): abstract;",
        ].join("\n"),
      },
      ({ files, symbols }) => {
        const file = files.get("references.d.ts")!;
        const consume = symbols.get(`${file}::consume`)![0].facets[0]
          .ir as IRFunction;

        expect(consume.parameters[0].type.reference).toMatchObject({
          resolvedFQN: `${file}::abstract`,
          resolvedDartName: "JS$abstract",
        });
        expect(consume.returnType.reference).toMatchObject({
          resolvedFQN: `${file}::abstract`,
          resolvedDartName: "JS$abstract",
        });
      },
    );
  });

  test("reserves unqualified Dart backend type and annotation names", async () => {
    await withTestProject(
      {
        "backend-names.d.ts": [
          "declare class String {",
          "  constructor(value: string);",
          "  value: string;",
          "}",
          "interface List { values: string[] }",
          "declare const JS: string;",
        ].join("\n"),
      },
      ({ files, symbols }) => {
        const file = files.get("backend-names.d.ts")!;
        expect(symbols.get(`${file}::String`)?.[0].facets[0].ir).toMatchObject({
          dartName: "JS$String",
          jsName: "String",
        });
        expect(symbols.get(`${file}::List`)?.[0].facets[0].ir).toMatchObject({
          dartName: "JS$List",
          jsName: "List",
        });
        expect(symbols.get(`${file}::JS`)?.[0].facets[0].ir).toMatchObject({
          dartName: "JS$JS",
          jsName: "JS",
        });
      },
    );
  });

  test("reserves generated extension and enum companion names", async () => {
    await withTestProject(
      {
        "helpers.d.ts": [
          "interface Smoothstep { value: string }",
          "interface SmoothstepExtension { other: string }",
          "enum Mix { A }",
          "interface MixEnum { value: string }",
          "interface ExistingExtension { value: string }",
          "interface Existing { other: string }",
          "declare class Factory {",
          "  static make(value: string): Factory;",
          "  static make(value: number): Factory;",
          "}",
          "declare function Factory_make_1(): void;",
        ].join("\n"),
      },
      ({ files, symbols }) => {
        const file = files.get("helpers.d.ts")!;
        const name = (sourceName: string) =>
          symbols.get(`${file}::${sourceName}`)?.[0].facets[0].ir.dartName;

        expect(name("Smoothstep")).toBe("Smoothstep");
        expect(name("SmoothstepExtension")).toBe("SmoothstepExtension_2");
        expect(name("Mix")).toBe("Mix");
        expect(name("MixEnum")).toBe("MixEnum_2");
        expect(name("ExistingExtension")).toBe("ExistingExtension");
        expect(name("Existing")).toBe("Existing_2");
        expect(name("Factory")).toBe("Factory");
        expect(name("Factory_make_1")).toBe("Factory_make_1_2");
      },
    );
  });
});

describe("Stage 4 transitional emission", () => {
  test("emits allocated overload, keyword, namespace, and reference names", async () => {
    const report = await renderTestProject({
      "bindings.d.ts": [
        "interface abstract {",
        "  while: string;",
        "  [Symbol.iterator](): Iterator<number>;",
        "  run(value: string): abstract;",
        "  run(value: number): abstract;",
        "}",
        "declare namespace api {",
        "  function under_score(value: abstract): abstract;",
        "  function under_score(value: string): abstract;",
        "}",
        "type Dual = string | number;",
        "declare const Dual: string;",
      ].join("\n"),
    });
    const content = [...report.files.values()][0].content;

    expect(content).toContain("abstract class JS$abstract{}");
    expect(content).toContain('@JS("while")\n  external String get JS$while;');
    expect(content).toContain(
      "// Unsupported computed JavaScript member preserved in IR: [Symbol.iterator]",
    );
    expect(content).not.toContain('@JS("[Symbol.iterator]")');
    expect(report.analysis.link.semantic.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "UNSUPPORTED_COMPUTED_MEMBER",
        action: "preservedUnsupported",
      }),
    );
    expect(content).toContain('@JS("run")\n  external JS$abstract run_1');
    expect(content).toContain('@JS("run")\n  external JS$abstract run_2');
    expect(content).toContain('@JS("api.under_score")\nexternal JS$abstract under_score_1');
    expect(content).toContain('@JS("api.under_score")\nexternal JS$abstract under_score_2');
    expect(content).toContain("typedef Dual = dynamic /* String|num */;");
    expect(content).toContain('@JS("Dual")\nexternal String JS$Dual;');
    expect(content).not.toContain(".split(");
  });

  test("emits merged variable-side members as static runtime members", async () => {
    const report = await renderTestProject({
      "static.d.ts": [
        "interface Config { instance: string }",
        "declare const Config: {",
        "  readonly version: string;",
        "  create(value: string): Config;",
        "};",
      ].join("\n"),
    });
    const content = [...report.files.values()][0].content;

    expect(content).toContain('@JS("Config")\nclass Config{');
    expect(content).toContain("external static String get version;");
    expect(content).toContain("external static Config create(String value);");
    expect(content).toContain("extension ConfigExtension on Config");
    expect(content).toContain("external String get instance;");
  });

  test("emits renamed class instance overloads as extension interop members", async () => {
    const report = await renderTestProject({
      "class-overloads.d.ts": [
        "declare class Widget {",
        "  f(value: string): string;",
        "  f(value: number): number;",
        "  plain(): void;",
        "}",
      ].join("\n"),
    });
    const content = [...report.files.values()][0].content;
    const classEnd = content.indexOf("}\nextension WidgetExtension");

    expect(classEnd).toBeGreaterThan(0);
    expect(content.slice(0, classEnd)).toContain("external void plain();");
    expect(content.slice(0, classEnd)).not.toContain(" f_1(");
    expect(content).toContain("extension WidgetExtension on Widget {");
    expect(content).toContain('@JS("f")\n  external String f_1(String value);');
    expect(content).toContain('@JS("f")\n  external num f_2(num value);');
  });

  test("lowers renamed static class members to qualified top-level bindings", async () => {
    const report = await renderTestProject({
      "static-overloads.d.ts": [
        "declare class Factory {",
        "  static make(value: string): Factory;",
        "  static make(value: number): Factory;",
        "}",
        "declare function Factory_make_1(): void;",
      ].join("\n"),
    });
    const content = [...report.files.values()][0].content;

    expect(content).toContain(
      '@JS("Factory.make")\nexternal Factory Factory_make_1(String value);',
    );
    expect(content).toContain(
      '@JS("Factory.make")\nexternal Factory Factory_make_2(num value);',
    );
    expect(content).not.toContain("static Factory make_1(");
    expect(content).not.toContain("static Factory make_2(");
    expect(content).toContain(
      '@JS("Factory_make_1")\nexternal void Factory_make_1_2();',
    );
  });

  test("prefixes library names derived from digit-leading declaration files", async () => {
    const report = await renderTestProject({
      "3MFLoader.d.ts": "export interface Loader { value: string }",
    });
    const content = [...report.files.values()][0].content;

    expect(content).toContain("library dartify_3MFLoader;");
    expect(content).not.toContain("library 3MFLoader;");
  });

  test("does not emit external augmentation declarations", async () => {
    const report = await renderTestProject({
      "target.d.ts": "export interface Target { base: string }",
      "augment.d.ts":
        'export {}; declare module "./target" { interface Target { added: string } }',
    });
    const content = [...report.files.values()]
      .map((file) => file.content)
      .join("\n");

    expect(content).toContain("external String get base;");
    expect(content).not.toContain("get added;");
    expect(report.analysis.link.semantic.externalAugmentationsSuppressed).toBe(
      1,
    );
  });
});
