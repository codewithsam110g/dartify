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
| 0.7 | Quarantine `engine/passes/**` + `engine/transformers/**` from `tsc` pending their verified S4 deletion | `D-01`, `D-02` |
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
either translates properly or becomes a named, documented symbol.*

> The original framing here — "no bare `dynamic` survives this stage" — turned
> out to be wrong about scope, not about intent. The **parser and linker** halves
> deliver it in full; three **emitter** paths do not, because they predate this
> stage and were never rewritten: unions (`E-18`), index signatures (`E-14`) and
> intersections (`T-09`). See the gap table under *Done when*.

The emitter half of this stage is ~40 lines and is absorbed into the S5 rewrite;
the parser, IR and linker halves are permanent. That is a deliberate trade — it
buys an end-to-end vertical slice through all three phases while they are still
small enough to reason about.

| # | Task | Findings |
|---|---|---|
| 1.1 | ✅ **Cache hygiene first.** ~~Key the type cache on file+scope+text+depth (or drop it — measure); stop handlers mutating cached objects~~ — **measured, then dropped the cache outright** (three.js `analyze()` 836→987 ms, leaflet unchanged; a correct key needs the per-declaration `currentFQN`, which would have collapsed the hit rate anyway). Handlers now spread. Uncovered `T-13`: cache hits were dropping nested dep edges, so the 2nd occurrence of a generic in a file contributed none | `T-04`, `T-03`, `T-13` |
| 1.2 | ✅ Populate `originalText` on **every** `IRType` node, at every depth — this is the comment body and it is unrecoverable later. Done centrally in `parseType` (one assignment after the dispatch, so no future `SyntaxKind` can forget it); normalised to one line by `sourceTextOf`, never truncated | `T-02` |
| 1.3 | ✅ `TypeKind.Unsupported` carrying `originalText` + a machine-readable reason code. Classifier covers 13 constructs; **census over three.js+leaflet: 1,410 nodes, 0 unclassified**. Emission unchanged (`dynamic`) so output stayed byte-identical | `I-03`, `T-01` |
| 1.4 | ✅ **Tier A — represent properly.** `this` → enclosing type (900 sites, §3.10) · `readonly T[]` and `ReadonlyArray<T>` → `List<T>` (§14.4) · `x is T` → `bool` (§6.6) · bare `null` → `Null` (§1.10) · optional tuple members, via the ts-morph 26→28 upgrade. **Census 1,410 → 503.** Also fixed `E-17` (`dynamic?` — uncompilable Dart), found by diffing output. **`typeof x` moved to Tier B**: it needs the checker, and the obvious guess is wrong (`typeof Foo` is the constructor, not `Foo`). Qualified names moved to S2 with `L-02` | `P-07`, `T-01`, `T-07`, `T-10`, `E-17` |
| 1.5 | ✅ **Tier B — mint a named alias.** `keyof`, conditional, mapped, template literal, `infer`, indexed access. `deriveAliasName` is a pure function of the source text (64-char budget: derived length is p50 23 / p90 37 / p99 56); `AliasRegistry` owns uniqueness because that needs the symbol table, dedups on text and disambiguates by hash so names don't move when an unrelated declaration is added. Not yet wired into the pipeline | `T-01`, principle 2 |
| 1.5b | ✅ **`typeof x` through the checker** — a correction, not a plan item. 1.4 wrote `typeof` off from *syntax*; asked properly, the checker resolves **393 of 449 (87%)** to a primitive (the enum-as-consts idiom: `export const NearestFilter: 1003`). Unsupported nodes **505 → 112**, minted typedefs **463 → 89**, `typedef CullFace = dynamic` → `= num`. 66 output lines changed, 0 regressions; cost inside noise. The 56 survivors — function values, namespace objects, class constructors — stay Tier B on purpose | `T-14` |
| 1.6 | ✅ Register minted aliases as real `Symbol`s during linking; dedup identical type expressions within a file. Use sites carry `aliasName`; nodes stay `Unsupported` so `unsupportedReason` remains queryable after linking. An author's own `type X = <unrepresentable>` is left alone — it is already a named degradation, and minting would add a hop naming nothing new. Corpus: 68 typedefs over three.js + leaflet + probe (**64 + 4 probe**), 0 dangling references, 0 duplicates, h3 byte-identical | `L-05` |
| 1.7 | ✅ Emit the **type-definitions section**: `/// Unrepresentable in Dart: <originalText>` + `typedef Name = dynamic;`, with use sites referring to the name. Minted typedefs are collected under a header and sorted; an author's own alias is documented in place instead of moved. The doc comment computes its Markdown fence, since template literal types carry backticks. `dart analyze`: probe 19 issues, leaflet 507, **none naming a minted typedef** | `E-16` |
| 1.8 | ✅ Purge Dart type names from `IRType.name`; TS-side names only. Invariant, not a case list: for every kind except `TypeReference`, `name === kind` — guarded by a test that was verified to fail on a reintroduced `name: "String"`. Surfaced a live defect: `name: "BigInt"` was the *only* thing separating a bigint literal from a number literal, and nothing reads `name` outside the `TypeReference` branch, so `10n` emitted `num`. Output byte-identical — no bigint literal types in the corpus | `T-06` |
| 1.9 | ✅ Propagate depth through function types; dispatch intersections on `SyntaxKind` not source text (shared predicates in `type/keywords.ts`); drop the single-member `Union` wrapper. Normalising the union **exposed three more defects**: `null \| undefined` threw at emit and became a `// ERROR` comment (`T-15`); `{}` synthesised a cyclic `typedef anon_dynamic = anon_dynamic;` emitted into one file while **117 use sites across 34 files** referenced it — **live in three.js** (`T-16`); and `E-17`'s guard compared for exact equality with `"dynamic"`, so `dynamic /* A\|B */?` slipped through in 3 three.js files | `T-05`, `T-08`, `T-12`, `T-15`, `T-16`, `E-17` |

