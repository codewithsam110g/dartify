# dartify — Road to v1

Sequenced from [`audit/FINDINGS.md`](audit/FINDINGS.md). Every task references a
finding ID; the audit holds the per-line reasoning.

---

## Release policy

**The next published version is `1.0.0`. There is no 0.6, 0.7, 0.8 or 0.9.**

The `v0.6 → v0.9` ladder in `ROADMAP.md` was drawn against the 5-pass
architecture and a single-file world view. Both are gone. Shipping four more
point releases against a plan that no longer describes the program is busywork
that also broadcasts "still not ready" four more times.

What follows are **internal stages**, not releases. They land on
`refactor/orchestration`, which may be broken between them. `main` keeps the
published `0.5.0` until v1 is ready to replace it wholesale.

| | |
|---|---|
| **Published today** | `0.5.0` on `main` |
| **Next publish** | `1.0.0` |
| **Optional** | `1.0.0-beta.n` under the npm `next` tag after Stage 5, for real-world feedback before the `latest` promotion |
| **After** | `2.0.0` — `dart:js_interop` backend behind a CLI flag |

---

## Product direction

**v1 — a drop-in replacement for `js_facade_gen`, targeting `package:js`.**

Deliberate, not inertia. `js_facade_gen` is archived and its users have
codebases where `package:js` and `dart:html` dependencies extend well past the
generated bindings. "Swap the tool, rerun the command, get strictly better
output" is near-zero friction; "migrate to `js_interop`" is a project. v1 must
therefore also emit the `dart:html` / `dart:typed_data` substitution imports
that `js_facade_gen` produced (ref §14).

**v2 — a `dart:js_interop` backend behind a CLI flag.**

The IR is output-language agnostic. A backend is a pair of string tables — one
type emitter, one statement emitter. v2 is a second pair, not a second compiler.
The same seam admits other target languages.

> The README must state the `package:js` target explicitly, so a 2026 reader
> does not mistake deliberate positioning for staleness.

---

## Design principles

1. **Never degrade silently.** Every unrepresentable construct survives into the
   output with its origin visible.

2. **Degrade to a *named* type, never to bare `dynamic`.** Where `js_facade_gen`
   emits `dynamic /*keyof Box<string>*/` at each use site, dartify mints a real
   symbol and documents it once at its definition:

   ```dart
   /// Unrepresentable in Dart: `keyof Box<string>`
   typedef KeyOfBoxString = dynamic;
   ```

   Use sites then say `KeyOfBoxString`. The developer sees a meaningful name and
   gets the origin on IDE hover, even though the representation underneath is
   `dynamic`; and when a better representation is found later, one typedef
   upgrades every use site. This is `E-16`, and it is Stage 1.

3. **The IR is the contract.** Anything not captured at parse time is gone
   forever. No emitter rewrite can recover it.

4. **The linker owns cross-declaration semantics.** Overloads, augmentation,
   renaming and imports are whole-program problems and belong in Phase 2 — the
   place the previous two architectures lacked.

5. **Instruments are not pipeline stages.** The dependency graph, IR dumps and
   diagnostics are consumers of phase output, never steps inside it. They live
   outside the shipped entry graph and can be as elaborate as they like.

---

## Stages

Ordered by dependency. Each stage is a layer of the compiler, and each one gates
the next.

```
S0 ──▶ S1 ──▶ S2 ──▶ S3 ──▶ S4 ──▶ S5 ──▶ S6
floor  types  links  decls  seman  emit   ship
              ▲                     │      v1.0.0
              └── S3 needs S2's parseType routing
```

Two hard constraints:

- **S0 precedes everything** — without render-to-string there is no way to
  assert on output, so every later stage would be verified by eyeballing files.
- **S1–S4 precede S5** — the emitter cannot render information the IR never
  captured. This is why the rewrite is late, not early.

---

## S0 — Restore the floor

*Mechanical. Nothing below is verifiable without it. Also the cheapest wins in
the tree.*

