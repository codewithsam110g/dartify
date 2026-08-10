# Consolidated Findings

Severity-ranked index. Detail and per-line reasoning live in the area files.

**Severity**
- **S1** — produces silently wrong output, or blocks a v1 goal outright
- **S2** — produces obviously broken output, or blocks a planned phase
- **S3** — correctness hazard that is currently latent, or a significant design debt
- **S4** — cosmetic, wasteful, or documentation drift

**Evidence** — `[verified]` reproduced by running · `[inspection]` established by reading · `[latent]` real but currently unobservable

---

## S1 — Silently wrong output / blocks v1

| ID | Finding | Where | Ev. |
|---|---|---|---|
| `E-01` | `.split("_")[0]` truncates JS names at the first underscore — `my_func` binds to `@JS("my")` | `emitter/old/function.ts:11`, `class.ts:83`, `interface.ts:48` | ✅ |
| `L-01` **[FIXED — S2]** | ~~Cross-file dep FQNs name the importing file, not the declaring file~~ — checker-backed targets now retain declaring file and target name; three.js has 0 checker-target fallbacks | `parser/type/typeRefernce.ts`, `symbol/fqn.ts` | ✅ |
| `P-01` **[FIXED — S2]** | ~~Heritage clauses bypass `parseType`~~ — class/interface heritage is `IRType[]` and contributes reference edges | `parser/{interface,class}.ts` | ✅ |
| `E-08` | No cross-file imports are ever emitted — 415/415 three.js files uncompilable | `phase/emitterPhase.ts:188-195` | ✅ |
| `T-02` **[FIXED]** | ~~`IRType.originalText` declared but never written — source text destroyed at parse~~ — written for every node at every depth from one place in `parseType` (S1.2), whitespace-normalised, no truncation | `type/sourceText.ts`, `type/type.ts` | ✅ |
| `E-03` | Type parameters never emitted — every generic declaration is uncompilable | `emitter/old/class.ts:17` | ✅ |
| `E-04` | `extends`/`implements` never emitted — whole inheritance graph dropped | all emitters | ✅ |
| `R-01` **[FIXED — S2]** | ~~Extensionless relative imports silently fail~~ — default Bundler resolution plus a unique explicit-declaration fallback; tsconfig remains authoritative | `resolution/moduleHost.ts`, `transpiler.ts` | ✅ |
| `X-01` **[FIXED]** | ~~Test suite calls removed `Transpiler.transpileFromString`~~ — restored in S0.2 as a static wrapper over the three phases | `transpiler.ts` | ✅ |
| `E-16` **[FIXED]** | ~~No type-definitions section; degradation to `dynamic` is anonymous and unnamed~~ — minted, documented typedefs with named use sites, S1.5–S1.7. 68 typedefs over three.js + leaflet, 0 dangling, 0 duplicates; no `dart analyze` issue names one | `engine/alias/*`, `phase/emitterPhase.ts` | ✅ |
| `E-18` | Multi-member unions emit `js_facade_gen`'s inline `dynamic /* A\|B */` at every use site — pre-existing, conformant, but the pattern principle 2 replaces. Dedup is computed then discarded (`"a"\|"b"\|number` → `String\|String\|num`). Needs a Dart-side name derivation, not `E-16`'s text-side one | `emitter/old/type/emit.ts:70-92` | ✅ |
| `R-12` **[FIXED]** | ~~Errors inside `declare module`/`namespace` were pushed into a throwaway array~~ — `processModuleDeclaration` passed a literal `[]`, so failures in the construct most of DefinitelyTyped is written in were unreachable. Threaded through in the audit pass; corpus probe shows nothing was being swallowed | `phase/symbolGeneration.ts` | ✅ |
| `E-19` | TS `object` and `undefined` keywords have no `emitType` case and fall to `default:` → bare `dynamic`. 28 nodes over three.js + leaflet + h3. Dart's `Object` is a close match for the former | `emitter/old/type/emit.ts` | ✅ |
| `L-14` **[FIXED — S2]** | ~~Type-reference IR nodes retain only the written name~~ — structured lookup/target data and linked `resolvedFQN` now live at each use site | `ir/type.ts`, `typeRefernce.ts` | ✅ |
| `E-17` **[FIXED]** | ~~`dynamic?` emitted for nullable unions collapsing to dynamic~~ — guard bypassed by an early `return` (S1.4); the guard's exact-equality test then missed the commented form `dynamic /* A\|B */?`, live in 3 three.js files until S1.9. **Severity corrected: this is an analyzer *warning*, not a compile error** — `void?` is the hard error, and was already excluded | `emitter/old/type/emit.ts` | ✅ |

