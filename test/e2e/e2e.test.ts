/**
 * End-to-end gate: generated bindings used by real Dart programs against the
 * real JavaScript libraries. Opt-in (needs a Dart SDK and pub.dev):
 *
 *   pnpm test:e2e
 *
 * For each library: generate its bindings with dartify, compile
 * `test/e2e/<lib>/main.dart` with dart2js, run it under Node after
 * `setup.cjs` installs the library the way a browser page would (a global),
 * and compare stdout with `main.expected` — which `expected.cjs` computes by
 * calling the same JavaScript API directly, so the oracle never depends on
 * dartify.
 */
import { execFileSync } from "child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Transpiler } from "../../src/transpiler";

const ENABLED = process.env.DARTIFY_E2E === "1";

const LIBRARIES: Record<string, { files: string[]; jsRoot?: string }> = {
  h3: { files: ["def_files/h3/h3.d.ts"] },
  // three's typings are ES modules without `export as namespace`; its classic
  // build is the global `THREE`.
  three: { files: ["def_files/three/src/Three.Core.d.ts"], jsRoot: "THREE" },
  leaflet: { files: ["def_files/leaflet/leaflet.d.ts", "def_files/leaflet/geojson.d.ts"] },
};

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

describe.skipIf(!ENABLED)("end to end against the real libraries", () => {
  let root = "";

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), "dartify-e2e-"));
    writeFileSync(
      join(root, "pubspec.yaml"),
      'name: e2e\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  js: ^0.6.7\n',
    );
    run("dart", ["pub", "get"], root);
    for (const [name, library] of Object.entries(LIBRARIES)) {
      await new Transpiler({
        files: library.files.map((file) => resolve(file)),
        outDir: join(root, "lib", name),
        ...(library.jsRoot ? { jsRoot: library.jsRoot } : {}),
      }).transpile();
    }
  }, 600_000);

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  for (const name of Object.keys(LIBRARIES)) {
    test(`${name}: dart2js program output equals the library's own answers`, () => {
      const dir = join(root, "e2e", name);
      mkdirSync(dir, { recursive: true });
      copyFileSync(resolve(`test/e2e/${name}/main.dart`), join(dir, "main.dart"));
      run("dart", ["compile", "js", "-O1", "-o", join(dir, "out.js"), join(dir, "main.dart")], root);
      // dart2js output reads `self`; Node scripts resolve packages from the repo.
      writeFileSync(
        join(dir, "run.cjs"),
        [
          "globalThis.self = globalThis;",
          `require(${JSON.stringify(resolve(`test/e2e/${name}/setup.cjs`))});`,
          `require(${JSON.stringify(join(dir, "out.js"))});`,
        ].join("\n"),
      );
      const stdout = run("node", [join(dir, "run.cjs")], resolve("."));
      expect(stdout).toBe(readFileSync(resolve(`test/e2e/${name}/main.expected`), "utf8"));
    }, 300_000);
  }
});