| # | Task | Findings |
|---|---|---|
| 0.1 | Split `emitAllFiles` into `renderAllFiles(): Map<path,string>` + `writeAll(map)` | `E-11` |
| 0.2 | Restore `Transpiler.transpileFromString` as a static wrapper over the 3 phases | `X-01` |
| 0.3 | Reset the context singleton per run (`SymbolTable.clear()`, `TypeParser.clearCache()`) | `R-11`, `T-04` |
| 0.4 | **Decouple the graph.** `runLinker` returns `LinkState` and imports no visualiser; move `visualizeGraph.ts` → `tools/graph.ts` with a `pnpm graph` script; delete the two `console.log`s; write to the given path, never `cwd`; gitignore + untrack `dependency_graph.svg` | `L-07`, `D-07` |
| 0.5 | Fix `test/decl/decl-parser.test.ts:65` signature; type the `(error, index)` params | `X-03` |
| 0.6 | Retier the suite: conformance / smoke / opt-in stress. Delete the 27 obsolete snapshots | `X-02` |
| 0.7 | Quarantine `engine/passes/**` + `engine/transformers/**` from `tsc` (do **not** delete — see S4) | `D-01`, `D-02` |
| 0.8 | Read `--version` from `package.json`; fix `test:cli` flags; point `pnpm test` at `vitest run` | `R-07`, `X-07`, `X-08` |
| 0.9 | Promote the audit probe file into `def_files/synthetic/` as a permanent fixture | `X-10` |

**Done when:** `pnpm test:run` green · `tsc --noEmit` clean · a default `pnpm dev`
run prints no debug noise and writes nothing outside `outDir` · `dist/cli.js`
≈ 0.5 MB, down from 1.59 MB.

**✅ Done.** All gates met, and the bundle beat the estimate:

| | before | after |
|---|---|---|
| `pnpm test:run` | 1654 failed / 48 passed | **57 passed / 1 skipped**, 3.1 s |
| `tsc --noEmit` | 15 errors | **0** |
| `dist/cli.js` | 1,671,733 B | **75,065 B** |
| snapshots on disk | 4.3 MB | **128 KB** |
| stray writes to `cwd` | `dependency_graph.svg` every run | none |

---

## S1 — The type layer: nothing is anonymous

*The first real feature, and the one that defines what dartify is. Every type
either translates properly or becomes a named, documented symbol. No bare
`dynamic` survives this stage.*

The emitter half of this stage is ~40 lines and is absorbed into the S5 rewrite;
the parser, IR and linker halves are permanent. That is a deliberate trade — it
buys an end-to-end vertical slice through all three phases while they are still
small enough to reason about.

| # | Task | Findings |
|---|---|---|
| 1.1 | **Cache hygiene first.** Key the type cache on file+scope+text+depth (or drop it — measure); stop handlers mutating cached objects. Doing this *after* 1.2 turns two latent bugs live | `T-04`, `T-03` |
| 1.2 | Populate `originalText` on **every** `IRType` node, at every depth — this is the comment body and it is unrecoverable later | `T-02` |
| 1.3 | `TypeKind.Unsupported` carrying `originalText` + a machine-readable reason code | `I-03`, `T-01` |
| 1.4 | **Tier A — represent properly.** `this` (**do first: ~1,100 corpus sites, the single biggest type gap, and cheap**), `readonly T[]`, qualified names, type predicates, `typeof x`, named/optional tuple members, bare `null` → `Null` | `P-07`, `T-01`, `T-07` |
| 1.5 | **Tier B — mint a named alias.** `keyof`, conditional, mapped, template literal, `infer`, indexed access. Deterministic name derivation, collision-checked against the symbol table | `T-01`, principle 2 |
| 1.6 | Register minted aliases as real `Symbol`s during linking; dedup identical type expressions within a file | `L-05` |
| 1.7 | Emit the **type-definitions section**: `/// Unrepresentable in Dart: <originalText>` + `typedef Name = dynamic;`, with use sites referring to the name | `E-16` |
| 1.8 | Purge Dart type names from `IRType.name`; TS-side names only | `T-06` |
| 1.9 | Propagate depth through function types; dispatch intersections on `SyntaxKind` not source text; drop the single-member `Union` wrapper | `T-05`, `T-08`, `T-12` |

**Done when:** a run over `def_files/` emits **zero bare `dynamic`** outside
genuine `any`/`unknown` · every `dynamic` typedef carries its source text · the
same type expression twice in one file yields one typedef.

**Deferred to post-v1 (Tier C):** evaluate `Partial<X>`→`X`, `Readonly<X>`→`X`,
`Record<K,V>` through `ts.TypeChecker`. ~330 corpus occurrences; real payoff, no
urgency — Tier B already gives them names.

---

## S2 — The link layer: the graph tells the truth

