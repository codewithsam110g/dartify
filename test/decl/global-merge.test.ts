import { readFileSync } from "fs";
import { join, resolve } from "path";
import { describe, expect, test } from "vitest";
import { Transpiler } from "../../src/transpiler";
import { LinkState } from "../../src/engine/phase/linkerPhase";
import { isShapeCandidate, ProgramIndex } from "../../src/engine/emitter/packagejs/program";
import { sdkMapping } from "../../src/engine/emitter/packagejs/types";
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

describe("a global that augments a core-mapped lib type becomes an extension on the SDK type (HD-23)", () => {
  test("interface Array<T> is an extension on List<T>, and Array<string> elsewhere stays List<String>", async () => {
    await withTestProgram(
      {
        "ext.d.ts": "interface Array<T> { myExt(): T }\n",
        "use.d.ts": [
          "declare function f(a: Array<string>): string[];",
          "declare function g(a: Array<Array<number>>, b: ReadonlyArray<boolean>): void;",
          "interface Holder { items: Array<string>; }",
        ].join("\n"),
      },
      {},
      ({ dart, diagnostics, ...rest }) => {
        const ext = dart.get("ext.d.ts")!;
        // No project class stands in for List.
        expect(classesOf(ext)).toEqual([]);
        expect(ext).toContain("extension ArrayAugment<T> on List<T> {");
        expect(ext).toContain('T myExt() => callMethod<T>(this, "myExt", []);');
        const use = dart.get("use.d.ts")!;
        expect(use).toContain("external List<String> f(List<String> a);");
        expect(use).toContain("external void g(List<List<num>> a, List<bool> b);");
        expect(use).toContain("external List<String> get items;");
        expect(use).not.toMatch(/\bArray\b/);
        // The augmenting file is not imported just to name the type.
        expect(use).not.toContain("import 'ext.dart'");
        expect(diagnostics).toEqual([]);
        expectCleanLink({ dart, diagnostics, ...rest });
      },
    );
  });

  test("interface String is an extension on String, and a String parameter elsewhere stays String", async () => {
    await withTestProgram(
      {
        "ext.d.ts": "interface String { shout(): string }\n",
        "use.d.ts": "declare function f(s: String, parts: String[]): string;\n",
      },
      {},
      ({ dart, diagnostics, ...rest }) => {
        const ext = dart.get("ext.d.ts")!;
        // No project class stands in for String (dartify names a shadowing one JS$String).
        expect(classesOf(ext)).toEqual([]);
        expect(ext).toContain("extension JS$StringAugment on String {");
        expect(ext).toContain('String shout() => callMethod<String>(this, "shout", []);');
        expect(dart.get("use.d.ts")).toContain("external String f(String s, List<String> parts);");
        expect(dart.get("use.d.ts")).not.toContain("JS$String");
        expect(diagnostics).toEqual([]);
        expectCleanLink({ dart, diagnostics, ...rest });
      },
    );
  });

  test("type parameters and bounds are kept; ReadonlyArray is an extension on List too", async () => {
    await withTestProgram(
      {
        "ext.d.ts": [
          "interface Item { id: string }",
          "interface Array<T extends Item> { ids(): string[] }",
          "interface ReadonlyArray<T> { second(): T }",
        ].join("\n"),
      },
      {},
      ({ dart }) => {
        const ext = dart.get("ext.d.ts")!;
        expect(ext).toContain("extension ArrayAugment<T extends Item> on List<T> {");
        expect(ext).toContain("extension ReadonlyArrayAugment<T> on List<T> {");
        expect(classesOf(ext)).toEqual(["Item"]);
      },
    );
  });

  test("every lib type the core lowering maps to an SDK type: the covered table", async () => {
    const table: [lib: string, header: string][] = [
      ["Array<T>", "extension ArrayAugment<T> on List<T> {"],
      ["ReadonlyArray<T>", "extension ReadonlyArrayAugment<T> on List<T> {"],
      ["String", "extension JS$StringAugment on String {"],
      ["Number", "extension NumberAugment on num {"],
      ["Boolean", "extension BooleanAugment on bool {"],
      ["Object", "extension JS$ObjectAugment on Object {"],
      ["Function", "extension JS$FunctionAugment on Function {"],
    ];
    await withTestProgram(
      { "core.d.ts": table.map(([lib]) => `interface ${lib} { added(): string }`).join("\n") },
      {},
      ({ dart, diagnostics }) => {
        const text = dart.get("core.d.ts")!;
        for (const [, header] of table) expect(text, header).toContain(header);
        expect(classesOf(text)).toEqual([]);
        expect(diagnostics).toEqual([]);
      },
    );
    // One lookup answers "has an SDK type" for the core table and the platform registry.
    const identity = (qualifiedName: string, library = "lib.es5.d.ts") => ({
      family: "typescript" as const,
      libraries: [library],
      qualifiedName,
    });
    expect(sdkMapping(identity("Array"))).toMatchObject({ library: "dart:core", name: "List", typeArgs: 1 });
    expect(sdkMapping(identity("String"))).toMatchObject({ library: "dart:core", name: "String", typeArgs: 0 });
    expect(sdkMapping(identity("Window", "lib.dom.d.ts"))).toMatchObject({ library: "dart:html", name: "Window" });
    expect(sdkMapping(identity("Float32Array", "lib.es5.d.ts"))).toMatchObject({ library: "dart:typed_data" });
    expect(sdkMapping(identity("Math"))).toBeUndefined();
    expect(sdkMapping({ ...identity("Array"), family: "node" })).toBeUndefined();
  });

  test("lib types that lower to no SDK type keep the ordinary merged class: Date, Promise, Math", async () => {
    await withTestProgram(
      {
        "none.d.ts": [
          // A Dart DateTime is not a JavaScript Date (a js_util call on it throws), and
          // Promise lowers to a per-library generated class: neither is an SDK type to extend.
          "interface Date { shifted(): Date }",
          "interface Promise<T> { tap(): Promise<T> }",
          "interface Math { clamp(x: number): number }",
        ].join("\n"),
      },
      {},
      ({ dart, diagnostics }) => {
        const text = dart.get("none.d.ts")!;
        expect(classesOf(text).sort()).toEqual(["Date", "Math", "Promise"]);
        expect(text).not.toContain("Augment");
        expect(diagnostics.filter((line) => line.includes("AUGMENTATION"))).toEqual([]);
      },
    );
  });

  test("a use in a file that only references the augmenting file still gets the SDK type", async () => {
    await withTestProgram(
      {
        "main.d.ts": '/// <reference path="dep.d.ts" />\ndeclare function f(a: Array<string>, w: Window): string[];\n',
        "dep.d.ts": "interface Array<T> { depOnly(): T }\ninterface Window { depProp: string }\n",
      },
      { inputs: ["main.d.ts"] },
      ({ dart, ...rest }) => {
        const main = dart.get("main.d.ts")!;
        expect(main).toContain("external List<String> f(List<String> a, Window w);");
        expect(main).not.toMatch(/typedef \w+ = dynamic/);
        expect(main).not.toContain("import 'dep.dart'");
        expect(dart.get("dep.d.ts")).toContain("extension ArrayAugment<T> on List<T> {");
        expect(rest.diagnostics).toEqual([]);
      },
    );
  });

  test("collection-typed members are read as typed lists, not through a failing cast", async () => {
    await withTestProgram(
      {
        "lists.d.ts": [
          "type Names = string[];",
          "interface Box<T> { value: T }",
          "interface Array<T> {",
          "  labels: string[];",
          "  maybe?: string[];",
          "  nullable: string[] | null;",
          "  nested: string[][];",
          "  aliased: Names;",
          "  readonly ro: ReadonlyArray<number>;",
          "  words(): string[];",
          "  grid(n: number, label?: string): number[][];",
          "  maybeGrid(): number[][] | undefined;",
          "  boxes(): Box<string>[];",
          "  box(): Box<string>;",
          "  pick(raw: string, item: string): string[][] | undefined;",
          // Nothing to convert: lists of any, mixed tuples, and non-collections are read as before.
          "  anything: any[];",
          "  mixed: [string, number];",
          "  plain: string;",
          "}",
        ].join("\n"),
      },
      {},
      ({ dart }) => {
        const ext = declarationOf(dart.get("lists.d.ts")!, /extension ArrayAugment/);
        const read = (member: string) => ext.split("\n").filter((line) => line.includes(member)).join("\n");
        expect(ext).toContain('List<String> get labels => List<String>.from(getProperty<List<dynamic>>(this, "labels"));');
        expect(ext).toContain('List<num> get ro => List<num>.from(getProperty<List<dynamic>>(this, "ro"));');
        expect(ext).not.toContain("set ro(");
        // Nested: each level is converted; the inner lists are real typed lists too.
        expect(ext).toContain(
          'List<List<String>> get nested => <List<String>>[for (final item in getProperty<List<dynamic>>(this, "nested")) List<String>.from(item)];',
        );
        // Aliases and nullable lists are seen through.
        expect(ext).toContain('Names get aliased => List<String>.from(getProperty<List<dynamic>>(this, "aliased"));');
        for (const name of ["maybe", "nullable"]) {
          expect(ext).toContain(
            [
              `  List<String>? get ${name} {`,
              `    final raw = getProperty<List<dynamic>?>(this, "${name}");`,
              "    return raw == null ? null : List<String>.from(raw);",
              "  }",
            ].join("\n"),
          );
        }
        // Method results: required-only parameters, optional ones, nullable nested.
        expect(ext).toContain('List<String> words() => List<String>.from(callMethod<List<dynamic>>(this, "words", []));');
        expect(ext).toContain(
          'return <List<num>>[for (final item in callMethod<List<dynamic>>(this, "grid", args)) List<num>.from(item)];',
        );
        expect(ext).toContain('final raw = callMethod<List<dynamic>?>(this, "maybeGrid", []);');
        expect(ext).toContain("return raw == null ? null : <List<num>>[for (final item in raw) List<num>.from(item)];");
        // A generic container of a project type is no collection: read as it is.
        expect(ext).toContain('List<Box<String>> boxes() => List<Box<String>>.from(callMethod<List<dynamic>>(this, "boxes", []));');
        expect(ext).toContain('Box<String> box() => callMethod<Box<String>>(this, "box", []);');
        // The helper variables never collide with a parameter of the member.
        expect(ext).toContain('final raw2 = callMethod<List<dynamic>?>(this, "pick", [raw, item]);');
        expect(ext).toContain("return raw2 == null ? null : <List<String>>[for (final item2 in raw2) List<String>.from(item2)];");
        // Unchanged shapes keep the direct read.
        expect(read("get anything")).toBe('  List<dynamic> get anything => getProperty<List<dynamic>>(this, "anything");');
        expect(read("get mixed")).toBe('  List<Object?> get mixed => getProperty<List<Object?>>(this, "mixed");');
        expect(read("get plain")).toBe('  String get plain => getProperty<String>(this, "plain");');
      },
    );
  });

  test("a member named like a dart:core type does not capture the list type in the extension body", async () => {
    await withTestProgram(
      { "shadow.d.ts": "interface Array<T> { List: string; names(): string[] }\n" },
      {},
      ({ dart }) => {
        const text = dart.get("shadow.d.ts")!;
        expect(text).toContain("import 'dart:core' as core;");
        expect(text).toContain('core.List<String> names() => core.List<String>.from(callMethod<core.List<dynamic>>(this, "names", []));');
        // The receiver is outside the body, where no member can capture it.
        expect(text).toContain("extension ArrayAugment<T> on List<T> {");
      },
    );
  });

  test("a member named like a js_util function does not capture the body's calls; an Object member is reported", async () => {
    await withTestProgram(
      {
        "css.d.ts": [
          // lib.dom's CSSStyleDeclaration declares `setProperty` itself.
          "interface CSSStyleDeclaration { myVar: string; setProperty(name: string, value: string): void; toString(): string }",
          "interface String { hashCode: number; shout(): string }",
        ].join("\n"),
      },
      {},
      ({ dart, diagnostics }) => {
        const text = dart.get("css.d.ts")!;
        // The extension's own `setProperty` would shadow the import, so the library qualifies it.
        expect(text).toContain("import 'package:js/js_util.dart' as js_util;");
        expect(text).toContain('String get myVar => getProperty<String>(this, "myVar");');
        expect(text).toContain('set myVar(String value) => js_util.setProperty(this, "myVar", value);');
        expect(text).toContain('void setProperty(String name, String value) => callMethod<void>(this, "setProperty", [name, value]);');
        // Dart's Object already declares toString and hashCode, which an extension may not.
        expect(text).not.toMatch(/toString|hashCode/);
        expect(diagnostics.sort()).toEqual(
          [
            "[AUGMENTATION_MEMBER_UNSUPPORTED] CSSStyleDeclaration: member toString, which every Dart object declares, cannot be added to CssStyleDeclaration (dart:html) and is not bound",
            "[AUGMENTATION_MEMBER_UNSUPPORTED] String: member hashCode, which every Dart object declares, cannot be added to String (dart:core) and is not bound",
          ].sort(),
        );
      },
    );
  });

  test("an interface and its value companion in one file: the interface is the extension, the companion's members are reported", async () => {
    await withTestProgram(
      {
        "win.d.ts": [
          "interface Window { myProp: string }",
          "declare var Window: {",
          "  prototype: Window;",
          "  new (): Window;",
          "  staticThing: number;",
          "  make(): Window;",
          "};",
          "declare function current(): Window;",
        ].join("\n"),
      },
      {},
      ({ dart, diagnostics, ...rest }) => {
        const text = dart.get("win.d.ts")!;
        // No standalone class shadows dart:html's Window.
        expect(classesOf(text)).toEqual([]);
        expect(text).toContain("import 'dart:html' show Window;");
        const extension = declarationOf(text, /extension WindowAugment on Window/);
        expect(extension).toContain('String get myProp => getProperty<String>(this, "myProp");');
        expect(extension).not.toContain("staticThing");
        expect(text).toContain("external Window current();");
        // One diagnostic per companion member, `prototype` aside.
        expect(diagnostics.sort()).toEqual(
          [
            "[AUGMENTATION_MEMBER_UNSUPPORTED] Window: a construct signature cannot be added to Window (dart:html) and is not bound",
            "[AUGMENTATION_MEMBER_UNSUPPORTED] Window: static member staticThing cannot be added to Window (dart:html) and is not bound",
            "[AUGMENTATION_MEMBER_UNSUPPORTED] Window: static method make cannot be added to Window (dart:html) and is not bound",
          ].sort(),
        );
        expectCleanLink({ dart, diagnostics, ...rest });
      },
    );
  });

  test("a core-mapped type may have a value companion too", async () => {
    await withTestProgram(
      {
        "a.d.ts": [
          "interface Array<T> { z(): T }",
          "declare var Array: { prototype: Array<any>; new <T>(n?: number): Array<T>; of2(x: any): boolean };",
          "interface String { shout(): string }",
          "declare var String: { prototype: String; new (value?: any): String; fromCodes(): string };",
        ].join("\n"),
      },
      {},
      ({ dart, diagnostics }) => {
        const text = dart.get("a.d.ts")!;
        expect(classesOf(text)).toEqual([]);
        expect(text).toContain("extension ArrayAugment<T> on List<T> {");
        expect(text).toContain("extension JS$StringAugment on String {");
        expect(diagnostics.sort()).toEqual(
          [
            "[AUGMENTATION_MEMBER_UNSUPPORTED] Array: a construct signature cannot be added to List (dart:core) and is not bound",
            "[AUGMENTATION_MEMBER_UNSUPPORTED] Array: static method of2 cannot be added to List (dart:core) and is not bound",
            "[AUGMENTATION_MEMBER_UNSUPPORTED] String: a construct signature cannot be added to String (dart:core) and is not bound",
            "[AUGMENTATION_MEMBER_UNSUPPORTED] String: static method fromCodes cannot be added to String (dart:core) and is not bound",
          ].sort(),
        );
      },
    );
  });

  test("a lib type's value companion without an augmenting interface is untouched", async () => {
    await withTestProgram(
      {
        "mine.d.ts": [
          "interface Thing { a: string }",
          "declare var Thing: { prototype: Thing; new (): Thing; make(): Thing };",
        ].join("\n"),
      },
      {},
      ({ dart }) => {
        const text = dart.get("mine.d.ts")!;
        expect(classesOf(text)).toEqual(["Thing"]);
        expect(text).toContain("external static Thing make();");
        expect(text).not.toContain("Augment");
      },
    );
  });

});

