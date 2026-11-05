# 06 — Symbol Table & Linker

Covers `src/symbol/{index,table}.ts`, `src/engine/phase/symbolGeneration.ts`,
`src/engine/phase/linkerPhase.ts`, `src/symbol/resolve.ts`, and
`tools/graph.ts`.

This is the architecture's centrepiece and the area under active development.
Phase 2 is where overload resolution and declaration augmentation are intended
to live — the two problems that defeated both the pre-5-pass and 5-pass designs.

## S2 closure

The link layer now consumes structured checker-backed reference targets,
persists report edges and use-site identities, and never resolves ambiguity by
arbitrary selection. Leaflet closes at 328/328 symbols and 1,050/1,050 edges.
Three.js has 8,184 resolved edges, 0 ambiguous edges and 31 explicit missing
edges attributable to the absent `webxr` and `@webgpu/types` packages. Those
misses are intentionally not hidden by name fallback.

---

## L-01 — Cross-file dep FQNs name the *importing* file, not the *declaring* file `[verified]` **[FIXED — S2]**

**`parser/type/typeRefernce.ts:24-30`**
```ts
const identSymbol = typeName.getSymbol();
if (identSymbol) {
  const declarations = identSymbol.getDeclarations();
  sourceFilePath = declarations[0].getSourceFile().getFilePath();
}
```

For an imported type, `typeName.getSymbol()` returns the **alias** symbol whose
declaration is the local `ImportSpecifier` — in the importing file. The original
declaration is only reachable via `getAliasedSymbol()`.

### Repro

`base.d.ts` declares `BaseThing`; `derived.d.ts` imports and uses it. The linker
reports:

```
❌ Broken Link: .../derived.d.ts::UsesInProp
   Reason: Missing '.../derived.d.ts::BaseThing'
                    ^^^^^^^^^^ wrong file — BaseThing lives in base.d.ts
```

### Why this is currently invisible

`resolveRealFQN` (`symbol/resolve.ts:24-68`) falls back to matching on the bare
symbol *name* across every key in the table, so it finds `base.d.ts::BaseThing`
anyway and reports success. **The fuzzy matcher is masking a systematic FQN
defect.** three.js reports 0 broken links partly because of this.

The moment import emission (`E-08`) reads these FQNs to decide *which file to
import*, it will emit imports pointing at the importing file — or, via the
fuzzy fallback, at an arbitrary same-named symbol in an unrelated file.

### Re-measured before S2

Over three.js, **1,664 of 2,542 recorded dep edges** name the importing file
rather than the declaring file. The fuzzy matcher still reports 2,004/2,004
symbols linked, but a checker-backed comparison of aliased references found
**19 use sites resolved to the wrong real declaration**. Examples:

- `core/UniformsGroup.d.ts`'s `Uniform` resolves to
  `nodes/core/UniformNode.d.ts::Uniform`, not `core/Uniform.d.ts::Uniform`.
- `renderers/common/Renderer.d.ts`'s `RenderItem` resolves to the WebGL
  `RenderItem`, not `renderers/common/RenderList.d.ts::RenderItem`.

So the masking is no longer hypothetical: three.js's zero-broken headline
contains verified false-positive links.

A renamed-import probe exposes a second half of the defect:

```ts
// base.d.ts
export interface Foo {}
// derived.d.ts
import { Foo as Bar } from "./base";
export interface Uses { x: Bar }
```

records `/derived.d.ts::Bar`. Correcting only the file would produce
`/base.d.ts::Bar`, which is still not the declared symbol `/base.d.ts::Foo`.
The aliased symbol's **target name as well as target file** is the dependency
identity.

**Fix before writing the import emitter.** The comment at `typeRefernce.ts:8-12`
explains why the identifier symbol is preferred over the resolved type symbol
(alias-to-primitive preservation) — that reasoning is correct and should be
kept. When it is an alias, follow `getAliasedSymbol()` and use the target
symbol's declaration file **and target name**. Also attach the resolved identity
to the IR use site; fixing only the symbol-level dep list leaves `Bar` in the
emitted type (`L-14`).

---

## L-02 — Dotted qualified names never match table keys `[verified]` **[FIXED — S2]**

