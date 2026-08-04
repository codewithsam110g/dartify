# 01 — Architecture & Inventory

## Intended pipeline (current branch)

```
CLI (cli.ts)
  └─ glob/resolve .d.ts paths
     │
Transpiler (transpiler.ts)
  ├─ resolveAndCategorize()      → inputFiles | packageDepFiles | stdlibFiles
  │
  ├─ PHASE 1  generateSymbols()   (phase/symbolGeneration.ts)
  │     walks statements → parser/* → IR → SymbolTable.register(fqn, Symbol)
  │     structural IR walk derives checker-backed reference dependencies
  │
  ├─ PHASE 2  runLinker()         (phase/linkerPhase.ts)
  │     DFS over dep graph, memoised, cycle-safe
  │     → LinkReport (states, resolved edges, diagnostics)
  │     → writes resolvedDeps + IR use-site resolvedFQN
  │
  └─ PHASE 3  renderAllFiles() → writeAllFiles()  (phase/emitterPhase.ts)
        group symbols by source file → emitter/old/* → optionally write .dart
```

**Design intent** (from the author): the IR is output-language agnostic. A
backend is a pair of string tables — one type emitter, one statement emitter.
v1 targets `package:js`; v2 adds a `dart:js_interop` backend behind a CLI flag.
Any sufficiently annotation-friendly target language could be added the same way.

## FQN scheme

```
<absolute file path>::<modulePrefix>Name
                       └─ nested scopes joined with "|", e.g. "h3"|UNITS|m
```

`::` separates physical location from logical scope. `|` separates scope
segments. Anonymous hoisted types get `<file>::Anon_<sanitised scope path>`.

Reference nodes carry their written lookup plus a checker-backed target identity
when TypeScript can provide one. Phase 1 derives symbol deps by structurally
walking completed IR; Phase 2 resolves those targets without arbitrary fuzzy
selection and writes both symbol-level `resolvedDeps` and use-site
`resolvedFQN`. Namespace-prefix stripping is allowed only for a captured
`export as namespace` declaration.

## Live vs. dead inventory

### Live (on the execution path)

| Path | Role |
|---|---|
| `src/cli.ts` | arg parsing, globbing |
| `src/transpiler.ts` | orchestration, file resolution/categorisation |
| `src/context.ts` | resettable module-owned context: symbol table, namespace metadata, `currentFQN`, logging flag |
| `src/reset.ts` | per-run singleton reset |
| `src/symbol/{index,table,resolve,fqn}.ts` | symbol model, table, FQN construction and structured resolution |
| `src/resolution/*` | shared stdlib classification, module host and resolution reports |
| `src/ir/visit.ts` | structural type-reference walker used by generation/linking |
| `src/engine/phase/symbolGeneration.ts` | Phase 1 |
| `src/engine/phase/linkerPhase.ts` | Phase 2 |
| `src/engine/phase/emitterPhase.ts` | Phase 3 |
| `src/engine/parser/*.ts` | declaration → IR |
| `src/engine/parser/type/*.ts` | type node → IRType |
| `src/ir/*.ts` | IR definitions |
| `src/engine/emitter/old/*` | IR → Dart strings |
| `src/utils/utils.ts` | `stripQuotes` |

`tools/graph.ts` is an explicit consumer of `LinkReport`; it is not on the
shipped execution path (the S0.4 fix for `L-07`).

### Dead (zero inbound references from live code)

Verified with `grep -rn ... src test --include="*.ts"` excluding self-directory:

| Path | Lines | Notes |
|---|---|---|
| `src/engine/passes/**` | 880 | The old 5-pass pipeline. |
| `src/engine/transformers/**` | 804 | Overload grouping + hoisting lived here. |
| `src/legacy/**` | ~2450 | Original 3-day implementation. Self-contained, compiles clean. |
| `src/ir/literal.ts` (`IRLiteral`) | 44 | Only referenced by the dead transformers. Vestigial since hoisting moved to parse time. |
| `src/log.ts` | 251 | Full logger implementation; not imported by any live module. |

**At least 4,429 of 9,124 `src` TypeScript lines are currently unreachable.**
This is expected mid-refactor but it means `tsc`, coverage, and bundle size are
all reporting on code that does not run.

> Note: `src/engine/transformers/` still holds the only working implementation of
> overload grouping and recursive type-walking. Do not delete it until `P-3`
> lands — mine it first. See `08-dead-legacy.md`.

## Path aliases (`tsconfig.json`)

```
@/*            src/*
@ir/*          src/ir/*
@engine/*      src/engine/*
@emitter/*     src/engine/emitter/*
@parser/*      src/engine/parser/*
@passes/*      src/engine/passes/*        ← points at dead code
@transformers/* src/engine/transformers/* ← points at dead code
@utils/*       src/utils/*
@legacy/*      src/legacy/*
@typeParser/*  src/engine/parser/type/*
@typeEmitter/* src/engine/emitter/old/type/*  ← "old" is load-bearing in the alias
```

`@typeEmitter` pointing into `emitter/old/` will need a rename when the new
emitter lands, or the alias will be actively misleading. See `E-11`.

## Observed runtime behaviour (baseline, commit `fc57961`)

| Corpus | Files resolved | Symbols | Broken links | Emitted | Time |
|---|---|---|---|---|---|
| `def_files/h3/h3.d.ts` | 1 | ~40 | 0 | 1 file | 0.5 s |
| `def_files/leaflet/*.d.ts` | 2 + 51 stdlib | 318 | **42** | 2 files | ~1 s |
| `def_files/three/src/Three.Core.d.ts` | 420 | 1943 | 0 | 415 files | 10 s |

Performance is genuinely good. Correctness is the constraint, not speed.
