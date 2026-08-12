# Codebase Audit

A per-file, per-line audit of `dartify` / `dart_bindgen` as it stands on the
`refactor/orchestration` branch.

## Why this exists

The 5-pass architecture was replaced by a symbol-table + linker architecture
mid-flight. That left the tree in a state where some code is live, some is
orphaned, and several bugs are *latent* rather than visible — masked by other
layers that are themselves lossy. This audit establishes ground truth before
planning, so `PLAN.md` is sequenced by real dependency rather than by guess.

## How to read it

| File | Covers |
|---|---|
| [`01-architecture.md`](01-architecture.md) | Data flow, live vs. dead inventory |
| [`02-entry-resolve.md`](02-entry-resolve.md) | `cli.ts`, `transpiler.ts`, `context.ts` |
| [`03-parser-decl.md`](03-parser-decl.md) | `engine/parser/*.ts` |
| [`04-parser-type.md`](04-parser-type.md) | `engine/parser/type/*.ts` |
| [`05-ir.md`](05-ir.md) | `ir/*.ts` |
| [`06-symbol-linker.md`](06-symbol-linker.md) | `symbol/*`, `phase/symbolGeneration`, `phase/linkerPhase` |
| [`07-emitter.md`](07-emitter.md) | `phase/emitterPhase`, `emitter/old/*` |
| [`08-dead-legacy.md`](08-dead-legacy.md) | `engine/passes/*`, `engine/transformers/*`, `legacy/*` |
| [`09-tests-tooling.md`](09-tests-tooling.md) | `test/*`, configs, `log.ts`, `utils/*` |
| [`FINDINGS.md`](FINDINGS.md) | **Consolidated, severity-ranked index of every finding** |

Start at `FINDINGS.md` if you want the summary; go to the area file for the
per-line reasoning behind any given ID.

The implemented semantic contract is [`../STAGE4_PLAN.md`](../STAGE4_PLAN.md),
with command results and closure evidence in [`S4-EVIDENCE.md`](S4-EVIDENCE.md).
That ledger also records the targeted post-S4 deep-review corrections
`L-17`, `L-18`, `P-14`, and `E-24`–`E-28`. A new complete line-by-line post-S4
pass is tracked in `../Tasks.md` and must reconcile this folder before S5.

## Finding IDs

Stable IDs, referenced from `PLAN.md` and `CLAUDE.md`:

| Prefix | Area |
|---|---|
| `R-nn` | Resolution / entry / CLI |
| `P-nn` | Declaration parsers |
| `T-nn` | Type parsers |
| `I-nn` | IR shape |
| `L-nn` | Symbol table & linker |
| `E-nn` | Emitter |
| `D-nn` | Dead / legacy code |
| `X-nn` | Tests & tooling |

Never renumber an ID. If a finding is resolved, mark it `[FIXED]` in
`FINDINGS.md` and leave the ID in place — `PLAN.md` and commit messages
reference them.

## Evidence tags

Each finding carries one:

- **`[verified]`** — reproduced by running the tool; the repro is recorded.
- **`[inspection]`** — established by reading the code; logic is sound but no
  runtime repro was produced (often because the bug is latent).
- **`[latent]`** — real defect, currently unobservable because a downstream
  layer discards the affected information. Will surface when that layer improves.

## Maintenance

This is a living document. When you change code that a finding covers, update
the finding in the same commit. When you add a subsystem, add a section.
`CLAUDE.md` instructs future sessions to do the same.

Audit performed against commit `fc57961` (`feat: implement linker system`).


---

## Audit pass — full re-read, post-S1

Every live source file was read line by line and cross-checked against these
documents, rather than inferred from the S1 work. Nine new findings, three
corrections to existing ones, and four stale claims in `CLAUDE.md`.

**New, fixed in the pass** (all behaviour-neutral on the current corpus — the
holes were real, nothing was falling through them):

| ID | Summary |
|---|---|
| `R-12` | Errors inside `declare module`/`namespace` were pushed into a throwaway `[]` |
| `T-17` | `ParenthesizedType` and `readonly` consumed nesting without charging depth — `(((…)))` was unbounded |

**New, filed for a stage** (status updated as stages close):

| ID | Summary | Lands in |
|---|---|---|
| `P-12` | Classes drop index signatures; `IRClass` has no field | S3 ✅ |
| `I-13` | `IRParameter` declared twice with different rest-flag names | S3 ✅ |
| `I-14` | `ir/literal.ts` dead but imported by the live IR | S3 ✅ |
| `L-16` | Type parameters in optional/member contexts can become fake global dependency edges | S3 ✅ |
| `E-20` | `isAbstract` parsed, never emitted | S5 |
| `E-21` | Emitter dead code and unused parameters | S4/S5 |
| `X-12` | Stress tier asserts only that nothing *escaped* | S6 |

