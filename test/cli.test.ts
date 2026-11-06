import { ChildProcess, spawn, spawnSync } from "child_process";
import { existsSync } from "fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { build } from "tsup";

/**
 * The CLI as users run it: the bundle, spawned, with its exit code, stdout
 * and stderr asserted. Covers the input boundary (HD-04, HD-13), the link
 * summary, the js_facade_gen invocation shapes (HD-14) and watch-mode
 * reporting.
 */

let bundleDir: string;
let cli: string;
const projects: string[] = [];

beforeAll(async () => {
  // Inside the repository so the bundle resolves its dependencies from node_modules.
  bundleDir = resolve("output", `cli-test-${process.pid}`);
  await build({
    entry: ["src/cli.ts"],
    format: ["esm"],
    target: "node22",
    outDir: bundleDir,
    clean: true,
    silent: true,
    config: false,
  });
  cli = join(bundleDir, "cli.js");
}, 120_000);

afterAll(async () => {
  await rm(bundleDir, { recursive: true, force: true });
  await Promise.all(projects.map((root) => rm(root, { recursive: true, force: true })));
});

async function project(sources: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "dartify-cli-"));
  projects.push(root);
  for (const [name, source] of Object.entries(sources)) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), source);
  }
  return root;
}

interface Run {
  status: number | null;
  stdout: string;
  stderr: string;
}

