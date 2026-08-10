# 08 — Dead Code & Legacy

Covers `src/engine/passes/**`, `src/engine/transformers/**`, `src/legacy/**`,
`src/log.ts`.

**4,385 of 10,152 `src` lines are currently unreachable.** None is on the
execution path. The 1,684 lines under `engine/{passes,transformers}` are
excluded from TypeScript checking; `legacy/**` and `log.ts` remain checked.
The post-S3 bundle scan confirms none of these modules ships in `dist/cli.js`.

Verification:
```
grep -rn "declarationTransformers|typeTransformer|declarationPass|emissionPass|typePass" \
     src test --include="*.ts" | grep -vE "^src/engine/(passes|transformers)/"
→ (no output)

grep -rn "legacy" src test --include="*.ts" | grep -v "^src/legacy/"
→ (no output)
```

---

## D-01 — The 5-pass pipeline is orphaned and quarantined `[verified]`

`src/engine/passes/**` (880 lines) and `src/engine/transformers/**` (804 lines)
have zero inbound references. They historically accounted for five compiler
errors; S0.7 excluded both directories, so the live tree now typechecks cleanly.

```
src/engine/passes/declarationPass.ts(225,36): error TS2554: Expected 2 arguments, but got 1.
src/engine/transformers/declarationTransformers.ts(40,27): error TS2339: Property 'getCurrentFileName' does not exist on type 'TranspilerContext'.
src/engine/transformers/declarationTransformers.ts(43,62): error TS2339: ...
src/engine/transformers/typeTransformer.ts(47,27):  error TS2339: ...
src/engine/transformers/typeTransformer.ts(50,62):  error TS2339: ...
```

The post-S3 read found deeper incompatibility than those historical diagnostics:
the pass sources import superseded APIs, lose nested-module errors in fresh
arrays, collide type-map keys and include an incomplete function processor.
They are deletion candidates, not S4 scaffolding.

`tsconfig.json` also still declares `@passes/*` and `@transformers/*` path
aliases pointing here.

---

## D-02 — Mine transformer concepts, not implementations `[inspection]`

The original audit treated `engine/transformers/` as a reference implementation.
The post-S3 line read narrows what is actually reusable:

| What | Where | Why it matters |
|---|---|---|
| Overload grouping + renaming | `declarationTransformers.ts` | Retain the `f_1`/`f_2` + shared JS-name behaviour, but reimplement against current symbols/IR |
| Recursive traversal | `typeVisitor.ts` | Obsolete: live `src/ir/visit.ts` already traverses current IR and is used by symbol generation and alias registration |
| Literal canonicalisation | `typeVisitor.ts` | Retain the structural-dedup requirement, not its `JSON.stringify` hash, which includes non-semantic current-IR metadata |

Nested type literals already hoist through recursive `parseType` calls inside
unions, arrays and generic arguments. What is missing is canonical structural
dedup, and `P-13` proves that sibling positions can currently collide before
dedup even runs.

**Sequencing:** record the overload behaviour and canonicalisation constraints,
build S4 on the live walker plus safe symbol-table mutation APIs, then delete
both quarantined directories in S4. No current implementation should be copied.

---

## D-03 — `IRLiteral` is reachable only from dead code `[verified]` **[FIXED — S3 live IR]**

See `I-07`. `src/ir/literal.ts` and `IRType.objectLiteral` are referenced solely
by `typeVisitor.ts` / `typeTransformer.ts`. They go when the transformers go.

> **S3 resolution:** the live `IRLiteral` file and `IRType.objectLiteral` field
> are deleted. The excluded transformer sources deliberately remain untouched:
> S4 still has to mine their overload grouping and anonymous-shape
> canonicalisation before deleting the quarantined directories.

---

## D-04 — `src/legacy/**` is self-contained and compiles clean `[verified]`

2,450 lines across `transpiler.ts` (1,025), `type.ts` (737), `typeNode.ts` (688).
Zero inbound references; zero `tsc` errors. Internally it imports only from
itself and `ts-morph`.

### What it is

The original implementation, written in three days after ~3 weeks of evaluating
`js_facade_gen`, the Dart team's own tooling, and `typings`.

### What it demonstrates

**It is string-concatenation transpiling.** `resolveDartType()` returns a
`string` (`legacy/type.ts:51`), and the emitter builds Dart with template
literals directly from it. There is no IR and no seam. This is precisely why
overloads and augmentation could never generalise: by the time two declarations
are known to need merging, they are already text.

