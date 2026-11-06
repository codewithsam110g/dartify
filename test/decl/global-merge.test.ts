import { readFileSync } from "fs";
import { join, resolve } from "path";
import { describe, expect, test } from "vitest";
import { Transpiler } from "../../src/transpiler";
import { LinkState } from "../../src/engine/phase/linkerPhase";
import { isShapeCandidate, ProgramIndex } from "../../src/engine/emitter/packagejs/program";
import { invalidJsSegments, withTestProgram, TestProgram } from "../linker/test-program";

const FIXTURES = resolve("def_files/synthetic/globals");

/** The text of one declaration (`class Name`, `extension Name`) up to its closing brace. */
function declarationOf(dart: string, header: RegExp): string {
  const start = dart.search(header);
  expect(start, `no declaration matching ${header}`).toBeGreaterThanOrEqual(0);
  const end = dart.indexOf("\n}", start);
  return dart.slice(start, end + 2);
}

/** The class names a library declares, in order. */
function classesOf(dart: string): string[] {
  return [...dart.matchAll(/^(?:abstract )?class ([A-Za-z_$][\w$]*)/gm)].map((match) => match[1]);
}

function expectCleanLink(program: TestProgram): void {
  const { report } = program.program;
  expect(report.broken, "broken symbols").toBe(0);
  expect(report.edges.filter((edge) => edge.resolution.kind !== "resolved")).toEqual([]);
  for (const result of report.results.values()) {
    expect([LinkState.LinkedIndependent, LinkState.LinkedResolved]).toContain(result.state);
  }
  // No degradation to a `dynamic` typedef stands in for the merged type.
  for (const dart of program.dart.values()) {
    expect(dart).not.toMatch(/typedef \w+ = dynamic/);
    expect(invalidJsSegments(dart)).toEqual([]);
  }
}