## S2 — Obviously broken / blocks a phase

| ID | Finding | Where | Ev. |
|---|---|---|---|
| `L-02` **[FIXED — S2]** | ~~Dotted qualified names never match table keys~~ — declared namespace metadata resolves all 44 former Leaflet failures | `symbol/resolve.ts`, `phase/symbolGeneration.ts` | ✅ |
| `E-02` | Constructor counter never incremented → duplicate factory names | `emitter/old/class.ts:25-31` | ✅ |
| `E-06` | Enum members unreachable (`static` in an `extension`) with per-member type drift | `emitter/old/enum.ts:19-29` | ✅ |
| `P-04` **[FIXED — S3]** | Discriminated enum initializers retain implicit/numeric/string/computed form, raw text and semantic values; numeric members now reach the old emitter as numbers | `parser/enum.ts`, `ir/enum.ts` | ✅ |
| `P-03` / `I-05` **[FIXED — S3]** | Interface and type-literal call signatures have a shared IR shape and every overload is parsed | `parser/{interface,type/typeLiterals}.ts`, `ir/signature.ts` | ✅ |
| `E-07` | Hoisted anonymous classes get no factory → unconstructible | `emitter/old/interface.ts:21-29` | ✅ |
| `I-01` **[FIXED — S3]** | Shared `IRTypeParam` is present on every generic declaration/signature/function type with constraints, defaults, docs and locations | `ir/signature.ts`, parsers | ✅ |
| `I-04` **[FIXED — S2]** | ~~Heritage stored as raw strings~~ — class/interface `extends` and `implements` now use `IRType` | `ir/{interface,class}.ts` | ✅ |
| `T-01` / `I-03` **[FIXED — S1]** | ~~Unsupported constructs collapsed to `Any` with no reason~~ — `TypeKind.Unsupported` + `UnsupportedReason`; checker-backed `typeof` handling reduced the corpus from 1,410 to **112** unsupported nodes, with 0 unclassified. Remaining nodes are explicit, named degradations | `type/unsupported.ts`, `type/typeQuery.ts` | ✅ |
| `P-07` **[FIXED]** | ~~`this` type → `dynamic`, 900 occurrences — the #1 type gap~~ — resolves to the enclosing class/interface per js_facade_gen §3.10 (S1.4). Owner found via AST ancestors, not by parsing `currentFQN` | `type/thisType.ts` | ✅ |
| `E-09` | No Dart keyword escaping (`external bool get static;`) | all emitters | ✅ |
| `P-12` **[FIXED — S3]** | Classes now retain index signatures in the same shape as interfaces/type literals | `parser/class.ts`, `ir/class.ts` | ✅ |
| `E-20` | `IRClass.isAbstract` parsed and never emitted — abstract classes emit as concrete | `emitter/old/class.ts:16` | ✅ |
| `E-10` | Namespace flattening collides (two `abstract class ZoomOptions` in leaflet) | `phase/emitterPhase.ts:198-211` | ✅ |
| `E-05` | Variables emit mutable fields; `isReadonly`/`isConst` ignored | `emitter/old/variable.ts:13` | ✅ |
| `L-05` | Overload grouping + augmentation not implemented in the new pipeline | `phase/linkerPhase.ts` | ✅ |
| `L-08` **[FIXED — S2]** | Persisted `LinkReport.edges`, symbol `resolvedDeps`, and use-site identities replace graph-side re-resolution | `phase/linkerPhase.ts`, `symbol/index.ts` | ✅ |
| `E-11` **[FIXED]** | ~~Emission coupled to `fs`~~ — split into `renderAllFiles()` / `writeAllFiles()` in S0.1 | `phase/emitterPhase.ts` | 🔍 |
| `T-09` **[FIXED]** | ~~Intersections parsed correctly, then dropped to `dynamic` at emit~~ — emits `Foo /*Foo&Bar*/` per js_facade_gen §5.3 (S1.9). It was the one gap making dartify *worse* than the tool it replaces | `emitter/old/type/emit.ts` | ✅ |
| `X-06` **[FIXED — S2]** | 15 focused linker/resolution/graph/reporting tests plus Leaflet and three.js corpus gates now assert link behaviour | `test/linker/` | ✅ |
| `D-01` *(quarantined)* | 5-pass pipeline orphaned. Excluded from `tsconfig` in S0.7 so its 5 stale errors stop masking real ones. **Still on disk** — S4 mines `transformers/` before deleting both | `engine/{passes,transformers}` | ✅ |
| `D-07` **[FIXED]** | ~~**95% of `dist/cli.js` was `@viz-js/viz`**~~ — a devDependency made reachable by a live import in `linkerPhase`. S0.4: **1.59 MB → 73.3 KB** | `tools/graph.ts` | ✅ |
| `X-03` **[FIXED]** | ~~`tsc --noEmit` → 15 errors~~ — now **0**. Dead dirs excluded from `tsconfig` (kept on disk for S4 mining), test signatures fixed | `tsconfig.json` | ✅ |
| `P-13` | Sibling structural positions share one parse-context FQN. `f(x: {a: string} \| {b: number})` registers two `Anon_f_overload_0_param_0_x` declarations and both union members collapse to that name | `parser/type/typeLiterals.ts`, `parser/context.ts` | ✅ |

