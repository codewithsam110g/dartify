# 60 — Closing verification of registered fixes and regression sweep

Scope: every finding `audit/FINDINGS.md` marks fixed in the v1 window (pre-S5 barrier 4.11–4.17, S5, S6, post-S6 watch/e2e), plus a sweep of earlier fixes for regressions. "Real" means the code change exists and behaves as claimed. "Tested" means a test fails if it regresses. "Complete" means the whole defect class is closed.

## Registered fixes

| ID | Claim | Real | Tested by | Complete | Notes |
|---|---|---|---|---|---|
| R-14, R-11 | No process-global run state; reset seam deleted | ✅ `src/context.ts`/`reset.ts` absent; every entry point builds its own run [static] | `test/run-isolation.test.ts` ✅ | ✅ | |
| L-10 | Deep table ownership | ✅ `table.ts` clones on register/read; `adopt`/`release` are documented ownership transfers | `symbol-table.test.ts` ✅ | ✅ | |
| R-13 | Generation diagnostics returned; `transpile()` blocks writes | ✅ reproduced: `GENERATION_FAILED`, nothing written (CA-09 input) [runtime] | `generation-diagnostics.test.ts` ✅ | ✅ | |
| P-15, P-16 | Anonymous defaults, const enums | ✅ | `module-exports.test.ts`, `decl-emitter.test.ts` ✅ | ✅ | |
| P-17 | Export assignments/lists/re-exports resolved into `moduleExports` | ✅ for `export =`, `export default x`, `export * from`, `export {x} from` | `module-exports.test.ts` ✅ | ❌ **Incomplete** | specifier-less named re-exports of imports, `export * as ns`, renamed re-exports (CA-03) |
| T-18 | Impossible intersections → `Never` | ✅ | `normalisation.test.ts` ✅ | ✅ | |
| L-19 | Terminal-name fallback only for globally visible declarations | ✅ `resolve.ts:281-302` [static] | linker tests ✅ | ✅ | |
| E-29, E-30 | Order-independent alias names; revalidated composites | ✅ `registry.ts` allocates over the set | `aliasName.test.ts` ✅ | ✅ | |
| X-14, X-09 | Executable Dart gate, in CI | ✅ ran 2/2 with Dart 3.13.7 [runtime] | itself | ✅ | CI uses `stable` (CA-17) |
| X-15 | Node floor declared | ✅ `engines.node` | CI matrix | Unverified locally | only Node 22 here |
| X-16 (coverage) | `test:coverage` works | ✅ 90.43% [runtime] | CI 24.x | ✅ | ID reused (CA-22) |
| X-16 (gitignore) | Hand-written Dart fixtures tracked | ✅ `git ls-files` shows golden, runtime and e2e `main.dart` | default suite reads them | ✅ | ID reused (CA-22) |
| I-15 | Host identity on references | ✅ | `host-identity.test.ts` ✅ | ✅ | |
| E-08, E-23 | Cross-file imports, capture-safe | ✅ 420 three.js libraries analyze clean, independently re-run [runtime] | Dart gate, `decl-emitter.test.ts` ✅ | ✅ | |
| E-31 | Rest params as real JS arguments | ✅ | dart2js probe ✅ | ✅ | |
| E-35 | No implicit construction of interfaces/enums | ✅ | probe ✅ | ✅ | adjacent gap CA-16 (private-only constructors) |
| E-02, E-03, E-04, E-05, E-06, E-07 | Constructors, type params, heritage, variables, enums, anonymous factories | ✅ | decl-emitter + Dart gate ✅ | ✅ | |
| E-12, E-18, E-19 | Tuples, union typedefs, `object`/`undefined`/`never` | ✅ | type tests / snapshots ✅ | ✅ | |
| E-14, E-34 | Typed index operators | ✅ | dart2js probe (index operators) ✅ | ✅ | |
| E-32 | Central escaping of `@JS` strings | ✅ for annotations | ✅ | ❌ **Incomplete** | import/export URIs bypass escaping (CA-11) |
| E-33, E-13, E-36 | Library names, quote handling, utility aliases | ✅ | ✅ | ✅ | |
| E-20 | TS abstract classes emit `abstract class` | ✅ [runtime] | ❌ no test | ✅ | CA-23 |
| E-11b, E-15, E-21, R-08/D-05 | Deletions (`emitter/old`, `log.ts`) | ✅ files absent; `tools/ir.ts` present and outside bundle | n/a | ✅ | |
| X-12 | Stress asserts on output | ✅ `stress.test.ts:46-85` [static], ran 1,661 files [runtime] | itself | ✅ | count drift (CA-21) |
| R-15 | lib.dom 100 s → 6.5 s | code change present (`metadata.ts` line table) | ❌ | Unverified (not timed) | |
| E-37 | Avoid Dart 3.13 analyzer crash shapes | ✅ three.js analyzes without a crash [runtime] | Dart gate ✅ | ✅ | |
| E-38 | Barrel ambiguity `hide`s | ✅ | `decl-emitter.test.ts`, Dart gate ✅ | ✅ | |
| P-18 | `this:` removed from function types | ✅ [runtime] | ❌ no test | ✅ | CA-23 |
| E-39 | Alias-owned literal emitted under the alias name | ✅ h3 `CoordIJ` | smoke snapshot, h3 golden ✅ | ✅ | |
| E-40 | Shared `dartify_support.dart` | ✅ present in three.js output | `decl-emitter.test.ts` ✅ | ✅ | |
| E-42, E-43 | UMD roots, structural conformance | ✅ | e2e ✅ | ✅ | |
| E-44 | `--js-root`; `NATIVE_NAME_CONFLICT` diagnostic | ✅ diagnostic reproduced [runtime] | e2e covers `--js-root`; ❌ diagnostic untested | ✅ | CA-23 |
| R-16 | Prune unreachable files in watch | ✅ | watch-differential ✅ | ✅ | |
| R-05 | stdlib files not materialised | ✅ `transpiler.ts:624-629` [static] | — | ✅ | perf claim unverified |
| W-01 | Watch output equals cold build | ✅ for the 38 scripted edits | `test:incremental` ✅ 5/5 | ❌ **Incomplete** | CA-02 |