**The overload idea was correct from day one.** `getOverloadFuncs`
(`legacy/transpiler.ts:576-586`) is `Map<string, ParsedFunction[]>` grouping,
feeding `f_1`/`f_2` renaming with a shared `@JS("f")` at `:442-461` — the same
algorithm later reimplemented in the 5-pass transformers and intended for the
linker. It never generalised for lack of a *place to live*, not for lack of a
correct idea. Phase 2 is that place.

**Two parallel type resolvers capture a pivot mid-flight.** `legacy/type.ts`
walks `ts.Type`; `legacy/typeNode.ts` walks `ts.TypeNode`. Issue #1 records
"Use ts.Node rather than ts.Type … to get more information" as completed —
`typeNode.ts` is the direct ancestor of today's `engine/parser/type/`.

**It is more careful than a three-day sprint suggests.** `visitedTypes` is a
proper DFS set with `delete` in a `finally` (`legacy/type.ts:145`) and an
explicit `clear()` (`:694`) — not a leaky global.

**One semantic decision changed:** legacy maps `number → double`
(`legacy/type.ts:21`); current maps `number → num`
(`emitter/old/type/emit.ts:21-24`). Current is correct — `num` is the supertype
of both `int` and `double`, and JS numbers are neither.

### Recommendation

Keep in-tree until v1.0 as the "why this architecture" exhibit; it is the
clearest available justification for the IR. Move to `docs/history/` or a git
tag at v1.0. It has no maintenance cost — it compiles clean and nothing depends
on it.

---

## D-05 — `src/log.ts` is a complete, unused logger `[verified]`

251 lines: singleton `Logger`, five levels, ANSI colours, file output to
`./logs/<name>.log`. No live module imports it.

The v0.5 CHANGELOG historically described `-l` / `--enable-logs` as producing a
"Full IR Dump between 5 stages". That feature ran through this logger and the
5-pass architecture; both are gone. The current README accurately documents
`-l` as phase/module logging and `-lv` as the structured linker report. No live
flag currently emits IR files (see `R-08`).

**Decision needed:** either reconnect it as the IR-dump mechanism for the
3-phase pipeline (`--emit-ir` writing one JSON per phase), or delete it and
correct the docs. The IR dump was genuinely useful for debugging the passes and
is arguably more valuable now that there are three phases with a shared mutable
symbol table.

---

## D-06 — Dead code is absent from the published bundle `[verified]` **[FIXED — post-S3 audit]**

`pnpm build` produces a 114,961-byte (112.24 KB) `dist/cli.js`. A scan for
quarantined pass/transformer classes, legacy entry points, logger strings,
graphology and Viz finds no matches. Deleting the sources will improve tree
hygiene and maintenance, but not the shipped artifact's current size.

---

## D-07 — 95% of the published binary is a bundled devDependency `[verified]` `[FIXED]`

**Fixed in S0.4.** Measured before and after:

| | `dist/cli.js` | `grep -c viz` |
|---|---|---|
| before | **1,671,733 B** (1.59 MB) | 59 |
| after | **75,065 B** (73.3 KB) | 0 |

**dartify itself is 73 KB. The other 1.52 MB was Graphviz.**

The original estimate in this finding said "~70%", derived from
`lib/backend.js` alone (1.12 MB). That undercounted — the package's real
footprint through the pnpm symlink is 4.8 MB on disk, and the bundled entry
pulls `dist/viz.js` (1.19 MB) *in addition to* `lib/backend.js`. The true
figure is **95%**.

### Original diagnosis

```
pnpm build
→ ESM dist/cli.js 1.59 MB

grep -c viz dist/cli.js
→ 59
```

`@viz-js/viz` is declared in **`devDependencies`** (`package.json:56`), but
`src/engine/phase/linkerPhase.ts:2` imports it transitively through
`utils/visualizeGraph.ts` — and `linkerPhase` is live production code on the
Phase 2 path.

tsup externalises `dependencies` and `peerDependencies`; anything else it
**inlines**. So the Graphviz WASM backend was compiled into the shipped CLI.

Two independent problems, one cause:

1. **Size.** Every install of `dart_bindgen` downloads a Graphviz renderer to
   generate Dart bindings.
2. **Correctness of the dependency declaration.** The package is in the wrong
   section. It works today only *because* tsup inlines it — move the build to
   externalise devDependencies, or have a consumer import from source, and it
   becomes a missing-module crash at runtime.

**Fix applied:** `L-07`'s decoupling. `src/utils/visualizeGraph.ts` moved to
`tools/graph.ts` with its own yargs entry (`pnpm graph`), consuming the
`LinkReport` that `runLinker` now returns. The import disappeared from the CLI
entry graph; `@viz-js/viz` is correctly a devDependency again and is no longer
reachable from `src/`.

The cheapest win in the audit: one file move, **1.52 MB**.
