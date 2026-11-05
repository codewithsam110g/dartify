# 20 — Intent vs implementation (pass 2)

Documented promises (README, ROADMAP, CHANGELOG, PLAN, CLAUDE.md, code comments) checked against measured behaviour at `17e8aa9`. Evidence: **[runtime]** = executed in this audit (Node 22.23.4, Dart 3.13.7), **[static]** = read.

## Claims table

| # | Claim (source) | Result | Label | Evidence |
|---|---|---|---|---|
| 1 | h3: 0 analyzer errors/warnings (README, ROADMAP) | 0 issues | Verified correct | `pnpm test:dart`; independent CLI run + `dart analyze` (`logs/independent-dart-census.txt`) [runtime] |
| 2 | h3 golden 63/63 declarations reproduced (README) | 63/63 | Verified correct | default suite. Falsification: re-ran the comparison **keeping nullability** (the normalizer erases `?`); still 0/63 differ (`fixtures/h3-nullability-diff.ts`) [runtime] |
| 3 | Leaflet 0 errors / 0 warnings | 2 deprecation infos only | Verified correct | gate + independent run [runtime] |
| 4 | three.js, 420 libraries, 0 errors / 0 warnings (with `--js-root THREE`) | 421 files (420 + support), 37 deprecation infos | Verified correct | independent CLI run [runtime] |
| 5 | Conformance 67/90 parity, 16 improved, 2 differ, 5 out of scope | exact | Verified correct | `logs/gates.txt` [runtime] |
| 6 | dart2js runtime probe (overloads, rest args, constructors, renames, index ops, factories, promises) | passes | Verified correct | `pnpm test:dart` [runtime] |
| 7 | e2e: Dart programs match h3-js / three / leaflet | 3/3 | Verified correct | `pnpm test:e2e` [runtime] |
| 8 | Watch: incremental == cold, byte for byte (CLAUDE.md, watch.ts header, W-01) | Documented suite passes 5/5; **two out-of-suite scenarios diverge** | Incorrect (incomplete contract) | CA-02 [runtime] |
| 9 | "Correct runtime dispatch" / platform types by identity (README) | `Date` → `DateTime` throws at runtime | Incorrect | CA-01 [runtime] |
| 10 | "Barrels become libraries" (README, CHANGELOG) | `export *` and same-name `export {}` work; import-then-export, `export * as ns`, renamed exports are lost silently | Incomplete | CA-03 [runtime] |
| 11 | "Support … declaration merging, module/global augmentation" (CLAUDE.md input contract) | Same-file merging works; cross-file global merging does not | Incomplete | CA-07 [runtime] |
| 12 | Every degradation is named (README, ROADMAP) | Holds in the output: every probe's degradation produced a documented typedef | Verified correct | backend probes [runtime] |
| 13 | Never degrade silently (PLAN principle 1) | Console summary omits link failures; CLI path ignores syntax errors; barrel losses have no diagnostic | Incomplete | CA-08, CA-10, CA-03 |
| 14 | v1 acceptance sentence: zero analyzer errors for inputs js_facade_gen accepted (PLAN) | Holds for every corpus and conformance case; fails for valid inputs with Object-member names, self-named members, quote/`$` file names | Incomplete | CA-04, CA-05, CA-11 [runtime] |
| 15 | Stress 1,655/1,655, 719 empty (CLAUDE.md, README, FINDINGS) | 1,661 files, 720 empty, 0 throws/errors/markers | Incorrect (numbers stale; behaviour holds) | CA-21 [runtime] |
| 16 | S4 53/53; coverage 90.1%; bundle 252 KB | 54/54; 90.43%; 262.7 + 15.3 + 16.1 KB | Incorrect (stale numbers) | CA-21 [runtime] |
| 17 | 299 passed / 10 skipped; e2e 3/3; incremental 5/5; S2 2/2; S3 1/1; S5 3/3; Dart gate 2/2 | exact | Verified correct | `logs/gates.txt` [runtime] |
| 18 | `tsc --noEmit` 0 errors; `pnpm build` succeeds | yes | Verified correct | [runtime] |
| 19 | Process-global state removed; `context.ts`/`reset.ts` deleted (4.11) | files absent; `test/run-isolation.test.ts` passes | Verified correct | [static + runtime] |
| 20 | Instruments outside the bundle (D-07) | 0 Viz/graphology matches in `dist`; `npm pack` ships 6 files | Verified correct | [runtime] |
| 21 | Node floor `^20.19.0 \|\| ^22.12.0 \|\| >=23` (X-15) | Node 20.19.0 and 24.22.2 (downloaded to the scratchpad): `tsc` 0, 299 passed / 10 skipped, build OK, built CLI generates h3. Live CI run 12 for `17e8aa9`: Node 20.19.0, 22.12.0, 24.x and the Dart gate all success | Verified correct | `logs/node-matrix.txt`, `logs/live-ci.txt` [runtime + live] |
| 22 | Watch rebuild h3 ~35 ms, Leaflet ≤ 94 ms, three.js ~53 ms; "under 100 ms" | h3 37 ms; Leaflet leaf 132 ms / core 57 ms; three.js leaf 57 ms / core 731 ms; 40 builds verified byte-for-byte | Incorrect (partly) | CA-27, `logs/bench.txt` [runtime] |
| 23 | "Drop-in replacement: swap the tool, rerun the command" (README, ROADMAP) | Output parity is demonstrated (h3 golden, conformance). The command is not: js_facade_gen's documented invocations (archived README) fail with exit 1, and its five behaviour flags are silently ignored | Incorrect (CLI level) | CA-30 [runtime + reference docs] |
| 24 | Private members (`JS$_x` style) | Emitted, as js_facade_gen §2.13/§2.14 do | Verified correct (parity) | falsified suspicion [runtime] |
| 25 | Registry: "never renumber or delete an ID" (CLAUDE.md) | `X-16` used twice | Incorrect | CA-22 [static] |
| 26 | `browserTypes.ts` is generated; "regenerate and re-validate rather than hand-edit" (CLAUDE.md) | No generator or validator is committed; the table is internally consistent (500 entries, no duplicates) | Incorrect | CA-29 [static + runtime] |
| 27 | e2e oracle "computed by `expected.cjs`, never depends on dartify" | True today (all three reproduce `main.expected`), but the suite never runs `expected.cjs` | Incomplete | CA-28 [runtime] |
| 28 | `thisType.ts`: generic arguments dropped "because type parameters are not emitted yet (E-03)" | E-03 is fixed; the rationale is stale and a test locks the old behaviour | Incorrect | CA-26 [runtime] |
| 29 | Every CI run is green for the shipped work | Run 12 (`17e8aa9`) success; runs 4–11 (earlier v1 commits) failed, consistent with the X-16 (bis) gitignore defect fixed at `17e8aa9` | Verified for the audited commit | `logs/live-ci.txt` [live] |

