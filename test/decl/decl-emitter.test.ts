import { describe, expect, test } from "vitest";
import { Transpiler } from "../../src/transpiler";
import { renderTestProject } from "../linker/test-project";

/**
 * S5 package:js backend behaviour, end to end through the real pipeline.
 * js_facade_gen parity lives in `test/conformance/`; these lock the
 * dartify-specific contracts the reference tool never had.
 */
const dart = async (source: string, fileName = "/lib.d.ts") => {
  const result = await Transpiler.transpileFromString(source, { fileName });
  expect(result.errors).toEqual([]);
  return result.content;
};

describe("S5 declarations", () => {
  test("variables are getter/setter pairs; const is getter-only (E-05)", async () => {
    const content = await dart("declare var a: number;\ndeclare const b: string;");
    expect(content).toContain('@JS("a")\nexternal num get a;\n@JS("a")\nexternal set a(num value);');
    expect(content).toContain('@JS("b")\nexternal String get b;');
    expect(content).not.toContain("set b(");
  });

  test("generic functions keep type parameters and class-like bounds (E-03)", async () => {
    const content = await dart(
      "interface Box { v: number }\ndeclare function pick<T extends Box, U>(a: T, b: U[]): T;",
    );
    expect(content).toContain("external T pick<T extends Box, U>(T a, List<U> b);");
  });

  test("rest parameters are polyfilled with real JavaScript arity (E-31)", async () => {
    const content = await dart("declare function join(sep: string, ...values: string[]): string;");
    expect(content).toContain(
      "external String join(String sep, [String values1, String values2, String values3, String values4, String values5]);",
    );
  });

  test("runtime enums are uninstantiable classes with uniform statics (E-06)", async () => {
    const content = await dart("declare enum Color { Red, Green = 4, Blue }");
    expect(content).toContain(
      '@JS("Color")\nabstract class Color {\n  external static num get Red;\n  external static num get Green;\n  external static num get Blue;\n}',
    );
  });

  test("const enums lower to compile-time constants (P-16)", async () => {
    const content = await dart('declare const enum Mode { A = 1, B = A << 2, C = "c" }');
    expect(content).toContain("static const Object A = 1;");
    expect(content).toContain("static const Object B = 4;");
    expect(content).toContain('static const Object C = "c";');
    expect(content).not.toContain('@JS("Mode")');
  });

  test("property bags get an anonymous factory including inherited fields (E-07)", async () => {
    const content = await dart(
      "interface Base<T> { id: T }\ninterface Opts extends Base<number> { name: string; size?: number }",
    );
    expect(content).toContain(
      "external factory Opts({required String name, num? size, required num id});",
    );
    expect(content).toContain("abstract class Opts implements Base<num> {");
  });

  test("callable interfaces become function typedefs (§3.6, I-05)", async () => {
    const content = await dart("interface F<A, B> { (a: A): B; }");
    expect(content).toContain("typedef F<A, B> = B Function(A a);");
  });

  test("overloaded constructors become named factories (E-02)", async () => {
    const content = await dart(
      "declare class P { constructor(x: number); constructor(x: number, y: number); }",
    );
    expect(content).toContain("  external P(num x);\n  external factory P.overload2(num x, num y);");
  });

  test("subclasses extend, inherit constructors, and override covariantly (E-04)", async () => {
    const content = await dart(
      [
        "declare class Animal { constructor(name: string); feed(food: Food): void; }",
        "interface Food { kcal: number }",
        "interface Meat extends Food { cut: string }",
        "declare class Dog extends Animal { feed(food: Meat): void; }",
      ].join("\n"),
    );
    expect(content).toContain("class Dog extends Animal {\n  external Dog(String name);");
    expect(content).toContain("external void feed(covariant Meat food);");
  });

  test("concrete classes restate implemented interface members", async () => {
    const content = await dart(
      "interface Named { name: string; greet(): string }\ndeclare class Person implements Named { age: number }",
    );
    expect(content).toContain("class Person implements Named {");
    expect(content).toContain("external String get name;");
    expect(content).toContain("external String greet();");
  });

  test("index signatures use their real key and value types (E-14)", async () => {
    const content = await dart("interface Dict { [key: string]: number }");
    expect(content).toContain("external num operator [](String key);");
    expect(content).toContain("external void operator []=(String key, num value);");
  });

  test("anonymous default exports are not bound to a fake name (P-15)", async () => {
    const content = await dart("export default function (): void;");
    expect(content).toContain("// Skipped: anonymous default-exported function");
    expect(content).not.toMatch(/@JS\("default"\)|@JS\(""\)/);
  });

  test("JSDoc becomes dartdoc; @param and @returns are stripped (§11, I-06)", async () => {
    const content = await dart(
      "/**\n * Adds. See {@link Other}.\n * @param a first\n * @returns sum\n */\ndeclare function add(a: number): number;",
    );
    expect(content).toContain('/// Adds. See [Other].\n@JS("add")');
    expect(content).not.toContain("@param");
  });

  test("JavaScript names are escaped inside @JS strings (E-32)", async () => {
    const content = await dart('interface X { "$foo-bar": string }');
    expect(content).toContain('@JS("\\$foo-bar")');
  });

  test("keyword file names produce legal library directives (E-33)", async () => {
    const content = await dart("declare const a: number;", "/class.d.ts");
    expect(content).toContain("library dartify_class;");
  });
});

