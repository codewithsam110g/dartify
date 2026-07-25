# 06 — Symbol Table & Linker

Covers `src/symbol/{index,table}.ts`, `src/engine/phase/symbolGeneration.ts`,
`src/engine/phase/linkerPhase.ts`, `src/utils/visualizeGraph.ts`.

This is the architecture's centrepiece and the area under active development.
Phase 2 is where overload resolution and declaration augmentation are intended
to live — the two problems that defeated both the pre-5-pass and 5-pass designs.

---

## L-01 — Cross-file dep FQNs name the *importing* file, not the *declaring* file `[verified]`

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

`resolveRealFQN` (`linkerPhase.ts:38-95`) falls back to matching on the bare
symbol *name* across every key in the table, so it finds `base.d.ts::BaseThing`
anyway and reports success. **The fuzzy matcher is masking a systematic FQN
defect.** three.js reports 0 broken links partly because of this.

The moment import emission (`E-08`) reads these FQNs to decide *which file to
import*, it will emit imports pointing at the importing file — or, via the
fuzzy fallback, at an arbitrary same-named symbol in an unrelated file.

**Fix before writing the import emitter.** The comment at `typeRefernce.ts:8-12`
explains why the identifier symbol is preferred over the resolved type symbol
(alias-to-primitive preservation) — that reasoning is correct and should be
kept; the fix is to additionally follow `getAliasedSymbol()` when the
declaration is an import specifier.

---

## L-02 — Dotted qualified names never match table keys `[verified]`

Deps record the type name as written: `typeName.getText()`
(`typeRefernce.ts:19`) yields `"L.Control.Attribution"`. The symbol table stores
module scope pipe-separated: `leaflet.d.ts::Control|Attribution`.

`resolveRealFQN` splits keys on `|` and compares only the last segment
(`linkerPhase.ts:57-63`), so `"Attribution"` is compared against the full dotted
string `"L.Control.Attribution"` and never matches.

### Repro

```
pnpm dev -d "def_files/leaflet/*.d.ts" -l
→ ✅ Graph Verification Complete: 276 valid, 42 broken.
```

All 42 failures are qualified names — `Control.Attribution`, `Control.Layers`,
`Control.Scale`, `Control.Zoom`, `L.Control.Attribution`, `L.Coords`,
`TileLayer.WMS`. Zero are genuinely-absent symbols.

**Fix direction:** normalise `.` → `|` on the dep side before matching, and
strip a leading `export as namespace` alias (`L.`) when it matches the file's
declared global name.

---

## L-03 — Ambiguous matches silently resolve to `matches[0]` `[inspection]`

**`linkerPhase.ts:66-94`** — the preference order is: same-file match, then
non-namespaced primary, then `matches[0]`. The collision warning at `:84-92` is
**unreachable for the common case** because both earlier `return`s fire first;
it only prints when neither preference matched, and then still returns
`matches[0]`.

For link *verification* this is a benign over-approximation. For import
emission it silently selects a wrong file. Every `.d.ts` corpus has repeated
type names (`Options`, `Config`, `Event`).

**Fix direction:** make ambiguity a first-class diagnostic with source location
(`I-10`), and prefer the dep's own file once `L-01` is fixed — at which point
most ambiguity disappears.

---

## L-04 — Inheritance edges are absent from the graph `[verified]`

See `P-01`. Recorded here because the consequence is a linker/graph consequence:
`dependency_graph.svg` currently renders a graph that is *missing its most
important edges*, and the "all green, no red" state it shows is partly an
artefact of not looking at heritage at all.

---

## L-05 — Overload grouping and declaration augmentation are not implemented `[verified]`

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

## L-06 — `resolveRealFQN` is duplicated between linker and visualiser `[inspection]`

`linkerPhase.ts:38-95` and `utils/visualizeGraph.ts:16-40` contain two
near-identical copies of the fuzzy matcher, with the visualiser's copy silently
omitting the collision warning. They will drift.

**Fix direction:** extract to `src/symbol/resolve.ts` and import from both.

---

## L-07 — The graph visualiser is wired into the production pipeline `[verified]`

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

## L-08 — `LinkState` is computed and then discarded `[inspection]`

`runLinker` builds a full `LinkResult` per symbol (`linkerPhase.ts:98-169`),
counts valid/invalid, prints them under `debug`, and returns `void`. Nothing is
stored on the `Symbol`, and `emitAllFiles` re-reads the raw table with no
knowledge of link state.

So the emitter cannot: skip broken symbols, emit `// unresolved: X` markers, or
generate imports from resolved edges. The graph is computed for its own sake.

**Fix direction:** persist resolved edges onto the symbol
(`resolvedDeps: string[]`) — that array *is* the import list.

---

## L-09 — The bottom-up pre-sort reads only the first symbol's deps `[inspection]`

**`linkerPhase.ts:179-183`**
```ts
const aDeps = a[1][0]?.deps?.length || 0;
```

For an FQN with several registered symbols (overloads, augmentations), only
`[0]`'s dep count informs the sort — while `checkDeps` correctly unions deps
across *all* symbols at that FQN (`:123-128`). A heuristic only, so this is a
performance nit rather than a correctness bug.

---

## L-10 — `SymbolTable` has no removal or replacement API `[inspection]`

`symbol/table.ts` exposes `register`, `lookup`, `has`, `getAll`,
`getSymbolTable`, `clear`. Phase 2 must *replace* IR (merging augmentations,
renaming overloads) and will need `unregister` / `replace`, or will end up
mutating through the `getSymbolTable()` escape hatch — which returns the live
internal `Map` by reference (`:48-50`), so callers can already corrupt
invariants silently.

**Fix direction:** add explicit mutation methods before P3, and consider
returning a readonly view from `getSymbolTable`.

---

## L-11 — Module scoping is textual, with no distinction between namespace kinds `[inspection]`

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
