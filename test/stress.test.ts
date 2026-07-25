/**
 * Tier 3 — stress. Opt-in:
 *
 *   DARTIFY_STRESS=1 pnpm test:run test/stress.test.ts
 *
 * Runs the entire 1,648-file `def_files/` corpus and asserts only that nothing
 * *crashes*. Deliberately snapshot-free: byte-exact output over a corpus this
 * size is unreviewable (X-02), but "the tool survived every file in
 * DefinitelyTyped" is a real and cheap signal, and it is the thing most likely
 * to catch a parser change that throws on some construct nobody thought about.
 *
 * Skipped by default so the normal suite stays fast.
 */

import { Transpiler } from "../src/transpiler";
import { expect, test, describe } from "vitest";
import { readFileSync } from "fs";
import { join, basename } from "path";
import fg from "fast-glob";

const ENABLED = process.env.DARTIFY_STRESS === "1";

const defFilesDir = join(process.cwd(), "def_files");
const defFiles = ENABLED
  ? fg.sync("**/*.d.ts", { cwd: defFilesDir }).sort()
  : [];

describe.skipIf(!ENABLED)("stress: full def_files corpus", () => {
  const failures: { file: string; error: string }[] = [];
  const emptyOutputs: string[] = [];

  test("every file transpiles without throwing", async () => {
    for (const relPath of defFiles) {
      const source = readFileSync(join(defFilesDir, relPath), "utf-8");

      try {
        const result = await Transpiler.transpileFromString(source, {
          fileName: basename(relPath),
          debug: false,
        });

        // An empty render for a non-trivial input means every declaration was
        // dropped — not a crash, but worth surfacing.
        if (result.content.trim() === "" && source.trim() !== "") {
          emptyOutputs.push(relPath);
        }
      } catch (error) {
        failures.push({
          file: relPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (failures.length > 0) {
      console.error(`\n❌ ${failures.length} file(s) threw:`);
      for (const { file, error } of failures.slice(0, 25)) {
        console.error(`  ${file}: ${error}`);
      }
      if (failures.length > 25) {
        console.error(`  … and ${failures.length - 25} more`);
      }
    }

    if (emptyOutputs.length > 0) {
      console.warn(
        `\n⚠️  ${emptyOutputs.length}/${defFiles.length} file(s) rendered empty`,
      );
    }

    expect(failures).toEqual([]);
  }, 600_000);
});
