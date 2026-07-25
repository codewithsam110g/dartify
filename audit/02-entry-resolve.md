# 02 — Entry, Resolution & Context

Covers `src/cli.ts`, `src/transpiler.ts`, `src/context.ts`.

---

## R-01 — Extensionless relative imports silently fail to resolve `[verified]`

**`src/transpiler.ts:86-96`** — the default (no-tsconfig) project is built with:

```ts
module: ESNext,
moduleResolution: NodeNext,
```

Under `NodeNext`, an ESM-style relative import **must** carry an explicit
extension. `import { X } from "./base"` does not resolve; `"./base.js"` does.

### Repro

```ts
// base.d.ts
export interface BaseThing { a: string; }
// derived.d.ts
import { BaseThing } from "./base";
export interface UsesInProp { p: BaseThing; }
```

```
pnpm dev -d derived.d.ts -l
→ 📦 Package dependencies: 0        ← base.d.ts never parsed
→ ❌ Broken Link: ...::UsesInProp
```

Change to `"./base.js"`:

```
→ 📦 Package dependencies: 1
→ ✅ Graph Verification Complete: 5 valid, 0 broken.
```

### Why this matters more than it looks

`three.js` resolves 419 dependencies flawlessly *because it is modern ESM with
explicit `.js` extensions*. The bulk of DefinitelyTyped (`@types/*`) is
CommonJS-style with extensionless imports — those will silently produce empty
dependency graphs and emit files full of unresolved type names. The current
green three.js result is not evidence that multi-file resolution is solved.

**Fix direction:** detect module style per package (`package.json#type`,
presence of extensions) or default to `moduleResolution: "node"` / `"Bundler"`
with `NodeNext` as opt-in. Note `tsconfig.json` itself uses `Bundler` — the
runtime project config and the repo's own config disagree.

---

## R-02 — Unresolved dependencies are reported only under `--enable-logs` `[inspection]`

**`src/transpiler.ts:113-116`, `262-340`** — `detectUnresolvedDeps()` is gated
behind `if (this.debug)`. A default run that resolves nothing looks identical to
a default run that resolves everything.

Combined with `R-01`, the failure mode is: user points the tool at an `@types`
package, gets `.dart` files out, and only discovers every cross-file type is
missing when `dart analyze` fails.

**Fix direction:** always compute the unresolved count; print a one-line summary
unconditionally; reserve the detailed listing for `-l`. Consider a non-zero exit
under a `--strict` flag.

---

## R-03 — `inputRoot` is derived from the first input file only `[inspection]`

**`src/transpiler.ts:142-144`**

```ts
const firstInputFile = this.inputFiles.keys().next().value;
const inputRoot = firstInputFile ? dirname(firstInputFile) : ".";
```

With multiple input files in sibling directories, every output path is computed
relative to the *first* file's directory. `deriveOutputPath`
(`emitterPhase.ts:128-155`) then strips leading `../` segments to stop paths
escaping `outDir`, which silently flattens distinct trees into each other.

Two files at `a/x.d.ts` and `b/x.d.ts` collide at `outDir/x.dart` — the second
write wins.

**Fix direction:** compute the longest common ancestor of all input files.

---

## R-04 — `Map` iteration order is the emission order `[inspection]`

**`src/transpiler.ts:118-123`** — input files then package deps, each in `Map`
insertion order, which derives from `getProgram().getSourceFiles()` order.

Output is therefore deterministic *for a given TypeScript version and
filesystem*, but not stable across those. For snapshot testing this is a
latent flake source. **Fix direction:** sort file lists before iteration.

---

## R-05 — `resolveAndCategorize` adds every program file to the ts-morph project `[inspection]`

**`src/transpiler.ts:184-196`** — loops all program source files and calls
`addSourceFileAtPathIfExists ?? addSourceFileAtPath` on each, including the 51
stdlib files. They are categorised as stdlib and skipped for parsing, so this is
correct but wasteful — ts-morph wrapper objects are materialised for files that
are never read.

Low priority; noted because it dominates the fixed cost on small inputs
(h3 = 0.5 s for one 500-line file).

---

## R-06 — `isStdlib` is a hardcoded substring list `[inspection]`

**`src/transpiler.ts:211-216`**

```ts
if (filePath.includes("@types/node/")) return true;
if (filePath.includes("undici-types/")) return true;
if (/typescript\/lib\/lib\..*\.d\.ts$/.test(filePath)) return true;
```