*`L-01` and `P-01` must land before the import emitter is written, or S5 will
emit confidently wrong imports.*

| # | Task | Findings |
|---|---|---|
| 2.1 | Follow `getAliasedSymbol()` in `collectTypeDep` so deps name the **declaring** file. Keep the existing identifier-symbol preference — its alias-to-primitive reasoning is correct | `L-01` |
| 2.2 | Route heritage clauses through `parseType` — restores inheritance edges to the graph | `P-01`, `L-04` |
| 2.3 | Normalise dotted names (`.`→`\|`) in `resolveRealFQN`; strip a leading `export as namespace` alias | `L-02` |
| 2.4 | Make ambiguity a real diagnostic; prefer the dep's own file (mostly moot once 2.1 lands) | `L-03` |
| 2.5 | Extract `resolveRealFQN` to `src/symbol/resolve.ts`; import from linker and from `tools/graph.ts` | `L-06` |
| 2.6 | Persist resolved edges onto the `Symbol` (`resolvedDeps: string[]`) — **this array is the import list** | `L-08` |
| 2.7 | Module-resolution fallback for extensionless imports; unconditional one-line unresolved-dep summary | `R-01`, `R-02` |
| 2.8 | Single shared `isStdlib` predicate; longest-common-ancestor `inputRoot`; sorted file iteration | `R-06`, `R-03`, `R-04` |
| 2.9 | **First tests for the linker** — FQN construction, dep collection, `resolveRealFQN`, cycles | `X-06` |
| 2.10 | Cross-file dedup of S1's minted aliases | `L-05` |

**Done when:** leaflet reports 0 broken links · the extensionless-import fixture
resolves · heritage edges appear in the graph · linker unit tests exist.

---

## S3 — The declaration layer: the IR is complete

*Gates S5. The emitter cannot render what was never captured.*

| # | Task | Findings |
|---|---|---|
| 3.1 | `IRTypeParam { name, constraint?, default? }` on Interface / Function / TypeAlias / Method / Class | `I-01`, `P-02` |
| 3.2 | `extends`/`implements` as `IRType[]` — recovers generic args, dep edges, qualified names (builds on 2.2) | `I-04` |
| 3.3 | `callSignatures` on `IRInterface`; read them in the parser | `I-05`, `P-03` |
| 3.4 | `jsDoc?: string` on `IRDeclaration` + members + params; capture in all parsers | `I-06`, `P-06` |
| 3.5 | `loc?: {file,line,col}` on IR nodes — makes S2's diagnostics actionable | `I-10` |
| 3.6 | `export` / `declare` / visibility modifiers on IR declarations | `I-09` |
| 3.7 | Fix enum values (number vs string, flag implicit); unify the two constructor shapes; replace the JSON deep-clone (throws on bigint) | `P-04`, `I-08`, `I-11` |
| 3.8 | Scope handling via `withScope(name, fn)` + `try/finally`, or explicit parameter passing — one parse error currently poisons every later FQN in the file | `R-09`, `R-10`, `P-08` |
| 3.9 | Construct signatures as a first-class IR shape, not fake-named `IRMethod`s | `P-09` |
| 3.10 | Delete `IRLiteral` + `IRType.objectLiteral` | `I-07`, `D-03` |

**Done when:** the synthetic probe round-trips through the IR with **zero
information loss** — asserted on the IR, not on rendered output.

---

## S4 — The semantic layer: what Phase 2 exists for

*Mine the dead transformers before deleting them.*

| # | Task | Findings |
|---|---|---|
| 4.1 | Port the recursive IR walker out of `transformers/typeVisitor.ts` into the linker | `D-02` |
| 4.2 | Overload grouping + renaming. Carry the original JS name as `jsName` on the IR — **never** recover it by string surgery | `L-05`, `E-01` |
| 4.3 | Nested `TypeLiteral` hoisting (inside unions, arrays, generics) via the walker; structural dedup of identical shapes | `D-02` |
| 4.4 | Declaration augmentation: `interface`+`var` (§4.1) with `var`-side members marked **static** (§4.2), default form (§4.3), type-alias+var | `L-05`, `P-10` |
| 4.5 | Dart keyword escaping (`JS$name`), preserving the original for `@JS()` | `E-09` |
| 4.6 | Namespace collision renaming (§8.4, §8.5) | `E-10`, `L-11` |
| 4.7 | Distinguish `declare module` / `namespace` / `global`; hoist `global` to file scope | `L-11` |
| 4.8 | `SymbolTable.unregister`/`replace`; readonly view from `getSymbolTable()` | `L-10` |
| 4.9 | **Delete `engine/passes/**` and `engine/transformers/**`** once mined | `D-01`, `D-02` |