## Data handling

The tool reads the given `.d.ts` files and their transitive imports, and writes `.dart` files under `-o` (default `./dart_out`). Output-path containment holds: `deriveOutputPath` strips leading `..` segments, and `path.relative` cannot yield interior `..`. Collisions raise `OUTPUT_PATH_COLLISION` instead of overwriting [static, reasoning]. Nothing is sent over the network.

## Documentation that is incorrect

The numbers in CA-21 and the registry problems in CA-22. `test/stress.test.ts:6` still says "1,654-file corpus". The `transpiler.ts:530-538` docblock for `resolveAndCategorize` sits on `pruneUnreachable` (cosmetic, not registered).

## Third pass (after the second stop-hook review)

| # | Claim | Result | Label | Evidence |
|---|---|---|---|---|
| 30 | R-15: lib.dom analysis 100 s → 6.5 s | `analyze()` 2.0 s, `render()` 4.1 s on `def_files/lib.dom/lib.dom.d.ts` (29,610 lines, 2,010 symbols) | Verified correct | `logs/r15-libdom.txt` [runtime] |
| 31 | Snapshot goldens describe correct output | Smoke Dart (h3, Leaflet, probe) re-analyzed: 0 errors/warnings. IR snapshots consistent with the parsers. One locked behaviour is a silent loss (CA-31); one test is misnamed (CA-23) | Verified, with exceptions | `30_IMPLEMENTATION.md` [runtime + static] |
| 32 | js_facade_gen §3.8 callable interfaces (`call` method) dispatch correctly | dart2js probe: `counter.call(5)` and `counter(7)` match JavaScript | Verified correct (suspicion falsified) | `fixtures/runtime-callable/` [runtime] |