describe("global declarations merged across files (HD-06)", () => {
  test("the audit's trigger: Settings declared in two script files is one class, configure is typed", async () => {
    await withTestProgram(
      {
        "part1.d.ts": readFileSync(join(FIXTURES, "merge/part1.d.ts"), "utf8"),
        "part2.d.ts": readFileSync(join(FIXTURES, "merge/part2.d.ts"), "utf8"),
      },
      {},
      (program) => {
        const part1 = program.dart.get("part1.d.ts")!;
        const part2 = program.dart.get("part2.d.ts")!;
        // The first declaring file owns the class, with the members of both parts.
        expect(classesOf(part1)).toEqual(["Settings"]);
        const settings = declarationOf(part1, /abstract class Settings/);
        for (const member of ["theme", "size", "locale"]) expect(settings).toContain(`get ${member};`);
        expect(settings).toContain("required String theme, required num size, required String locale");
        // The other file emits no partial class and imports the owner.
        expect(classesOf(part2)).toEqual([]);
        expect(part2).toContain("import 'part1.dart' show Settings;");
        expect(part2).toContain("external void configure(Settings settings);");
        expect(part2).not.toMatch(/Settings_[0-9a-f]+/);
        expectCleanLink(program);
        // One redirect says where the second file's Settings went.
        expect(program.program.report.semantic.redirects.map((redirect) => redirect.reason)).toEqual(["globalMerge"]);
      },
    );
  });

  test("three parts across three files, one of them a declare global block", async () => {
    await withTestProgram(
      {
        "a.d.ts": "interface Settings { theme: string; }\ndeclare function useA(s: Settings): void;\n",
        "b.d.ts": "interface Settings { size: number; }\ndeclare function useB(s: Settings): void;\n",
        "c.d.ts": [
          "export {};",
          "declare global { interface Settings { locale: string; } }",
          "export declare function useC(s: Settings): void;",
        ].join("\n"),
      },
      {},
      ({ dart, ...rest }) => {
        expect(classesOf(dart.get("a.d.ts")!)).toEqual(["Settings"]);
        expect(classesOf(dart.get("b.d.ts")!)).toEqual([]);
        expect(classesOf(dart.get("c.d.ts")!)).toEqual([]);
        const settings = declarationOf(dart.get("a.d.ts")!, /abstract class Settings/);
        for (const member of ["theme", "size", "locale"]) expect(settings).toContain(`get ${member};`);
        for (const name of ["b.d.ts", "c.d.ts"]) {
          expect(dart.get(name)).toContain("import 'a.dart' show Settings;");
        }
        expectCleanLink({ dart, ...rest });
      },
    );
  });

  test("a merged interface and a same-named declare var in another file are one symbol", async () => {
    await withTestProgram(
      {
        "a.d.ts": "interface Counter { value: number; }\n",
        "b.d.ts": "declare var Counter: { zero(): Counter; DEFAULT: number };\ndeclare function make(): Counter;\n",
      },
      {},
      ({ dart, ...rest }) => {
        const owner = dart.get("a.d.ts")!;
        // The interface and the value shape become one class, the value's members static
        // (what the same two declarations in one file give).
        expect(classesOf(owner)).toEqual(["Counter"]);
        const counter = declarationOf(owner, /class Counter/);
        expect(counter).toContain("external static Counter zero();");
        expect(counter).toContain("external static num get DEFAULT;");
        expect(counter).toContain("external num get value;");
        expect(classesOf(dart.get("b.d.ts")!)).toEqual([]);
        expect(dart.get("b.d.ts")).toContain("external Counter make();");
        expectCleanLink({ dart, ...rest });
      },
    );
  });

  test("overloads and namespace members declared in several files join the owner's library", async () => {
    await withTestProgram(
      {
        "a.d.ts": "declare function pick(x: number): number;\ndeclare namespace NS { interface Opt { a: number } }\n",
        "b.d.ts": "declare function pick(x: string): string;\ndeclare namespace NS { interface Opt { b: string } function make(): Opt; }\n",
      },
      {},
      ({ dart, ...rest }) => {
        const owner = dart.get("a.d.ts")!;
        expect(owner).toMatch(/external num pick_1\(num x\);/);
        expect(owner).toMatch(/external String pick_2\(String x\);/);
        const opt = declarationOf(owner, /abstract class Opt/);
        expect(opt).toContain("get a;");
        expect(opt).toContain("get b;");
        expect(dart.get("b.d.ts")).toContain("import 'a.dart' show Opt;");
        expect(dart.get("b.d.ts")).toContain("external Opt make();");
        expectCleanLink({ dart, ...rest });
      },
    );
  });

  test("the order the inputs are named in does not change anything", async () => {
    const sources = {
      "a.d.ts": "interface Settings { theme: string; }\ndeclare function fa(s: Settings): void;\n",
      "b.d.ts": "interface Settings { size: number; }\ndeclare function fb(s: Settings): void;\n",
      "c.d.ts": "interface Settings { locale: string; }\ndeclare function fc(s: Settings): void;\n",
    };
    const outputs: string[] = [];
    for (const inputs of [
      ["a.d.ts", "b.d.ts", "c.d.ts"],
      ["c.d.ts", "b.d.ts", "a.d.ts"],
      ["b.d.ts", "c.d.ts", "a.d.ts"],
    ]) {
      await withTestProgram(sources, { inputs }, ({ dart, diagnostics }) => {
        outputs.push(JSON.stringify([[...dart].sort(), diagnostics]));
      });
    }
    expect(new Set(outputs).size).toBe(1);
    const [first] = outputs;
    expect(JSON.parse(first)[0].find(([name]: [string]) => name === "a.d.ts")[1]).toContain("abstract class Settings");
  });

  test("an input owns a global before a dependency that declares it too", async () => {
    await withTestProgram(
      {
        // `zdep.d.ts` sorts after `a.d.ts`, but the rule is inputs first, whatever the names.
        "main.d.ts": '/// <reference path="a_dep.d.ts" />\ninterface Settings { fromInput: string; }\n',
        "a_dep.d.ts": "interface Settings { fromDependency: number; }\ndeclare function dep(s: Settings): void;\n",
      },
      { inputs: ["main.d.ts"] },
      ({ dart, ...rest }) => {
        expect(classesOf(dart.get("main.d.ts")!)).toEqual(["Settings"]);
        const settings = declarationOf(dart.get("main.d.ts")!, /abstract class Settings/);
        expect(settings).toContain("get fromInput;");
        expect(settings).toContain("get fromDependency;");
        expect(classesOf(dart.get("a_dep.d.ts") ?? "")).toEqual([]);
        expectCleanLink({ dart, ...rest });
      },
    );
  });

  test("module-local declarations of one name stay separate", async () => {
    await withTestProgram(
      {
        "a.d.ts": "export interface Shape { a: number }\n",
        "b.d.ts": "export interface Shape { b: string }\n",
      },
      {},
      ({ dart }) => {
        expect(declarationOf(dart.get("a.d.ts")!, /abstract class Shape/)).not.toContain("get b;");
        expect(declarationOf(dart.get("b.d.ts")!, /abstract class Shape/)).not.toContain("get a;");
      },
    );
  });

  test("a script file's names merge across the whole fixture directory run, however it is generated", async () => {
    const files = ["part1", "part2", "part3"].map((name) => join(FIXTURES, "merge", `${name}.d.ts`));
    const report = await new Transpiler({ files, outDir: join(FIXTURES, "out") }).render();
    const byName = Object.fromEntries(
      [...report.files.values()].map((file) => [file.sourceFile.split("/").pop(), file.content]),
    );
    expect(classesOf(byName["part1.d.ts"])).toEqual(["Settings"]);
    expect(classesOf(byName["part2.d.ts"])).toEqual([]);
    expect(classesOf(byName["part3.d.ts"])).toEqual([]);
    expect(report.analysis.link.broken).toBe(0);
  });
});