Deps record the type name as written: `typeName.getText()`
(`typeRefernce.ts:19`) yields `"L.Control.Attribution"`. The symbol table stores
module scope pipe-separated: `leaflet.d.ts::Control|Attribution`.

`resolveRealFQN` splits keys on `|` and compares only the last segment
(`symbol/resolve.ts:39-47`), so `"Attribution"` is compared against the full dotted
string `"L.Control.Attribution"` and never matches.

### Repro

```
pnpm dev -d "def_files/leaflet/*.d.ts" -l
→ ✅ Graph Verification Complete: 274 valid, 44 broken.
```

The 44 broken symbols propagate from **14 raw missing edges**, and all 14 are
qualified names — `Control.Attribution`, `Control.Layers`,
`Control.Scale`, `Control.Zoom`, `L.Control.Attribution`, `L.Coords`,
`TileLayer.WMS`. Zero are genuinely-absent symbols.

> **Baseline moved 42 → 44 in S1.1, and that is an improvement.** Fixing `T-13`
> restored dependency edges that cache hits had been dropping, which exposed two
> more symbols (`Marker`, `marker`) that transitively depend on
> `L.Control.Attribution` via `Handler → Map`. They were never actually linked;
> the linker just could not see the edge. Do not read the increase as a
> regression — the fix for `L-02` should take all 44 to zero.

**Fix direction:** normalise `.` → `|` on the dep side before matching, and
strip a leading `export as namespace` alias (`L.`) when it matches the file's
declared global name. That alias is currently ignored with every other export
statement, so either capture per-file namespace-export metadata during symbol
generation or allow only a unique same-file suffix match; the resolver cannot
currently verify that `L` is the declared global name.

---

## L-03 — Ambiguous matches silently resolve to `matches[0]` `[inspection]` **[FIXED — S2]**

**`symbol/resolve.ts:24-68`** — the preference order is: same-file match, then
non-namespaced primary, then `matches[0]`. The ambiguity callback runs only when
neither preference matched, and resolution still returns `matches[0]`. Thus the
common repeated-name case silently chooses a symbol; with debug disabled even
the narrow callback case is invisible.

For link *verification* this is a benign over-approximation. For import
emission it silently selects a wrong file. Every `.d.ts` corpus has repeated
type names (`Options`, `Config`, `Event`).

**Fix direction:** make ambiguity a first-class diagnostic with source location
(`I-10`), and prefer the dep's own file once `L-01` is fixed — at which point
most ambiguity disappears.

---

## L-04 — Inheritance edges are absent from the graph `[verified]` **[FIXED — S2]**

See `P-01`. Recorded here because the consequence is a linker/graph consequence:
`tools/graph.ts` currently renders a graph that is *missing its most
important edges*, and the "all green, no red" state it shows is partly an
artefact of not looking at heritage at all.

---

## L-05 — Overload grouping and declaration augmentation are not implemented `[verified]` **[FIXED — S4 matrix]**

The atomic semantic pass now retains function facets, numbers every overload,
merges compatible interface/interface and class/interface groups, synthesizes
constructor companions, folds default value objects into static members,
preserves type/value facets, and diagnoses unsafe groups without data loss.
External augmentations are modeled, visibly reported, and suppressed by the
locked S4 policy. Original finding follows.

This is the intended Phase 2 feature work, not a defect — recorded so the
audit reflects reality.

`SymbolTable.register` (`symbol/table.ts:21-25`) appends to a `Symbol[]` per
FQN, so multiple declarations sharing a name are *preserved* — the data model is
ready. `runLinker` currently only verifies reachability; it never merges,
renames, or rewrites IR.

Consequences visible in output today:

```dart
class SimpleOverload {
  @JS("f") external num f(String a);
  @JS("f") external String f(String a, num b);   // duplicate member — invalid Dart
}
```

The only working implementation of overload grouping in the tree is in the
**dead** `engine/transformers/declarationTransformers.ts` and in
`legacy/transpiler.ts:576`. Mine both before deleting.

Augmentation targets, with `js_facade_gen` reference cases:
- `interface` + `var` merge → §4.1, §4.2 (note: `var`-side members become `static`)
- `interface` + `var` default form → §4.3
- namespace collision renaming → §8.4, §8.5

