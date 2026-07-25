/**
 * Tier 2 — smoke.
 *
 * A handful of representative libraries, snapshotted byte-exact. Replaces the
 * previous suite, which snapshotted all 1,648 files in `def_files/` (X-02):
 * 4.3 MB of snapshots that no human could review, where one `emitType` change
 * rewrote every file and a fix was indistinguishable from a regression.
 *
 * The point of this tier is a *reviewable diff*. Keep the list short. If you
 * find yourself adding a library because it exercises one construct, add that
 * construct to `def_files/synthetic/probe.d.ts` instead.
 */

import { Transpiler } from "../src/transpiler";
import { expect, test, describe } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const defFilesDir = join(process.cwd(), "def_files");

/** Small, clean, and each one earns its place. */
const SMOKE_FILES = [
  // Every known-broken construct in one file — see the header comment there.
  "synthetic/probe.d.ts",
  // Small, clean, modern. The demo candidate.
  "h3/h3.d.ts",
  // Namespaces and dotted qualified names — exercises L-02.
  "leaflet/leaflet.d.ts",
] as const;

describe("smoke", () => {
  for (const relPath of SMOKE_FILES) {
    test(`transpiles ${relPath}`, async () => {
      const source = readFileSync(join(defFilesDir, relPath), "utf-8");

      const result = await Transpiler.transpileFromString(source, {
        fileName: relPath,
        debug: false,
      });

      expect(result.content).toMatchSnapshot();
    });
  }
});