function run(cwd: string, ...args: string[]): Run {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8", timeout: 60_000 });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

const VALID = "export declare const answer: number;\n";
// The audit's minimal trigger: a malformed signature, then a valid declaration.
const TRIGGER = "export declare function broken(x: number: string;\nexport declare const fine: number;\n";

describe("syntax errors fail the run and write nothing", () => {
  test("the trigger exits 1, names path:line:column and the TS code of every failure", async () => {
    const root = await project({ "trigger.d.ts": TRIGGER });
    const result = run(root, "-d", "trigger.d.ts", "-o", "out");
    expect(result.status).toBe(1);
    const failures = result.stderr.split("\n").filter((line) => /^trigger\.d\.ts:\d+:\d+ TS\d{4} /.test(line));
    expect(failures.length).toBeGreaterThan(1);
    expect(failures[0]).toMatch(/^trigger\.d\.ts:1:\d+ TS1005 /);
    expect(result.stderr).toContain("Error: generation failed with");
    expect(result.stdout).not.toContain("Completed");
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("a missing brace fails too", async () => {
    const root = await project({ "broken.d.ts": "export interface Broken { a: string\n" });
    const result = run(root, "-d", "broken.d.ts", "-o", "out");
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/broken\.d\.ts:\d+:\d+ TS1005 '\}' expected\./);
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("one bad file among several: nothing is written for any of them", async () => {
    const root = await project({ "good.d.ts": VALID, "bad.d.ts": TRIGGER });
    const result = run(root, "-d", "good.d.ts", "bad.d.ts", "-o", "out");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("bad.d.ts:1:");
    expect(result.stderr).not.toContain("good.d.ts");
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("type-check errors are not failures: the run succeeds and emits", async () => {
    const root = await project({ "semantic.d.ts": "export declare const a: Missing;\n" });
    const result = run(root, "-d", "semantic.d.ts", "-o", "out");
    expect(result.status).toBe(0);
    expect(await readFile(join(root, "out", "semantic.dart"), "utf8")).toContain("typedef Missing = dynamic;");
  });
});

describe("explicit inputs are validated before any generation", () => {
  test("a missing file beside a valid one exits 1 naming it, without -l, and writes nothing", async () => {
    const root = await project({ "valid.d.ts": VALID });
    const result = run(root, "-d", "valid.d.ts", "missing.d.ts", "-o", "out");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Input not found: missing.d.ts");
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("a directory named like a declaration file exits 1 naming it", async () => {
    const root = await project({ "valid.d.ts": VALID, "folder.d.ts/keep": "" });
    const result = run(root, "-d", "valid.d.ts", "folder.d.ts", "-o", "out");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Input is a directory, not a declaration file: folder.d.ts");
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("an explicit foo.ts is rejected, not skipped", async () => {
    const root = await project({ "valid.d.ts": VALID, "foo.ts": "export const x = 1;\n" });
    const result = run(root, "-d", "valid.d.ts", "foo.ts", "-o", "out");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Input is not a declaration file");
    expect(result.stderr).toContain("foo.ts");
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("a glob that matches nothing warns by pattern; the run continues if another input exists", async () => {
    const root = await project({ "valid.d.ts": VALID });
    const result = run(root, "-d", "valid.d.ts", "nothing/**/*.d.ts", "-o", "out");
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("Warning: Pattern matched no declaration files");
    expect(result.stderr).toContain("nothing/**/*.d.ts");
    expect(existsSync(join(root, "out", "valid.dart"))).toBe(true);
  });

  test("with nothing left at all it exits 1", async () => {
    const root = await project({});
    const result = run(root, "-d", "nothing/**/*.d.ts", "-o", "out");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("nothing/**/*.d.ts");
  });
});

describe(".d.mts and .d.cts inputs", () => {
  test("a .d.mts alone, from an explicit path and from a glob, emits <stem>.dart", async () => {
    const root = await project({ "mod.d.mts": VALID });
    for (const input of ["mod.d.mts", "*.d.mts"]) {
      const result = run(root, "-d", input, "-o", `out-${input.replace(/\W/g, "")}`);
      expect(result.status, input).toBe(0);
      const dart = await readFile(join(root, `out-${input.replace(/\W/g, "")}`, "mod.dart"), "utf8");
      expect(dart).toContain("library mod;");
    }
  });

  test("mixed with .d.ts inputs, each keeps its own output", async () => {
    const root = await project({ "a.d.ts": VALID, "b.d.mts": VALID, "c.d.cts": VALID });
    const result = run(root, "-d", "*.d.{ts,mts,cts}", "-o", "out");
    expect(result.status).toBe(0);
    for (const name of ["a", "b", "c"]) expect(existsSync(join(root, "out", `${name}.dart`)), name).toBe(true);
  });

  test("dual-package typings: the .d.ts wins and a notice names the skipped file", async () => {
    const root = await project({ "x.d.ts": VALID, "x.d.mts": "export declare const other: string;\n" });
    const result = run(root, "-d", "*.d.{ts,mts}", "-o", "out");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Skipping x.d.mts: x.d.ts describes the same API");
    expect(await readFile(join(root, "out", "x.dart"), "utf8")).toContain("answer");
  });

  test("a true output collision is an error naming both inputs", async () => {
    const root = await project({ "x.d.ts": VALID, "x.d.mts": VALID });
    const result = run(root, "-d", "x.d.ts", "x.d.mts", "-o", "out");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("x.d.mts");
    expect(result.stderr).toContain("x.d.ts");
    expect(result.stderr).toContain("x.dart");
    expect(existsSync(join(root, "out"))).toBe(false);
  });
});

describe("link failures are visible in the default output", () => {
  test("a broken reference states the count without -l and still exits 0", async () => {
    const root = await project({ "x.d.ts": "export declare const a: Missing;\n" });
    const result = run(root, "-d", "x.d.ts", "-o", "out");
    expect(result.status).toBe(0);
    expect(result.stderr).toContain(
      "Link report: 1 broken symbol(s), 0 ambiguous reference(s); rerun with -lv for the full linker report",
    );
  });

  test("a fully resolved run prints no link warning", async () => {
    const root = await project({ "x.d.ts": VALID });
    const result = run(root, "-d", "x.d.ts", "-o", "out");
    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("Link report");
  });
});

describe("js_facade_gen invocation shapes", () => {
  test("positional input without -o prints the single library to stdout, logs to stderr", async () => {
    const root = await project({ "x.d.ts": VALID });
    const written = run(root, "-d", "x.d.ts", "-o", "out");
    expect(written.status).toBe(0);

    const result = run(root, "x.d.ts");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe(await readFile(join(root, "out", "x.dart"), "utf8"));
    expect(result.stderr).toContain("Processing files...");
    expect(existsSync(join(root, "dart_out"))).toBe(false);
  });

  test("with -l the pipeline's own logging also stays off stdout", async () => {
    const root = await project({ "x.d.ts": VALID });
    const result = run(root, "x.d.ts", "-l");
    expect(result.status).toBe(0);
    expect(result.stdout.startsWith("// Generated by dart_bindgen")).toBe(true);
    expect(result.stdout).not.toContain("Processing");
    expect(result.stdout).not.toContain("Source Path Resolution");
    expect(result.stderr).toContain("Source Path Resolution Summary");
  });

  test("a multi-library result in stdout mode is an error asking for --destination", async () => {
    const root = await project({ "a.d.ts": VALID, "b.d.ts": VALID });
    const result = run(root, "a.d.ts", "b.d.ts");
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("--destination");
    expect(existsSync(join(root, "dart_out"))).toBe(false);
  });

  test("stdout mode prints nothing on a syntax error", async () => {
    const root = await project({ "trigger.d.ts": TRIGGER });
    const result = run(root, "trigger.d.ts");
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/trigger\.d\.ts:1:\d+ TS1005/);
  });

  test("--destination is -o, with positional inputs", async () => {
    const root = await project({ "a.d.ts": VALID, "b.d.ts": VALID });
    const result = run(root, "--destination=out", "a.d.ts", "b.d.ts");
    expect(result.status).toBe(0);
    for (const name of ["a", "b"]) expect(existsSync(join(root, "out", `${name}.dart`))).toBe(true);
  });

  test("-d without positional inputs and without -o still writes ./dart_out", async () => {
    const root = await project({ "x.d.ts": VALID });
    const result = run(root, "-d", "x.d.ts");
    expect(result.status).toBe(0);
    expect(existsSync(join(root, "dart_out", "x.dart"))).toBe(true);
  });

  test("--base-path sets the root output paths are relative to", async () => {
    const root = await project({ "types/sub/a.d.ts": VALID });
    const inferred = run(root, "--destination=inferred", "types/sub/a.d.ts");
    expect(inferred.status).toBe(0);
    expect(existsSync(join(root, "inferred", "a.dart"))).toBe(true);

    const based = run(root, "--destination=based", "--base-path=types", "types/sub/a.d.ts");
    expect(based.status).toBe(0);
    expect(existsSync(join(root, "based", "sub", "a.dart"))).toBe(true);
  });

  test("an input outside --base-path is an error naming it", async () => {
    const root = await project({ "types/a.d.ts": VALID, "other/b.d.ts": VALID });
    const result = run(root, "--destination=out", "--base-path=types", "types/a.d.ts", "other/b.d.ts");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("lies outside --base-path types");
    expect(result.stderr).toContain("b.d.ts");
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("--skip-formatting is accepted and changes nothing", async () => {
    const root = await project({ "x.d.ts": VALID });
    const plain = run(root, "x.d.ts");
    const skipped = run(root, "x.d.ts", "--skip-formatting");
    expect(skipped.status).toBe(0);
    expect(skipped.stdout).toBe(plain.stdout);
  });

  test.each([
    ["--generate-html", "dart:html"],
    ["--rename-conflicting-types", "distinct Dart names"],
    ["--explicit-static", "static"],
    ["--trust-js-types", "@anonymous"],
  ])("%s exits 1 with a one-line explanation and generates nothing", async (flag, phrase) => {
    const root = await project({ "x.d.ts": VALID });
    const result = run(root, "-d", "x.d.ts", "-o", "out", flag);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    const lines = result.stderr.trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(`${flag} is not supported:`);
    expect(lines[0]).toContain(phrase);
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("an unknown flag is rejected", async () => {
    const root = await project({ "x.d.ts": VALID });
    const result = run(root, "-d", "x.d.ts", "-o", "out", "--frobnicate");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unknown argument: frobnicate");
    expect(existsSync(join(root, "out"))).toBe(false);
  });

  test("no input at all is an error", async () => {
    const root = await project({});
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("No input given");
  });
});

describe("watch mode reports like a one-shot run", () => {
  const MISSING = "export interface A { [Symbol.iterator](): Iterator<number> }\nexport declare const a: Missing;\n";

  async function until(predicate: () => boolean, what: string, timeoutMs = 25_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
      await new Promise((done) => setTimeout(done, 50));
    }
  }

  test("warnings, link failures and syntax errors appear on the first build and after edits", async () => {
    const root = await project({ "t.d.ts": MISSING });
    const oneShot = run(root, "-d", "t.d.ts", "-o", "oneshot");
    expect(oneShot.status).toBe(0);

    let stdout = "";
    let stderr = "";
    const child: ChildProcess = spawn(process.execPath, [cli, "-d", "t.d.ts", "-o", "watched", "-w"], { cwd: root });
    child.stdout!.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr!.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
    try {
      await until(() => stdout.includes("Watching"), "the initial build");
      // Every warning line the one-shot run printed is printed by the first watch build.
      for (const line of oneShot.stderr.split("\n").filter(Boolean)) expect(stderr, line).toContain(line);
      expect(stderr).toContain("Semantic analysis: 1 diagnostic(s)");
      expect(stderr).toContain("Link report: 1 broken symbol(s)");

      stderr = "";
      await writeFile(join(root, "t.d.ts"), `${MISSING}export declare const b: AlsoMissing;\n`);
      await until(() => stdout.includes("Rebuilt (t.d.ts)"), "the rebuild");
      expect(stderr).toContain("Semantic analysis: 1 diagnostic(s)");
      expect(stderr).toContain("Link report: 2 broken symbol(s)");

      stderr = "";
      await writeFile(join(root, "t.d.ts"), TRIGGER);
      await until(() => stderr.includes("TS1005"), "the syntax errors");
      expect(stderr).toMatch(/t\.d\.ts:1:\d+ TS1005 /);
      await until(() => stdout.includes("generation error(s); nothing written"), "the failed-build status");
    } finally {
      child.kill("SIGTERM");
      await new Promise((done) => child.once("exit", done));
    }
  }, 90_000);
});
