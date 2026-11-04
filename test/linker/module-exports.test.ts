import { describe, expect, test } from "vitest";
import { Transpiler } from "../../src/transpiler";
import { IREnum } from "../../src/ir/enum";
import { withTestProject } from "./test-project";

describe("4.12 module export and declaration identity", () => {
  test("anonymous default declarations keep an absent source name", async () => {
    const { program } = await Transpiler.transpileFromString(
      "export default class { value: string; }",
      { fileName: "/anon.d.ts" },
    );
    const facet = program!.symbols.get("/anon.d.ts::default")![0].facets[0];
    expect(facet.ir.modifiers.isAnonymousDefault).toBe(true);
    expect(facet.ir.modifiers.exportKind).toBe("default");
    expect(JSON.stringify(facet.ir)).not.toMatch(/Error_Class|anonFunc/);
  });

  test("const enums are distinguishable from runtime enums", async () => {
    const { program } = await Transpiler.transpileFromString(
      "declare const enum Mode { A = 1, B = A << 1 }\ndeclare enum Live { X }",
      { fileName: "/enums.d.ts" },
    );
    const mode = program!.symbols.get("/enums.d.ts::Mode")![0].facets[0].ir as IREnum;
    const live = program!.symbols.get("/enums.d.ts::Live")![0].facets[0].ir as IREnum;
    expect(mode.isConst).toBe(true);
    expect(live.isConst).toBe(false);
    expect(mode.members[1].initializer).toMatchObject({ kind: "computed", computedValue: 2 });
  });

  test("records and resolves export assignments, lists, and re-export chains", async () => {
    await withTestProject(
      {
        "lib.d.ts": [
          "declare namespace lib { function run(): void; }",
          "export = lib;",
        ].join("\n"),
        "core.d.ts": "export interface Core {}\nexport declare const value: number;",
        "barrel.d.ts": [
          'export * from "./core";',
          'export { Core as Renamed } from "./core";',
          'export * as nested from "./core";',
        ].join("\n"),
        "top.d.ts": [
          'export * from "./barrel";',
          "declare function local(): void;",
          "export { local };",
          "export default local;",
          'export * from "./missing";',
        ].join("\n"),
      },
      async ({ files }) => {
        const { program } = await new Transpiler({
          files: [...files.values()],
        }).analyzeProgram();
        const exports = program.moduleExports.byFile;
        const lib = exports.get(files.get("lib.d.ts")!)!;
        expect(lib).toEqual([
          expect.objectContaining({
            kind: "assignment",
            isDefault: false,
            expression: "lib",
            targets: [`${files.get("lib.d.ts")}::lib|run`],
          }),
        ]);

        const barrel = exports.get(files.get("barrel.d.ts")!)!;
        expect(barrel.map((record) => record.kind)).toEqual(["star", "named", "namespace"]);
        expect(barrel[0].targets).toEqual([files.get("core.d.ts")]);
        expect(barrel[1].targets).toEqual([`${files.get("core.d.ts")}::Core`]);

        const top = exports.get(files.get("top.d.ts")!)!;
        expect(top[0].targets).toEqual([files.get("barrel.d.ts")]);
        expect(top[1].targets).toEqual([`${files.get("top.d.ts")}::local`]);
        expect(top[2]).toMatchObject({ kind: "assignment", isDefault: true });
        expect(program.moduleExports.diagnostics).toEqual([
          expect.objectContaining({ code: "MODULE_EXPORT_TARGET_MISSING" }),
        ]);
      },
    );
  });
});