## Fixes registered as open, or accepted

`T-11` (string-literal escapes not unescaped) and `I-12` (multi-declarator grouping) remain open as registered. `E-41` is an accepted difference recorded in the conformance ledger. These were not re-audited beyond confirming they are still listed.

## Regression sweep

| Earlier guarantee | Check | Result |
|---|---|---|
| h3 analyzer-clean floor | gate + independent CLI run | holds |
| h3 golden parity, including nullability | default suite + nullability-preserving rerun | holds |
| Leaflet fully linked, analyzer-clean | gate + independent run (2 infos) | holds |
| three.js 0 errors | independent run, 421 files | holds |
| Stress: 0 throws / errors / markers | `pnpm test:stress` over 1,661 files | holds |
| `tsc` 0 errors (X-03) | executed | holds |
| D-07 bundle free of Viz | grep `dist` | holds |
| X-07 `pnpm test` is one-shot | executed | holds |
| R-07 version from package.json | `--version` → `1.0.0` | holds |
| Output path containment (R-03) | reasoning + collision check | holds |

No previously fixed behaviour was found regressed. Three fixes are incomplete for their defect class: P-17, E-32 and W-01.

## Probe for untested fixes

`pnpm exec tsx audit/10-closing-17e8aa9/fixtures/untested-fixes.ts` prints:

```
typedef Handler = bool Function(String a, num b);      // P-18: `this:` dropped
abstract class Shape { external Shape(); external num area(); }   // E-20
E-44 diagnostics: ["NATIVE_NAME_CONFLICT"]
```
