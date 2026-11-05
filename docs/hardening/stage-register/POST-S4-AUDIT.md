# Post-S4 Line-by-Line Audit

This ledger tracks the mandatory full audit between Stage 4 and Stage 5. Read
status means every line in the listed scope was inspected at baseline commit
`920c3fc`; verification status requires a focused reproduction, invariant test,
or measured command result. Findings keep the stable IDs in `FINDINGS.md`.

## Baseline and Scope

- Branch: `refactor/orchestration`
- Baseline: `920c3fc` (`docs(audit): reconcile the post-S4 deep review`)
- Mode: single agent; no S5 implementation during this audit.
- Live source: 75 TypeScript files, 8,130 lines.
- Historical exhibit: 3 `src/legacy/` files, 2,450 lines.
- Tests and tools: 29 TypeScript files, 4,055 lines, plus snapshots.
- Records: 24 Markdown files / 7,394 baseline lines.
- Runtime configuration: `package.json`, `tsconfig.json`, `vitest.config.ts`,
  `.gitignore`, lockfile, and fixture project configs.

Generated output, dependencies, and third-party declaration fixtures are
evidence inputs, not implementation lines. Declaration fixtures are never
edited unless they are repository-owned synthetic cases.

## Read and Verification Ledger

- [x] Entry, context, reset, CLI, and transpiler orchestration — 4 files / 871
  lines read; sequential reset claims corrected; concurrent isolation failed as
  `R-14`.
- [x] Resolution host, stdlib policy, and resolution report contracts — 4 files
  / 292 lines read; `R-01`–`R-04`/`R-06` behavior remains covered, while stale
  `R-08` and removed-`currentFQN` wording was corrected.
- [x] Declaration parsers and immutable parse context — 10 files / 757 lines
  read; immutable scoping remains sound; anonymous default declarations fail as
  `P-15`, and const-enum semantics are absent as `P-16`.
- [x] Type parsers, source preservation, and unsupported classification — 16
  files / 1,325 lines read; source/location and unsupported invariants remain
  intact; impossible intersections silently widen as `T-18`.
- [x] IR declarations, recursive walker, cloning, and metadata — 12 files / 502
  lines read; walker/cloning contracts remain sound; IR lacks the anonymity and
  const-enum facts required by `P-15`/`P-16`.
- [x] Symbol/FQN/table/dependency contracts — 7 files / 1,018 lines read;
  nested snapshot mutation reopens `L-10` as partial, cross-module terminal
  fallback fails as `L-19`, and ignored export assignments are `P-17`.
- [x] Semantic canonicalization, merging, naming, and aliases — 9 files / 2,003
  lines read; focused semantic/alias/table verification passes 53/53. Existing
  preservation fixes hold; scope-prefix legality fails as `E-30`, while alias
  collision ordering is recorded as low-severity `E-29`.
- [x] Transitional emitter paths — 11 files / 1,108 lines read; focused
  emitter/type/smoke verification passes 75/75 and the exact S5 fixture passes
  3/3. Newly exposed behavior is tracked as `E-31`–`E-35`; existing S5-owned
  gaps remain open rather than being hidden by green snapshots.
- [x] Remaining live logging and utility source — 2 files / 254 lines read;
  unused `log.ts` remains `D-05`, and global quote deletion remains `E-13`.
- [x] Tests, graph tooling, logging, utilities, and configuration — 29
  TypeScript files / 4,055 lines plus root configs and the lockfile inspected;
  false semantic expectations are `X-14`, the Node floor mismatch is `X-15`,
  and the nonfunctional coverage script is `X-16`.
- [x] Historical `src/legacy/` exhibit for misleading live dependencies — 3
  files / 2,450 lines read; no live imports remain. The unused `@legacy/*`
  path alias is historical configuration residue, not a runtime dependency.
- [x] All Markdown claims and finding dispositions — 24 files / 7,394
  baseline lines read; living status, S5 ownership, `L-10`, gate counts, and
  declaration/type census wording reconciled without altering `AGENTS.md`.

For each batch: read complete files, compare implementation with existing area
claims, reproduce suspicious behavior immediately, add or correct a stable
finding before moving on, then mark the batch complete with exact evidence.

## Acceptance

- Every scoped file has an explicit read disposition.
- Every existing finding touched by current behavior is reverified or corrected.
- New findings have stable IDs, severity, reproduction, ownership, and tests.
- Analyzer-invisible behavior uses dart2js/runtime probes where applicable.
- Normal, S2–S5 fixture, stress, TypeScript, build, h3, Leaflet, and three.js
  gates are remeasured after any audit fixes.
- `Tasks.md`, `PLAN.md`, `CLAUDE.md`, and area audits agree before S5 starts.

## Findings and Evidence Log

- `R-14` **S1, verified:** 20/20 concurrent `Beta` string transpilations
  returned the independent `Alpha` run's library because reset and all phases
  share `transpilerContext.symbolTable`. Recorded in `02-entry-resolve.md` and
  `FINDINGS.md`; requires per-run ownership or an explicit serialization policy
  before S5 adds more backend state.
- `P-15` **S1, verified:** valid anonymous default class/function declarations
  have zero TypeScript diagnostics but emit fake runtime names (`@JS("")`
  `JS$binding` and `@JS("anonFunc")`). The IR must retain anonymity and S5 must
  bind the module default export explicitly.
- `T-18` **S1, verified:** intersection normalization emits `String?` for
  `string & null`/`undefined` and `String` for `string & void`; TypeScript's
  checker resolves each to `never`. Recorded with a four-case comparison.