describe("a global that augments a browser type becomes an extension on the SDK type (HD-22)", () => {
  test("a script file and a declare global block: one extension, typed, on dart:html's Window", async () => {
    await withTestProgram(
      {
        "a_window.d.ts": readFileSync(join(FIXTURES, "augment/a_window.d.ts"), "utf8"),
        "b_more.d.ts": readFileSync(join(FIXTURES, "augment/b_more.d.ts"), "utf8"),
      },
      {},
      ({ dart, diagnostics, ...rest }) => {
        const owner = dart.get("a_window.d.ts")!;
        // No standalone class shadows dart:html's Window.
        expect(classesOf(owner)).toEqual([]);
        expect(owner).toContain("import 'dart:html' show Window;");
        expect(owner).toContain("import 'package:js/js_util.dart' show callMethod, getProperty, setProperty;");
        const extension = declarationOf(owner, /extension WindowAugment on Window/);
        // Getters and setters; the readonly member has no setter.
        expect(extension).toContain('String get myProp => getProperty<String>(this, "myProp");');
        expect(extension).toContain('set myProp(String value) => setProperty(this, "myProp", value);');
        expect(extension).toContain('num get version => getProperty<num>(this, "version");');
        expect(extension).not.toContain("set version");
        // The second file's member joins the one extension.
        expect(extension).toContain('bool get other => getProperty<bool>(this, "other");');
        expect(extension).toContain('set other(bool value) => setProperty(this, "other", value);');
        // Optional parameters admit null, and trailing unset ones are not sent.
        expect(extension).toContain("String ping([num? n, String? label]) {");
        expect(extension).toContain("while (args.length > 0 && args.last == null)");
        expect(extension).toContain('return callMethod<String>(this, "ping", args);');
        // Required parameters go straight through.
        expect(extension).toContain('num add(num a, num b) => callMethod<num>(this, "add", [a, b]);');
        // The second file declares nothing of its own.
        expect(dart.has("b_more.d.ts")).toBe(false);
        // The index signature cannot be an extension member: counted, named.
        expect(diagnostics).toEqual([
          "[AUGMENTATION_MEMBER_UNSUPPORTED] Window: an index signature cannot be added to Window (dart:html) and is not bound",
        ]);
        expectCleanLink({ dart, diagnostics, ...rest });
      },
    );
  });

  test("dart:html's Window stays the type everywhere it is used", async () => {
    await withTestProgram(
      {
        "win.d.ts": [
          "interface Window { myProp: string; }",
          "declare function current(): Window;",
          "declare function use(w: Window, others: Window[]): void;",
          "interface Holder { window: Window; }",
        ].join("\n"),
      },
      {},
      ({ dart }) => {
        const text = dart.get("win.d.ts")!;
        expect(classesOf(text)).toEqual(["Holder"]);
        expect(text).toContain("external Window current();");
        expect(text).toContain("external void use(Window w, List<Window> others);");
        expect(text).toContain("external Window get window;");
        expect(text).toContain("import 'dart:html' show Window;");
      },
    );
  });

  test("statics, call and construct signatures, heritage, type parameters and computed names are each reported", async () => {
    await withTestProgram(
      {
        "nav.d.ts": [
          "interface Navigator {",
          "  tag: string;",
          "  (x: number): void;",
          "  new (x: number): Navigator;",
          "  [key: string]: any;",
          "  [Symbol.iterator](): Iterator<string>;",
          "}",
          "interface Performance extends EventTarget { mark2: number }",
        ].join("\n"),
      },
      {},
      ({ dart, diagnostics }) => {
        const text = dart.get("nav.d.ts")!;
        expect(text).toContain('String get tag => getProperty<String>(this, "tag");');
        expect(text).toContain("extension NavigatorAugment on Navigator");
        expect(text).toContain("extension PerformanceAugment on Performance");
        expect(diagnostics.map((line) => line.replace(/^\[\w+\] /, "")).sort()).toEqual(
          [
            "Navigator: a call signature cannot be added to Navigator (dart:html) and is not bound",
            "Navigator: a construct signature cannot be added to Navigator (dart:html) and is not bound",
            "Navigator: an index signature cannot be added to Navigator (dart:html) and is not bound",
            "Navigator: computed method [Symbol.iterator] cannot be added to Navigator (dart:html) and is not bound",
            "Performance: an extends clause cannot be added to Performance (dart:html) and is not bound",
          ].sort(),
        );
        expect(diagnostics.every((line) => line.startsWith("[AUGMENTATION_MEMBER_UNSUPPORTED]"))).toBe(true);
      },
    );
  });

  test("a lib type with no SDK mapping is an ordinary merged global: a class of the project's members only", async () => {
    await withTestProgram(
      {
        "a.d.ts": "interface HTMLElementTagNameMap { 'my-el': HTMLElement }\ninterface Math { clamp(x: number, lo: number, hi: number): number }\n",
        "b.d.ts": "interface Math { lerp(a: number, b: number, t: number): number }\ndeclare function m(x: Math): void;\n",
      },
      {},
      ({ dart, diagnostics }) => {
        const owner = dart.get("a.d.ts")!;
        // Math has no entry in the platform registry: HD-06 merges the two parts into one class.
        expect(classesOf(owner)).toEqual(["HTMLElementTagNameMap", "Math"]);
        const math = declarationOf(owner, /abstract class Math/);
        expect(math).toContain("external num clamp(num x, num lo, num hi);");
        expect(math).toContain("external num lerp(num a, num b, num t);");
        expect(dart.get("b.d.ts")).toContain("import 'a.dart' show Math;");
        expect(owner).not.toContain("Augment");
        expect(diagnostics.filter((line) => line.includes("AUGMENTATION"))).toEqual([]);
      },
    );
  });

  test("an augmentation is no structural shape and declares no type", async () => {
    await withTestProgram(
      {
        "shape.d.ts": [
          "interface Window { alpha: string; beta: number; }",
          "interface Plain { alpha: string; beta: number; }",
        ].join("\n"),
      },
      {},
      ({ program, dart }) => {
        const facets = new Map(
          [...program.symbols].map(([fqn, group]) => [fqn.split("::")[1], group[0].facets[0]]),
        );
        // `Plain` qualifies as a shape classes can conform to; the augmentation
        // does not, and the program index denotes no Dart type for it.
        expect(isShapeCandidate(facets.get("Plain")!)).toBe(true);
        expect(isShapeCandidate(facets.get("Window")!)).toBe(false);
        const index = new ProgramIndex(program.symbols, new Map());
        const windowFQN = [...program.symbols.keys()].find((fqn) => fqn.endsWith("::Window"))!;
        expect(index.typeFacet(windowFQN)).toBeUndefined();
        expect(index.augmentedHost(windowFQN)?.qualifiedName).toBe("Window");
        expect(dart.get("shape.d.ts")).toContain("extension WindowAugment on Window");
      },
    );
  });

  test("a module's own interface of the same name is not an augmentation", async () => {
    await withTestProgram(
      { "mod.d.ts": "export interface Window { mine: string }\nexport declare function f(w: Window): void;\n" },
      {},
      ({ dart }) => {
        const text = dart.get("mod.d.ts")!;
        expect(classesOf(text)).toEqual(["Window"]);
        expect(text).not.toContain("dart:html");
      },
    );
  });
});

