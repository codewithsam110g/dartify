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