## S3 — Latent hazards & design debt

| ID | Finding | Where | Ev. |
|---|---|---|---|
| `T-03` **[FIXED]** | ~~Handlers mutate objects returned by reference from the shared cache~~ — **was not latent**: verified that `[x?: string]` made a later `[string]` optional. Cache removed (S1.1) and both handlers now spread instead of mutating | `type/{restType,tuple}.ts` | ✅ |
| `T-04` **[FIXED]** | ~~Type cache is global and text-keyed with no file/scope component~~ — cache removed entirely in S1.1 rather than re-keyed; a correct key needed `currentFQN`, which changes per declaration, so the hit rate would have collapsed anyway | `type/type.ts` | ✅ |
| `T-13` **[FIXED]** | ~~Cache hits skipped `collectTypeDep` for nested nodes, so the **second** occurrence of a generic type in a file contributed **zero** dep edges~~ — removed with the cache (S1.1) | `type/type.ts` | ✅ |
| `T-14` **[FIXED]** | ~~`typeof x` classified from syntax alone and written off as unrepresentable~~ — the checker resolves **393 of 449 (87%)** to a primitive, mostly the enum-as-consts idiom. Unsupported nodes 505 → 112 (S1.5b) | `type/typeQuery.ts` | ✅ |
| `T-15` **[FIXED]** | ~~`null \| undefined` left an empty `unionTypes` and `emitType` reached for `[0]`~~ — threw, and the emitter's per-symbol try/catch turned the declaration into a comment. Returns a nullable `Any` (S1.9) | `type/unions.ts` | ✅ |
| `T-16` **[FIXED]** | ~~`{}` synthesised a cyclic `typedef anon_dynamic = anon_dynamic;` registered under a non-FQN key~~ — emitted into 1 file while **117** use sites across **34** files referenced it. **Live in three.js.** `{}` is now `dynamic` (S1.9) | `type/typeLiterals.ts` | ✅ |
| `T-17` **[FIXED]** | ~~`ParenthesizedType` and the `readonly` operator forwarded `depth` unchanged~~ — **`T-05` was closed prematurely**; `(((…)))` was unbounded at any nesting. Verified: 40 nested parens never tripped the guard. Fixed in the audit pass | `type/type.ts`, `type/typeOperator.ts` | ✅ |
| `I-13` **[FIXED — S3]** | One shared `IRParameter` now serves declaration and function-type parsing with one `isRest` contract | `ir/signature.ts`, parsers | ✅ |
| `I-14` **[FIXED — S3]** | Deleted live `ir/literal.ts` and `IRType.objectLiteral`; the quarantined transformers remain excluded until S4 mines them | `ir/type.ts`, `ir/literal.ts` | ✅ |
| `P-11` **[FIXED — S3]** | Parameters retain exact object/array binding-pattern text and initializer text, with semantic rest/optional flags | `parser/signature.ts`, `ir/signature.ts` | ✅ |
| `X-12` | The stress tier asserts only that nothing *escaped* `transpileFromString`; `result.errors` and `// ERROR emitting` comments are never inspected. Post-S3 census: 0 throws / 0 returned errors / 0 markers over 1,650 files, so nothing is hidden today | `test/stress.test.ts` | ✅ |
| `R-09` **[FIXED — S3]** | Immutable `ParseContext` replaces every mutable `currentFQN` assignment and registers hoists through an explicit callback | `parser/context.ts`, parsers | ✅ |
| `I-11` **[FIXED — S3]** | `deepCloneIRDeclaration` uses `structuredClone`; the S3 fixture proves bigint literals clone independently | `ir/declaration.ts`, `test/decl/s3-ir.test.ts` | ✅ |
| `R-11` **[FIXED]** | ~~Context singleton never reset between runs~~ — `resetTranspilerState()` (`src/reset.ts`) called at the start of every run, S0.3. Verified: two `transpileFromString` calls no longer contaminate each other | `src/reset.ts` | ✅ |
| `T-06` **[FIXED]** | ~~`IRType.name` has three incompatible meanings; Dart names leak into the IR~~ — TS-side names only, guarded by an invariant test (S1.8). Surfaced a live defect: `name: "BigInt"` was the only thing separating a bigint literal from a number literal, so `10n` emitted `num` | `type/literals.ts` | ✅ |
| `L-03` **[FIXED — S2]** | Resolution returns an explicit ambiguous outcome and never selects `matches[0]` arbitrarily | `symbol/resolve.ts` | ✅ |
| `L-10` | `SymbolTable` has no `unregister`/`replace`; `getSymbolTable()` leaks the live `Map` | `symbol/table.ts` | 🔍 |
| `L-11` | Module scoping is textual; `declare module` / `namespace` / `global` indistinguishable | `phase/symbolGeneration.ts:239-253` | 🔍 |
| `R-13` | Symbol-generation errors are collected, optionally printed, then discarded; neither `LinkReport` nor `transpileFromString().errors` can surface per-statement failures | `phase/symbolGeneration.ts:11-44` | 🔍 |
| `L-12` **[FIXED — S2]** | Direct and transitive missing states are now distinct and fixture-tested | `phase/linkerPhase.ts` | ✅ |
| `L-13` **[FIXED — S2]** | Graph IDs derive from full FQNs; basename/scope is label-only | `tools/graphModel.ts` | ✅ |
| `L-15` **[FIXED — S2]** | Expected checker failures produce syntax fallbacks and structured diagnostics rather than disappearing edges | `parser/type/typeRefernce.ts` | ✅ |
| `L-16` **[FIXED — S3]** | Type-parameter references were excluded only when `node.getType().isTypeParameter()` happened to be true; optional/member contexts could expose the surrounding type and mint a fake `/file.d.ts::T` dependency. Declaration identity now excludes every `TypeParameterDeclaration`, fixture-tested on generic class members and signatures | `parser/type/typeRefernce.ts` | ✅ |
| `I-06` / `P-06` **[FIXED — S3]** | Shared node metadata retains raw JSDoc on declarations, members, signatures, enum members, type params and params; `@param` tags map to parameters | `ir/node.ts`, `parser/metadata.ts`, `parser/signature.ts` | ✅ |
| `I-10` **[FIXED — S3]** | Parsed declarations, types and nested nodes retain file/line/column; the census found 0 missing locations across 2,530 declarations and 26,240 parsed types | `ir/node.ts`, parsers | ✅ |
| `I-09` **[FIXED — S3]** | Required declaration modifiers retain export kind and declare/ambient state; class members and constructors retain visibility plus static/readonly/abstract facts | `ir/{node,interface,signature}.ts`, parsers | ✅ |
| `T-05` **[FIXED]** | ~~Depth not propagated through function types — recursion guard leaks~~ — `depth + 1` on the return type and each parameter (S1.9). **Closed too early**: two other handlers had the same defect, see `T-17` | `type/function.ts` | ✅ |
| `T-08` **[FIXED]** | ~~Intersection dispatch compares source text instead of `SyntaxKind`~~ — shared kind predicates in `type/keywords.ts`, now used by both the union and intersection handlers (S1.9) | `type/intersection.ts`, `type/keywords.ts` | ✅ |
| `R-03` **[FIXED — S2]** | Longest-common-ancestor roots plus explicit collision checks replace first-input rooting | `transpiler.ts`, `emitterPhase.ts` | ✅ |
| `R-02` **[FIXED — S2]** | Public reports always include resolution issues and the CLI always prints the unresolved count | `transpiler.ts`, `cli.ts` | ✅ |
| `X-02` **[FIXED]** | ~~1,648 whole-library snapshots~~ — retiered in S0.6 into sanity / smoke (3 files) / opt-in stress. **4.3 MB → 128 KB** of snapshots | `test/{simple,smoke,stress}.test.ts` | ✅ |
| `X-09` *(partial)* | ~~Nothing runs `dart analyze` on the output~~ — measured manually: **h3 clean**, probe 19, `leaflet.dart` 510; the separate `geojson.dart` adds 12, so complete Leaflet output is 522. Still not automated | — | ✅ |
| `I-07` / `D-03` **[FIXED — S3]** | Live vestigial literal IR deleted after S2 supplied `ir/visit.ts`; dead S4 reference code remains quarantined for mining | `ir/type.ts`, `ir/literal.ts` | ✅ |
| `I-08` **[FIXED — S3]** | Class constructors and interface/type-literal construct signatures share `IRConstructSignature`; fake names are gone | `ir/signature.ts`, parsers | ✅ |
| `E-14` | Index signatures ignore parsed key/value types | `emitter/old/interface.ts:70-73` | 🔍 |
| `E-12` | Tuples collapse to `List<dynamic>`; `literalValue` discarded | `emitter/old/type/emit.ts` | ✅ |
| `T-07` **[FIXED — S1]** | Bare `null` parses and emits as `Null`, protected by the Tier-A type test | `type/literals.ts`, `emitter/old/type/emit.ts` | ✅ |
| `P-05` **[FIXED — S3]** | Variables record `declarationKind: var | let | const` and derive `isConst`; impossible readonly state removed | `parser/variable.ts`, `ir/variable.ts` | ✅ |
| `P-02` **[FIXED — S3]** | Constraints/defaults are parsed as full `IRType` nodes on every generic owner and participate in linking | `parser/signature.ts` | ✅ |
| `R-10` **[FIXED — S2]** | ~~`currentDeps` shared across declarators~~ — bucket removed; deps derive from each declaration's completed IR | `phase/symbolGeneration.ts`, `ir/visit.ts` | ✅ |
| `P-08` **[FIXED — S3]** | Return, parameter, member and overload scopes are deterministic immutable context children. Sibling positions inside one type still collide; see `P-13` | `parser/{context,function,signature}.ts` | ✅ |
| `P-09` **[FIXED — S3 IR]** | Every construct overload is preserved in shared IR without a fake name. The transitional emitter still reads one interface factory; full overload emission remains S5 | `parser/interface.ts`, `ir/signature.ts` | ✅ |

