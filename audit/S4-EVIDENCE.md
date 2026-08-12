# Stage 4 Implementation Evidence

This ledger tracks the implementation of `STAGE4_PLAN.md`. A finding is closed
only after its focused reproduction changes from failing to passing and the
stage gates remain clean.

> **Post-S4 review (2026-08-12):** a deeper semantic/emitter/runtime review
> found eight gaps in the original acceptance claims. They are recorded as
> `L-17`, `L-18`, `P-14`, and `E-24`–`E-28` below. The original gate numbers
> remain as historical S4-close evidence; the post-review gate supersedes them.

## Starting State

- Branch: `refactor/orchestration`
- Starting commit: `b353fd7` (`docs(audit): re-audit Stage 3 and resequence Stage 4`)
- Worktree at start: only the approved Stage 4 plan and living-document edits
  were present; no implementation files were modified.
- S4 status: complete; delivery commits pending at the time of this ledger.
- Implementation mode: single agent.

## Context Read

The 21 Markdown files present before the plan was added were reviewed:
`AGENTS.md`, `CHANGELOG.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `PLAN.md`,
`README.md`, `ROADMAP.md`, `Tasks.md`, all eleven files under `audit/`, and
`def_files/{README,js_facade_gen_test_cases}.md`. `STAGE4_PLAN.md` is the
decision-complete implementation contract.

## Measured Baseline

| Fixture | Analyzer issues before S4 | Status |
|---|---:|---|
| overloads | 18 | final: 9 errors, all missing generic/type emission (`E-03`/S5); 0 duplicate/syntax/name errors |
| declaration augmentation | 11 | final: 2 undefined-class errors (S5 imports); 0 duplicate/syntax/name errors |
| keywords | 9 | final: 0 errors/warnings; one expected `package:js` deprecation info |
| modules | 25 | final: 0 errors/warnings; one expected `package:js` deprecation info |

Stage 3 floor: 222 tests passed / 4 skipped; S2 2/2; S3 1/1; 1,650 stress
files survived; `tsc` and build clean; bundle 112.24 KB; generated h3 passed
`dart analyze`.

## Finding Ledger

| Finding | Pre-change evidence | Focused verification | Status |
|---|---|---|---|
| `L-10` | Focused test initially failed 3/3: snapshot insertion changed the live table; `replace` and `apply` did not exist | snapshots isolate structure; replacement/removal and failed-apply rollback pass 3/3 | **closed** |
| `P-13` | Focused test initially found one `Anon_f_overload_0_param_0_x` for two different union members | exact union/array/generic/tuple/intersection paths plus same-file/cross-file canonicalization | **closed** |
| `L-11` | All module declarations previously shared one string stack and `global` polluted the FQN | explicit namespace/ambient/augmentation/global records; globals hoist; suppressions carry canonical targets | **closed** |
| `L-05` | linker preserved but did not transform overload/augmentation groups | overload, interface/class/value, constructor-companion, dual-facet, conflict, redirect, and report cases pass | **closed** |
| `P-10` | variable-side members were not promoted to static during augmentation | semantic and rendered-output tests prove static properties/methods/accessors | **closed** |
| `E-01` | emitters recovered JS names with `.split("_")[0]` | no recovery paths remain; `under_score_1/2` both bind `@JS("under_score")` | **closed** |
| `E-09` | Dart identifier contexts were not escaped | reserved, built-in type, member, parameter, type-param, and computed names covered; keyword fixture 9 -> 0 | **closed** |
| `E-10` | flattened namespace declarations collided | top-level priority, shortest suffix, numeric fallback, and reference rewrites covered; Leaflet duplicates 245 -> 0 | **closed** |
| `D-01` | quarantined five-pass directories remained on disk | 1,684 lines deleted; aliases/exclusions removed; no inbound imports | **closed** |
| `D-02` | retained concepts were not protected by live semantic tests | live shape walker/canonicalizer and overload tests replace the obsolete concepts | **closed** |
| `X-13` | six comments described superseded behavior | all audited source/test/config comments corrected | **closed** |
| `E-22` | three.js analyzer found computed `[Symbol.iterator]` emitted as a literal Dart method name, causing 4 `MISSING_IDENTIFIER` errors plus parser cascades | sanitation removed Dart syntax errors; runtime key semantics were not proven and are corrected separately by `E-25` | **closed: identifier legality only** |

## Stage Gates

| Gate | Result |
|---|---|
| Focused S4 tests | **26/26** |
| `pnpm test` | **241 passed**, 4 skipped |
| `pnpm test:s2` | **2/2** |
| `pnpm test:s3` | **1/1**; exact **2,530** pre-semantic declarations; 2,342 output facets in the representative census |
| `pnpm test:stress` | **1,650/1,650** in 176.5 s |
| independent stress census | 0 returned errors; 0 `// ERROR emitting`; 719 empties = 710 known + 9 Lodash augmentation-only files |
| `pnpm exec tsc --noEmit` | 0 errors |
| `pnpm build` | **154.11 KB** ESM bundle |
| h3 `dart analyze` | 0 errors/warnings; one target-expected `package:js` deprecation info; byte-identical smoke snapshot |
| legacy fixture analyzer census | overloads 9 errors; augmentation 2; keywords 0; modules 0; no S4-owned categories |
| Leaflet analyzer census | **239 total** (223 errors, 14 warnings, 2 info), down from 522; duplicate/syntax/name errors 0 |
| three.js analyzer census | 1,958 errors, all missing types/generic categories; duplicate/syntax/name errors 0 |