Duplicated — with a different list — in `parser/type/typeRefernce.ts:47-53`.
The two must agree or deps get recorded for files that are never parsed
(producing phantom broken links). They currently do agree, by coincidence.

**Fix direction:** single exported predicate, imported by both.

---

## R-07 — CLI `--version` is hardcoded to `v0.3` `[verified]`

**`src/cli.ts:64`** — `.version("v0.3")` while `package.json` says `0.5.0`.
Read the version from `package.json`.

---

## R-08 — `TranspilerOptions.debug` conflates two concerns `[inspection]`

`debug` drives: verbose console logging, resolution summary, unresolved-dep
detection, and per-symbol emission logging. `--enable-logs` is documented in the
README as enabling "IR dump" (a v0.5 feature) — that IR-dump path went through
`src/log.ts`, which is now unreferenced (`D-05`). So `-l` no longer does what
the README says it does.

**Fix direction:** separate `--verbose` (console) from `--emit-ir` (IR dump to
disk) and reconnect the latter to `log.ts`, or drop the README claim.

---

## Context (`src/context.ts`)

## R-09 — Parser state is threaded through a mutable global `[inspection]`

`transpilerContext.currentFQN` and `.currentDeps` are set/restored by every
parser via manual save/restore pairs:

```ts
const prevFQN = transpilerContext.currentFQN;
transpilerContext.currentFQN = prevFQN + "|" + name;
...
transpilerContext.currentFQN = prevFQN;
```

This appears **31 times** across `parser/interface.ts`, `parser/class.ts`,
`parser/function.ts`, `parser/type/typeLiterals.ts`. Every occurrence is a
manual, unbalanced-on-throw restore — `parser/class.ts:26-29` and siblings do
not use `try/finally`, so a parse error mid-declaration leaves `currentFQN`
corrupted for every subsequent declaration in the file.

`symbolGeneration.ts` catches per-statement errors (`:54-66`) and continues, so
this is reachable: one malformed declaration silently poisons the FQNs — and
therefore the hoisted anonymous class names — of everything after it.

**Fix direction:** a `withScope(name, fn)` helper using `try/finally`, or pass
scope explicitly as a parameter instead of via the singleton.

## R-10 — `currentDeps` is cleared per declaration, not per variable `[inspection]`

**`symbolGeneration.ts:200-219`** — `clearDeps()` is called once for a whole
`VariableStatement`, then every declaration in it is registered with
`Array.from(transpilerContext.currentDeps)`. For `declare var a: A, b: B;` both
`a` and `b` receive the union `{A, B}`.

Over-approximates the graph. Harmless for link *verification*; produces spurious
imports once `E-08` (import emission) lands.

## R-11 — The singleton is never reset between runs `[inspection]`

`TranspilerContext.getInstance()` is module-level and `SymbolTable.clear()` is
never called by `Transpiler`. Two `Transpiler` instances in one process share
one symbol table. Only reachable from tests and programmatic API use today —
but `X-01` (restoring `transpileFromString`) makes it immediately reachable.

---

## R-12 — Errors inside `declare module` / `namespace` were discarded `[verified]` **[FIXED — audit pass]**

**`phase/symbolGeneration.ts`**, `processModuleDeclaration`:

```ts
await this.walkStatements(statements, [], filePath);
//                                    ^^ a fresh array, never read again
```

`walkStatements` catches per-statement failures and pushes them into the array
it is handed. Every other caller passes the run's `errors`; the module handler
passed a literal `[]`. So a parse failure anywhere inside a `declare module` or
`namespace` was pushed into a value with no reader and vanished — not logged,
not surfaced by `--enable-logs`, and invisible to the stress tier, which only
observes what escapes `transpileFromString` entirely.

This is a silent-failure hole in the exact construct the corpus leans on:
leaflet has 15 namespaces, and `declare module` is how most of DefinitelyTyped
is written.

**Nothing was actually being swallowed today.** `errors` is now threaded through
`processStatementDeclaration` to the module handler, and a `--enable-logs` run
over leaflet reports nothing new. A whole-corpus probe agrees: over 1,649 files,
`result.errors` is empty for every one. The hole was real; it just had nothing
in it.

**Related, and still open:** even at the top level, `errors` is only printed
`if (transpilerContext.getIsLogging())`. Without `-l`, a parse failure produces
a silently smaller symbol table. That is design principle 1's problem, and it
belongs with the diagnostics work in S6 rather than being papered over here.
