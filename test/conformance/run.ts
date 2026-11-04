import { readFileSync } from "fs";
import { resolve } from "path";
import { Transpiler } from "../../src/transpiler";
import { ConformanceCase, loadConformanceCases } from "./cases";
import { normalizeDart } from "./normalize";

export type LedgerStatus = "parity" | "improved" | "differs" | "outOfScope";

export interface LedgerEntry {
  status: LedgerStatus;
  /** Declarations the snippet references but does not declare. */
  prelude?: string;
  note?: string;
}

export interface CaseResult {
  case: ConformanceCase;
  entry: LedgerEntry;
  dart: string;
  /** Whether every reference declaration normalizes identically. */
  parity: boolean;
  mismatches: { name: string; expected: string[]; actual: string[] }[];
}

export function loadLedger(): Record<string, LedgerEntry> {
  return JSON.parse(readFileSync(resolve("test/conformance/ledger.json"), "utf8")).cases;
}

/**
 * Runs one reference case as a `.d.ts` input (dartify's input contract) with
 * its optional prelude, then compares normalized declarations. Only names
 * the reference output declares are compared; dartify's type-definitions
 * section and prelude declarations are extra.
 */
export async function runCase(
  conformanceCase: ConformanceCase,
  entry: LedgerEntry,
): Promise<CaseResult> {
  const source = `${entry.prelude ? `${entry.prelude}\n` : ""}${conformanceCase.typescript}`;
  const result = await Transpiler.transpileFromString(source, {
    fileName: `/case_${conformanceCase.id.replace(/[^0-9a-z]+/gi, "_")}.d.ts`,
  });
  const expected = normalizeDart(conformanceCase.dart ?? "");
  const actual = normalizeDart(result.content);
  const mismatches: CaseResult["mismatches"] = [];
  for (const [name, lines] of expected) {
    const got = actual.get(name) ?? [];
    if (JSON.stringify(got) !== JSON.stringify(lines)) {
      mismatches.push({ name, expected: lines, actual: got });
    }
  }
  const emptyExpected = expected.size === 0;
  const parity = emptyExpected
    ? [...actual.keys()].every((name) => !conformanceCase.typescript.includes(name))
    : mismatches.length === 0;
  return { case: conformanceCase, entry, dart: result.content, parity, mismatches };
}

export async function runAllCases(): Promise<CaseResult[]> {
  const ledger = loadLedger();
  const results: CaseResult[] = [];
  for (const conformanceCase of loadConformanceCases()) {
    // Cases the ledger does not list must be at parity.
    const entry = ledger[conformanceCase.id] ?? { status: "parity" };
    results.push(await runCase(conformanceCase, entry));
  }
  return results;
}