**Done when:** a run over `def_files/` emits **zero bare `dynamic`** outside
genuine `any`/`unknown` · every `dynamic` typedef carries its source text · the
same type expression twice in one file yields one typedef.

**Stages 1.1–1.10 are complete, and the criterion is substantially met.**

All three clauses were re-measured at the close of the stage, after an earlier
pass reported them from inconsistent file sets and got them wrong.

- ✅ *Every `dynamic` typedef carries its source text.*
- ✅ *The same expression twice in one file yields one typedef* — 0 duplicates,
  0 dangling references over three.js + leaflet + probe.
- ⚠️ *Zero bare `dynamic` outside genuine `any`/`unknown`.* Attributed at the IR
  level, **839** nodes over three.js + leaflet + h3 emit exactly `dynamic`:

  | IR kind | count | verdict |
  |---|---:|---|
  | `any` / `unknown` | 727 | **allowed by the criterion** — leaflet's `context?: any` alone is 222 |
  | `unsupported` | 84 | the minted typedefs' own right-hand sides. `dynamic` by construction |
  | `object` | 22 | **gap** — the TS `object` keyword has no `emitType` case. Dart's `Object` is a close match (`E-19`) |
  | `undefined` | 6 | **gap**, minor — same shape as `object` |

  **No unrepresentable *use site* emits bare `dynamic` any more.** That was the
  point of the stage and it holds. What is left is 28 nodes across two
  primitive keywords, plus two emitter paths that never went through `emitType`
  at all: index signatures emit a hardcoded `dynamic operator []` (`E-14`), and
  union use sites emit a commented — not bare — `dynamic /* A\|B */` (`E-18`).

`T-09` was closed rather than deferred. It was the one gap that made dartify
*worse* than the tool it replaces: `emitType` had no `Intersection` case, so
`Foo & Bar` fell to `default:` and emitted bare `dynamic` with no name and no
comment, where `js_facade_gen` §5.3 emits `Foo /*Foo&Bar*/`. It now does the
same — the first member is a real supertype and tells the reader more than a
named `dynamic` would.

