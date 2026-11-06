import { readdirSync } from "fs";
import { join, resolve } from "path";
import { describe, expect, test } from "vitest";
import { Transpiler } from "../../src/transpiler";
import {
  invalidJsSegments,
  jsPathsOf,
  TestProgram,
  withTestProgram,
} from "../linker/test-program";

/** The `@JS` paths a library binds, by the Dart name that carries each. */
function bindings(dart: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = dart.split("\n");
  lines.forEach((line, index) => {
    const path = line.match(/^@JS\("([^"]*)"\)$/)?.[1];
    if (path === undefined) return;
    const next = lines[index + 1] ?? "";
    const name =
      next.match(/^(?:abstract )?class ([A-Za-z_$][\w$]*)/)?.[1] ??
      next.match(/^external .*?\b(?:get |set )?([A-Za-z_$][\w$]*)(?:<.*?>)?[(;]/)?.[1];
    if (name) result[name] = path;
  });
  return result;
}

/** Asserts the invariant HD-20 added, on everything a test generated. */
function expectValidPaths(program: TestProgram): void {
  for (const [name, dart] of program.dart) {
    expect(invalidJsSegments(dart), `${name}: @JS segments`).toEqual([]);
  }
}

describe("dispatch follows the module's exports (HD-17)", () => {
  test("a default export binds Root.default, an export = module is the root, an alias binds its public name", async () => {
    await withTestProgram(
      {
        "defaults.d.ts": "export default function named(x: number): number;\nexport declare const a: number;\n",
        "assigned.d.ts": "declare function callable(x: number): number;\nexport = callable;\n",
        "aliased.d.ts": "declare function hidden(x: number): number;\nexport { hidden as publicName };\n",
      },
      { jsRoot: "Root" },
      ({ dart, diagnostics, ...program }) => {
        expect(bindings(dart.get("defaults.d.ts")!)).toEqual({ named: "Root.default", a: "Root.a" });
        expect(bindings(dart.get("assigned.d.ts")!)).toEqual({ callable: "Root" });
        // Exported only under an alias, so the alias is the Dart name too.
        expect(bindings(dart.get("aliased.d.ts")!)).toEqual({ publicName: "Root.publicName" });
        expect(dart.get("aliased.d.ts")).not.toContain("hidden");
        expect(diagnostics.filter((line) => line.includes("EXPORT_PATH_CONFLICT"))).toEqual([]);
        expectValidPaths({ dart, diagnostics, ...program });
      },
    );
  });

  test("export = x with a merged namespace binds the members on the root, not under x", async () => {
    await withTestProgram(
      {
        "lodashish.d.ts": [
          "declare function lodashish(value: number): number;",
          "declare namespace lodashish {",
          "  function member(by: number): number;",
          "  const VERSION: string;",
          "  class Chain { constructor(); run(): void; }",
          "}",
          "export = lodashish;",
        ].join("\n"),
      },
      { jsRoot: "_" },
      ({ dart }) => {
        expect(bindings(dart.get("lodashish.d.ts")!)).toEqual({
          lodashish: "_",
          member: "_.member",
          VERSION: "_.VERSION",
          Chain: "_.Chain",
        });
      },
    );
  });

  test("a UMD root applies per input and wins over --js-root", async () => {
    await withTestProgram(
      {
        "umd.d.ts": "export declare function f(): void;\nexport as namespace Lib;\n",
        "plain.d.ts": "export declare function g(): void;\n",
      },
      { jsRoot: "Root" },
      ({ dart }) => {
        expect(bindings(dart.get("umd.d.ts")!)).toEqual({ f: "Lib.f" });
        expect(bindings(dart.get("plain.d.ts")!)).toEqual({ g: "Root.g" });
      },
    );
  });

  test("names are followed through barrels, renames and default re-exports to the declaration", async () => {
    await withTestProgram(
      {
        "entry.d.ts": [
          'export * from "./b";',
          'export { Widget as Gadget, helper as util } from "./widgets";',
          'export { default as Tool } from "./tool";',
          'export * as geometry from "./geometry";',
        ].join("\n"),
        "b.d.ts": 'export { Counter } from "./core";',
        "core.d.ts": "export declare class Counter { constructor(); }\n",
        "widgets.d.ts":
          "export declare class Widget { constructor(); }\nexport declare function helper(): void;\n",
        "tool.d.ts": "declare function tool(): void;\nexport default tool;\n",
        "geometry.d.ts": "export declare function area(): number;\nexport declare class Point { constructor(); }\n",
      },
      { inputs: ["entry.d.ts"], jsRoot: "Root" },
      ({ dart, diagnostics }) => {
        expect(bindings(dart.get("core.d.ts")!)).toEqual({ Counter: "Root.Counter" });
        expect(bindings(dart.get("widgets.d.ts")!)).toEqual({ Widget: "Root.Gadget", helper: "Root.util" });
        expect(bindings(dart.get("tool.d.ts")!)).toEqual({ tool: "Root.Tool" });
        // `export * as geometry`: the namespace adds `geometry.` to the path.
        expect(bindings(dart.get("geometry.d.ts")!)).toEqual({ area: "Root.geometry.area", Point: "Root.geometry.Point" });
        expect(diagnostics.filter((line) => line.startsWith("[EXPORT_"))).toEqual([]);
      },
    );
  });

  test("a value reachable by two routes takes the first in a deterministic order, whatever the input order", async () => {
    const sources = {
      "a.d.ts": "export declare function shared(): void;\n",
      "one.d.ts": 'export { shared } from "./a";\n',
      "two.d.ts": 'export { shared as second } from "./a";\n',
    };
    const outputs: Record<string, string>[] = [];
    for (const inputs of [
      ["one.d.ts", "two.d.ts"],
      ["two.d.ts", "one.d.ts"],
    ]) {
      await withTestProgram(sources, { inputs, jsRoot: "Root" }, ({ dart, program }) => {
        outputs.push(Object.fromEntries([...dart].sort()));
        expect(program.moduleExports.routes.get([...program.symbols.keys()].find((key) => key.endsWith("::shared"))!)!.map(
          (route) => route.path.join("."),
        )).toEqual(["shared", "second"]);
      });
    }
    expect(outputs[0]).toEqual(outputs[1]);
    expect(bindings(outputs[0]["a.d.ts"])).toEqual({ shared: "Root.shared" });
  });

  test("the most direct route wins: Root.x over Root.ns.x, even when the longer one's entry sorts first", async () => {
    await withTestProgram(
      {
        "a-entry.d.ts": 'export * as ns from "./m";\n',
        "m.d.ts": "export declare function x(): void;\n",
      },
      { inputs: ["a-entry.d.ts", "m.d.ts"], jsRoot: "Root" },
      ({ dart }) => {
        expect(bindings(dart.get("m.d.ts")!)).toEqual({ x: "Root.x" });
      },
    );
  });

  test("two inputs exporting different values under one name is a counted diagnostic", async () => {
    await withTestProgram(
      {
        "left.d.ts": "export declare function dup(): void;\n",
        "right.d.ts": "export declare function dup(): number;\n",
      },
      { jsRoot: "Root" },
      ({ diagnostics, dart }) => {
        const conflicts = diagnostics.filter((line) => line.startsWith("[EXPORT_PATH_CONFLICT]"));
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0]).toContain("Root.dup");
        expect(conflicts[0]).toContain("left.d.ts");
        expect(conflicts[0]).toContain("right.d.ts");
        // Both still bind it: nothing is dropped.
        expect(bindings(dart.get("left.d.ts")!)).toEqual({ dup: "Root.dup" });
        expect(bindings(dart.get("right.d.ts")!)).toEqual({ dup: "Root.dup" });
      },
    );
  });

  test("the same declaration exported by two inputs is not a conflict", async () => {
    await withTestProgram(
      {
        "a.d.ts": "export declare function shared(): void;\n",
        "one.d.ts": 'export * from "./a";\n',
        "two.d.ts": 'export * from "./a";\n',
      },
      { inputs: ["one.d.ts", "two.d.ts"], jsRoot: "Root" },
      ({ diagnostics }) => {
        expect(diagnostics).toEqual([]);
      },
    );
  });

  test("a value no input exports keeps Root.<local name> and says so; types need no route", async () => {
    await withTestProgram(
      {
        "entry.d.ts": 'export { Public } from "./internal";\n',
        "internal.d.ts": [
          "export declare class Public { constructor(); }",
          "export declare class Hidden { constructor(); }",
          "export declare function helperFn(): void;",
          "export interface JustAType { x: number }",
        ].join("\n"),
      },
      { inputs: ["entry.d.ts"], jsRoot: "Root" },
      ({ dart, diagnostics }) => {
        expect(bindings(dart.get("internal.d.ts")!)).toEqual({
          Public: "Root.Public",
          Hidden: "Root.Hidden",
          helperFn: "Root.helperFn",
        });
        const missing = diagnostics.filter((line) => line.startsWith("[EXPORT_ROUTE_MISSING]"));
        expect(missing.map((line) => line.replace(/^\[\w+\] /, ""))).toEqual([
          "Hidden is not exported by any input file; it binds Root.Hidden by its own name",
          "helperFn is not exported by any input file; it binds Root.helperFn by its own name",
        ]);
      },
    );
  });

  test("an export type is not a runtime route", async () => {
    await withTestProgram(
      {
        "entry.d.ts": 'export type { Thing } from "./a";\nexport { Real } from "./a";\n',
        "a.d.ts": "export declare class Thing { constructor(); }\nexport declare class Real { constructor(); }\n",
      },
      { inputs: ["entry.d.ts"], jsRoot: "Root" },
      ({ dart, diagnostics, program }) => {
        const thing = [...program.symbols.keys()].find((key) => key.endsWith("::Thing"))!;
        expect(program.moduleExports.routes.get(thing)!.every((route) => route.typeOnly)).toBe(true);
        // The JavaScript has no `Thing` export, so it is reported and keeps its own name.
        expect(bindings(dart.get("a.d.ts")!)).toEqual({ Thing: "Root.Thing", Real: "Root.Real" });
        expect(diagnostics).toEqual([
          "[EXPORT_ROUTE_MISSING] Thing is not exported by any input file; it binds Root.Thing by its own name",
        ]);
      },
    );
  });

  test("without a root nothing changes: module declarations bind bare globals and no route diagnostics fire", async () => {
    await withTestProgram(
      {
        "entry.d.ts": [
          'export { Widget as Gadget } from "./widgets";',
          'export * as geometry from "./geometry";',
          "export default function run(): void;",
        ].join("\n"),
        "widgets.d.ts": "export declare class Widget { constructor(); }\nexport declare class Unused { constructor(); }\n",
        "geometry.d.ts": "export declare function area(): number;\n",
      },
      { inputs: ["entry.d.ts"] },
      ({ dart, diagnostics, ...program }) => {
        expect(bindings(dart.get("widgets.d.ts")!)).toEqual({ Widget: "Widget", Unused: "Unused" });
        expect(bindings(dart.get("geometry.d.ts")!)).toEqual({ area: "area" });
        expect(bindings(dart.get("entry.d.ts")!)).toEqual({ run: "run" });
        expect(diagnostics.map((line) => line.split("]")[0])).toEqual(["[NAMESPACE_REEXPORT_NOT_FORWARDED"]);
        expectValidPaths({ dart, diagnostics, ...program });
      },
    );
  });

  test("control: h3 and the S5 fixture, generated without a root, bind as they always did", async () => {
    const h3 = await new Transpiler({
      files: [resolve("def_files/h3/h3.d.ts")],
      outDir: join(resolve("def_files/h3"), "out"),
    }).render();
    const [h3File] = [...h3.files.values()];
    const h3Paths = jsPathsOf(h3File.content);
    expect(h3Paths.length).toBeGreaterThan(60);
    // The ambient `h3` module's specifier is a valid property path: it prefixes.
    expect(h3Paths.every((segments) => segments[0] === "h3")).toBe(true);
    expect(h3File.diagnostics).toEqual([]);

    const s5Dir = resolve("def_files/synthetic/s5_emitter");
    const s5 = await new Transpiler({
      files: readdirSync(s5Dir).filter((name) => name.endsWith(".d.ts")).sort().map((name) => join(s5Dir, name)),
      outDir: join(s5Dir, "out"),
    }).render();
    const codes = [...s5.files.values()].flatMap((file) => file.diagnostics.map((diagnostic) => diagnostic.code));
    for (const code of ["EXPORT_ROUTE_MISSING", "EXPORT_PATH_CONFLICT", "PUBLIC_NAME_UNAVAILABLE", "NAMESPACE_REEXPORT_NOT_FORWARDED"]) {
      expect(codes).not.toContain(code);
    }
    // The one deliberate change: `virtual-sdk` is not a property path, so its
    // values are bare globals and the run says so.
    expect(codes.filter((code) => code === "AMBIENT_MODULE_UNROOTED")).toHaveLength(1);
    const ambient = [...s5.files.values()].find((file) => file.sourceFile.endsWith("ambient.d.ts"))!;
    expect(bindings(ambient.content)).toMatchObject({ connect: "connect" });
  });

  test("a rooted run of the fixtures keeps every @JS segment a JavaScript identifier", async () => {
    const fixtures = resolve("def_files/synthetic/exports");
    for (const [set, files, jsRoot] of [
      ["rooted", ["entry", "callable"], "Root"],
      ["barrels", ["chain", "rename", "import", "namespace"], undefined],
      ["rooted", ["entry", "callable"], undefined],
      ["ambient", ["ambient"], "PKG"],
      ["ambient", ["ambient"], undefined],
    ] as const) {
      const report = await new Transpiler({
        files: files.map((name) => join(fixtures, set, `${name}.d.ts`)),
        outDir: join(fixtures, "out"),
        ...(jsRoot ? { jsRoot } : {}),
      }).render();
      expect(report.files.size).toBeGreaterThan(0);
      for (const file of report.files.values()) {
        expect(invalidJsSegments(file.content), `${set} ${jsRoot ?? "no root"} ${file.outputPath}`).toEqual([]);
      }
    }
  });
});