describe("S5 types", () => {
  test("multi-member unions are named once (E-18)", async () => {
    const content = await dart("declare function f(x: string | number[]): void;");
    expect(content).toContain("external void f(StringOrListNum x);");
    expect(content).toContain(
      "/// A JavaScript union of `String | List<num>`; Dart has no union types.\ntypedef StringOrListNum = dynamic;",
    );
  });

  test("object, undefined and never have explicit lowerings (E-19, T-18)", async () => {
    const content = await dart("declare function f(a: object, b: undefined): never;");
    expect(content).toContain("external Never f(Object a, Null b);");
  });

  test("Promise becomes an interop class with toFuture (§2.16)", async () => {
    const content = await dart("declare function load(): Promise<string>;");
    expect(content).toContain("import 'package:js/js_util.dart' show promiseToFuture;");
    expect(content).toContain("external Promise<String> load();");
    expect(content).toContain("Future<T> toFuture() => promiseToFuture<T>(this);");
  });

  test("platform types import dart:html by host identity (§14, I-15)", async () => {
    const content = await dart(
      "declare function f(el: HTMLElement, xhr: XMLHttpRequest, bytes: Uint8Array): void;",
    );
    expect(content).toContain("import 'dart:html' show HtmlElement, HttpRequest;");
    expect(content).toContain("import 'dart:typed_data' show Uint8List;");
    expect(content).toContain("external void f(HtmlElement el, HttpRequest xhr, Uint8List bytes);");
  });

  test("a local declaration never captures a platform name (E-26)", async () => {
    const content = await dart(
      "interface HtmlElement { mine: true }\ndeclare function f(a: HTMLElement, b: HtmlElement): void;",
    );
    expect(content).toContain("import 'dart:html' as html;");
    expect(content).toContain("external void f(html.HtmlElement a, HtmlElement b);");
  });

  test("standard utility aliases lower or degrade by name (E-36)", async () => {
    const content = await dart(
      "interface X { a: number }\ndeclare function f(a: Partial<X>, b: Record<string, number>): void;",
    );
    expect(content).toContain("external void f(X a, RecordStringNumber b);");
    expect(content).toContain("typedef RecordStringNumber = dynamic;");
    const code = content.split("\n").filter((line) => !line.startsWith("///"));
    expect(code.join("\n")).not.toMatch(/\bRecord</);
  });
});

describe("S5 multi-file libraries", () => {
  test("foreign types import their library and are never captured locally (E-08, E-23)", async () => {
    const report = await renderTestProject({
      "a.d.ts": "export interface Options { a: number }\nexport interface Shared { s: string }",
      "b.d.ts": [
        'import { Options as Foreign, Shared } from "./a";',
        "export interface Options { b: string }",
        "export declare function f(x: Foreign, y: Options, z: Shared): void;",
      ].join("\n"),
    });
    const b = [...report.files.values()].find((file) => file.outputPath.endsWith("b.dart"))!;
    expect(b.content).toContain("import 'a.dart' show Shared;");
    expect(b.content).toContain("import 'a.dart' as a;");
    expect(b.content).toContain("external void f(a.Options x, Options y, Shared z);");
  });

  test("libraries share one Promise type through the support library (E-40)", async () => {
    const report = await renderTestProject({
      "load.d.ts": "export declare function load(): Promise<string>;",
      "save.d.ts": "export declare function save(pending: Promise<string>): void;",
    });
    const byName = (suffix: string) =>
      [...report.files.values()].find((file) => file.outputPath.endsWith(suffix))!;
    const support = byName("dartify_support.dart");
    expect(support.content).toContain("abstract class Promise<T> {}");
    expect(support.content).toContain("extension PromiseToFuture<T> on Promise<T>");
    for (const name of ["load.dart", "save.dart"]) {
      const content = byName(name).content;
      expect(content).toContain("import 'dartify_support.dart' show Promise;");
      expect(content).toContain("export 'dartify_support.dart' show Promise, PromiseToFuture;");
      expect(content).not.toContain("abstract class Promise");
    }
  });

  test("barrels re-export and hide names two sources both supply", async () => {
    const report = await renderTestProject({
      "one.d.ts": "export declare function one(x: Record<string, number>): void;",
      "two.d.ts": "export declare function two(x: Record<string, number>): void;",
      "index.d.ts": 'export * from "./one";\nexport * from "./two";',
    });
    const index = [...report.files.values()].find((file) => file.outputPath.endsWith("index.dart"))!;
    expect(index.content).toContain("export 'one.dart' hide RecordStringNumber;");
    expect(index.content).toContain("export 'two.dart' hide RecordStringNumber;");
  });
});