**Deferred to post-v1 (Tier C):** evaluate `Partial<X>`→`X`, `Readonly<X>`→`X`,
`Record<K,V>` through `ts.TypeChecker`. ~330 corpus occurrences; real payoff, no
urgency — Tier B already gives them names. **But re-measure before deferring
again**: `T-14` is exactly this bet, and asking the checker turned out to be
both cheap and worth 393 sites. The Tier A/B split was drawn by reading syntax,
and syntax is the wrong axis — the question is not "can this be represented"
but "can dartify *find out* what it means".

---

## S2 — The link layer: the graph tells the truth

*`L-01` and `P-01` must land before the import emitter is written, or S5 will
emit confidently wrong imports.*

| # | Task | Findings |
|---|---|---|
| 2.1 | ✅ Type references carry checker-backed target file **and declared target name**, following aliases without losing alias-to-primitive behaviour. Module augmentations are canonicalised to the primary declaration. Three.js: 0 ambiguous edges and 0 checker-target fallbacks | `L-01` |
| 2.2 | ✅ Heritage clauses route through `parseType` and are stored as `IRType[]`; generic `extends`/`implements` references now reach the graph | `P-01`, `L-04`, `I-04` |
| 2.3 | ✅ Qualified names resolve through captured `export as namespace` metadata; only a declared global alias may be stripped. Leaflet: 44 transitively broken symbols → 0 | `L-02` |
| 2.4 | ✅ Resolution returns structured `resolved`/`missing`/`ambiguous` outcomes, direct and indirect failures are distinct, and dependency-collection failures become diagnostics instead of missing edges. `-lv` renders the structured edge/failure/strategy report; `-v` is verbose and `--version` is long-only | `L-03`, `L-12`, `L-15`, `R-08` |
| 2.5 | ✅ Extract `resolveRealFQN` to `src/symbol/resolve.ts`; import from linker and from `tools/graph.ts` — landed in S0.4 | `L-06` |
| 2.5b | ✅ Graph IDs derive from the full FQN while labels remain short; graph rendering consumes persisted report edges and no longer re-resolves raw deps | `L-13` |
| 2.6 | ✅ Symbols persist `resolvedDeps`; every reference use site carries a structured target and receives `resolvedFQN`. Dependency collection walks completed IR, removing the global dependency bucket and its multi-declarator leak | `L-08`, `L-14`, `R-10` |
| 2.7 | ✅ Default projects use Bundler resolution plus a unique explicit-declaration fallback; explicit tsconfig settings remain authoritative. Resolution results are returned from every public path and the CLI always prints the unresolved count | `R-01`, `R-02` |
| 2.8 | ✅ One shared stdlib predicate, longest-common-ancestor input root, deterministic file/report ordering, incompatible-root rejection and output-collision detection | `R-03`, `R-04`, `R-06` |
| 2.9 | ✅ Added 15 focused linker/resolution/graph/reporting tests plus an opt-in `test:s2` corpus gate for Leaflet and three.js | `X-06` |
| 2.10 | ✅ Measure before adding cross-file alias ownership: three.js + leaflet have 64 aliases with **0 repeated source texts across files**. Keep aliases file-local; centralising them would add imports for no measured gain | `L-05` |

**Done:** leaflet reports 0 broken links · the extensionless-import fixture
resolves · heritage edges appear in the graph · a renamed-import fixture links
`Bar` to `Foo` at the IR use site · direct/indirect states tell the truth · graph
node IDs are unique · linker tests and corpus gates pass. Three.js truthfully
reports 31 missing edges caused by absent `webxr` and `@webgpu/types` packages;
it has 0 ambiguity and every available checker target links exactly.

---

## S3 — The declaration layer: the IR is complete

*Gates S5. The emitter cannot emit information the IR never captured. The
current `emitter/old/*` string-template backend remains intentionally
half-complete until the S5 rebuild.*