## S4 — Cosmetic, wasteful, drift

| ID | Finding | Where |
|---|---|---|
| `L-07` **[FIXED]** | ~~Visualiser wired into the production linker phase~~ — moved to `tools/graph.ts` (`pnpm graph`), consuming the `LinkReport` `runLinker` now returns. Stray logs gone; SVG untracked and gitignored | `tools/graph.ts` |
| `L-06` **[FIXED]** | ~~`resolveRealFQN` duplicated~~ — extracted to `src/symbol/resolve.ts`, shared by the linker and the graph tool | `symbol/resolve.ts` |
| `R-06` **[FIXED — S2]** | Shared `resolution/stdlib.ts` predicate is used by orchestration and parsing | `resolution/stdlib.ts` |
| `R-08` **[PARTIAL — S2]** / `D-05` | `-l` is now accurately documented phase/module logging; `-lv` prints structured linker details and `--version` is long-only. The separate IR-dump decision and unused 251-line `log.ts` remain | `cli.ts`, `reporting/linker.ts`, `src/log.ts` |
| `E-13` | `stripQuotes` strips quotes globally, not just delimiters | `utils/utils.ts:2` |
| `R-04` **[FIXED — S2]** | Files/reports/groups are sorted while source declaration order is preserved | `transpiler.ts`, `emitterPhase.ts` |
| `R-05` | Every program file materialised as a ts-morph object, including 51 stdlib files | `transpiler.ts:184-196` |
| `X-05` **[FIXED]** | ~~Snapshot path rewrite assumes POSIX separator~~ — normalises separators first | `vitest.config.ts` |
| `X-07` **[FIXED]** | ~~`pnpm test` is watch mode~~ — repointed at `vitest run`; `test:watch` unchanged | `package.json` |
| `X-08` **[FIXED]** | ~~`test:cli` placeholder path and wrong flags~~ — now `-d def_files/h3/h3.d.ts -o ./output` | `package.json` |
| `R-07` **[FIXED]** | ~~CLI `--version` hardcoded `v0.3`~~ — read from `package.json` | `cli.ts` |
| `X-10` **[FIXED]** | ~~Probe fixture only in the audit~~ — promoted to `def_files/synthetic/probe.d.ts`, now a smoke-tier snapshot | `def_files/synthetic/probe.d.ts` |
| `E-15` | Redundant `isReadonly` branch emitting identical getters | `emitter/old/interface.ts:35-44` |
| `E-21` | Emitter dead code and unused params remain: commented-out overload path + `getOverloadFuncs`, passthrough `returnTypeAliasName`, and unused `prefix`/`debug` parameters. S3 removed the stale parser locals and double-slash imports | `emitter/**` | ✅ |
| `T-12` **[FIXED]** | ~~Single-member unions keep a meaningless `Union` wrapper~~ — normalised in the parser (S1.9); this is what exposed `E-17`'s commented-form residue | `type/unions.ts` |
| `T-10` **[FIXED — S1]** | ts-morph 28 exposes tuple `OptionalTypeNode`; parser and focused test now handle `[string?]` | `type/tuple.ts`, `test/type/tier-a.test.ts` |
| `T-11` | String literal values unquoted but not unescaped | `type/literals.ts:43` |
| `I-12` | Multi-declarator `var` grouping lost (benign) | `parser/variable.ts` |
| `D-06` **[FIXED — post-S3 audit]** | Built bundle is 114,961 bytes (112.24 KB); no pass, transformer, legacy, logger, graphology or Viz symbols are present | `dist/cli.js`, `package.json` |
| `E-11b` | `@typeEmitter/*` alias hardcodes `emitter/old/` | `tsconfig.json:29` |
| `X-13` | Post-S3 comment drift: input-root docs still say first file, tsconfig calls the dead walker unique, stress/smoke say 1,648 files and call h3 a demo, and a ReadonlyArray comment cites `T-07` instead of its own finding | `transpiler.ts`, `tsconfig.json`, `test/{smoke,stress}.test.ts`, `emitter/old/type/emit.ts` |

