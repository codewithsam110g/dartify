# MASTER — Closing audit of dartify v1.0.0 candidate (`17e8aa9`)

Branch `refactor/orchestration`, 2026-11-04. Request and setup history: `00_REQUEST.md`. Plan and denominator: `01_PLAN.md`. Full finding records: `findings.md` / `findings.json`.

## 1. Critical and high

There are no critical findings and one high.

### CA-01 (high, confirmed): `Date` is bound as Dart `DateTime` and fails at runtime

`types.ts:555-556` maps TypeScript `Date` to `DateTime`. package:js does not convert between a JS `Date` and a Dart `DateTime`. A dart2js probe shows both directions throwing (`fixtures/runtime-date/observed.txt`), while `dart analyze` reports nothing. This contradicts README's "Correct runtime dispatch". Leaflet, a gated library, is affected (`TileEvent.loaded?: Date`), and the corpus has 13 occurrences in 5 files. No runtime probe or e2e case exercises `Date`.

## 2. Findings grouped by root cause

| Root cause | Findings | Highest |
|---|---|---|
| RC-1 Runtime binding decisions taken without a runtime probe | CA-01, CA-06 | high |
| RC-2 Global visibility is not modelled across files | CA-02 (watch divergence), CA-07 (cross-file global merging) | medium |
| RC-3 Module-export linking keyed by file-local names | CA-03 (barrel re-exports lost or renamed) | medium |
| RC-4 Member identifiers ignore Dart class-member rules | CA-04 (Object members), CA-05 (member = class name), CA-16 (implicit constructor) | medium |
| RC-5 Console and report coverage | CA-08 (link failures not printed), CA-10 (syntax errors ignored on CLI path), CA-13 (cycle memoisation) | low |
| RC-6 Literal values parsed from raw text (with open T-11) | CA-09 | low |
| RC-7 Emitted text outside the central escaper | CA-11 (URIs), CA-12 (control tokens) | low |
| RC-8 CLI input handling | CA-14 (`.d.mts`/`.d.cts`), CA-15 (watch root) | low |
| RC-9 CI pinning | CA-17 (Dart `stable` vs exact baseline), CA-18 (action tags, permissions) | low |
| RC-10 Dependency currency | CA-19 (dev criticals), CA-20 (prod glob ReDoS) | medium |
| RC-11 Manually maintained metrics and registry | CA-21 (stale numbers), CA-22 (`X-16` reused) | low |
| RC-12 Regression tests for registered fixes | CA-23 | low |
| RC-13 Release documentation | CA-24 (no 0.5.0 → 1.0.0 breaking-change or rollback notes) | low |

## 3. Remaining findings by severity

**Medium (6):** CA-02, CA-03, CA-04, CA-06, CA-07, CA-19.
**Low (17):** CA-05, CA-08, CA-09, CA-10, CA-11, CA-12, CA-13, CA-14, CA-15, CA-16, CA-17, CA-18, CA-20, CA-21, CA-22, CA-23, CA-24.

## 4. What was verified correct

All 12 documented gates pass at `17e8aa9` (`logs/gates.txt`). They were reproduced independently outside the test harness: CLI-generated h3, Leaflet and 420 three.js libraries analyze with 0 errors and 0 warnings under Dart 3.13.7 (`logs/independent-dart-census.txt`).

The h3 golden parity (63/63) survives a stricter, nullability-preserving comparison. Of the registered v1-window fixes, everything checked is real. Three fixes are incomplete for their defect class (P-17 → CA-03, E-32 → CA-11, W-01 → CA-02), and three work but have no regression test (CA-23). No regression of an earlier fix was found (`60_CLOSING.md`).

## 5. Coverage: achieved vs planned

| Planned (`01_PLAN.md`) | Achieved |
|---|---|
| `src/` 73 files / 12,606 lines, full read | ≈10,100 lines (≈80%) read line by line. Remaining ≈2,500 lines (20 parser files, `src/ir/*`, `semantic/{shape,types}.ts`, `browserTypes.ts` data, half of `reporting/linker.ts`) **gate-only** (`30_IMPLEMENTATION.md`) |
| `test/` read for assertion strength | Partial: release gates (dart, conformance, h3 golden, stress, watch-differential) read. Unit tests not reviewed individually |
| `tools/` full read | `ir.ts` full; `graph.ts`/`bench.ts` reachability only |
| Config and CI full read | Done |
| Root docs: claim extraction | Done (25 claims, `20_INTENT.md`) |
| Registry: verify v1-window fixes | Done (`60_CLOSING.md`) |
| Runtime: all gates | Done; `pnpm bench` not run |
| Packaging and built-CLI run | Done |
| Adversarial fixtures | 14 fixture sets under `fixtures/` |
| Security: secrets, dependencies, CI | Done (`def_files` history excluded from the history scan for size) |

## 6. Exclusions

Third-party `def_files` content (used as inputs only), `docs/history/legacy/**`, line-level review of the lockfile and snapshots, npm publishing and merging to `main`, and live npm registry state.

## 7. Blockers encountered

1. **Stale checkout and ignore rule.** The audit folder was not gitignored and the local clone predated v1. The owner chose to commit the audit instead of ignoring it, and the branch was fast-forwarded to `17e8aa9` (`00_REQUEST.md`).
2. **No plan-approval round.** The `/goal` directive forbids pausing (`00_REQUEST.md` §4).
3. **No Dart SDK on the machine.** Resolved by downloading Dart 3.13.7 into the session scratchpad (not the repo).
4. **Only Node 22 available.** The Node 20.19 and 24 claims are unverified locally.

## 8. Follow-up checks

- **F-1** Run `pnpm bench` to verify the watch-latency claims (h3 ~35 ms, Leaflet ≤ 94 ms, three.js ~53 ms).
- **F-2** Confirm the CI matrix (Node 20.19.0, 22.12.0, 24.x) is green for `17e8aa9` on GitHub; not inspected here.
- **F-3** Verify the "swap the tool, rerun the command" claim against js_facade_gen's actual CLI flags; the repo documents none.
- **F-4** Execute dart2js probes for CA-06 (ambient-module `@JS` path) and CA-16 (implicit constructor) to upgrade them from probable to confirmed.
- **F-5** Time lib.dom analysis to verify R-15.
- **F-6** Read the ≈2,500 gate-only `src/` lines and the unit tests line by line.
- **F-7** Owner action: register CA-01…CA-24 in `audit/FINDINGS.md` (this audit kept tracked files read-only), resolving the `X-16` ID clash first.
- **F-8** **Independent verification in a fresh session.** This audit read `CLAUDE.md`'s prior conclusions before starting (`00_REQUEST.md`, prior-context disclosure). A fresh session should re-run `logs/gates.txt`, the `fixtures/` reproducers and the claims table without that context.