| # | Task | Findings |
|---|---|---|
| 3.0 | ✅ Expanded `synthetic/s3-complete.d.ts`: generics, call/construct overloads, docs, locations, modifiers, enum forms, bigint, defaults/destructuring, class index signatures and scoped inline types. Assertions are at the IR boundary | S3 gate |
| 3.1 | ✅ `IRTypeParam { name, constraint?, default? }` on Interface / Function / TypeAlias / Method / CallSignature / ConstructSignature / Class; constraints/defaults link while lexical and declaration identities exclude type parameters from graph edges | `I-01`, `P-02`, `L-16` |
| 3.1b | ✅ One shared `IRParameter`; declaration and function-type parsing preserve rest, optional, binding-pattern, initializer, docs and locations | `I-13`, `P-11` |
| 3.2 | ✅ Landed in S2.2: `extends`/`implements` are `IRType[]`, preserving generic args, dep edges and qualified names | `I-04` |
| 3.3 | ✅ `callSignatures` on `IRInterface` and hoisted type literals; every signature is parsed | `I-05`, `P-03` |
| 3.3b | ✅ Shared `IRConstructSignature` for classes, interfaces and type literals; every overload retained, fake constructor names removed, class constructor visibility retained | `I-08`, `P-09` |
| 3.4 | ✅ Shared `IRNode.jsDoc` on declarations, members, signatures, enum members, type params and params; `@param` tags attach to their parameters | `I-06`, `P-06` |
| 3.5 | ✅ `loc?: {file,line,column}` on declarations, parsed types and nested IR nodes; synthetic linker nodes may omit it. Snapshots normalise only the checkout-specific root | `I-10` |
| 3.6 | ✅ Required declaration modifiers capture export kind and syntactic/effective ambient state; members retain visibility/static/readonly/abstract facts | `I-09` |
| 3.6b | ✅ Variables capture `var`/`let`/`const` truthfully; classes retain index signatures | `P-05`, `P-12` |
| 3.7 | ✅ Enum initialisers are discriminated as implicit/numeric/string/computed with raw and semantic values; cloning uses bigint-safe `structuredClone` | `P-04`, `I-11` |
| 3.8 | ✅ Immutable `ParseContext` replaces mutable `currentFQN`; deterministic return/parameter/overload scopes and a callback seam register hoisted symbols. Post-S3 found sibling-position collision `P-13`, now owned by S4.2 | `R-09`, `P-08`, `P-13` |
| 3.9 | ✅ Deleted live `IRLiteral` and `IRType.objectLiteral`; S2's `ir/visit.ts` remains the live recursive walker. The quarantined S4 transformer source is intentionally untouched until mined | `I-07`, `I-14`, `D-03` |
| 3.10 | ✅ Six focused fidelity tests plus `test:s3`; S2 corpus 2/2, 1,650-file stress, typecheck, build, smoke and h3 `dart analyze` all pass | S3 gate |

**Done:** the expanded fixture reaches the IR with zero known information loss.
The representative census observed 2,530 declarations, 26,240 parsed types,
409 type parameters, 286 call signatures and 53 construct signatures with
zero missing declaration/type locations. S2 link metrics are unchanged; the
normal suite is 222 passed / 4 skipped, all 1,650 corpus files survive, the
bundle is 112.24 KB, and generated h3 remains `dart analyze` clean.

---

## S4 — The semantic layer: what Phase 2 exists for

*Use the live IR walker; preserve concepts from the quarantined code, not its
obsolete implementations.*

The implemented semantic contract, locked policies, merge matrix, and test
sequence live in [`STAGE4_PLAN.md`](STAGE4_PLAN.md); measured evidence lives in
[`audit/S4-EVIDENCE.md`](audit/S4-EVIDENCE.md).

