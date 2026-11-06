import { chmod, mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { afterEach, describe, expect, test } from "vitest";
import { collectInputs } from "../src/cliInputs";
import {
  CliUsageError,
  ParsedArgs,
  resolveCliOptions,
  UNSUPPORTED_FLAGS,
} from "../src/cliOptions";

/**
 * Input rules (HD-04): every explicit input is a readable declaration file or a
 * named error; `.d.mts` / `.d.cts` are declaration files; dual-package
 * siblings collapse to the `.d.ts`.
 */

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function files(names: string[], directories: string[] = []): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "dartify-inputs-"));
  roots.push(root);
  for (const directory of directories) await mkdir(join(root, directory), { recursive: true });
  for (const name of names) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), "export declare const x: number;\n");
  }
  return root;
}

const names = (root: string, selection: { files: string[] }) =>
  selection.files.map((file) => file.slice(root.length + 1)).sort();

describe("explicit inputs", () => {
  test("a missing file beside a valid one is an error naming it", async () => {
    const root = await files(["valid.d.ts"]);
    const selection = await collectInputs(["valid.d.ts", "missing.d.ts"], root);
    expect(selection.errors).toEqual(["Input not found: missing.d.ts"]);
  });

  test("a directory named like a declaration file is an error", async () => {
    const root = await files(["valid.d.ts"], ["folder.d.ts"]);
    const selection = await collectInputs(["valid.d.ts", "folder.d.ts"], root);
    expect(selection.errors).toEqual(["Input is a directory, not a declaration file: folder.d.ts"]);
  });

  test.each(["foo.ts", "foo.js", "foo.json", "foo.d.tsx"])("%s is not a declaration file", async (name) => {
    const root = await files([name]);
    const selection = await collectInputs([name], root);
    expect(selection.errors).toEqual([
      `Input is not a declaration file (expected .d.ts, .d.mts or .d.cts): ${name}`,
    ]);
    expect(selection.files).toEqual([]);
  });

  test("every bad input is reported, in the order given", async () => {
    const root = await files(["a.ts", "ok.d.ts"]);
    const selection = await collectInputs(["gone.d.ts", "ok.d.ts", "a.ts"], root);
    expect(selection.errors).toEqual([
      "Input not found: gone.d.ts",
      "Input is not a declaration file (expected .d.ts, .d.mts or .d.cts): a.ts",
    ]);
  });

  test.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "an unreadable file is an error naming it",
    async () => {
      const root = await files(["secret.d.ts", "valid.d.ts"]);
      await chmod(join(root, "secret.d.ts"), 0o000);
      const selection = await collectInputs(["valid.d.ts", "secret.d.ts"], root);
      expect(selection.errors).toEqual(["Input is not readable: secret.d.ts"]);
    },
  );

  test("an explicit path inside node_modules is accepted, as before", async () => {
    const root = await files(["node_modules/@types/x/index.d.ts"]);
    const selection = await collectInputs(["node_modules/@types/x/index.d.ts"], root);
    expect(selection.errors).toEqual([]);
    expect(names(root, selection)).toEqual(["node_modules/@types/x/index.d.ts"]);
  });
});

describe("glob inputs", () => {
  test("a pattern that matches nothing warns, naming the pattern, and the run continues", async () => {
    const root = await files(["valid.d.ts"]);
    const selection = await collectInputs(["valid.d.ts", "nothing/**/*.d.ts"], root);
    expect(selection.errors).toEqual([]);
    expect(selection.warnings).toEqual([
      "Pattern matched no declaration files (.d.ts, .d.mts or .d.cts): nothing/**/*.d.ts",
    ]);
    expect(names(root, selection)).toEqual(["valid.d.ts"]);
  });

  test("a pattern that matches only other files warns too", async () => {
    const root = await files(["a.ts", "b.js"]);
    const selection = await collectInputs(["*.*s"], root);
    expect(selection.warnings).toHaveLength(1);
    expect(selection.files).toEqual([]);
  });

  test("a negated pattern still excludes files, and node_modules is skipped", async () => {
    const root = await files(["a.d.ts", "skip.d.ts", "node_modules/p/index.d.ts"]);
    const selection = await collectInputs(["**/*.d.ts", "!skip.d.ts"], root);
    expect(selection.warnings).toEqual([]);
    expect(names(root, selection)).toEqual(["a.d.ts"]);
  });
});

