/**
 * Executable Dart acceptance gate (task 4.15, `X-14`, S6.2). Opt-in:
 *
 *   pnpm test:dart        # needs a Dart SDK on PATH and pub.dev access
 *
 * 1. Generates every fixture set into one temporary Dart package and runs
 *    `dart analyze --format=machine`. Diagnostics are categorized per set as
 *    `SEVERITY CODE` and compared exactly with `baseline.json`: a new
 *    category, a changed count, or a missing expected category all fail.
 * 2. Compiles the runtime probe with dart2js and runs it under Node against a
 *    JavaScript implementation, because analyzer-clean output is not evidence
 *    of correct JavaScript dispatch (overloads, rest arguments, constructors,
 *    index operators, anonymous factories, promises).
 *
 * Kept out of the default suite so contributors without a Dart SDK can run
 * `pnpm test`.
 */
import { execFileSync } from "child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve, sep } from "path";
import fg from "fast-glob";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Transpiler } from "../../src/transpiler";
import { runAllCases } from "../conformance/run";

const ENABLED = process.env.DARTIFY_DART === "1";

export const FIXTURE_SETS: Record<string, string[]> = {
  h3: ["def_files/h3/h3.d.ts"],
  leaflet: ["def_files/leaflet/leaflet.d.ts", "def_files/leaflet/geojson.d.ts"],
  s5: fg.sync("def_files/synthetic/s5_emitter/*.d.ts").sort(),
  synthetic: ["def_files/synthetic/probe.d.ts", "def_files/synthetic/s3-complete.d.ts"],
  legacy: fg.sync("def_files/legacy_tests/*.d.ts").sort(),
  three: ["def_files/three/src/Three.Core.d.ts"],
  runtime: ["def_files/synthetic/runtime/probe.d.ts"],
};

type Census = Record<string, Record<string, number>>;

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

describe.skipIf(!ENABLED)("Dart acceptance gate", () => {
  let root = "";

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "dartify-dart-"));
    writeFileSync(
      join(root, "pubspec.yaml"),
      'name: dc\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  js: ^0.6.7\n',
    );
    run("dart", ["pub", "get"], root);
    for (const [set, files] of Object.entries(FIXTURE_SETS)) {
      await new Transpiler({
        files: files.map((file) => resolve(file)),
        outDir: join(root, "lib", set),
        // three's typings are ES modules; its browser global is THREE.
        ...(set === "three" ? { jsRoot: "THREE" } : {}),
      }).transpile();
    }
    // Every js_facade_gen reference case must also analyze (S6.1).
    mkdirSync(join(root, "lib", "conformance"), { recursive: true });
    for (const result of await runAllCases()) {
      const name = `case_${result.case.id.replace(/[^0-9a-z]+/gi, "_")}.dart`;
      writeFileSync(join(root, "lib", "conformance", name), result.dart);
    }
  }, 600_000);

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  test("generated libraries match the categorized analyzer baseline", () => {
    let output = "";
    try {
      output = run("dart", ["analyze", "--format=machine", "lib"], root);
    } catch (error) {
      // `dart analyze` exits nonzero when it reports anything; the machine
      // output is still on stdout/stderr.
      const failure = error as { stdout?: string; stderr?: string };
      output = `${failure.stdout ?? ""}\n${failure.stderr ?? ""}`;
    }
    const census: Census = Object.fromEntries(
      [...Object.keys(FIXTURE_SETS), "conformance"].map((set) => [set, {}]),
    );
    for (const line of output.split("\n")) {
      const fields = line.split("|");
      if (fields.length < 8) continue;
      const [severity, , code, file] = fields;
      const relative = file.split(`${sep}lib${sep}`)[1] ?? file;
      const set = relative.split(sep)[0];
      const key = `${severity} ${code}`;
      census[set] ??= {};
      census[set][key] = (census[set][key] ?? 0) + 1;
    }
    const baseline = JSON.parse(readFileSync(resolve("test/dart/baseline.json"), "utf8")) as {
      sets: Census;
    };
    expect(census).toEqual(baseline.sets);
  }, 600_000);

  test("dart2js output dispatches correctly at runtime", () => {
    mkdirSync(join(root, "web"), { recursive: true });
    copyFileSync(resolve("def_files/synthetic/runtime/main.dart"), join(root, "web", "main.dart"));
    copyFileSync(resolve("def_files/synthetic/runtime/probe.js"), join(root, "probe.js"));
    run("dart", ["compile", "js", "-o", "out.js", "web/main.dart"], root);
    writeFileSync(join(root, "run.cjs"), 'require("./probe.js");\nrequire("./out.js");\n');
    const stdout = run("node", ["run.cjs"], root);
    expect(stdout).toBe(readFileSync(resolve("def_files/synthetic/runtime/main.expected"), "utf8"));
  }, 600_000);
});