---

## Historical pre-S1 corpus frequency data

Measured across the then-current 1,648-file corpus. The statuses below describe
the original audit, not current behaviour; fixed/current metrics follow.

| Construct | Occurrences | Files | Status |
|---|---|---|---|
| **`this` type** | **~1,100** | many | → `dynamic` |
| `keyof` | 1,728 | **20** | → `dynamic` |
| `Array<` | 699 | — | ✅ handled |
| `infer` | 368 | 7 | → `dynamic` |
| `Promise<` | 354 | — | ✅ handled |
| type predicates (`x is T`) | 296 | 16 | → `dynamic` |
| `Exclude<` | 126 | — | → `dynamic` |
| `Record<` | 122 | — | → `dynamic` |
| `ReadonlyArray<` | 61 | — | → `dynamic` |
| `Partial<` | 49 | — | → `dynamic` |
| mapped `[K in keyof T]` | 37 | 17 | → `dynamic` |
| template literal types | 26 | 6 | → `dynamic` |
| `Omit<` / `Pick<` | 31 | — | → `dynamic` |
| `declare module` | — | 39 | partial (`L-11`) |
| `namespace` | — | 15 | partial (`L-11`) |

**Reading:** the frightening constructs are *concentrated*, not pervasive —
`keyof` is 1,728 hits across 20 files (`typescript.d.ts`, `vscode.d.ts`,
lodash). `this` is the genuinely universal gap and it is also the cheapest to
fix. The ROADMAP schedules `this` for v0.7; the data says v0.6.