**Done when:** `def_files/legacy_tests/{overloads,declaration_augmentation,keywords,modules}.d.ts`
match expected output.

---

## S5 — The emitter, rebuilt once

*Now safe to do, and safe to do only once. Built as backend #1 with the v2 seam
already in place.*

| # | Task | Findings |
|---|---|---|
| 5.1 | Backend interface: a type-emitter + statement-emitter string-table pair. Rename the `@typeEmitter` alias off `emitter/old/` | `E-11b` |
| 5.2 | **Emit imports from `resolvedDeps`** (2.6) | `E-08` |
| 5.3 | `dart:html` / `dart:typed_data` substitution imports (§14.1-14.3) | v1 goal |
| 5.4 | Type params on all declarations, with constraints | `E-03` |
| 5.5 | `extends` / `implements` incl. generic args (§14.5) | `E-04` |
| 5.6 | Named constructors for overloaded constructors | `E-02` |
| 5.7 | Factory constructors for hoisted anonymous types — `formatNamedParameters` already exists | `E-07` |
| 5.8 | Variables as getter/setter pairs; getter-only for `const` (§1.1, §1.9) | `E-05`, `P-05` |
| 5.9 | Enums as plain classes with uniform `num` statics (§7) | `E-06` |
| 5.10 | Callable interfaces → `typedef`, into the S1 type-definitions section (§3.6-3.8) | `I-05`, `E-16` |
| 5.11 | Index signatures using real key/value types | `E-14` |
| 5.12 | Intersections, tuples, literal values (§5.3) | `T-09`, `E-12` |
| 5.13 | JSDoc → `///`, `{@link x}` → `[x]`, strip `@param`/`@return` (§11) | `I-06` |
| 5.14 | Scoped `stripQuotes`; drop the redundant readonly branch | `E-13`, `E-15` |

**Done when:** h3 **and** leaflet pass `dart analyze` with zero errors (`X-09`).

---

## S6 — Conformance and ship

| # | Task | Findings |
|---|---|---|
| 6.1 | Make `def_files/js_facade_gen_test_cases.md` executable — ~120 snippet→expected pairs on `test-helper.ts` primitives | `X-04` |
| 6.2 | `dart analyze` in CI over generated h3 / leaflet / three.js output | `X-09` |
| 6.3 | Publish **"N/M js_facade_gen cases passing"** as the headline metric | — |
| 6.4 | Reconnect `log.ts` as `--emit-ir` (one JSON per phase) as a `tools/` consumer, or delete it and fix the docs | `R-08`, `D-05` |
| 6.5 | README: state the `package:js` target deliberately; document `pnpm graph` | — |
| 6.6 | Verify tree-shaking removed the deleted code from `dist/` | `D-06` |
| 6.7 | Move `src/legacy/**` to `docs/history/` or a git tag | `D-04` |
| 6.8 | *(optional)* `1.0.0-beta.0` under the npm `next` tag; soak | — |
| 6.9 | Merge to `main`, publish **`1.0.0`** | — |

---

## The v1 acceptance test

One sentence, and it is the only claim that matters publicly:

> Point dartify at the same `.d.ts` inputs `js_facade_gen` accepted, get output
> that passes `dart analyze` with zero errors, with every `dynamic` named and
> documented.

Everything above exists to make that sentence true and measurable.

---

## Tracking

Re-measure the baseline table in `audit/FINDINGS.md` at the end of each stage.

| Stage | Status | Notes |
|---|---|---|
| S0 floor | ☑ **done** | suite 1654 failed → **57 passed**; `tsc` 15 errors → **0**; `dist` 1.59 MB → **75 KB**; snapshots 4.3 MB → **128 KB** |
| S1 types | ☐ not started | |
| S2 links | ☐ not started | |
| S3 decls | ☐ not started | |
| S4 semantics | ☐ not started | |
| S5 emitter | ☐ not started | |
| S6 ship | ☐ not started | |

When a finding is resolved, mark it `[FIXED]` in `audit/FINDINGS.md` and keep
the ID — plan tasks and commit messages reference them.
