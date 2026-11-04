import { describe, expect, test } from "vitest";
import { loadConformanceCases } from "./cases";
import { CaseResult, loadLedger, runAllCases } from "./run";

/**
 * S6.1/S6.3: the js_facade_gen reference cases, executable (`X-04`).
 *
 * Each case runs as a `.d.ts` snippet and is compared after normalization
 * (`normalize.ts`). `ledger.json` records the expected status of every case;
 * this test fails when a parity case regresses *or* when a non-parity case
 * starts matching, so the headline number can only change deliberately.
 */
describe("js_facade_gen conformance", () => {
  let results: CaseResult[] = [];

  test("every reference case has its ledger status", async () => {
    results = await runAllCases();
    const ledger = loadLedger();
    const ids = new Set(loadConformanceCases().map((item) => item.id));
    for (const id of Object.keys(ledger)) expect(ids.has(id), `stale ledger id ${id}`).toBe(true);

    // Out-of-scope cases have nothing comparable, so their computed parity is
    // vacuous and not checked.
    const wrong = results
      .filter((result) => result.entry.status !== "outOfScope")
      .filter((result) =>
        result.entry.status === "parity" ? !result.parity : result.parity,
      )
      .map((result) => ({
        id: result.case.id,
        ledger: result.entry.status,
        computedParity: result.parity,
        mismatches: result.mismatches,
      }));
    expect(wrong).toEqual([]);

    const count = (status: string) =>
      results.filter((result) => result.entry.status === status).length;
    console.log(
      `js_facade_gen conformance: ${count("parity")}/${results.length} parity, ` +
        `${count("improved")} improved, ${count("differs")} differ, ` +
        `${count("outOfScope")} out of scope`,
    );
  }, 300_000);

  test("no case produces generation or emission errors", () => {
    for (const result of results) {
      expect(result.dart, result.case.id).not.toContain("// ERROR emitting");
    }
  });
});