`def_files/legacy_tests/declaration_augmentation.d.ts` and `overloads.d.ts` are
the fixtures.

---

## L-06 — `resolveRealFQN` was duplicated between linker and visualiser `[inspection]` **[FIXED — S0.4]**

The matcher now lives in `src/symbol/resolve.ts` and is shared by
`linkerPhase.ts` and `tools/graph.ts`. Original finding follows.

`linkerPhase.ts:38-95` and `utils/visualizeGraph.ts:16-40` contain two
near-identical copies of the fuzzy matcher, with the visualiser's copy silently
omitting the collision warning. They will drift.

**Fix direction:** extract to `src/symbol/resolve.ts` and import from both.

---

## L-07 — The graph visualiser was wired into the production pipeline `[verified]` **[FIXED — S0.4]**

The visualiser now lives at `tools/graph.ts`, consumes `Transpiler.analyze()`'s
`LinkReport`, writes only when explicitly invoked with `pnpm graph`, and is no
longer reachable from the published CLI bundle. Original finding follows.

**`linkerPhase.ts:2`**
```ts
import { generateDependencyGraphSVG } from "../../utils/visualizeGraph";
```
**`linkerPhase.ts:217`**
```ts
await generateDependencyGraphSVG(path.join(process.cwd(), "dependency_graph.svg"));
```

Runs on every invocation regardless of `--enable-logs`, writing
`dependency_graph.svg` into `process.cwd()` — not `outDir`. The file is
committed at repo root (64 KB) and any run of the tool from the repo root
overwrites it, so it shows up as a spurious diff. (This audit hit exactly that
and had to `git checkout` it back.)

**`utils/visualizeGraph.ts:56-57`**
```ts
console.log("orignal name", fqn);
console.log("clean name", nodeA);
```
Two lines per symbol on stdout, unconditionally — 1,943 symbol pairs on a
three.js run.

### The graph is worth keeping; the coupling is not

The SVG is the author's correctness instrument for the linker — reading the
graph is how link regressions get spotted, and it is the only view of the
whole-program symbol relation that currently exists. It stays. What has to go
is its presence in the shipped code path:

- `linkerPhase` should not know the visualiser exists. `runLinker` already
  computes `LinkState` (`L-08`); the visualiser is a **consumer** of that value,
  not a step inside its production.
- The import makes a devDependency reachable from the published binary — see
  **`D-07`**, which measures the cost at ~70% of `dist/cli.js`.

**Fix direction:** invert the dependency.

1. `runLinker` returns `LinkState` and calls nothing else.
2. Move `utils/visualizeGraph.ts` out of the shipped tree — `tools/graph.ts`,
   built and run separately (`pnpm graph -d <glob>`), importing the phases and
   rendering the returned `LinkState`.
3. Delete the two `console.log` lines.
4. Write to the given output path, defaulting under `outDir`, never `cwd`.
5. Add `dependency_graph.svg` to `.gitignore` and untrack the committed copy —
   it is a generated artifact, and a regenerated one should not read as a source
   change.

