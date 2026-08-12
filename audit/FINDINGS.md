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
| `E-01` **[FIXED — S4]** | Exact source `jsName` is carried separately from overload/collision `dartName`; all split-based recovery paths are deleted | `semantic/names.ts`, `emitter/shared/names.ts` | ✅ |
| `L-01` **[FIXED — S2]** | ~~Cross-file dep FQNs name the importing file, not the declaring file~~ — checker-backed targets now retain declaring file and target name; three.js has 0 checker-target fallbacks | `parser/type/typeRefernce.ts`, `symbol/fqn.ts` | ✅ |
| `P-01` **[FIXED — S2]** | ~~Heritage clauses bypass `parseType`~~ — class/interface heritage is `IRType[]` and contributes reference edges | `parser/{interface,class}.ts` | ✅ |
| `E-08` | No cross-file imports are ever emitted — 415/415 three.js files uncompilable | `phase/emitterPhase.ts:188-195` | ✅ |
| `E-23` | Cross-file type uses emit only the target's library-local leaf name; if the consumer library declares that name, Dart silently binds to the wrong local type. The S5 fixture resolves `Consumer --Toolkit.Options--> foundation::Toolkit\|Options` but emits the consumer's own `Options` | `linkerPhase.ts:252-262`, `emitter/old/type/emit.ts:49-64`, `s5-emitter-fixture.test.ts.snap` | ✅ |
| `L-17` **[FIXED — post-S4 review]** | Constructor-companion synthesis converted callable/constructable interfaces to `IRClass`, deleted the target, and silently lost signatures. Unsupported shapes now remain unmerged with diagnostics | `semantic/merge.ts`, `semantic.test.ts` | ✅ |
| `L-18` **[FIXED — post-S4 review]** | Interface/value folding deleted anonymous value-side index signatures. Indexed shapes now remain intact as a separate facet with a merge diagnostic | `semantic/merge.ts`, `semantic.test.ts` | ✅ |
| `P-14` **[FIXED — post-S4 review]** | The public `Anon_` prefix was mistaken for parser provenance, allowing author declarations with equal shapes to be deleted. Hoisted facets now carry explicit `synthetic: "anonymousType"` provenance | `symbol/index.ts`, `symbolGeneration.ts`, `semantic/run.ts` | ✅ |
| `P-15` | Valid anonymous default class/function declarations lose their absent source name. The parser invents `Error_Class`/`anonFunc`; current output becomes `@JS("") class JS$binding` or `@JS("anonFunc")`, neither of which addresses the module default export | `parser/{class,function}.ts`, `symbolGeneration.ts` | ✅ |
| `P-16` | `const enum` is not represented in declaration modifiers or `IREnum`. A valid ambient const enum is indistinguishable from a runtime enum and emits `@JS("Mode")` getters against an object TypeScript normally inlines/erases | `parser/{metadata,enum}.ts`, `ir/{node,enum}.ts` | ✅ |
| `E-31` | Rest parameters emit as one optional `List<T>` argument instead of variadic JavaScript arguments. dart2js/Node received one array (`1:true:a,b`) for `join(...values)`; 36 corpus files contain rest declarations | `emitter/shared/shared.ts`, `emitter/old/type/emit.ts` | ✅ |
| `E-35` | A non-constructable interface/value merge emits a concrete `@JS` class with an implicit Dart constructor. `Config()` compiled as `new A.Config()` despite the TypeScript value having no construct signature | `emitter/old/interface.ts` | ✅ |
| `E-24` **[FIXED — post-S4 review]** | Renamed legacy class members compiled to JavaScript property calls such as `receiver.f_1`, despite `@JS("f")`. Instance overloads now emit as external extension members; renamed statics become qualified top-level bindings. dart2js runtime probes call `f` and `Factory.make` | `emitter/old/class.ts`, `emitter/shared/names.ts` | ✅ |
| `E-25` **[FIXED — post-S4 review]** | `@JS("[Symbol.iterator]")` addressed a string/path, not the ECMAScript symbol key. Computed members remain in IR and now produce an explicit unsupported diagnostic/comment instead of a corrupt binding | `semantic/names.ts`, `emitter/old/{class,interface}.ts` | ✅ |
| `E-26` **[FIXED — post-S4 review]** | Source declarations such as three.js `class String` captured unqualified backend types and produced analyzer-clean semantic corruption. Backend-owned names are now reserved and references follow the allocated `JS$` name | `semantic/{keywords,names}.ts`, `semantic.test.ts` | ✅ |
| `T-02` **[FIXED]** | ~~`IRType.originalText` declared but never written — source text destroyed at parse~~ — written for every node at every depth from one place in `parseType` (S1.2), whitespace-normalised, no truncation | `type/sourceText.ts`, `type/type.ts` | ✅ |
| `E-03` | Type parameters never emitted — every generic declaration is uncompilable | `emitter/old/class.ts:17` | ✅ |
| `E-04` | `extends`/`implements` never emitted — whole inheritance graph dropped | all emitters | ✅ |
| `R-01` **[FIXED — S2]** | ~~Extensionless relative imports silently fail~~ — default Bundler resolution plus a unique explicit-declaration fallback; tsconfig remains authoritative | `resolution/moduleHost.ts`, `transpiler.ts` | ✅ |
| `R-14` | Concurrent `analyze`/`render`/`transpileFromString` calls reset and mutate one process-global symbol table. A 20-pair probe returned the first `Alpha` output for every independent `Beta` request. Task 4.11 is locked to delete `context.ts`/`reset.ts`, move all project/table/resolution state per run, and pass narrow dependencies—no replacement singleton or serialization | `context.ts`, `reset.ts`, `transpiler.ts`, phase entry points | ✅ |
| `L-19` | Syntax fallback drops external-module visibility: an unresolved `Missing` in `a.d.ts` silently resolves by terminal name to an exported `Missing` in unrelated `b.d.ts`; the link report remains fully green | `symbol/resolve.ts`, `phase/linkerPhase.ts` | ✅ |
| `P-17` | Symbol generation ignores `ExportAssignment`, so `export = value` and `export default value` relationships never enter IR. The checked corpus contains 690 files with `export =` and 222 with identifier default exports, leaving S5 unable to bind the module export correctly | `phase/symbolGeneration.ts` | ✅ |
| `X-14` | The pre-S5 fixture snapshots Dart and checks TypeScript declaration validity, but never analyzes or executes generated Dart. Existing unit tests positively lock `T-18`'s impossible intersections and `E-31`'s list-as-rest lowering, so green Vitest results can certify wrong bindings | `test/{type/normalisation,type/type-emitter,decl/s5-emitter-fixture}.test.ts` | ✅ |
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
| `I-15` | Standard-library references discard their declaration identity: both a real `lib.dom.d.ts` `HTMLElement` and a lexical type parameter named `HTMLElement` have no `IRReferenceTarget`. S5 therefore cannot apply browser/typed-data substitutions safely without matching leaf text and risking user/type-parameter capture | `parser/type/typeRefernce.ts:91-114`, `ir/type.ts` | ✅ |
| `T-01` / `I-03` **[FIXED — S1]** | ~~Unsupported constructs collapsed to `Any` with no reason~~ — `TypeKind.Unsupported` + `UnsupportedReason`; checker-backed `typeof` handling reduced the corpus from 1,410 to **112** unsupported nodes, with 0 unclassified. Remaining nodes are explicit, named degradations | `type/unsupported.ts`, `type/typeQuery.ts` | ✅ |
| `P-07` **[FIXED — S1/S5 fixture]** | ~~`this` type → `dynamic`, 900 occurrences — the #1 type gap~~ — resolves to the enclosing class/interface per js_facade_gen §3.10. Its owner FQN is linkable, so S4 constructor-companion redirects also rewrite fluent return names | `type/thisType.ts`, `s5-emitter-fixture.test.ts` | ✅ |
| `E-09` **[FIXED — S4]** | Context-aware Dart reserved/built-in names are escaped with `JS$`; source spellings remain in `@JS` annotations | `semantic/{keywords,names}.ts` | ✅ |
| `E-22` **[FIXED — S4 identifier legality]** | Computed/non-identifier source spellings receive legal Dart identifiers, eliminating parser cascades. S4 did not prove runtime key semantics; that distinct defect is `E-25` | `semantic/keywords.ts`, `semantic.test.ts` | ✅ |
| `E-27` **[FIXED — post-S4 review]** | Generated `${name}Extension`, `${name}Enum`, and class static-binding names were absent from allocation, causing duplicate top-level declarations in three.js. Allocation now reserves every emitted companion | `semantic/names.ts`, `semantic.test.ts` | ✅ |
| `E-28` **[FIXED — post-S4 review]** | Digit-leading declaration filenames emitted invalid libraries such as `library 3MFLoader;`. Sanitization now prefixes names that cannot start a Dart identifier | `phase/emitterPhase.ts`, `semantic.test.ts` | ✅ |
| `E-30` | Collision prefixes derived from ambient-module specifiers are not revalidated as Dart identifiers. A top-level `Item` plus `declare module "3d-kit" { interface Item {} }` emits invalid `class 3d_kit_Item` | `semantic/names.ts` | ✅ |
| `E-32` | JavaScript names are inserted into Dart annotation strings without literal escaping. `$foo` becomes string interpolation, while a TS member `"foo-bar"` emits malformed `@JS(""foo-bar"")` | `emitter/shared/names.ts`, `emitter/old/*` | ✅ |
| `E-33` | Library-name sanitization handles punctuation/digits but not Dart keywords; `class.d.ts` emits invalid `library class;` | `phase/emitterPhase.ts` | ✅ |
| `E-34` | S3 preserves class index signatures in IR, but `emitClass` never reads `indexSignatures`, so their complete contract is silently dropped | `emitter/old/class.ts` | ✅ |
| `E-36` | Standard-library utility references such as `Record<K, V>` remain ordinary unresolved Dart identifiers. The S5 fixture emits `Record<String, dynamic>` and fails analysis; the post-v1 checker-evaluation deferral incorrectly claimed Tier B already gave these references safe names | `parser/type/typeRefernce.ts`, `emitter/old/type/emit.ts`, `s5-emitter-fixture.test.ts.snap` | ✅ |
| `P-12` **[FIXED — S3]** | Classes now retain index signatures in the same shape as interfaces/type literals | `parser/class.ts`, `ir/class.ts` | ✅ |
| `P-10` **[FIXED — S4]** | Variable-side object members are promoted to static properties/methods/accessors during supported interface/value and constructor-companion merges | `semantic/merge.ts`, `emitter/old/{class,interface}.ts` | ✅ |
| `E-20` | `IRClass.isAbstract` parsed and never emitted — abstract classes emit as concrete | `emitter/old/class.ts:16` | ✅ |
| `E-10` **[FIXED — S4]** | Top-level priority plus shortest namespace suffix/numeric fallback produces unique Dart-visible names and rewrites references; Leaflet duplicate definitions 245 -> 0 | `semantic/names.ts`, `emitterPhase.ts` | ✅ |
| `E-05` | Variables emit mutable fields; `isReadonly`/`isConst` ignored | `emitter/old/variable.ts:13` | ✅ |
| `L-05` **[FIXED — S4 matrix]** | Atomic semantic pass groups overloads, merges supported declaration families/constructor companions, retains dual facets, redirects identities, and diagnoses preserved conflicts | `engine/semantic/*`, `linkerPhase.ts` | ✅ |
| `L-08` **[FIXED — S2]** | Persisted `LinkReport.edges`, symbol `resolvedDeps`, and use-site identities replace graph-side re-resolution | `phase/linkerPhase.ts`, `symbol/index.ts` | ✅ |
| `E-11` **[FIXED]** | ~~Emission coupled to `fs`~~ — split into `renderAllFiles()` / `writeAllFiles()` in S0.1 | `phase/emitterPhase.ts` | 🔍 |
| `T-09` **[FIXED]** | ~~Intersections parsed correctly, then dropped to `dynamic` at emit~~ — emits `Foo /*Foo&Bar*/` per js_facade_gen §5.3 (S1.9). It was the one gap making dartify *worse* than the tool it replaces | `emitter/old/type/emit.ts` | ✅ |
| `X-06` **[FIXED — S2]** | 15 focused linker/resolution/graph/reporting tests plus Leaflet and three.js corpus gates now assert link behaviour | `test/linker/` | ✅ |
| `D-01` **[FIXED — S4]** | The orphaned 1,684-line five-pass pipeline, path aliases, and compiler exclusions are deleted after live semantic tests replaced its retained concepts | `engine/semantic/*`, `tsconfig.json` | ✅ |
| `D-07` **[FIXED]** | ~~**95% of `dist/cli.js` was `@viz-js/viz`**~~ — a devDependency made reachable by a live import in `linkerPhase`. S0.4: **1.59 MB → 73.3 KB** | `tools/graph.ts` | ✅ |
| `X-03` **[FIXED]** | ~~`tsc --noEmit` → 15 errors~~ — now **0**. Dead dirs excluded from `tsconfig` (kept on disk for S4 mining), test signatures fixed | `tsconfig.json` | ✅ |
| `P-13` **[FIXED — S4]** | Every recursive structural position has a deterministic child path; distinct siblings no longer collapse before same-file shape canonicalization | `parser/type/*`, `semantic/shape.ts` | ✅ |

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
| `T-18` | Intersection normalization treats `null`/`undefined` as nullable union members and drops `void`: `string & null`/`undefined` emit `String?`, and `string & void` emits `String`, although the checker resolves all three to `never` | `parser/type/intersection.ts` | ✅ |
| `I-13` **[FIXED — S3]** | One shared `IRParameter` now serves declaration and function-type parsing with one `isRest` contract | `ir/signature.ts`, parsers | ✅ |
| `I-14` **[FIXED — S3/S4]** | Deleted live vestigial literal IR in S3; S4 then deleted the quarantined transformer consumers | `ir/type.ts`, `engine/semantic/shape.ts` | ✅ |
| `D-02` **[FIXED — S4]** | Overload and structural-canonicalization requirements were reimplemented against current facets/IR; obsolete transformer implementations were not ported | `engine/semantic/*`, `ir/visit.ts` | ✅ |
| `P-11` **[FIXED — S3]** | Parameters retain exact object/array binding-pattern text and initializer text, with semantic rest/optional flags | `parser/signature.ts`, `ir/signature.ts` | ✅ |
| `X-12` | The stress tier asserts only that nothing *escaped* `transpileFromString`; `result.errors` and `// ERROR emitting` comments are never inspected. Post-S3 census: 0 throws / 0 returned errors / 0 markers over 1,650 files, so nothing is hidden today | `test/stress.test.ts` | ✅ |
| `X-15` | The package documents/targets generic Node 20 but declares no `engines`; pinned `yargs@18.0.0` requires Node `^20.19.0 || ^22.12.0 || >=23`, so supported-looking Node 20.0–20.18 installs can fail at runtime | `package.json`, `pnpm-lock.yaml` | ✅ |
| `X-16` | `pnpm test:coverage` is advertised but `@vitest/coverage-v8` is absent. Direct execution stops with `MISSING DEPENDENCY` before running a test | `package.json` | ✅ |
| `R-09` **[FIXED — S3]** | Immutable `ParseContext` replaces every mutable `currentFQN` assignment and registers hoists through an explicit callback | `parser/context.ts`, parsers | ✅ |
| `I-11` **[FIXED — S3]** | `deepCloneIRDeclaration` uses `structuredClone`; the S3 fixture proves bigint literals clone independently | `ir/declaration.ts`, `test/decl/s3-ir.test.ts` | ✅ |
| `R-11` **[FIXED; SUPERSEDED BY 4.11]** | Resetting fixed sequential contamination in S0.3, but cannot isolate overlap (`R-14`). Task 4.11 deletes the singleton/reset seam while retaining the sequential regression as a by-construction invariant | `src/reset.ts`, `transpiler.ts` | ✅ |
| `T-06` **[FIXED]** | ~~`IRType.name` has three incompatible meanings; Dart names leak into the IR~~ — TS-side names only, guarded by an invariant test (S1.8). Surfaced a live defect: `name: "BigInt"` was the only thing separating a bigint literal from a number literal, so `10n` emitted `num` | `type/literals.ts` | ✅ |
| `L-03` **[FIXED — S2]** | Resolution returns an explicit ambiguous outcome and never selects `matches[0]` arbitrarily | `symbol/resolve.ts` | ✅ |
| `L-10` **[PARTIAL — S4]** | Validated `replace`, `unregister`, and rollback-safe `apply` protect table structure, but snapshot/lookup results retain live `Symbol`, facet, IR, and dependency objects. A consumer can mutate table state without an API call | `symbol/table.ts`, `symbol-table.test.ts` | ✅ |
| `L-11` **[FIXED — S4]** | Explicit namespace/external-module/global scope records drive FQNs, JS paths, augmentation suppression, and global hoisting | `symbol/index.ts`, `symbolGeneration.ts` | ✅ |
| `R-13` | Symbol-generation errors are collected, optionally printed through global `isLogging`, then discarded; neither `LinkReport` nor `transpileFromString().errors` can surface per-statement failures. Task 4.11 returns them as owned phase output while deleting the logging singleton | `phase/symbolGeneration.ts:11-44`, `context.ts` | 🔍 |
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
| `X-09` *(partial)* | Manual S4 acceptance: h3 0 errors/warnings; semantic fixtures 0 S4-owned errors; Leaflet 239 total with 0 duplicates; three.js 0 duplicate/syntax/identifier errors. CI automation remains S6 | `audit/S4-EVIDENCE.md` | ✅ |
| `I-07` / `D-03` **[FIXED — S3/S4]** | Live vestigial literal IR deleted after S2 supplied `ir/visit.ts`; S4 deleted its quarantined transformer consumers | `ir/type.ts`, `engine/semantic/shape.ts` | ✅ |
| `I-08` **[FIXED — S3]** | Class constructors and interface/type-literal construct signatures share `IRConstructSignature`; fake names are gone | `ir/signature.ts`, parsers | ✅ |
| `E-14` | Index signatures ignore parsed key/value types | `emitter/old/interface.ts:70-73` | 🔍 |
| `E-12` | Tuples collapse to `List<dynamic>`; `literalValue` discarded | `emitter/old/type/emit.ts` | ✅ |
| `T-07` **[FIXED — S1]** | Bare `null` parses and emits as `Null`, protected by the Tier-A type test | `type/literals.ts`, `emitter/old/type/emit.ts` | ✅ |
| `P-05` **[FIXED — S3]** | Variables record `declarationKind: var | let | const` and derive `isConst`; impossible readonly state removed | `parser/variable.ts`, `ir/variable.ts` | ✅ |
| `P-02` **[FIXED — S3]** | Constraints/defaults are parsed as full `IRType` nodes on every generic owner and participate in linking | `parser/signature.ts` | ✅ |
| `R-10` **[FIXED — S2]** | ~~`currentDeps` shared across declarators~~ — bucket removed; deps derive from each declaration's completed IR | `phase/symbolGeneration.ts`, `ir/visit.ts` | ✅ |
| `P-08` **[FIXED — S3/S4]** | Immutable owner/signature scopes landed in S3; S4 added deterministic recursive structural positions and closed `P-13` | `parser/{context,function,signature,type}.ts` | ✅ |
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
| `E-21` **[PARTIAL — S4]** | Deleted commented overload code/helper and wired interface prefixes; passthrough alias helper and compatibility `debug` parameters remain for S5 | `emitter/**` | ✅ |
| `T-12` **[FIXED]** | ~~Single-member unions keep a meaningless `Union` wrapper~~ — normalised in the parser (S1.9); this is what exposed `E-17`'s commented-form residue | `type/unions.ts` |
| `T-10` **[FIXED — S1]** | ts-morph 28 exposes tuple `OptionalTypeNode`; parser and focused test now handle `[string?]` | `type/tuple.ts`, `test/type/tier-a.test.ts` |
| `T-11` | String literal values unquoted but not unescaped | `type/literals.ts:43` |
| `I-12` | Multi-declarator `var` grouping lost (benign) | `parser/variable.ts` |
| `D-06` **[FIXED — S4 reverified]** | Built bundle is 154.11 KB with semantic/reporting code; no deleted pass/transformer, legacy, logger, graphology, or Viz code ships | `dist/cli.js`, `package.json` |
| `E-11b` | `@typeEmitter/*` alias hardcodes `emitter/old/` | `tsconfig.json:29` |
| `X-13` **[FIXED — S4]** | Corrected all six audited source/test/config comments alongside deletion of the obsolete pipeline | `transpiler.ts`, `tsconfig.json`, `test/{smoke,stress}.test.ts`, `emitter/old/type/emit.ts` |
| `E-29` | Colliding derived alias names are source-order-dependent: reversing two distinct `keyof` expressions swaps which gets the unhashed base name, contrary to the stability claim | `engine/alias/registry.ts` |

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

### Post-S4 full-audit baseline (`920c3fc`)

| Measure | Result |
|---|---|
| scope read | 75 live source / 29 test-tool / 3 historical TypeScript files; all 24 Markdown records |
| findings | 16 new; `L-10` reopened as partial |
| normal / S2 / S3 / S4 / S5 fixture | 252 passed, 4 skipped / 2/2 / 1/1 / 34/34 / 3/3 |
| current S3 view | 2,530 input declarations; 2,342 facets; 25,268 parsed types; 0 missing locations |
| stress | 1,654/1,654 in 180 s; 719 known empty outputs |
| compiler/build/h3 | TypeScript clean; 162.47 KB; Dart analyzer has only the expected deprecation info |
| Leaflet / three.js analyzer | 223 errors + 14 warnings / 8,342 errors + 267 warnings; no duplicate, syntax, or identifier categories |

The original S3 and S4 tables above are historical stage-close measurements.
The current ownership and reproductions are in `POST-S4-AUDIT.md`; prerequisite
work is sequenced as `PLAN.md` tasks 4.11–4.17.
