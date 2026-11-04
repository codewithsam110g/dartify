# 30 — Implementation (pass 3)

Correctness, edge cases, error handling, silent failures, concurrency, resource limits and test meaningfulness at `17e8aa9`.

## Coverage table

"Full" means read line by line. The first delivery left ≈2,500 lines gate-only; after the plan was approved, they were read (second pass), so all of `src/` is now covered.

| Area | Files | Lines | Read | Method |
|---|---|---:|---|---|
| `src/cli.ts` | 1 | 285 | Full | read + CLI probes (exit codes, `.d.mts`, bracket paths, unwritable `-o`, syntax error, real `-w` watcher) |
| `src/transpiler.ts` | 1 | 837 | Full | read + gates |
| `src/watch.ts` | 1 | 597 | Full | read + differential probes (CA-02), `pnpm bench` |
| `src/engine/phase/*` | 3 | 1,234 | Full | read + gates |
| `src/engine/emitter/backend.ts` | 1 | 76 | Full | read |
| `src/engine/emitter/packagejs/` (excl. data) | 7 | 3,270 | Full | read + analyzer and dart2js probes |
| `src/engine/emitter/packagejs/browserTypes.ts` | 1 | 535 | Header and structure read; entries validated programmatically (500, no cross-library duplicates) | generated data; generator missing (CA-29) |
| `src/engine/semantic/*` | 6 | 1,637 | Full | read + probes |
| `src/engine/alias/*` | 3 | 450 | Full | read |
| `src/symbol/*` | 6 | 640 | Full | read + cycle probe (CA-13) |
| `src/resolution/*` | 3 | 157 | Full | read |
| `src/reporting/linker.ts` | 1 | 144 | Full | read |
| `src/engine/parser/**` | 26 | 2,165 | Full (second pass covered the remaining 20 files) | read + bigint, anonymous-collision and `this` probes (CA-09, CA-25, CA-26) |
| `src/ir/*` | 13 | 579 | Full (second pass) | read |
| **`src/` total** | **73** | **12,606** | **12,071 lines read line by line; 535-line data table validated programmatically** | |
| `test/**` (40 `.ts` files, 5,604 lines) | 40 | 5,604 | Every file: assertion census (tests, `expect` count, snapshot-only and weak assertions). Release gates and the isolation, watch, diagnostics, module-export, host-identity and decl-emitter tests read in full. Remaining unit tests reviewed by test name and assertion list | see "Test meaningfulness" below |
| `test/__snapshots__/**` | 4 | 5,501 | Third pass: all 32 entries reviewed. Smoke snapshot's 3 Dart libraries (h3 365, Leaflet 3,260, probe 213 lines) extracted and re-analyzed (0 errors/warnings; 2 deprecation infos); probe library read in full. S5 fixture snapshot (464 lines, 5 libraries + verbose report) read in full. IR snapshots (`decl-parser` 7, `type-parser` 21 entries) read in full | findings CA-31, CA-23 (misnamed test) |
| `tools/` | 4 | 354 | `ir.ts` full; `graph.ts`/`bench.ts` imports and usage; `bench.ts` executed | reachability + run |

## Executed checks

All gates pass (`logs/gates.txt`): `tsc` 0 errors; `pnpm test` 299 passed / 10 skipped; S2 2/2; S3 1/1; S4 54/54; S5 fixture 3/3; `test:dart` 2/2; `test:e2e` 3/3; `test:incremental` 5/5; coverage 90.43% lines; stress 1/1 over 1,661 files (720 empty, 0 throws/errors/markers).

An independent CLI generation of h3, Leaflet and three.js (`--js-root THREE`), 424 libraries, analyzed with Dart 3.13.7: 0 errors and 0 warnings; 2 + 37 deprecation infos, matching `baseline.json` (`logs/independent-dart-census.txt`).

## Findings from this pass

| ID | Severity | Summary |
|---|---|---|
| CA-01 | high | `Date` → `DateTime` throws under dart2js in both directions |
| CA-02 | medium | Watch diverges from a cold build for module-file `declare global` changes |
| CA-03 | medium | Import-then-export, `export * as ns` and renamed re-exports are lost silently |
| CA-04 | medium | Object-member names (`toString(x)`, `hashCode`, …) → `INVALID_OVERRIDE` |
| CA-05 | low | Member named like its class → analyzer errors |
| CA-06 | medium | Ambient `declare module "@scope/pkg"` binds an unresolvable `@JS` path |
| CA-07 | medium | Cross-file global merging → partial duplicate classes, `dynamic` use sites |
| CA-09 | low | `1_000n` aborts the whole run |
| CA-11 | low | `'` / `$` in file names → invalid import directives |
| CA-12 | low | Private-use code points act as emitter control tokens |
| CA-13 | low | Cycle memoisation misreports link state |
| CA-14 | low | `.d.mts`/`.d.cts` inputs dropped |
| CA-15 | low | Watch root computed by string prefix |
| CA-16 | low | Private-only constructors leave Dart's implicit constructor |
| CA-23 | low | P-18, E-44 diagnostic and E-20 have no regression test |
| CA-25 | medium | Distinct inline types hoist to the same anonymous FQN and merge into one wrong shape |
| CA-26 | low | `this` in generic classes emitted raw; rationale stale; a test locks it |
| CA-28 | low | e2e oracle `expected.cjs` never executed |
| CA-30 | low | CLI is not invocation-compatible with js_facade_gen; its behaviour flags are silently ignored |
| CA-31 | low | Construct signatures on type-only interfaces dropped silently; snapshots lock it |