This keeps the fun intact and makes it strictly better: the tool can then render
a graph *without* also emitting Dart, and can grow visualiser-only features
(colouring by broken/valid, filtering to one file's subgraph) with no risk to
the compiler.

---

## L-08 — Resolved edges are not persisted `[inspection]` **[FIXED — S2]**

`LinkReport.edges` is the canonical persisted graph, every symbol receives
`resolvedDeps`, and reference IR nodes receive `resolvedFQN`. The graph renderer
consumes the report rather than invoking the resolver again.

`runLinker` now returns a `LinkReport` containing the state for every real FQN,
so the old "computed then discarded" wording is no longer true. What remains:
no resolved edge is stored on `Symbol`, no use-site reference is linked to its
target, and `emitAllFiles` still re-reads only the raw table. Even
`tools/graph.ts` re-runs `resolveRealFQN` over raw deps to draw its edges because
the report contains states but not edges.

So the emitter cannot: skip broken symbols, emit `// unresolved: X` markers, or
generate imports from resolved edges. The graph is computed for its own sake.

**Fix direction:** persist resolved edges onto the symbol
(`resolvedDeps: string[]`) as the file import list, and persist the resolved
target on each reference use site (`L-14`).

---

## L-09 — The bottom-up pre-sort reads only the first symbol's deps `[inspection]`

**`linkerPhase.ts:152-158`**
```ts
const aDeps = a[1][0]?.deps?.length || 0;
```

For an FQN with several registered symbols (overloads, augmentations), only
`[0]`'s dep count informs the sort — while `checkDeps` correctly unions deps
across *all* symbols at that FQN (`:123-128`). A heuristic only, so this is a
performance nit rather than a correctness bug.

---

## L-10 — `SymbolTable` has no removal or replacement API `[verified]` **[PARTIAL — S4]**

The table now exposes validated `replace`, `unregister`, and atomic `apply`
operations, and copied map/array structure prevents direct insertion or group
append. The post-S4 audit found that the copied groups still contain the live
`Symbol` objects. Mutating `snapshot.get(fqn)[0].facets[0].ir` or `.deps`
immediately changes a subsequent `lookup()`. The `readonly` types are therefore
compile-time guidance, not an invariant boundary.

S4 closed the missing-API half but overstated snapshot isolation. Pre-S5 task
4.11 now locks the resolution: mutation happens only on run-owned transactional
drafts, while emission, reports, tests, and other consumers receive deeply
detached reads or the owned linked-program value. There will be no global table
whose lifetime makes borrowed objects accidentally cross runs. Add nested IR,
facet, dependency, resolved-dependency, and namespace-alias mutation probes;
benchmark the three.js cost before considering any narrower optimization.
Original finding follows.

`symbol/table.ts` exposes `register`, `lookup`, `has`, `getAll`,
`getSymbolTable`, `clear`. Phase 2 must *replace* IR (merging augmentations,
renaming overloads) and will need `unregister` / `replace`, or will end up
mutating through the `getSymbolTable()` escape hatch — which returns the live
internal `Map` by reference (`:48-50`), so callers can already corrupt
invariants silently.

**Fix direction:** add explicit mutation methods before P3, and consider
returning a readonly view from `getSymbolTable`.

---

## L-11 — Module scoping is textual, with no distinction between namespace kinds `[inspection]` **[FIXED — S4]**

Every facet now carries explicit namespace, external-module, or global scope
records. The same records drive FQN creation, namespace name expansion,
qualified JS annotations, global hoisting, and augmentation suppression with a
canonical module target. Original finding follows.

**`symbolGeneration.ts:239-253`** — `processModuleDeclaration` appends
`moduleName + "|"` for every `ModuleDeclaration`. That covers
`declare module "x"` (quoted, an external module), `declare namespace Y`
(internal), and `declare global` identically, and the quotes survive into the
FQN (`"h3"|isValidCell`) to be stripped later by `stripQuotes` and
`extractJsPrefix`.

Consequences:
- An ambient external module and a namespace of the same name are
  indistinguishable in the table.
- `declare global` contributes a `global|` scope segment that should instead
  hoist to file scope.
- Quote stripping is spread across three places
  (`utils/utils.ts:2`, `emitterPhase.ts:117-120`, `linkerPhase` implicitly).

`Tasks.md` lists "Fix ambient declarations using an encapsulatory class for each
module" — this finding is the mechanical half of that item.

---

## L-12 — A direct missing dependency is reported as indirect `[verified]` **[FIXED — S2]**

`checkDeps(missingPseudoFqn)` returns `NotLinkedDirect`, but its caller
immediately wraps that result as `NotLinkedIndirect` for the owning symbol
(`linkerPhase.ts:112-125`). Only real table FQNs are inserted into
`LinkReport.results`, so a top-level report entry can **never** have
`NotLinkedDirect`.

Minimal probe:

```text
A deps: [Missing]
report[A] = NotLinkedIndirect via [Missing]
```

The graph's red/blue verdict is unaffected, but the public state model and
diagnostic wording are false. Define the states relative to the reported symbol:
its immediate missing edge is direct; failure reached through another real
symbol is indirect. Add direct, indirect and cyclic fixtures before changing
the DFS.

---

## L-13 — Graph node IDs collapse distinct files with the same basename `[verified]` **[FIXED — S2]**

`tools/graph.ts:61-66` builds a Graphviz node ID from
`basename(file) + scope`. Two declarations with the same file basename and
scope in different directories become one visual node.

This is live in three.js. Four real symbols collapse into two graph nodes:

```text
core/Uniform.d.ts::Uniform
renderers/common/Uniform.d.ts::Uniform

core/UniformsGroup.d.ts::UniformsGroup
renderers/common/UniformsGroup.d.ts::UniformsGroup
```

The graph is a correctness instrument, so this is not merely cosmetic. Use a
stable unique ID derived from the full FQN and keep the short basename/scope as
the human-readable label.

---

## L-14 — Type-reference use sites have no resolved symbol identity `[verified]` **[FIXED — S2]**

`IRType` stores a `TypeReference`'s written `name`, while dependency collection
writes an unrelated string into the owning `Symbol.deps`. The linker can resolve
the latter, but it has no path back to the exact IR node that produced it.

The renamed-import probe from `L-01` leaves:

```text
Symbol.deps       = ["/derived.d.ts::Bar"]
IRType.name       = "Bar"
real declaration  = "/base.d.ts::Foo"
```

Even a perfect `resolvedDeps` import list would still make the emitter write
`Bar`, which does not exist in the generated `base.dart`. Qualified namespace
references and S4 collision renames have the same problem.

**Fix direction:** linking must attach a language-independent target identity
to each reference node — for example `IRType.resolvedFQN` or an edge ID that
maps to it. `resolvedDeps` remains the file-level import set; it is not a
substitute for use-site linking.

---

## L-15 — Dependency-resolution exceptions silently remove graph edges `[inspection]` **[FIXED — S2]**

`collectTypeDep` wraps its complete body in `try/catch {}` and returns nothing
on any exception (`typeRefernce.ts:14-59`). The linker cannot diagnose an edge
that was never recorded, so the failure mode is a falsely green graph rather
than a broken link.

No swallowed exception was found in the measured corpus, but this is the same
defect class as `R-12`: an error in graph construction is converted into absent
data. Catch only expected checker failures, return a structured diagnostic, and
cover the fallback path with a fixture.

---

## L-17 — Constructor-companion folding deletes callable facets `[verified]` **[FIXED — post-S4 review]**

S4 synthesized an `IRClass` whenever a variable's `prototype` resolved to an
interface. `IRClass` has no call- or construct-signature facet, so callable and
constructable targets were then deleted without a diagnostic.

The merge now rejects target call/construct signatures and value-side call
signatures before synthesis. Both symbols remain available, and
`DECLARATION_MERGE_CONFLICT` records the unsupported fold. Focused tests assert
the signatures and variable declaration still exist after semantics.

---

## L-18 — Value-side index signatures disappear during interface folding `[verified]` **[FIXED — post-S4 review]**

For `interface Catalog` plus `var Catalog: { [key: string]: number }`, S4 copied
properties, methods, and accessors but not the anonymous shape's index
signatures, then removed that shape.

Indexed value shapes are now outside the supported merge matrix. The semantic
pass preserves the interface, variable facet, and explicitly marked anonymous
shape, and emits a merge diagnostic. This leaves the index contract available
for the S5 index-signature backend instead of converting unsupported structure
into silent data loss.

---

## L-19 — Global terminal-name fallback crosses external-module boundaries `[verified]`

Two independent external modules were generated in one in-memory project:

```ts
// a.d.ts
export interface Uses { value: Missing }
// b.d.ts
export interface Missing { marker: string }
```

The reference in `a.d.ts` has no checker target and enters the syntax fallback.
After exact and same-file resolution fail, `resolveReference` searches every
table key by terminal name. It selects `/b.d.ts::Missing` as `uniqueGlobal`,
sets that identity on the IR use site, and reports 2 valid / 0 broken symbols.
An exported declaration in another external module is not lexically visible
without an import, so this is a silently wrong link and would drive a wrong S5
import.

Carry source-file module/script visibility into fallback resolution. A syntax
fallback from an external module may use declarations in its own module and
explicitly imported/ambient-global targets, never an arbitrary unique export.
Retain terminal fallback only for declarations proven to share global scope,
and fixture external-module, script-global, import, and ambiguity cases.
