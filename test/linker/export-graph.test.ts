import { describe, expect, test } from "vitest";
import { LinkedProgram } from "../../src/engine/phase/linkerPhase";
import { withTestProgram } from "./test-program";

/** `name` of every route to the declaration whose FQN ends with `::name`. */
function routesOf(program: LinkedProgram, name: string, entries?: Map<string, string>): string[] {
  const fqn = [...program.symbols.keys()].find(
    (key) => key.endsWith(`::${name}`) || key.endsWith(`|${name}`),
  );
  if (!fqn) throw new Error(`no symbol ${name}`);
  const entryName = (entry: string) =>
    [...(entries ?? new Map())].find(([, file]) => file === entry)?.[0] ?? entry;
  return (program.moduleExports.routes.get(fqn) ?? []).map(
    (route) => `${entryName(route.entry)}:${route.path.join(".")}${route.typeOnly ? " (type)" : ""}`,
  );
}

describe("the export graph resolves module exports over the whole program (HD-17, HD-18)", () => {
  test("named records resolve through barrel chains, imports and default re-exports", async () => {
    await withTestProgram(
      {
        "a.d.ts": "export interface A { x: number }\nexport default class Named { constructor(); }\n",
        "b.d.ts": 'export * from "./a";\n',
        "chain.d.ts": 'export { A } from "./b";\n',
        "via.d.ts": 'import { A } from "./b";\nexport { A as Renamed };\n',
        "dflt.d.ts": 'export { default as Other } from "./a";\n',
      },
      {},
      ({ program, files }) => {
        const a = (name: string) => `${files.get("a.d.ts")}::${name}`;
        const byFile = program.moduleExports.byFile;
        const elements = (file: string) =>
          byFile.get(files.get(file)!)!.flatMap((record) => (record.kind === "named" ? record.resolvedElements! : []));
        expect(elements("chain.d.ts")).toMatchObject([{ name: "A", fqns: [a("A")], viaFile: files.get("b.d.ts") }]);
        expect(elements("via.d.ts")).toMatchObject([{ name: "Renamed", from: "A", fqns: [a("A")], viaFile: files.get("b.d.ts") }]);
        expect(elements("dflt.d.ts")).toMatchObject([{ name: "Other", from: "default", fqns: [a("Named")] }]);
        expect(program.moduleExports.diagnostics).toEqual([]);
      },
    );
  });

  test("an element that resolves to nothing is a diagnostic, not silence", async () => {
    await withTestProgram(
      {
        "a.d.ts": "export interface A { x: number }\n",
        "b.d.ts": 'export { Missing } from "./a";\nexport { Nowhere };\nexport { A as Fine } from "./a";\n',
      },
      {},
      ({ program }) => {
        expect(program.moduleExports.diagnostics.map((d) => [d.code, d.message])).toEqual([
          ["MODULE_EXPORT_UNRESOLVED", "export { Missing } from './a' does not resolve to a declaration"],
          ["MODULE_EXPORT_UNRESOLVED", "export { Nowhere } does not name a declaration or import in this file"],
        ]);
      },
    );
  });

  test("export * cycles terminate and name what each side exports", async () => {
    await withTestProgram(
      {
        "left.d.ts": 'export * from "./right";\nexport declare const l: 1;\n',
        "right.d.ts": 'export * from "./left";\nexport declare const r: 2;\n',
      },
      { inputs: ["left.d.ts"] },
      ({ program, files }) => {
        const entries = new Map([["left", files.get("left.d.ts")!]]);
        expect(routesOf(program, "l", entries)).toEqual(["left:l"]);
        expect(routesOf(program, "r", entries)).toEqual(["left:r"]);
      },
    );
  });

  test("a name two export * sources supply differently is exported by neither; an explicit export wins", async () => {
    await withTestProgram(
      {
        "one.d.ts": "export declare const dup: 1;\nexport declare const only1: 1;\nexport declare const mine: 1;\n",
        "two.d.ts": "export declare const dup: 2;\nexport declare const only2: 2;\n",
        "both.d.ts": 'export * from "./one";\nexport * from "./two";\nexport declare const mine: 3;\n',
      },
      { inputs: ["both.d.ts"] },
      ({ program, files }) => {
        const dups = [...program.symbols.keys()].filter((key) => key.endsWith("::dup"));
        expect(dups).toHaveLength(2);
        for (const fqn of dups) expect(program.moduleExports.routes.has(fqn)).toBe(false);
        const entries = new Map([["both", files.get("both.d.ts")!]]);
        expect(routesOf(program, "only1", entries)).toEqual(["both:only1"]);
        expect(routesOf(program, "only2", entries)).toEqual(["both:only2"]);
      },
    );
  });

  test("export * does not carry default; default is its own route", async () => {
    await withTestProgram(
      {
        "dep.d.ts": "declare function d(): void;\nexport default d;\nexport declare const n: 1;\n",
        "entry.d.ts": 'export * from "./dep";\nexport default function main(): void;\n',
      },
      { inputs: ["entry.d.ts"] },
      ({ program, files }) => {
        const entries = new Map([["entry", files.get("entry.d.ts")!]]);
        expect(routesOf(program, "main", entries)).toEqual(["entry:default"]);
        expect(routesOf(program, "n", entries)).toEqual(["entry:n"]);
        expect(routesOf(program, "d", entries)).toEqual([]);
      },
    );
  });

  test("export = reaches members of a merged namespace directly and through an import", async () => {
    await withTestProgram(
      {
        "lib.d.ts": "declare function lib(): void;\ndeclare namespace lib { function member(): void; namespace deep { const x: 1 } }\nexport = lib;\n",
        "wrap.d.ts": 'import lib = require("./lib");\nexport { lib };\n',
        "consumer.d.ts": 'import lib from "./lib";\nexport { lib as again };\n',
      },
      { inputs: ["lib.d.ts", "consumer.d.ts"] },
      ({ program, files }) => {
        const entries = new Map([
          ["lib", files.get("lib.d.ts")!],
          ["consumer", files.get("consumer.d.ts")!],
        ]);
        // Most direct route first: the module itself, then the alias.
        expect(routesOf(program, "lib", entries)).toEqual(["lib:", "consumer:again"]);
        // `again` is the module function itself, so its members hang off it.
        expect(routesOf(program, "member", entries)).toEqual(["lib:member", "consumer:again.member"]);
        expect(routesOf(program, "x", entries)).toEqual(["lib:deep.x", "consumer:again.deep.x"]);
      },
    );
  });

  test("implicit and explicit export contexts follow TypeScript's rule", async () => {
    await withTestProgram(
      {
        // No export declaration: every declaration is exported, with or without the keyword.
        "implicit.d.ts": "declare const a: 1;\nexport declare const b: 2;\ndeclare namespace N { const c: 3 }\n",
        // An export list switches that off: only what is exported is.
        "explicit.d.ts": "declare const d: 1;\nexport declare const e: 2;\ndeclare const f: 3;\nexport { f };\nexport namespace Shown { const g: 4 }\ndeclare namespace Hidden { const h: 5 }\n",
      },
      {},
      ({ program, files }) => {
        const entries = new Map([
          ["implicit", files.get("implicit.d.ts")!],
          ["explicit", files.get("explicit.d.ts")!],
        ]);
        expect(routesOf(program, "a", entries)).toEqual(["implicit:a"]);
        expect(routesOf(program, "c", entries)).toEqual(["implicit:N.c"]);
        expect(routesOf(program, "d", entries)).toEqual([]);
        expect(routesOf(program, "e", entries)).toEqual(["explicit:e"]);
        expect(routesOf(program, "f", entries)).toEqual(["explicit:f"]);
        expect(routesOf(program, "g", entries)).toEqual(["explicit:Shown.g"]);
        expect(routesOf(program, "h", entries)).toEqual([]);
      },
    );
  });

  test("only input files are entries; a dependency's own exports are not routes", async () => {
    await withTestProgram(
      {
        "entry.d.ts": 'export { used } from "./dep";\n',
        "dep.d.ts": "export declare const used: 1;\nexport declare const unused: 2;\n",
      },
      { inputs: ["entry.d.ts"] },
      ({ program, files }) => {
        const entries = new Map([["entry", files.get("entry.d.ts")!]]);
        expect(routesOf(program, "used", entries)).toEqual(["entry:used"]);
        expect(routesOf(program, "unused", entries)).toEqual([]);
      },
    );
  });

  test("an input that is a dependency of another contributes its own routes too", async () => {
    await withTestProgram(
      {
        "entry.d.ts": 'export * as inner from "./dep";\n',
        "dep.d.ts": "export declare const x: 1;\n",
      },
      { inputs: ["entry.d.ts", "dep.d.ts"] },
      ({ program, files }) => {
        const entries = new Map([
          ["entry", files.get("entry.d.ts")!],
          ["dep", files.get("dep.d.ts")!],
        ]);
        expect(routesOf(program, "x", entries)).toEqual(["dep:x", "entry:inner.x"]);
      },
    );
  });

  test("routes do not depend on the order inputs are named", async () => {
    const sources = {
      "x.d.ts": 'export { v as one } from "./v";\n',
      "y.d.ts": 'export { v as two } from "./v";\n',
      "v.d.ts": "export declare const v: 1;\n",
    };
    const seen: string[] = [];
    for (const inputs of [
      ["x.d.ts", "y.d.ts"],
      ["y.d.ts", "x.d.ts"],
    ]) {
      await withTestProgram(sources, { inputs }, ({ program }) => {
        seen.push(JSON.stringify([...program.moduleExports.routes].map(([fqn, routes]) => [fqn.split("::")[1], routes.map((r) => r.path.join("."))])));
      });
    }
    expect(seen[0]).toBe(seen[1]);
  });

  test("ambient modules an input declares are entries; their export lists are followed", async () => {
    await withTestProgram(
      {
        "ambient.d.ts": [
          'declare module "pkg" {',
          "  function a(): void;",
          "  export { a as b };",
          "  export class K { constructor(); }",
          "}",
          'declare module "other" {',
          '  export * from "pkg";',
          "}",
        ].join("\n"),
      },
      {},
      ({ program }) => {
        // `a` is exported only as `b`; `K` carries the keyword; `other` star-exports `pkg`.
        expect(routesOf(program, "a")).toEqual(["ambient:other:b", "ambient:pkg:b"]);
        expect(routesOf(program, "K")).toEqual(["ambient:other:K", "ambient:pkg:K"]);
      },
    );
  });

  test("a declaration only an export list marks type-only is not a runtime route", async () => {
    await withTestProgram(
      {
        "a.d.ts": "export declare class C { constructor(); }\nexport declare const v: 1;\n",
        "t.d.ts": 'export type { C } from "./a";\nimport type { v } from "./a";\nexport { v };\n',
      },
      { inputs: ["t.d.ts"] },
      ({ program, files }) => {
        const entries = new Map([["t", files.get("t.d.ts")!]]);
        expect(routesOf(program, "C", entries)).toEqual(["t:C (type)"]);
        expect(routesOf(program, "v", entries)).toEqual(["t:v (type)"]);
      },
    );
  });
});