describe("the same global declared identically in several files is one binding (HD-06)", () => {
  const semanticCodes = (program: TestProgram) =>
    program.program.report.semantic.diagnostics.map((diagnostic) => diagnostic.code);

  test("an identical declare var and function signature in two script files: one binding, owned by the first", async () => {
    await withTestProgram(
      {
        "one.d.ts": "declare var shared: number;\ndeclare function same(x: number): string;\n",
        "two.d.ts": "declare var shared: number;\ndeclare function same(x: number): string;\ndeclare function use(): number;\n",
      },
      {},
      (program) => {
        const one = program.dart.get("one.d.ts")!;
        expect(one).toContain('@JS("shared")\nexternal num get shared;');
        expect(one).toContain("external String same(num x);");
        expect(one.match(/external num get shared/g)).toHaveLength(1);
        expect(one).not.toMatch(/shared_2|same_1|same_2/);
        // The second file declares nothing of its own for them.
        expect(program.dart.get("two.d.ts")).not.toMatch(/shared|same/);
        expect(semanticCodes(program)).not.toContain("UNSUPPORTED_DECLARATION_GROUP");
        expect(program.diagnostics).toEqual([]);
        // The one declaration is a single group: no rename was needed.
        expect(program.program.report.semantic.overloadsRenamed).toBe(0);
      },
    );
  });

  test("three files, the third identical too; a different third signature makes an overload of two, not three", async () => {
    await withTestProgram(
      {
        "a.d.ts": "declare var v: boolean;\ndeclare function f(x: number): void;\n",
        "b.d.ts": "declare var v: boolean;\ndeclare function f(x: number): void;\n",
        "c.d.ts": "declare var v: boolean;\ndeclare function f(x: number): void;\n",
      },
      {},
      ({ dart }) => {
        const a = dart.get("a.d.ts")!;
        expect(a.match(/external bool get v/g)).toHaveLength(1);
        expect(a.match(/external void f\(/g)).toHaveLength(1);
        expect(a).not.toMatch(/v_2|f_1|f_2/);
      },
    );
    await withTestProgram(
      {
        "a.d.ts": "declare function f(x: number): void;\n",
        "b.d.ts": "declare function f(x: number): void;\n",
        "c.d.ts": "declare function f(x: string): void;\n",
      },
      {},
      ({ dart }) => {
        const a = dart.get("a.d.ts")!;
        expect(a).toContain("external void f_1(num x);");
        expect(a).toContain("external void f_2(String x);");
        expect(a).not.toContain("f_3");
      },
    );
  });

  test("non-identical redeclarations keep the D-12 behaviour: overloads stay overloads, a conflict stays visible", async () => {
    await withTestProgram(
      {
        "one.d.ts": "declare function over(x: number): string;\ndeclare var diff: number;\n",
        "two.d.ts": "declare function over(x: string): string;\ndeclare var diff: string;\n",
      },
      {},
      (program) => {
        const one = program.dart.get("one.d.ts")!;
        expect(one).toContain("external String over_1(num x);");
        expect(one).toContain("external String over_2(String x);");
        expect(one).toContain("external num get diff;");
        expect(one).toContain("external String get diff_2;");
        expect(semanticCodes(program)).toEqual(["UNSUPPORTED_DECLARATION_GROUP"]);
      },
    );
  });

  test("identity is the IR's structure: a parameter name or a type makes declarations differ", async () => {
    await withTestProgram(
      {
        "one.d.ts": "declare function named(x: number): void;\ndeclare function typed(x: number): void;\n",
        "two.d.ts": "declare function named(y: number): void;\ndeclare function typed(x: number | string): void;\n",
      },
      {},
      ({ dart }) => {
        const one = dart.get("one.d.ts")!;
        expect(one).toContain("external void named_1(num x);");
        expect(one).toContain("external void named_2(num y);");
        expect(one).toContain("external void typed_1(num x);");
        expect(one).toMatch(/external void typed_2\(\S+ x\);/);
      },
    );
  });

  test("two identical signatures within one file are not touched", async () => {
    await withTestProgram(
      { "dup.d.ts": "declare function twice(x: number): void;\ndeclare function twice(x: number): void;\n" },
      {},
      ({ dart }) => {
        expect(dart.get("dup.d.ts")).toContain("twice_1");
        expect(dart.get("dup.d.ts")).toContain("twice_2");
      },
    );
  });

  test("the order the inputs are named in does not change the result", async () => {
    const sources = {
      "a.d.ts": "declare var shared: number;\ndeclare function f(x: number): void;\n",
      "b.d.ts": "declare var shared: number;\ndeclare function f(x: number): void;\ndeclare function g(): void;\n",
      "c.d.ts": "declare var shared: number;\ndeclare function f(x: string): void;\n",
    };
    const outputs: string[] = [];
    for (const inputs of [
      ["a.d.ts", "b.d.ts", "c.d.ts"],
      ["c.d.ts", "b.d.ts", "a.d.ts"],
      ["b.d.ts", "a.d.ts", "c.d.ts"],
    ]) {
      await withTestProgram(sources, { inputs }, ({ dart, diagnostics }) => {
        outputs.push(JSON.stringify([[...dart].sort(), diagnostics]));
      });
    }
    expect(new Set(outputs).size).toBe(1);
  });
});

describe("an interface and its constructor-shaped value in different files are one declaration (HD-06)", () => {
  const semanticCodes = (program: TestProgram) =>
    program.program.report.semantic.diagnostics.map((diagnostic) => diagnostic.code);
  /** Every generated library, joined: nothing of the companion's scaffolding may be left in any. */
  const allText = (dart: ReadonlyMap<string, string>) => [...dart.values()].join("\n");

  // The owner is the first declaring file, `a.d.ts`: the interface's, or the value's.
  const COUNTER_INTERFACE = "interface Counter { value: number }\n";
  const COUNTER_VALUE = [
    "declare var Counter: { prototype: Counter; new (start: number): Counter; zero(): Counter; DEFAULT: number };",
    "declare function make(): Counter;",
  ].join("\n");
  const orders: [string, Record<string, string>][] = [
    ["the interface's file first", { "a.d.ts": COUNTER_INTERFACE, "b.d.ts": COUNTER_VALUE }],
    ["the value's file first", { "a.d.ts": COUNTER_VALUE, "b.d.ts": COUNTER_INTERFACE }],
  ];

  test.each(orders)("an ordinary type is one class owned by the first file, %s", async (_, sources) => {
    await withTestProgram(sources, {}, (program) => {
      const { dart, diagnostics } = program;
      const owner = dart.get("a.d.ts")!;
      expect(classesOf(owner)).toEqual(["Counter"]);
      // The constructor and statics of the value file, the member of the interface file.
      const counter = declarationOf(owner, /class Counter/);
      expect(counter).toContain("external Counter(num start);");
      expect(counter).toContain("external num get value;");
      expect(counter).toContain("external static num get DEFAULT;");
      expect(counter).toContain("external static Counter zero();");
      // The other file declares no class of its own and shares the owner's.
      expect(classesOf(dart.get("b.d.ts") ?? "")).toEqual([]);
      expect(allText(dart).match(/external Counter make\(\);/g)).toHaveLength(1);
      // No leftover: no shape class, no variable standing in for the value, no diagnostic.
      expect(allText(dart)).not.toMatch(/Anon_|JS\$Counter/);
      expect(semanticCodes(program)).toEqual([]);
      expect(diagnostics).toEqual([]);
      expectCleanLink(program);
    });
  });

  test("the file the user names first does not decide the owner", async () => {
    const outputs: string[] = [];
    for (const inputs of [["a.d.ts", "b.d.ts"], ["b.d.ts", "a.d.ts"]]) {
      await withTestProgram(orders[1][1], { inputs }, ({ dart, diagnostics }) => {
        outputs.push(JSON.stringify([[...dart].sort(), diagnostics]));
      });
    }
    expect(new Set(outputs).size).toBe(1);
  });

  const WINDOW_INTERFACE = "interface Window { first: string }\n";
  const WINDOW_VALUE = "declare var Window: { prototype: Window; new (): Window; id: number };\n";
  test.each([
    ["the interface's file first", { "a.d.ts": WINDOW_INTERFACE, "b.d.ts": WINDOW_VALUE }],
    ["the value's file first", { "a.d.ts": WINDOW_VALUE, "b.d.ts": WINDOW_INTERFACE }],
  ] as [string, Record<string, string>][])("a mapped lib type is the extension, the companion's members reported, %s", async (_, sources) => {
    await withTestProgram(sources, {}, (program) => {
      const { dart, diagnostics } = program;
      const owner = dart.get("a.d.ts")!;
      expect(classesOf(owner)).toEqual([]);
      expect(owner).toContain("extension WindowAugment on Window {");
      expect(owner).toContain('String get first => getProperty<String>(this, "first");');
      // One diagnostic per companion member, exactly as when both sit in one file.
      expect(diagnostics.sort()).toEqual(
        [
          "[AUGMENTATION_MEMBER_UNSUPPORTED] Window: a construct signature cannot be added to Window (dart:html) and is not bound",
          "[AUGMENTATION_MEMBER_UNSUPPORTED] Window: static member id cannot be added to Window (dart:html) and is not bound",
        ].sort(),
      );
      expect(allText(dart)).not.toMatch(/Anon_|JS\$Window|class Window/);
      expect(semanticCodes(program)).toEqual([]);
      expectCleanLink(program);
    });
  });

  test("a core-mapped type may have its value in another file too", async () => {
    await withTestProgram(
      {
        "a.d.ts": "interface Array<T> { z(): T }\n",
        "b.d.ts": "declare var Array: { prototype: Array<any>; new <T>(n?: number): Array<T>; of2(x: any): boolean };\n",
      },
      {},
      (program) => {
        const owner = program.dart.get("a.d.ts")!;
        expect(owner).toContain("extension ArrayAugment<T> on List<T> {");
        expect(classesOf(owner)).toEqual([]);
        expect(program.diagnostics.sort()).toEqual(
          [
            "[AUGMENTATION_MEMBER_UNSUPPORTED] Array: a construct signature cannot be added to List (dart:core) and is not bound",
            "[AUGMENTATION_MEMBER_UNSUPPORTED] Array: static method of2 cannot be added to List (dart:core) and is not bound",
          ].sort(),
        );
        expect(allText(program.dart)).not.toMatch(/Anon_|JS\$Array/);
        expect(semanticCodes(program)).toEqual([]);
      },
    );
  });

  test("two values that construct different types in different files stay ambiguous", async () => {
    // The redirects only fold declarations of one symbol; `A` and `B` are two.
    await withTestProgram(
      {
        "a.d.ts": "interface A { a: number }\ninterface B { b: number }\n",
        "b.d.ts": "declare var A: { prototype: B; new (): A };\n",
      },
      {},
      (program) => {
        expect(semanticCodes(program)).toContain("AMBIGUOUS_CONSTRUCTOR_COMPANION");
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