---

## Baseline metrics (commit `fc57961`)

| Metric | Value |
|---|---|
| `pnpm test:run` | 1654 failed / 48 passed |
| `tsc --noEmit` | 15 errors (0 in live `src`) |
| live `src` lines | ~3,600 |
| dead `src` lines | ~4,300 |
| `dist/cli.js` | **1.59 MB** — 95% of it `@viz-js/viz` (`D-07`; **73.3 KB** after S0.4) |
| h3 | 1 file, 0 broken links, 0.5 s |
| leaflet | 318 symbols, **42 broken**, ~1 s |
| three.js | 420 files, 1943 symbols, 0 broken, 415 emitted, 10 s |
| files with cross-file imports emitted | **0** |
| `dart analyze` clean outputs | **unmeasured** (`X-09`) |
| full-corpus stress (post-S0) | 1,649 files, **0 crashes**, 262 s; 710 empty renders — all barrels/comment-only, 0 real (`X-11`) |

Re-measure after each phase in `PLAN.md`.

## After S1 — the type layer

| Metric | S0 | S1 |
|---|---|---|
| `pnpm test:run` | 57 passed | **199 passed** / 1 skipped |
| `tsc --noEmit` | 0 | **0** |
| `dist/cli.js` | 73.3 KB | **90.6 KB** (+17 KB: alias derivation, registry, registration) |
| unsupported IR nodes (three.js + leaflet + probe) | 1,410 | **112** |
| — of which `unclassified` | — | **0** |
| minted typedefs (three.js + leaflet + probe) | n/a | **68** (64 + 4 probe), 0 dangling, 0 duplicate; 0 cross-file duplicate texts |
| IR nodes emitting exactly `dynamic` | not attributed | **839** — 727 genuine `any` (allowed), 84 typedef right-hand sides, 22 `object`, 6 `undefined` |
| — unrepresentable **use sites** emitting bare `dynamic` | all of them | **0** |
| `anon_dynamic` occurrences in output | 117 | **0** (`T-16`) |
| uncompilable `dynamic /* … */?` | 3 files | **0** (`E-17`) |
| h3 | 0 broken links | 0 broken, **`dart analyze` clean** (unchanged since pre-S1) |
| leaflet | 42 broken | **44 broken** (`T-13` unmasked 2, `L-02`), **510** analyzer issues |
| three.js | 0 broken | 0 broken, 5.2 s end-to-end |
| full-corpus stress | 1,649 files, 0 crashes, 262 s | 1,649 files, **0 crashes**, 336 s |
| `dart analyze` clean outputs | **unmeasured** | h3 ✅ · probe 19 · leaflet 510 — both dominated by `E-03`, `L-05`/`E-10` |

