# 08 — Dead Code & Legacy

Covers `src/engine/passes/**`, `src/engine/transformers/**`, `src/legacy/**`,
`src/log.ts`.

**~4,300 of ~7,900 `src` lines are currently unreachable.** None of it is on the
execution path; all of it is still type-checked, coverage-counted and
bundle-eligible.

Verification:
```
grep -rn "declarationTransformers|typeTransformer|declarationPass|emissionPass|typePass" \
     src test --include="*.ts" | grep -vE "^src/engine/(passes|transformers)/"
→ (no output)

grep -rn "legacy" src test --include="*.ts" | grep -v "^src/legacy/"
→ (no output)
```

---

## D-01 — The 5-pass pipeline is orphaned but still type-checked `[verified]`

`src/engine/passes/**` (~730 lines) and `src/engine/transformers/**` (~800
lines). Between them they account for **5 of the 15 `tsc --noEmit` errors**:

```
src/engine/passes/declarationPass.ts(225,36): error TS2554: Expected 2 arguments, but got 1.
src/engine/transformers/declarationTransformers.ts(40,27): error TS2339: Property 'getCurrentFileName' does not exist on type 'TranspilerContext'.
src/engine/transformers/declarationTransformers.ts(43,62): error TS2339: ...
src/engine/transformers/typeTransformer.ts(47,27):  error TS2339: ...
src/engine/transformers/typeTransformer.ts(50,62):  error TS2339: ...
```

`getCurrentFileName` was removed from `TranspilerContext` during the refactor
(`context.ts` still exposes `currentFQN`; S2 removed `currentDeps` and derives
dependencies by walking each completed declaration IR instead).

`tsconfig.json` also still declares `@passes/*` and `@transformers/*` path
aliases pointing here.

---

## D-02 — **Do not delete the transformers yet — mine them first** `[inspection]`

`engine/transformers/` holds the only working implementations of two things
Phase 2 needs:

| What | Where | Why it matters |
|---|---|---|
| Overload grouping + renaming | `declarationTransformers.ts` | The `f_1`/`f_2` + shared `@JS("f")` scheme that shipped in v0.4 |
| Recursive IR type walker | `typeVisitor.ts` (268 lines) | Walks every `IRType` in a declaration — needed for nested `TypeLiteral` hoisting, and for the `Unsupported`-node collection that the named-alias degradation strategy requires |
| Literal canonicalisation | `typeVisitor.ts:255` (`canonicalizeLiteral`) | Structural dedup of identical anonymous shapes — currently the parse-time hoister mints a fresh `Anon_*` per site with no dedup |

`typeVisitor`'s walker is the more valuable of the two: parse-time hoisting
(`parser/type/typeLiterals.ts`) only fires for a `TypeLiteral` in *direct*
position. A literal nested inside a union, array or generic argument is never
hoisted — `Tasks.md` tracks this as "Fix nested `TypeLiteral` hoisting from
within unions, arrays, and generics", and the recursive walker is the mechanism.

**Sequencing:** port these into the linker phase during P3, then delete the
directories in the same commit. Deleting earlier loses the reference
implementation; deleting later leaves `tsc` broken.

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

## D-06 — Dead code inflates the published bundle `[inspection]`

`package.json` builds with `tsup src/cli.ts --format esm`, which tree-shakes
from the entry point — so unreachable modules should not ship. Worth verifying
after Stage 0 with a `dist/` size comparison, since the v0.4 CHANGELOG cites a
"~17% reduction in final bundled package size" from a previous legacy purge and
that measurement is the natural regression check.

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
