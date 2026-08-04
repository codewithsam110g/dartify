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

**New, filed for a stage:**

| ID | Summary | Lands in |
|---|---|---|
| `P-12` | Classes drop index signatures; `IRClass` has no field | S3 |
| `I-13` | `IRParameter` declared twice with different rest-flag names | S3 |
| `I-14` | `ir/literal.ts` dead but imported by the live IR | S3 |
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
| corpus | 1,649 `.d.ts` files |
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