**Corrections to existing findings:**

- `T-05` was marked `[FIXED]` after S1.9 fixed the function-type positions only.
  Two other handlers had the same defect — see `T-17`.
- `R-09` says "31 sites". Re-counted: **52** `currentFQN` save/restore pairs.
- `X-11`'s claim that all 710 empty renders are barrels is **confirmed** by
  classification, not just assertion.

**Measured during the pass**, and worth not re-deriving:

| | |
|---|---|
| `src` lines | 9,107 total · 4,722 live · ~4,400 dead |
| corpus at audit time | 1,649 `.d.ts` files; **1,650 after the S3 fixture** |
| files with `result.errors` set, whole corpus | **0** |
| files containing `// ERROR emitting` | **0** |
| empty renders | 710, all barrels or comment-only |
| unpushed commits | **23** — the entire branch, S0 and S1 |

---

## Audit pass — pre-S2 link verification

The resolution, symbol-generation, linker and graph paths were re-read line by
line immediately before starting S2. Existing S2 findings were reproduced, the
detailed audit was brought forward from its pre-S0 wording, and five missing
findings were filed: `R-13`, `L-12`, `L-13`, `L-14`, `L-15`.

Roadmap ownership is explicit in `PLAN.md`: `L-12`/`L-15` → S2.4,
`L-13` → S2.5b, `L-14` → S2.6, and `R-13` → S6.4. The `S0`–`S4`
headings in `FINDINGS.md` are severity ranks, not implementation stages.

Fresh baselines:

| | |
|---|---|
| three.js symbols | 2,004 valid / 0 reported broken |
| three.js recorded dep edges | 2,542 |
| edges naming the importing rather than declaring file | **1,664** |
| checker-verified type-reference sites linked to the wrong declaration | **19** |
| graph node-ID collisions | **2 groups / 4 real symbols** |
| leaflet | 284 valid / **44 broken**, from 14 raw dotted edges |
| aliases, three.js + leaflet | **64**, all distinct across files |
| aliases including synthetic probe | **68** — the probe contributes 4 |

The earlier post-S1 note saying "52 currentFQN save/restore pairs" was also
wrong: there are **24 pairs** (48 assignments) plus one one-way assignment in
the variable parser. The branch has since been pushed; the old "23 unpushed"
measurement above is historical, not current state.

---

## Stage 2 closure — truthful link graph

S2 is implemented and verified. Reference identity is checker-backed and stored
on the IR, dependencies are derived by walking completed declarations, linker
outcomes and edges are persisted, module-resolution issues are public report
data, and the graph renderer consumes those results without resolving again.

| Gate | Result |
|---|---|
| Leaflet | **328/328 symbols**, **1,050/1,050 edges**, 0 ambiguous / 0 missing |
| three.js | **8,184 resolved edges**, 0 ambiguous, **31 missing** |
| three.js missing cause | absent `webxr` and `@webgpu/types` type packages; retained as honest failures |
| focused S2 tests | **15/15**, including structured verbose-report formatting |
| `pnpm test:s2` | **2/2** corpus gates |
| normal suite | **214 passed**, 3 skipped |
| compiler/build | `tsc --noEmit` clean; bundle **107.53 KB** including verbose report formatting |
| compatibility | h3 smoke output byte-identical; bundled CLI reports 0 unresolved modules |

Closed here: `R-01`–`R-04`, `R-06`, `R-10`, `P-01`, `I-04`, `L-01`–`L-04`,
`L-08`, `L-12`–`L-15`, and `X-06`. At S2 closure, `R-09` remained in S3;
it is now fixed. `R-13` remains in
S6 because symbol-generation errors still need to join the public report model.
The S2 CLI follow-up also partially closes `R-08`: `-l` owns ordinary logs,
`-lv` adds the structured linker report, and `--version` is long-only. IR-dump
logging remains the independent `D-05` decision.

---

## Stage 3 scope correction

The post-S2 implementation plan now includes the declaration-loss findings
added after the original S3 table was written: duplicate parameter models
(`I-13`), the live vestigial literal field (`I-14`), parameter defaults and
destructuring (`P-11`), class index signatures (`P-12`), and the impossible
top-level variable readonly flag (`P-05`). They belong in S3 because its exit
condition is zero known information loss at the IR boundary. Dart emission for
those fields remains S5 work.