- `P-16` **S1, verified:** `export declare const enum` loses its const identity
  and emits runtime `@JS("Mode")` getters even though const-enum values are
  compile-time/inlined and may have no JavaScript object.
- `L-10` **S3, partial:** copied table maps/arrays still expose live nested
  symbols. A probe changed both `facet.ir.name` and `deps` through a snapshot
  and a subsequent live lookup observed both mutations.
- `L-19` **S1, verified:** syntax fallback in external module `a.d.ts` resolved
  an unimported `Missing` to the sole exported `Missing` in unrelated module
  `b.d.ts`, reporting every symbol valid via `uniqueGlobal`.
- `P-17` **S1, verified:** `ExportAssignment` is ignored entirely. Corpus
  census: 690 files use `export =` and 222 use identifier-form default exports;
  no module export identity survives for S5.
- `E-29` **S4, verified:** two distinct expressions deriving to the same alias
  base swap hashed/unhashed names when mint order is reversed. Output remains
  valid but is not stable under insertion of an earlier collision.
- `E-30` **S2, verified:** a collision under ambient module `"3d-kit"` is
  prefixed as `3d_kit_Item` and emitted as an invalid Dart class name.
- `E-31` **S1, verified:** rest parameters lower to one optional list; the
  runtime probe observed one array argument rather than multiple JS arguments.
- `E-32` **S2, verified:** raw annotation strings break on `$` interpolation
  and quoted member names; focused Dart analysis reports hard errors.
- `E-33` **S2, verified:** keyword filenames such as `class.d.ts` survive
  library sanitization and produce invalid directives.
- `E-34` **S2, inspection:** class index signatures are present in IR but have
  no emitter read or diagnostic.
- `E-35` **S1, verified:** non-constructable runtime interfaces receive an
  implicit local Dart constructor accepted by dart2js.
- `X-14` **S1, verified:** current fixture/unit gates can positively certify
  analyzer-invalid or runtime-corrupt output; `T-18` and `E-31` are encoded as
  expected behavior and the S5 fixture never invokes Dart.
- `X-15` **S3, verified:** the repository promises generic Node 20 but pinned
  `yargs@18.0.0` requires at least Node 20.19; no package `engines` field warns
  consumers before installation.
- `X-16` **S3, verified:** the checked-in coverage script exits immediately
  because `@vitest/coverage-v8` is not installed.

## Final Gate

| Check | Result |
|---|---|
| normal suite | 252 passed / 4 skipped |
| S2 / S3 / S4 / S5 fixture | 2/2 · 1/1 · 34/34 · 3/3 |
| current S3 view | 2,530 input declarations; 2,342 facets; 25,268 parsed types; 0 missing locations |
| stress | 1,654/1,654 in 180 s; 719 known empty outputs |
| TypeScript / build | 0 errors / 162.47 KB ESM bundle |
| h3 Dart analysis | 0 errors/warnings; one expected `package:js` deprecation info |
| Leaflet Dart analysis | 223 errors / 14 warnings; only missing types/generics and unused private bindings |
| three.js Dart analysis | 8,342 errors / 267 warnings across 415 libraries; only missing types/generics and unused private bindings |

All 75 live TypeScript source files (8,130 lines), 29 test/tool TypeScript files
(4,055 lines), 3 historical files (2,450 lines), and 24 Markdown records have
been read at the audit baseline. The pass found 16 new findings and reopened
`L-10` as partial. `PLAN.md` tasks 4.11–4.17 own the prerequisite repairs,
including the later `I-15` design finding; S5 owns the emitter-specific
corrections.

## R-14 Design Disposition

The pre-S5 remediation is now decision-complete: delete `src/context.ts` and
`src/reset.ts` rather than adding another reset or serialization lock. Each
public invocation owns its project, file-resolution accumulators, symbol table,
namespace aliases, and diagnostics. Phase functions receive narrow explicit
dependencies and the linker returns an owned linked program for S5 and future
backends.

This disposition absorbs `R-13` because removing global `isLogging` requires
symbol generation to return diagnostics, and closes the remaining design half
of `L-10` through transactional drafts plus detached consumer reads. It also
protects `L-19`, S5 imports/local-capture work (`E-08`/`E-23`), graph report
purity, and v2 backend isolation. Same-instance and cross-instance concurrent
calls, nested mutation attempts, diagnostics, and repository-wide removal of
context/reset imports are explicit 4.11 acceptance gates.

The preceding targeted review closed `L-17`, `L-18`, `P-14`, and
`E-24`–`E-28`; this pass rechecks their surrounding code rather than assuming
those fixes cover adjacent cases.

## Post-audit design follow-up

Planning the platform substitution layer against the original
`js_facade_gen` registry exposed `I-15`. A focused checker probe confirmed that
`collectTypeDep` discards a real `lib.dom.d.ts` `HTMLElement` reference, while
a lexical type parameter with the same spelling also correctly has no normal
dependency target. Leaf text cannot distinguish them. Task 4.17 now preserves
host identity before S5.3; this is a follow-up finding and does not alter the
historical 16-new-finding count for the completed line-by-line pass above.

The same verification exposed `E-36`: standard utility aliases do not enter
the unsupported-alias path. The S5 fixture emits the nonexistent Dart type
`Record<String, dynamic>`, contradicting the earlier claim that utility types
already received Tier-B names. S5.18 now guarantees a verified lowering or a
named documented fallback; exact checker expansion can remain a later
precision improvement.