describe("public names inside an ambient module (HD-18)", () => {
  test("hidden as shown gives Dart the name shown, with and without a root", async () => {
    const source = [
      'declare module "pkg-lib" {',
      "  function hidden(): void;",
      "  class Thing { constructor(); }",
      "  export { hidden as shown };",
      "  export { Thing as Other, Thing };",
      "}",
    ].join("\n");
    await withTestProgram({ "ambient.d.ts": source }, { jsRoot: "G" }, ({ dart }) => {
      const text = dart.get("ambient.d.ts")!;
      expect(text).toContain('@JS("G.shown")\nexternal void shown();');
      expect(text).not.toContain("void hidden");
      // A second public name for a class is a typedef to it.
      expect(text).toContain("typedef Other = Thing;");
    });
    await withTestProgram({ "ambient.d.ts": source }, {}, ({ dart, diagnostics }) => {
      const text = dart.get("ambient.d.ts")!;
      // No root: the module binds bare globals, but the Dart name is still the public one.
      expect(text).toContain('@JS("hidden")\nexternal void shown();');
      expect(diagnostics.some((line) => line.startsWith("[AMBIENT_MODULE_UNROOTED]"))).toBe(true);
    });
  });

  test("a declaration also exported under its own name keeps it", async () => {
    await withTestProgram(
      {
        "ambient.d.ts": [
          'declare module "pkg-lib" {',
          "  function both(): void;",
          "  export { both, both as again };",
          "}",
        ].join("\n"),
      },
      { jsRoot: "G" },
      ({ dart }) => {
        const text = dart.get("ambient.d.ts")!;
        expect(text).toContain("external void both();");
        // The second name is its own binding at the path that exports it.
        expect(text).toMatch(/@JS\("G\.again"\)\nexternal void again\(\);/);
      },
    );
  });

  test("two ambient modules renaming different declarations do not interfere", async () => {
    await withTestProgram(
      {
        "ambient.d.ts": [
          'declare module "one" { function hidden(): void; export { hidden as first }; }',
          'declare module "two" { function hidden(): void; export { hidden as second }; }',
        ].join("\n"),
      },
      { jsRoot: "G" },
      ({ dart }) => {
        const text = dart.get("ambient.d.ts")!;
        expect(text).toContain('@JS("G.first")\nexternal void first();');
        expect(text).toContain('@JS("G.second")\nexternal void second();');
      },
    );
  });
});