---

## Stage 3 closure — complete declaration IR

S3 is implemented and verified. Shared `IRNode`, `IRTypeParam`, `IRParameter`,
`IRCallSignature` and `IRConstructSignature` contracts now carry the declaration
facts that were previously discarded. Every parser uses immutable
`ParseContext` scopes; return, parameter and overload hoists are deterministic.
Enum initializer form/value, bigint cloning, declaration
modifiers, member visibility, docs, locations, variable declaration kinds and
class index signatures are all asserted at the IR boundary.

| Gate | Result |
|---|---|
| focused S3 acceptance | **6/6** semantic tests over `synthetic/s3-complete.d.ts` |
| representative S3 census | **2,530 declarations**, **26,240 parsed types**; 0 missing declaration/type locations |
| signatures/generics observed | 409 type params · 6,475 params · 286 calls · 53 constructs · 64 index signatures |
| S2 corpus regression | **2/2**; Leaflet and three.js link baselines unchanged |
| normal suite | **222 passed**, 4 skipped |
| full stress | **1,650/1,650 files** survived; 710 known empty barrels |
| compiler/build | `tsc --noEmit` clean; bundle **112.24 KB** |
| generated h3 | 0 unresolved modules; `dart analyze` **No issues found** |

Closed here: `I-01`, `I-05`–`I-11`, `I-13`, `I-14`, `P-02`–`P-06`,
`P-08`, `P-09`, `P-11`, `P-12`, `R-09`, and the newly exposed `L-16`.
`P-09` is closed specifically at the IR boundary; emitting every overload is
still part of the S5 backend rebuild. S4 now owns overload grouping,
augmentation and anonymous-shape canonicalisation.

---

## Audit pass — full re-read, post-S3

At `293a102`, all 66 live source files (5,767 lines), all 26 test/tool files
(3,038 lines), runtime configuration, and the S4-relevant quarantined code were
re-read. Findings were verified at discovery time with focused probes.

The gates remain green: 222 tests passed / 4 skipped, S2 2/2, S3 1/1,
`tsc --noEmit` clean, bundle 112.24 KB, and all 1,650 stress files survived.
An independent stress census found 0 returned errors and 0 embedded emission
error comments; 710 known barrels/comment-only files remain empty. Fresh Dart
analysis reports h3 0, probe 19, `leaflet.dart` 510, and `geojson.dart` 12.

One new S2 finding is verified: `P-13`. Sibling inline shapes within one type
reuse the same anonymous FQN, producing duplicate classes and collapsed union
members. `X-13` records six stale source/test/config comments without changing
them in this documentation-only pass. The audit also corrects `T-07`, `T-10`,
and `D-06` to fixed.

S4 was re-sequenced from the evidence. The live `src/ir/visit.ts` walker already
does recursive traversal, and nested literals already hoist during parsing; the
quarantined walker is obsolete current-IR code. S4 therefore begins with safe
symbol-table mutation/pass infrastructure, fixes structural-position identity
and semantic canonicalisation, then implements module kinds, overloads,
augmentation, and renaming before deleting the quarantined directories.

---

## Stage 4 close — semantic bindings

S4 implements atomic facet-based bindings, positional and canonical anonymous
identity, explicit module/global scopes, the measured declaration merge matrix,
overload and Dart-name allocation, resolved target names, semantic reports, and
normal/verbose CLI diagnostics. The obsolete five-pass directories are gone.

| Gate | Result |
|---|---|
| focused S4 acceptance | **26/26** across SymbolTable, semantics, reporting, and emitter adapter |
| normal / S2 / S3 | **241 passed**, 4 skipped / **2/2** / **1/1** |
| S3 input floor | **2,530** declarations before semantic rewriting |
| full stress | **1,650/1,650**; 0 returned errors, 0 emission markers |
| empty-output classification | 710 historical barrels/comments + **9 intentional Lodash augmentation-only files** |
| compiler/build | `tsc --noEmit` clean; bundle **154.11 KB** |
| Dart analyzer | h3 0 errors; semantic fixtures 0 S4-owned errors; Leaflet **522 → 239**; three.js 0 duplicate/syntax/identifier errors |

Closed here: `L-05`, `L-10`, `L-11`, `P-10`, `P-13`, `E-01`, `E-09`,
`E-10`, `D-01`, `D-02`, and `X-13`. S4 also found and fixed `E-22`, computed
member spellings that were not valid Dart identifiers. S5 still owns imports,
generics, heritage, callable interfaces, and constructor-overload emission.