## Areas examined and found correct (falsification record)

| Suspicion | Test | Result |
|---|---|---|
| Lone-CR JSDoc could break out of `///` into code | `fixtures/backend/lonecr` | TypeScript's JSDoc normalisation removed it; output safe. **Falsified** |
| `private`/`protected` members leak into the API | `fixtures/backend/visibility` | Emitted, which matches js_facade_gen §2.13/§2.14. **Intentional parity** |
| CLI hangs on an unwritable `-o` | `-o /proc/forbidden` hung; `-o /etc/hostname/sub` exits 1 with ENOTDIR | Plain `node -e mkdir('/proc/…',{recursive:true})` also hangs: a Node/procfs quirk. **Not a dartify defect** |
| Bracketed explicit paths (`routes/[id]/page.d.ts`) mis-globbed | CLI probe | Bound correctly. **Falsified** |
| h3 golden hides nullability changes | nullability-preserving rerun | 0/63 differ. **Falsified** |
| Output escapes `-o` via `../` | `deriveOutputPath` reasoning | Contained; collisions throw. **Holds** |
| Watch: `typeof` const / alias change across an import | differential probe | Matches cold. **Holds** |
| A §3.8 callable interface's `external call()` would hit `Function.prototype.call` | dart2js probe, `fixtures/runtime-callable/` | Dispatches correctly. **Falsified** |
| Harness validity of the dart2js probes | Re-ran every runtime probe with `globalThis.self = globalThis` (as test/e2e does) | The first `Date` run had mis-recorded a harness `ReferenceError` as a throw. Corrected: the `Date` binding silently returns NaN and wrong objects (CA-01 stands). CA-06 and CA-16 unchanged |
| Concurrency (R-14) | `test/run-isolation.test.ts` passes; no module-level mutable run state found on read (`TypeParser` singleton is stateless) | **Holds** |

## Error handling and resource notes (not registered as findings)

- `renderLibrary` turns a thrown emitter error into a `// ERROR emitting …` comment plus an `EMIT_ERROR` diagnostic, and the CLI still exits 0. That matches the documented policy, and stress asserts on the markers.
- `ResolutionRun.moduleFallbacks` accumulates across watch rebuilds (never cleared). `buildResolutionReport` deduplicates, but a fallback that stops applying stays reported. The differential suite does not compare `ResolutionReport`. Observation only; not reproduced.
- `pruneUnreachable` relies on TypeScript compiler internals (`getResolvedModuleFromModuleSpecifier`, `getSourceFileFromReference`, …) cast onto the public `Program` type. With `ts-morph ^28` on a caret range, a TypeScript upgrade that renames them would surface as `UNEXPECTED_ERROR`. This is an upgrade risk to watch in CI, not a current defect.
- `resolveReference`'s syntax fallbacks scan every table key per unresolved reference (O(references × symbols)). This only affects checker-failed references and is fast on the corpus.

## Test meaningfulness (second pass)

| Observation | Evidence |
|---|---|
| Release-relevant tests assert exact output, with negative checks (`not.toContain`), not merely "no throw" | `decl-emitter.test.ts` (52 expects), `semantic.test.ts` (118), `run-isolation.test.ts` (21), `watch.test.ts` (17), `generation-diagnostics.test.ts` (8) |
| Snapshot-only files | `type/type-parser.test.ts` (21 snapshots), `decl/decl-parser.test.ts` (7), `smoke.test.ts` (3 byte-exact files). Acceptable as IR/format locks; snapshots are not reviewed for correctness by the tests themselves |
| Weak assertions | 14 sites in total (`toBeGreaterThan(0)`, `toBeDefined`), mostly the S3 census (`decl/corpus.test.ts:131-140`), where the exact protected floor `inputDeclarations === 2_530` carries the real assertion |
| Tests that lock questionable behaviour | `tier-a.test.ts` "drops type arguments on a generic owner" (CA-26) |
| Paths with no test | barrel re-export forms (CA-03; `module-exports.test.ts` checks only IR records), P-18, E-44 diagnostic, E-20 (CA-23), module-file `declare global` in watch mode (CA-02) |
| Oracle integrity | e2e compares with a committed `main.expected` and never runs `expected.cjs` (CA-28; consistent today) |
| Opt-in gates | dart, e2e, stress, S2, S3 and incremental are skipped in `pnpm test`; CI runs dart, e2e and incremental, but not stress, S2 or S3 |