| # | Task | Findings |
|---|---|---|
| 4.1 | ✅ Atomic semantic-pass contract; readonly snapshots plus `replace`, `unregister`, and transactional `apply` | `L-10` |
| 4.2 | ✅ Positional structural identities, metadata-free shape keys, same-file canonicalization, and transitive redirects | `P-13`, `D-02` |
| 4.3 | ✅ Explicit namespace, ambient-module, augmentation, and global scope records; globals hoist | `L-11` |
| 4.4 | ✅ Stable free-function/method overload names with exact `jsName`; no `.split("_")` recovery | `L-05`, `E-01` |
| 4.5 | ✅ Supported interface/class/value/constructor-companion merges with static variable-side members and preserved conflicts | `L-05`, `P-10` |
| 4.6 | ✅ Context-aware Dart identifiers plus computed-name sanitation; computed-key runtime semantics are handled explicitly by 4.10 | `E-09`, `E-22`, `E-25` |
| 4.7 | ✅ Top-level priority, shortest namespace suffixes, numeric fallback, dual facets, and resolved Dart target names | `E-10`, `L-11` |
| 4.8 | ✅ Deleted 1,684 quarantined lines, removed aliases/exclusions, and corrected six stale comments | `D-01`, `D-02`, `X-13` |
| 4.9 | ✅ `test:s4` plus normal/S2/S3/stress/typecheck/build/Dart analyzer acceptance | S4 gate |
| 4.10 | ✅ Post-S4 deep-review remediation: lossless unsupported merges, explicit anonymous provenance, backend/helper name reservation, valid library identifiers, runtime-safe class overload lowering, and computed-key diagnostics | `L-17`, `L-18`, `P-14`, `E-24`–`E-28` |

**Done:** the original 26-test S4 gate is expanded to 34 focused tests. The
post-S4 review corrections and runtime/compiler evidence are recorded in
`audit/S4-EVIDENCE.md`. S2 is 2/2, S3 retains
the exact 2,530 input declaration floor, and all 1,650 stress files complete
with zero returned/emission errors. h3 is unchanged and analyzer-error-free;
the four semantic fixtures, Leaflet, and three.js have zero S4-owned duplicate,
keyword, or syntax errors. Complete Leaflet improves from 522 to 239 analyzer
issues. The remaining import/generic/heritage/backend categories belong to S5.

Before S5 begins, perform the separately tracked line-by-line post-S4 audit and
reconcile every finding, source claim, test gap, and living-document status.

---

## S5 — The emitter, rebuilt once

*Now safe to do, and safe to do only once. Built as backend #1 with the v2 seam
already in place.*

The before-state is executable: `pnpm test:s5:fixture` first validates four
inputs as real `.d.ts` declaration files, then snapshots all Dart and normalized
verbose CLI output under `def_files/synthetic/s5_emitter/`. Executable `.ts`
programs and implementation lowering are outside the project boundary. The
fixture links 40/40 symbols and 36/36 edges; semantic analysis has three
explicit diagnostics (two suppressed augmentations and one unsupported
computed member). Dart analysis has 34 errors mapped
to `E-08`, `E-03`, S5.3, and `E-13`. It also locks the analyzer-invisible
`E-23` baseline: a correctly linked foreign `Toolkit.Options` is emitted as a
bare name and captured by the consumer's local `Options`. Update the golden
only after reviewing the complete Dart diff and re-running the analyzer.

| # | Task | Findings |
|---|---|---|
| 5.1 | Backend interface: a type-emitter + statement-emitter string-table pair. Rename the `@typeEmitter` alias off `emitter/old/` | `E-11b` |
| 5.2 | **Emit deterministic prefixed imports from `resolvedDeps`; qualify every foreign use site from `resolvedFQN` + `resolvedDartName` and prevent local-name capture** | `E-08`, `E-23` |
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

**Done when:** h3 and the complete Leaflet output (`leaflet.dart` plus
`geojson.dart`) pass `dart analyze` with zero errors (`X-09`).

---

## S6 — Conformance and ship

| # | Task | Findings |
|---|---|---|
| 6.1 | Make `def_files/js_facade_gen_test_cases.md` executable — ~120 snippet→expected pairs on `test-helper.ts` primitives. **Plus the h3 golden file** — see "h3 is the real gate" below | `X-04` |
| 6.2 | `dart analyze` in CI over generated h3 / leaflet / three.js output | `X-09` |
| 6.3 | Publish **"N/M js_facade_gen cases passing"** as the headline metric | — |
| 6.4 | Return symbol-generation errors as phase output; merge them into the programmatic result and CLI diagnostic policy so caught statement failures cannot silently shrink the generated API | `R-13` |
| 6.5 | Reconnect `log.ts` as `--emit-ir` (one JSON per phase) as a `tools/` consumer, or delete it and fix the docs | `R-08`, `D-05` |
| 6.6 | README: state the `package:js` target deliberately; document `pnpm graph` | — |
| 6.7 | Reconfirm final bundle composition/size after deletion; post-S3 already proves dead code is tree-shaken | `D-06` |
| 6.8 | Move `src/legacy/**` to `docs/history/` or a git tag | `D-04` |
| 6.9 | *(optional)* `1.0.0-beta.0` under the npm `next` tag; soak | — |
| 6.10 | Merge to `main`, publish **`1.0.0`** | — |

