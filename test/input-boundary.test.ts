import { existsSync } from "fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { basename, dirname, join } from "path";
import { afterEach, describe, expect, test } from "vitest";
import { TranspileException, Transpiler } from "../src/transpiler";
import { WatchSession } from "../src/watch";

/**
 * The input boundary: input dartify cannot parse is a generation failure, not
 * a recovered success (HD-13), and `.d.mts` / `.d.cts` are declaration files
 * (HD-04).
 */

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function project(sources: Record<string, string>): Promise<{ root: string; path: (name: string) => string }> {
  const root = await mkdtemp(join(tmpdir(), "dartify-boundary-"));
  roots.push(root);
  for (const [name, source] of Object.entries(sources)) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), source);
  }
  return { root, path: (name) => join(root, name) };
}

async function failureOf(promise: Promise<unknown>): Promise<TranspileException> {
  const error = await promise.then(
    () => undefined,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(TranspileException);
  return error as TranspileException;
}

// The minimal trigger of the audit finding: a malformed signature, then a
// declaration the parser's recovery would happily bind.
const TRIGGER = "export declare function broken(x: number: string;\nexport declare const fine: number;\n";

describe("syntax errors are generation failures (HD-13)", () => {
  test("the trigger fails with file, line, column and TS code, and writes nothing", async () => {
    const { root, path } = await project({ "trigger.d.ts": TRIGGER });
    const outDir = join(root, "out");
    const transpiler = new Transpiler({ files: [path("trigger.d.ts")], outDir });

    const error = await failureOf(transpiler.transpile());

    expect(error.code).toBe("GENERATION_FAILED");
    expect(error.diagnostics?.length).toBeGreaterThan(0);
    for (const diagnostic of error.diagnostics!) {
      expect(basename(diagnostic.file)).toBe("trigger.d.ts");
      expect(diagnostic.code).toMatch(/^TS\d{4}$/);
      expect(diagnostic.line).toBeGreaterThanOrEqual(1);
      expect(diagnostic.column).toBeGreaterThanOrEqual(1);
    }
    expect(error.diagnostics![0]).toMatchObject({ code: "TS1005", line: 1 });
    expect(error.file && basename(error.file)).toBe("trigger.d.ts");
    expect(existsSync(outDir)).toBe(false);
  });

  test("analyze() carries the failures; render() keeps its partial-results contract", async () => {
    const { root, path } = await project({ "trigger.d.ts": TRIGGER });
    const transpiler = new Transpiler({ files: [path("trigger.d.ts")], outDir: join(root, "out") });

    const analysis = await transpiler.analyze();
    expect(analysis.generation.map((failure) => failure.code)).toContain("TS1005");

    const rendered = await transpiler.render();
    expect(rendered.analysis.generation.length).toBeGreaterThan(0);
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("a missing closing brace fails", async () => {
    const { root, path } = await project({ "broken.d.ts": "export interface Broken { a: string\n" });
    const error = await failureOf(
      new Transpiler({ files: [path("broken.d.ts")], outDir: join(root, "out") }).transpile(),
    );
    expect(error.code).toBe("GENERATION_FAILED");
    expect(error.diagnostics).toEqual([
      expect.objectContaining({ code: "TS1005", message: "'}' expected." }),
    ]);
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("invalid UTF-8 inside an identifier fails", async () => {
    const { root, path } = await project({});
    await writeFile(
      path("utf.d.ts"),
      Buffer.concat([Buffer.from("export declare const fo"), Buffer.from([0xff]), Buffer.from("o: number;\n")]),
    );
    const error = await failureOf(new Transpiler({ files: [path("utf.d.ts")], outDir: join(root, "out") }).transpile());
    expect(error.diagnostics!.length).toBeGreaterThan(0);
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("a syntax error in one file of a multi-file run writes nothing for any file", async () => {
    const { root, path } = await project({
      "good.d.ts": "export declare const good: number;\n",
      "bad.d.ts": TRIGGER,
    });
    const outDir = join(root, "out");
    const error = await failureOf(
      new Transpiler({ files: [path("good.d.ts"), path("bad.d.ts")], outDir }).transpile(),
    );
    expect(error.diagnostics!.map((diagnostic) => basename(diagnostic.file))).not.toContain("good.d.ts");
    expect(error.diagnostics!.every((diagnostic) => basename(diagnostic.file) === "bad.d.ts")).toBe(true);
    expect(existsSync(join(outDir, "good.dart"))).toBe(false);
    expect(existsSync(outDir)).toBe(false);
  });

  test("a syntax error in a dependency file the inputs import fails the run", async () => {
    const { root, path } = await project({
      "main.d.ts": 'import { Dep } from "./dep";\nexport declare const value: Dep;\n',
      "dep.d.ts": "export interface Dep { a: string\n",
    });
    const error = await failureOf(
      new Transpiler({ files: [path("main.d.ts")], outDir: join(root, "out") }).transpile(),
    );
    expect(error.diagnostics!.map((diagnostic) => basename(diagnostic.file))).toEqual(["dep.d.ts"]);
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("type-check errors are not failures: an unresolved name still emits a named typedef", async () => {
    const { root, path } = await project({ "semantic.d.ts": "export declare const a: Missing;\n" });
    const outDir = join(root, "out");

    const report = await new Transpiler({ files: [path("semantic.d.ts")], outDir }).transpile();

    expect(report.analysis.generation).toEqual([]);
    const dart = await readFile(join(outDir, "semantic.dart"), "utf8");
    expect(dart).toContain("typedef Missing = dynamic;");
  });

  test("transpileFromString keeps its contract: syntax errors once each, no generation duplicates", async () => {
    const result = await Transpiler.transpileFromString(TRIGGER, { fileName: "/trigger.d.ts" });
    expect(result.errors.length).toBeGreaterThan(0);
    const keys = result.errors.map((error) => `${error.code}@${error.line}:${error.column}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(result.errors.every((error) => /^TS\d{4}$/.test(error.code))).toBe(true);
  });
});

describe("watch mode reports syntax errors and writes nothing for them (HD-13)", () => {
  test("a broken edit is reported and leaves the last good output; repairing it recovers", async () => {
    const { root, path } = await project({
      "a.d.ts": "export declare const a: number;\n",
      "b.d.ts": "export declare const b: number;\n",
    });
    const outDir = join(root, "out");
    const session = new WatchSession({ files: [path("a.d.ts"), path("b.d.ts")], outDir });

    const first = await session.build();
    expect(first.analysis.generation).toEqual([]);
    expect(first.written).toHaveLength(2);
    const goodA = await readFile(join(outDir, "a.dart"), "utf8");

    await writeFile(path("a.d.ts"), "export declare function broken(x: number: string;\n");
    const broken = await session.build([path("a.d.ts")]);
    expect(broken.analysis.generation.map((failure) => failure.code)).toContain("TS1005");
    expect(broken.analysis.generation.every((failure) => basename(failure.file) === "a.d.ts")).toBe(true);
    expect(broken.written).toEqual([]);
    expect(await readFile(join(outDir, "a.dart"), "utf8")).toBe(goodA);

    await writeFile(path("a.d.ts"), "export declare const a: string;\n");
    const repaired = await session.build([path("a.d.ts")]);
    expect(repaired.analysis.generation).toEqual([]);
    expect(repaired.written.map((file) => basename(file))).toEqual(["a.dart"]);
    expect(await readFile(join(outDir, "a.dart"), "utf8")).toContain("String");
  });
});

describe(".d.mts and .d.cts are declaration files (HD-04)", () => {
  test.each([
    ["mod.d.mts", "mod"],
    ["mod.d.cts", "mod"],
    ["mod.d.ts", "mod"],
  ])("%s renders to %s.dart with library name %s", async (name, stem) => {
    const { root, path } = await project({ [name]: "export declare const x: number;\n" });
    const rendered = await new Transpiler({ files: [path(name)], outDir: join(root, "out") }).render();
    expect([...rendered.files.keys()]).toEqual([join(root, "out", `${stem}.dart`)]);
    expect([...rendered.files.values()][0].content).toContain(`library ${stem};`);
  });

  test("an import with the .mjs / .cjs extension reaches a .d.mts / .d.cts dependency", async () => {
    const { root, path } = await project({
      "a.d.mts": 'import { B } from "./b.mjs";\nexport declare function a(): B;\n',
      "b.d.mts": "export interface B { n: number }\n",
    });
    const outDir = join(root, "out");
    const rendered = await new Transpiler({ files: [path("a.d.mts")], outDir }).render();
    expect([...rendered.files.keys()].sort()).toEqual([join(outDir, "a.dart"), join(outDir, "b.dart")]);
    expect(rendered.files.get(join(outDir, "a.dart"))!.content).toContain("import 'b.dart' show B;");
    expect(rendered.analysis.resolution.unresolved).toEqual([]);
  });

  test("an extensionless import does not find a .d.mts, as in TypeScript: it degrades by name", async () => {
    const { root, path } = await project({
      "d.d.ts": 'import { C } from "./c";\nexport declare const d: C;\n',
      "c.d.mts": "export interface C { c: string }\n",
    });
    const rendered = await new Transpiler({ files: [path("d.d.ts")], outDir: join(root, "out") }).render();
    expect(rendered.analysis.resolution.unresolved.map((issue) => issue.specifier)).toEqual(["./c"]);
    expect([...rendered.files.values()][0].content).toContain("typedef C = dynamic;");
  });
});