describe(".d.mts and .d.cts inputs", () => {
  test("are accepted from explicit paths", async () => {
    const root = await files(["m.d.mts", "c.d.cts"]);
    const selection = await collectInputs(["m.d.mts", "c.d.cts"], root);
    expect(selection.errors).toEqual([]);
    expect(names(root, selection)).toEqual(["c.d.cts", "m.d.mts"]);
  });

  test("are accepted from globs, alongside .d.ts files", async () => {
    const root = await files(["a.d.ts", "m.d.mts", "c.d.cts"]);
    const selection = await collectInputs(["*.d.{ts,mts,cts}"], root);
    expect(selection.errors).toEqual([]);
    expect(selection.notices).toEqual([]);
    expect(names(root, selection)).toEqual(["a.d.ts", "c.d.cts", "m.d.mts"]);
  });

  test("dual-package typings: a glob-matched .d.mts / .d.cts yields to its .d.ts sibling, with a notice", async () => {
    const root = await files(["lib/x.d.ts", "lib/x.d.mts", "lib/x.d.cts", "lib/y.d.mts"]);
    const selection = await collectInputs(["lib/*.d.{ts,mts,cts}"], root);
    expect(selection.errors).toEqual([]);
    expect(names(root, selection)).toEqual(["lib/x.d.ts", "lib/y.d.mts"]);
    expect(selection.notices.sort()).toEqual([
      "Skipping lib/x.d.cts: lib/x.d.ts describes the same API",
      "Skipping lib/x.d.mts: lib/x.d.ts describes the same API",
    ]);
  });

  test("the sibling rule also applies when the .d.ts is an explicit input", async () => {
    const root = await files(["x.d.ts", "x.d.mts"]);
    const selection = await collectInputs(["x.d.ts", "*.d.mts"], root);
    expect(selection.errors).toEqual([]);
    expect(names(root, selection)).toEqual(["x.d.ts"]);
    expect(selection.notices).toEqual(["Skipping x.d.mts: x.d.ts describes the same API"]);
  });

  test("an explicit .d.mts is never skipped: with its .d.ts it is an output collision", async () => {
    const root = await files(["x.d.ts", "x.d.mts"]);
    for (const inputs of [["x.d.ts", "x.d.mts"], ["x.d.mts", "*.d.ts"]]) {
      const selection = await collectInputs(inputs, root);
      expect(selection.errors, inputs.join(" ")).toEqual([
        "Inputs x.d.mts and x.d.ts would all be written to x.dart; pass only one of them",
      ]);
    }
  });

  test("a .d.mts and a .d.cts with no .d.ts both map to one .dart: an error naming both", async () => {
    const root = await files(["x.d.mts", "x.d.cts"]);
    const selection = await collectInputs(["*.d.{mts,cts}"], root);
    expect(selection.errors).toEqual([
      "Inputs x.d.cts and x.d.mts would all be written to x.dart; pass only one of them",
    ]);
  });

  test("the same stem in different directories is not a collision", async () => {
    const root = await files(["a/x.d.mts", "b/x.d.cts"]);
    const selection = await collectInputs(["a/x.d.mts", "b/x.d.cts"], root);
    expect(selection.errors).toEqual([]);
    expect(selection.files).toHaveLength(2);
  });
});

describe("invocation shapes (HD-14)", () => {
  const base = { enableLogs: false, verbose: false, dryRun: false, watch: false };

  test("positional inputs are -d inputs; -d values come first", () => {
    const options = resolveCliOptions({ ...base, defFiles: ["a.d.ts"], inputs: ["b.d.ts", "c/*.d.ts"], output: "out" });
    expect(options.inputs).toEqual(["a.d.ts", "b.d.ts", "c/*.d.ts"]);
    expect(options.toStdout).toBe(false);
  });

  test("positional inputs without an output directory select stdout", () => {
    expect(resolveCliOptions({ ...base, inputs: ["a.d.ts"] }).toStdout).toBe(true);
  });

  test("-d without positional inputs keeps writing to the default directory", () => {
    const options = resolveCliOptions({ ...base, defFiles: ["a.d.ts"] });
    expect(options.toStdout).toBe(false);
    expect(options.output).toBeUndefined();
  });

  test("--base-path and the destination are carried through", () => {
    const options = resolveCliOptions({ ...base, inputs: ["types/a.d.ts"], output: "out", basePath: "types" });
    expect(options).toMatchObject({ output: "out", basePath: "types", toStdout: false });
  });

  test("--skip-formatting is accepted and changes nothing", () => {
    expect(resolveCliOptions({ ...base, inputs: ["a.d.ts"], output: "o", skipFormatting: true })).toEqual(
      resolveCliOptions({ ...base, inputs: ["a.d.ts"], output: "o" }),
    );
  });

  test.each(Object.entries(UNSUPPORTED_FLAGS))("%s is refused with a one-line explanation", (key, { flag }) => {
    let error: unknown;
    try {
      resolveCliOptions({ ...base, inputs: ["a.d.ts"], output: "o", [key]: true });
    } catch (thrown) {
      error = thrown;
    }
    expect(error).toBeInstanceOf(CliUsageError);
    const { messages } = error as CliUsageError;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(new RegExp(`^${flag} is not supported: dartify `));
    expect(messages[0]).not.toContain("\n");
  });

  test("several refused flags are all named", () => {
    expect(() => resolveCliOptions({ ...base, inputs: ["a.d.ts"], generateHtml: true, trustJsTypes: true })).toThrowError(
      /--generate-html[\s\S]*--trust-js-types/,
    );
  });

  test("at least one input is required", () => {
    expect(() => resolveCliOptions(base)).toThrowError(/No input given/);
    expect(() => resolveCliOptions({ ...base, defFiles: [], inputs: [] })).toThrowError(/No input given/);
  });

  test("watch cannot print to stdout, and a repeated destination is ambiguous", () => {
    expect(() => resolveCliOptions({ ...base, inputs: ["a.d.ts"], watch: true })).toThrowError(/--watch writes files/);
    expect(() => resolveCliOptions({ ...base, inputs: ["a.d.ts"], watch: true, output: "out" })).not.toThrow();
    expect(() => resolveCliOptions({ ...base, defFiles: ["a.d.ts"], watch: true })).not.toThrow();
    expect(() => resolveCliOptions({ ...base, inputs: ["a.d.ts"], output: ["a", "b"] })).toThrowError(/more than once/);
  });
});