## Semantic Totals

| Corpus | Input declarations | Output symbols/facets | Merges | Overloads renamed | Canonical anonymous | Suppressed augmentation facets |
|---|---:|---:|---:|---:|---:|---:|
| h3 | 73 | 73 / 73 | 0 | 0 | 0 | 0 |
| four legacy fixtures | 51 | 37 / 39 | 6 | 15 | 0 | 0 |
| Leaflet | 336 | 327 / 345 | 0 | 267 | 3 | 0 |
| three.js | 2,101 | 1,931 / 1,972 | 18 | 89 | 42 | 125 |

## New Findings During S4

`E-22`: computed TypeScript member spellings can be invalid Dart identifiers.
The focused reproduction and three.js analyzer exposed it; semantic sanitation
produced a legal `dartName`. Post-S4 review later proved that preserving the
computed text in a legacy `@JS` annotation did not preserve runtime semantics.

## Post-S4 Deep-Review Corrections

| Finding | Review evidence | Correction and verification | Status |
|---|---|---|---|
| `L-17` | callable/constructable target signatures disappeared after class synthesis | reject unsupported folds; retain both declarations and diagnose; focused IR test | **closed** |
| `L-18` | value-side index signatures were omitted and their anonymous shape deleted | preserve the indexed value facet and diagnose; focused IR test | **closed** |
| `P-14` | author `Anon_` declarations were eligible for synthetic canonicalization | explicit `synthetic: "anonymousType"` provenance; author-name fixture | **closed** |
| `E-24` | dart2js compiled renamed class overloads as `receiver.f_1/f_2` | external instance extensions plus qualified top-level static bindings; analyzer, dart2js, and Node runtime probe call `f`/`Factory.make` | **closed** |
| `E-25` | compiled computed annotation addressed a string/path rather than `Symbol.iterator` | explicit semantic diagnostic and no corrupt external binding; IR preserved | **closed for transitional backend** |
| `E-26` | three.js local `class String` captured primitive Dart `String` | reserve backend-owned names; real AST output is `class JS$String` with primitive `String` parameters | **closed** |
| `E-27` | three.js helper names collided with emitted extensions/enums | reserve every generated companion/static binding; focused name tests and targeted analyzer run | **closed** |
| `E-28` | `3MFLoader`/`3DMLoader` emitted digit-leading libraries | prefix invalid starts; both real files parse without library-name errors | **closed** |

Targeted analysis of the five affected three.js files now reports only known
missing-import/generic diagnostics plus `package:js` deprecation info: no
invalid library, duplicate definition, or backend-name-capture diagnostic.

### Post-review gate

| Gate | Result |
|---|---|
| focused S4 gate | **34/34** |
| normal suite | **252 passed**, 4 skipped |
| S2 corpus | **2/2** |
| S3 corpus | **1/1**; 0 missing declaration/type locations |
| full stress | **1,654/1,654** in 188.7 s; unchanged 719 known empty outputs |
| `tsc --noEmit` | 0 errors |
| Node 20 ESM build | **162.47 KB** |
| h3 `dart analyze` | 0 errors/warnings; one expected `package:js` deprecation info |
| overload dispatch probe | analyzer clean apart from deprecation; dart2js compile succeeds; Node calls `f` and `Factory.make` with four expected results |
| targeted three.js review files | 0 invalid-library or duplicate-definition diagnostics; remaining issues are existing S5 imports/generics |