describe("public names in Dart (HD-18)", () => {
  const sources = {
    "a.d.ts": [
      "export interface A { x: number }",
      "export declare class Box<T extends A = A> { constructor(value: T); static of<T extends A>(value: T): Box<T>; }",
      "export declare function makeA(): A;",
      "export declare const flag: boolean;",
    ].join("\n"),
    "b.d.ts": 'export * from "./a";\n',
    "chain.d.ts": 'export { A, Box } from "./b";\n',
    "rename.d.ts": 'export { A as Shape, Box as Crate, makeA as create, flag as enabled } from "./a";\n',
    "import.d.ts": 'import { A, makeA } from "./a";\nexport { A, makeA };\n',
  };

  test("a name is followed through a chain of barrels", async () => {
    await withTestProgram(sources, { inputs: ["chain.d.ts"] }, ({ dart, diagnostics }) => {
      expect(dart.get("chain.d.ts")).toContain("export 'a.dart' show A, Box;");
      expect(dart.get("b.d.ts")).toContain("export 'a.dart';");
      expect(diagnostics).toEqual([]);
    });
  });

  test("a renamed export is a typedef for types, a second binding for functions and variables", async () => {
    await withTestProgram(sources, { inputs: ["rename.d.ts"] }, ({ dart, diagnostics }) => {
      const barrel = dart.get("rename.d.ts")!;
      expect(barrel).toContain("typedef Shape = A;");
      // Type parameters and bounds are kept.
      expect(barrel).toContain("typedef Crate<T extends A> = Box<T>;");
      // No tear-off: a real `external` binding with its own path.
      expect(barrel).toMatch(/@JS\("makeA"\)\nexternal A create\(\);/);
      expect(barrel).toMatch(/@JS\("flag"\)\nexternal bool get enabled;/);
      expect(barrel).not.toMatch(/create\s*=/);
      // The consumers see the public names, not the internal ones.
      expect(barrel).not.toContain("export 'a.dart'");
      expect(diagnostics).toEqual([]);
    });
  });

  test("a second binding under a root points at the path the module exports it under", async () => {
    await withTestProgram(sources, { inputs: ["rename.d.ts"], jsRoot: "Root" }, ({ dart }) => {
      expect(bindings(dart.get("rename.d.ts")!)).toEqual({ create: "Root.create", enabled: "Root.enabled" });
      expect(bindings(dart.get("a.d.ts")!)).toMatchObject({ makeA: "Root.create", flag: "Root.enabled", Box: "Root.Crate" });
    });
  });

  test("an imported binding that is exported yields a library exposing it", async () => {
    await withTestProgram(sources, { inputs: ["import.d.ts"] }, ({ dart, diagnostics }) => {
      expect(dart.get("import.d.ts")).toContain("export 'a.dart' show A, makeA;");
      expect(diagnostics).toEqual([]);
    });
  });

  test("a declaration exported only under an alias is emitted under it; an additional name is a typedef", async () => {
    await withTestProgram(
      {
        "alias.d.ts": [
          "declare class Hidden { constructor(); }",
          "export { Hidden as Visible };",
          "export declare class Both { constructor(); }",
          "export { Both as Also };",
        ].join("\n"),
      },
      {},
      ({ dart }) => {
        const text = dart.get("alias.d.ts")!;
        expect(text).toMatch(/class Visible \{/);
        expect(text).not.toMatch(/class Hidden/);
        expect(text).toMatch(/class Both \{/);
        expect(text).toContain("typedef Also = Both;");
      },
    );
  });

  test("export { default as X } gives X, and a bare default keeps the declaration's name", async () => {
    await withTestProgram(
      {
        "tool.d.ts": "declare class Tool { constructor(); }\nexport default Tool;\n",
        "barrel.d.ts": 'export { default as Utensil } from "./tool";\nexport { default } from "./tool";\n',
      },
      { inputs: ["barrel.d.ts"] },
      ({ dart }) => {
        const barrel = dart.get("barrel.d.ts")!;
        expect(barrel).toContain("typedef Utensil = Tool;");
        expect(barrel).toContain("export 'tool.dart' show Tool;");
      },
    );
  });

  test("a namespace exported under another name keeps its members' names and says so", async () => {
    await withTestProgram(
      {
        "ns.d.ts": "export declare namespace Tools { function run(): void; }\n",
        "barrel.d.ts": 'export { Tools as Utilities } from "./ns";\n',
      },
      { inputs: ["barrel.d.ts"], jsRoot: "Root" },
      ({ dart, diagnostics }) => {
        // Dispatch still follows the public name; the Dart name is the member's own.
        expect(bindings(dart.get("ns.d.ts")!)).toEqual({ run: "Root.Utilities.run" });
        expect(diagnostics).toEqual([
          "[PUBLIC_NAME_UNAVAILABLE] namespace Tools exported as Utilities cannot be renamed in Dart; its members keep their own names",
        ]);
      },
    );
  });

  test("an alias whose name the library already declares is reported, not silently dropped", async () => {
    await withTestProgram(
      {
        "a.d.ts": "export declare class A { constructor(); }\n",
        "clash.d.ts": 'export declare class Taken { constructor(); }\nexport { A as Taken } from "./a";\n',
      },
      { inputs: ["clash.d.ts"] },
      ({ diagnostics }) => {
        expect(diagnostics.filter((line) => line.startsWith("[PUBLIC_NAME_UNAVAILABLE]"))).toHaveLength(1);
      },
    );
  });
});

describe("export * as ns (HD-19)", () => {
  test("the barrel points at the import the consumer writes, the target is emitted, and the diagnostic is counted", async () => {
    await withTestProgram(
      {
        "m.d.ts": "export interface Widget { x: number }\nexport declare function foo(): void;\n",
        "barrel.d.ts": 'export * as ns from "./m";\n',
      },
      { inputs: ["barrel.d.ts"], jsRoot: "Root" },
      ({ dart, diagnostics, report }) => {
        // A barrel whose only content is a namespace re-export is still emitted.
        expect(dart.get("barrel.d.ts")).toContain("// export * as ns from './m': import 'm.dart' as ns;");
        expect(dart.get("barrel.d.ts")).not.toMatch(/^export /m);
        expect(dart.has("m.d.ts")).toBe(true);
        expect(diagnostics).toEqual([
          "[NAMESPACE_REEXPORT_NOT_FORWARDED] export * as ns from './m' cannot be re-exported by Dart; consumers write import 'm.dart' as ns; for the same names",
        ]);
        // Dispatch stays right: the namespace adds `ns.` to the path.
        expect(bindings(dart.get("m.d.ts")!)).toEqual({ foo: "Root.ns.foo" });
        expect(report.files.size).toBe(2);
      },
    );
  });

  test("m.dart is rendered even when it declares nothing and ns is its only route", async () => {
    await withTestProgram(
      {
        "m.d.ts": 'export * from "./inner";\n',
        "inner.d.ts": "export declare function foo(): void;\n",
        "barrel.d.ts": 'export * as ns from "./m";\n',
      },
      { inputs: ["barrel.d.ts"] },
      ({ dart }) => {
        expect([...dart.keys()].sort()).toEqual(["barrel.d.ts", "inner.d.ts", "m.d.ts"]);
        expect(dart.get("barrel.d.ts")).toContain("import 'm.dart' as ns;");
      },
    );
  });

  test("a namespace import that is exported is the same pointer", async () => {
    await withTestProgram(
      {
        "m.d.ts": "export declare function foo(): void;\n",
        "barrel.d.ts": 'import * as ns from "./m";\nexport { ns };\n',
      },
      { inputs: ["barrel.d.ts"], jsRoot: "Root" },
      ({ dart }) => {
        expect(dart.get("barrel.d.ts")).toContain("// export { ns }: import 'm.dart' as ns;");
        expect(bindings(dart.get("m.d.ts")!)).toEqual({ foo: "Root.ns.foo" });
      },
    );
  });
});

describe("ambient modules (HD-20)", () => {
  const ambient = [
    'declare module "@scope/pkg" {',
    "  export class Widget { constructor(name: string); }",
    "  export function make(): Widget;",
    "}",
  ].join("\n");

  test("without a root a specifier that is not a property path binds bare globals and says so", async () => {
    await withTestProgram({ "ambient.d.ts": ambient }, {}, (program) => {
      expect(bindings(program.dart.get("ambient.d.ts")!)).toEqual({ Widget: "Widget", make: "make" });
      expect(program.diagnostics).toEqual([
        '[AMBIENT_MODULE_UNROOTED] ambient module "@scope/pkg" has no JavaScript global to bind under: its 2 value(s) bind bare globals; pass --js-root <global> to bind them under one',
      ]);
      expectValidPaths(program);
    });
  });

  test("with a root the module's exports bind under it", async () => {
    await withTestProgram({ "ambient.d.ts": ambient }, { jsRoot: "PKG" }, (program) => {
      expect(bindings(program.dart.get("ambient.d.ts")!)).toEqual({ Widget: "PKG.Widget", make: "PKG.make" });
      expect(program.diagnostics).toEqual([]);
      expectValidPaths(program);
    });
  });

  test("a specifier that is a valid property path keeps prefixing it (h3's shape)", async () => {
    await withTestProgram(
      { "h3.d.ts": 'declare module "h3" { export function isValidCell(index: string): boolean; }\ndeclare module "a.b" { export function inner(): void; }' },
      {},
      (program) => {
        expect(bindings(program.dart.get("h3.d.ts")!)).toEqual({ isValidCell: "h3.isValidCell", inner: "a.b.inner" });
        expect(program.diagnostics).toEqual([]);
      },
    );
  });

  test("an ambient module's export = and renamed exports follow the same rule", async () => {
    await withTestProgram(
      {
        "ambient.d.ts": [
          'declare module "my-lib" {',
          "  function main(x: number): number;",
          "  namespace main { const LEVEL: string }",
          "  export = main;",
          "}",
          'declare module "other-lib" {',
          "  function hidden(): void;",
          "  export { hidden as shown };",
          "}",
        ].join("\n"),
      },
      { jsRoot: "G" },
      (program) => {
        expect(bindings(program.dart.get("ambient.d.ts")!)).toEqual({ main: "G", LEVEL: "G.LEVEL", hidden: "G.shown" });
        expectValidPaths(program);
      },
    );
  });

  test("an ambient module nothing exports keeps its local path under a root and says so", async () => {
    await withTestProgram(
      {
        "ambient.d.ts": [
          'declare module "my-lib" {',
          "  function main(): void;",
          "  function internal(): void;",
          "  export { main };",
          "}",
        ].join("\n"),
      },
      { jsRoot: "G" },
      (program) => {
        expect(bindings(program.dart.get("ambient.d.ts")!)).toEqual({ main: "G.main", internal: "G.internal" });
        expect(program.diagnostics).toEqual([
          "[EXPORT_ROUTE_MISSING] internal is not exported by any input file; it binds G.internal by its own name",
        ]);
      },
    );
  });
});

describe("every corpus the export fixtures define renders without losing a declaration", () => {
  test("each fixture library renders for every root choice", async () => {
    const dir = resolve("def_files/synthetic/exports");
    const names = readdirSync(join(dir, "barrels")).filter((name) => name.endsWith(".d.ts"));
    expect(names.length).toBeGreaterThan(0);
    for (const jsRoot of [undefined, "Root"]) {
      const report = await new Transpiler({
        files: names.map((name) => join(dir, "barrels", name)),
        outDir: join(dir, "out"),
        ...(jsRoot ? { jsRoot } : {}),
      }).render();
      expect(report.analysis.generation).toEqual([]);
      for (const file of report.files.values()) {
        expect(file.content).not.toContain("// ERROR emitting");
        expect(jsPathsOf(file.content).flat().every((segment) => /^[A-Za-z_$][\w$]*$/.test(segment))).toBe(true);
      }
    }
  });
});
