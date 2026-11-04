# 30 — Implementation (pass 3)

Correctness, edge cases, error handling, silent failures, concurrency, resource limits and test meaningfulness at `17e8aa9`.

## Coverage table

"Full" means read line by line. "Partial" lists how much was read. "Gate-only" means not read in this audit and exercised only through the executed gates and probes.

| Area | Files | Lines | Read | Method |
|---|---|---:|---|---|
| `src/cli.ts` | 1 | 285 | Full | read + CLI probes (exit codes, `.d.mts`, bracket paths, unwritable `-o`, syntax error) |
| `src/transpiler.ts` | 1 | 837 | Full | read + gates |
| `src/watch.ts` | 1 | 597 | Full | read + differential probes (CA-02) |
| `src/engine/phase/*` | 3 | 1,234 | Full | read + gates |
| `src/engine/emitter/backend.ts` | 1 | 76 | Full | read |
| `src/engine/emitter/packagejs/` (excl. `browserTypes.ts`) | 7 | 3,270 | Full | read + analyzer and dart2js probes |
| `src/engine/emitter/packagejs/browserTypes.ts` | 1 | 535 | Gate-only (generated data) | structure checked through `platformMapping()` callers |
| `src/engine/semantic/{keywords,names,run,merge}.ts` | 4 | 1,506 | Full | read + probes |
| `src/engine/semantic/{shape,types}.ts` | 2 | 131 | Gate-only | — |
| `src/engine/alias/*` | 3 | 450 | Full | read |
| `src/symbol/*` | 6 | 640 | Full | read + cycle probe (CA-13) |
| `src/resolution/*` | 3 | 157 | Full | read |
| `src/reporting/linker.ts` | 1 | 144 | Partial (60) | read |
| `src/engine/parser/` class, interface, typeRefernce, literals | 4 | 634 | Full | read + bigint probe (CA-09) |
| `src/engine/parser/type/type.ts`, `signature.ts` | 2 | 425 | Partial (~360) | read |
| `src/engine/parser/` remaining 20 files | 20 | ~1,106 | Gate-only | exercised by the S3 census (2,530 declarations), stress (1,661 files), snapshots |
| `src/ir/*` | 13 | 579 | Gate-only | type definitions; behaviour exercised everywhere |
| **`src/` total** | **73** | **12,606** | **≈10,100 lines (≈80%) read; ≈2,500 gate-only** | |
| `test/` | 54 | 5,604 | Partial: dart gate, conformance (4 files), stress, watch-differential header, e2e listing | assertion strength reviewed for the release gates |
| `tools/` | 4 | 354 | `ir.ts` full; `graph.ts`/`bench.ts` imports only | reachability |

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
| Concurrency (R-14) | `test/run-isolation.test.ts` passes; no module-level mutable run state found on read (`TypeParser` singleton is stateless) | **Holds** |

## Error handling and resource notes (not registered as findings)

- `renderLibrary` turns a thrown emitter error into a `// ERROR emitting …` comment plus an `EMIT_ERROR` diagnostic, and the CLI still exits 0. That matches the documented policy, and stress asserts on the markers.
- `ResolutionRun.moduleFallbacks` accumulates across watch rebuilds (never cleared). `buildResolutionReport` deduplicates, but a fallback that stops applying stays reported. The differential suite does not compare `ResolutionReport`. Observation only; not reproduced.
- `pruneUnreachable` relies on TypeScript compiler internals (`getResolvedModuleFromModuleSpecifier`, `getSourceFileFromReference`, …) cast onto the public `Program` type. With `ts-morph ^28` on a caret range, a TypeScript upgrade that renames them would surface as `UNEXPECTED_ERROR`. This is an upgrade risk to watch in CI, not a current defect.
- `resolveReference`'s syntax fallbacks scan every table key per unresolved reference (O(references × symbols)). This only affects checker-failed references and is fast on the corpus.