---

## The v1 acceptance test

One sentence, and it is the only claim that matters publicly:

> Point dartify at the same `.d.ts` inputs `js_facade_gen` accepted, get output
> that passes `dart analyze` with zero errors, with every `dynamic` named and
> documented.

Everything above exists to make that sentence true and measurable.

### h3 is the real gate

dartify exists because h3's Dart **web** bindings were generated by
`js_facade_gen`, which is archived and still load-bearing. The author maintains
those bindings. So `def_files/h3/h3.d.ts` is not a demo fixture — it is the
motivating consumer, and it is also the first library that can actually adopt
the result.

That makes one specific artifact more valuable than any synthetic case:
**the `js_facade_gen`-generated Dart currently shipping in the h3 Dart package
is a golden file.** Real input, real expected output, for the highest-stakes
library in the corpus, produced by the exact tool being replaced.

Add it as a conformance fixture (S6.1) alongside the ~120 extracted cases, and
diff against it. Three outcomes, all useful:

- **dartify matches it** → drop-in replacement, demonstrated rather than claimed.
- **dartify is better** (named types instead of bare `dynamic`, real imports)
  → that diff *is* the release announcement.
- **dartify is worse** → a concrete, prioritised bug list from the only user
  whose opinion is already known.

---

## Tracking

Re-measure the baseline table in `audit/FINDINGS.md` at the end of each stage.

| Stage | Status | Notes |
|---|---|---|
| S0 floor | ☑ **done** | suite 1654 failed → **57 passed**; `tsc` 15 errors → **0**; `dist` 1.59 MB → **75 KB**; snapshots 4.3 MB → **128 KB** |
| S1 types | ☑ **done** | unsupported nodes 1,410 → **112**; 68 minted typedefs (**64 three.js+leaflet + 4 probe**), 0 dangling / 0 duplicate; suite 57 → **199 passed**; `dist` 75 KB → **90.6 KB**. Fixed `T-01`–`T-16` bar `T-11`, plus `P-07`, `E-16`, `E-17`. No unrepresentable use site emits bare `dynamic`. Residual: 28 nodes across `object`/`undefined` (`E-19`), and `E-14`/`E-18` which bypass `emitType` — all S5. h3 `dart analyze` clean (was already); leaflet 510, probe 19, dominated by `E-03` and `L-05`/`E-10` |
| S2 links | ☑ **done** | Leaflet 328/328 symbols and 1,050/1,050 edges resolved; three.js 0 ambiguity and 8,184 resolved edges, with 31 honest misses from two absent external type packages. Suite **214 passed**, focused S2 tests 15/15, corpus 2/2, `tsc` and build clean, h3 byte-identical; `-lv` exposes the structured report |
| S3 decls | ☑ **done** | Complete metadata/signature IR; six semantic acceptance tests; census 2,530 declarations / 26,240 parsed types with 0 missing locations; suite **222 passed**, S2/S3 corpus gates and 1,650-file stress clean; h3 `dart analyze` clean |
| S4 semantics | ☑ **done** | Canonical semantic bindings, supported merges, overload/identifier/namespace naming, explicit module scopes, CLI diagnostics, 26-test S4 gate; full acceptance recorded in `audit/S4-EVIDENCE.md` |
| S5 emitter | ☐ not started | Pre-S5 fixture/golden ready: 40 symbols, 36 resolved edges, 34 analyzer errors mapped to planned tasks |
| S6 ship | ☐ not started | |

When a finding is resolved, mark it `[FIXED]` in `audit/FINDINGS.md` and keep
the ID — plan tasks and commit messages reference them.
