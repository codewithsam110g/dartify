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
  │     semantic/* canonicalizes, merges and allocates names atomically
  │     DFS over dep graph, memoised, cycle-safe
  │     → LinkReport (semantic report, states, edges, diagnostics)
  │     → writes resolvedDeps + IR use-site resolvedFQN/resolvedDartName
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
| `src/context.ts` | temporary process-global service locator; locked for deletion in pre-S5 task 4.11 (`R-14`) |
| `src/reset.ts` | sequential-only workaround scheduled for deletion with the singleton in 4.11 |
| `src/symbol/{index,table,resolve,fqn}.ts` | symbol model, table, FQN construction and structured resolution |
| `src/resolution/*` | shared stdlib classification, module host and resolution reports |
| `src/ir/visit.ts` | structural type-reference walker used by generation/linking |
| `src/engine/semantic/*` | canonical shape, merge, overload/name, and atomic semantic passes |
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

Pre-S5 task 4.11 changes phase ownership without changing the three-phase
architecture. A run-local project/table/alias/diagnostic set flows through
explicit parameters and produces an owned linked program for emission. No
phase may obtain compiler state through module imports; future backends consume
the linked program, while graph tooling continues to consume only reports.

### Dead (zero inbound references from live code)

Verified with `grep -rn ... src test --include="*.ts"` excluding self-directory:

| Path | Lines | Notes |
|---|---|---|
| `src/legacy/**` | ~2450 | Original 3-day implementation. Self-contained, compiles clean. |
| `src/log.ts` | 251 | Full logger implementation; not imported by any live module. |

S4 deleted the 1,684-line pass/transformer quarantine after reimplementing its
requirements against current IR. `legacy/**` and `log.ts` remain intentionally
unreachable and tree-shaken from `dist`.

## Path aliases (`tsconfig.json`)

```
@/*            src/*
@ir/*          src/ir/*
@engine/*      src/engine/*
@emitter/*     src/engine/emitter/*
@parser/*      src/engine/parser/*
@utils/*       src/utils/*
@legacy/*      src/legacy/*
@typeParser/*  src/engine/parser/type/*
@typeEmitter/* src/engine/emitter/old/type/*  ← "old" is load-bearing in the alias
```

`@typeEmitter` pointing into `emitter/old/` will need a rename when the new
emitter lands, or the alias will be actively misleading. See `E-11`.

## Historical runtime behaviour (baseline, commit `fc57961`)

| Corpus | Files resolved | Symbols | Broken links | Emitted | Time |
|---|---|---|---|---|---|
| `def_files/h3/h3.d.ts` | 1 | ~40 | 0 | 1 file | 0.5 s |
| `def_files/leaflet/*.d.ts` | 2 + 51 stdlib | 318 | **42** | 2 files | ~1 s |
| `def_files/three/src/Three.Core.d.ts` | 420 | 1943 | 0 | 415 files | 10 s |

Performance is genuinely good. Correctness is the constraint, not speed.