**The `dart analyze` row is the one that changed character.** `X-09` recorded it
as unmeasured; it is now the standing acceptance measure, and `CLAUDE.md`
carries the harness. h3 clean is *necessary and nowhere near sufficient* — h3
has no generics, no heritage, no `interface`s and one file, so `E-03`, `E-04`
and `E-08` are all structurally invisible from it.

### Post-S2 link baseline

| Measure | S2 result |
|---|---|
| Leaflet symbols / edges | **328/328** / **1,050/1,050**, 0 ambiguity |
| three.js reference edges | **8,184 resolved**, 0 ambiguous, **31 missing** |
| three.js missing module types | `webxr`, `@webgpu/types` (not installed) |
| focused link/resolution/graph/reporting tests | **15/15** |
| corpus gates | **2/2** |
| normal suite | **214 passed**, 3 skipped |
| `tsc --noEmit` / build | clean / **107.53 KB** bundle |

The 31 three.js misses replace the old falsely-green result: available checker
targets resolve exactly, while genuinely unavailable external types remain
visible instead of being rebound by bare-name similarity.

### Post-S3 re-audit baseline (`293a102`)

| Measure | Result |
|---|---|
| source read | 66 live files / 5,767 lines; 26 test/tool files / 3,038 lines; configs plus targeted quarantined code |
| normal suite / compiler / build | 222 passed, 4 skipped / clean / 112.24 KB |
| S2 / S3 corpus gates | 2/2 / 1/1; 2,530 declarations and 26,240 types, 0 missing locations |
| full stress | 1,650/1,650 no throws in 157.96 s; 710 empty barrels/comment-only files |
| independent error census | 0 throws, 0 returned errors, 0 `// ERROR emitting` markers |
| Dart analyzer | h3 0; probe 19; `leaflet.dart` 510 + `geojson.dart` 12 |
| new blocker | `P-13`: sibling inline shapes collide before S4 canonicalisation |

The re-audit also corrects `T-07`, `T-10` and `D-06` to fixed. `R-05`,
`R-13`, `L-10`, `L-11`, `X-12` and the transitional-emitter findings remain
open. The former S4 walker-port task is obsolete because `src/ir/visit.ts` is
already live; the quarantined walker is incompatible with current IR.
