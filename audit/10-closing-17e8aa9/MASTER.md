# MASTER — Closing audit of dartify v1.0.0 candidate (`17e8aa9`)

Branch `refactor/orchestration`, 2026-11-04.
- Request, setup history and owner decisions: `00_REQUEST.md`.
- Approved plan, denominator and scope challenges: `01_PLAN.md`.
- Full records: `findings.md` / `findings.json` (29 findings, cross-registered in `audit/FINDINGS.md`).

## 1. Critical and high

There are no critical findings and one high.

### CA-01 (high, confirmed): `Date` is bound as Dart `DateTime` and fails at runtime

`types.ts:555-556` maps TypeScript `Date` to `DateTime`. package:js does not convert between a JS `Date` and a Dart `DateTime`. A dart2js probe shows both directions throwing (`fixtures/runtime-date/observed.txt`), while `dart analyze` reports nothing. This contradicts README's "Correct runtime dispatch". Leaflet, a gated library, is affected (`TileEvent.loaded?: Date`), as are 13 occurrences in 5 corpus files. No runtime probe or e2e case exercises `Date`.

## 2. Findings grouped by root cause

| Root cause | Findings | Highest |
|---|---|---|
| RC-1 Runtime binding decisions taken without a runtime probe | CA-01 (`Date`), CA-06 (ambient-module `@JS` path crashes dart2js) | high |
| RC-2 Global visibility not modelled across files | CA-02 (watch diverges from cold), CA-07 (cross-file global merging) | medium |
| RC-3 Module-export linking keyed by file-local names | CA-03 (barrel re-exports lost or renamed) | medium |
| RC-4 Member identifiers ignore Dart class-member rules | CA-04 (Object members), CA-05 (member = class name), CA-16 (implicit constructor) | medium |
| RC-14 Lossy name sanitisation used as identity | CA-25 (distinct inline types merged) | medium |
| RC-5 Console and report coverage | CA-08, CA-10, CA-13 | low |
| RC-6 Literal values from raw text | CA-09 | low |
| RC-7 Emitted text outside the central escaper | CA-11, CA-12 | low |
| RC-8 CLI input handling | CA-14, CA-15 | low |
| RC-9 Reproducible toolchain and CI pinning | CA-17, CA-18, CA-29 | low |
| RC-10 Dependency currency | CA-19 (dev criticals), CA-20 | medium |
| RC-11 Manually maintained metrics, rationale and registry | CA-21, CA-22, CA-26, CA-27 | low |
| RC-12 Test integrity and coverage of fixes | CA-23, CA-28 | low |
| RC-13 Release documentation | CA-24 | low |

## 3. Remaining findings by severity

**Medium (7):** CA-02, CA-03, CA-04, CA-06, CA-07, CA-19, CA-25.
**Low (21):** CA-05, CA-08, CA-09, CA-10, CA-11, CA-12, CA-13, CA-14, CA-15, CA-16, CA-17, CA-18, CA-20, CA-21, CA-22, CA-23, CA-24, CA-26, CA-27, CA-28, CA-29.
**Confidence:** 28 confirmed. 1 probable (CA-27, a single benchmark run on a shared container).

## 4. What was verified correct

- **Gates:** all 12 documented gates pass at `17e8aa9` (`logs/gates.txt`).
- **Node matrix:** they also pass on Node 20.19.0 and 24.22.2 (`logs/node-matrix.txt`).
- **Live CI:** run 12 for `17e8aa9` is green on all four jobs (`logs/live-ci.txt`).
- **Independent analyzer run:** CLI-generated h3, Leaflet and 420 three.js libraries analyze with 0 errors and 0 warnings on Dart 3.13.7 (`logs/independent-dart-census.txt`).
- **Newer SDKs:** the same baseline holds on Dart 3.14 beta and 3.15 dev.
- **h3 golden:** parity (63/63) survives a nullability-preserving comparison.
- **Watch:** `pnpm bench` verified 40 incremental builds byte-for-byte.
- **Registered fixes:** everything checked from the v1 window is real. Four defect classes are incomplete: P-17 → CA-03, E-32 → CA-11, W-01 → CA-02, and P-13/P-14 → CA-25. Three fixes work but have no regression test (CA-23). No regression was found in the gated corpora (`60_CLOSING.md`).

## 5. Coverage: achieved vs planned

| Planned (`01_PLAN.md`) | Achieved |
|---|---|
| `src/` 73 files / 12,606 lines, full read | **12,071 lines read line by line** (two passes). The 535-line generated `browserTypes.ts` table: header read, entries validated programmatically |
| `test/` read for assertion strength | All 40 files censused (tests, expects, snapshot-only, weak assertions). Release gates and 6 core unit-test files read in full; the rest reviewed by test name and assertion list (`30_IMPLEMENTATION.md`) |
| `tools/` | `ir.ts` read; `graph.ts`/`bench.ts` reachability; `bench.ts` executed |
| Config and CI | Read; live CI queried read-only |
| Root docs: claim extraction | 29 claims checked (`20_INTENT.md`) |
| Registry: verify v1-window fixes | Done, plus an earlier-fix regression sweep (`60_CLOSING.md`) |
| Runtime gates, bench, Node matrix | Done |
| Packaging and built-CLI run | Done |
| Adversarial fixtures | 19 fixture sets and 7 scripted reproducers under `fixtures/` |
| Security: secrets, dependencies, CI | Done: full 99-commit history scanned from a non-shallow clone (`logs/secrets-scan.txt`) |

## 6. Exclusions

Third-party `def_files` content (inputs only), `docs/history/legacy/**`, line-level review of the lockfile and snapshot files, npm publishing and merging to `main`, and live npm registry state.

## 7. Blockers encountered and how they were resolved

1. **Audit folder not ignored; local clone predated v1.** The owner chose to commit the audit, and the branch was fast-forwarded to `17e8aa9`.
2. **No plan-approval round.** Approval was obtained after the first delivery (`00_REQUEST.md` item 6).
3. **Read-only rule vs. CLAUDE.md registry contract.** The owner allowed changes anywhere under `audit/` (item 7).
4. **No Dart SDK or extra Node versions on the machine.** Dart 3.13.7 / 3.14 beta / 3.15 dev and Node 20.19.0 / 24.22.2 were downloaded to the scratchpad.
5. **The tracked `.gitignore` excludes `logs/` and `*.dart`.** Evidence files were force-added rather than changing `.gitignore`.

## 8. Follow-up checks

- **F-1** Re-run `pnpm bench` on a quiet machine before quoting latency numbers (CA-27).
- **F-2** Verify the "swap the tool, rerun the command" claim against js_facade_gen's actual CLI flags; the repo documents none, and it was not verifiable offline.
- **F-3** Time lib.dom analysis to verify R-15's 100 s → 6.5 s claim.
- **F-4** Review the snapshot files (`type-parser`, `decl-parser`, `smoke`) line by line; they were not reviewed in this audit.
- **F-6** The fixture file names `it's.d.ts`, `cost$x.d.ts` and `my lib.d.ts` (deliberate CA-11 reproducers) break naïve `git ls-files | xargs` pipelines; use `-z`/`-0` in repo tooling.
- **F-7** **Independent verification in a fresh session.** This audit read `CLAUDE.md`'s prior conclusions before starting (`00_REQUEST.md`, prior-context disclosure). A fresh session should re-run `logs/gates.txt`, the `fixtures/` reproducers and the claims table without that context.
