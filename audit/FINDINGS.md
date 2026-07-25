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
| `L-01` | Cross-file dep FQNs name the importing file, not the declaring file; masked by the fuzzy matcher | `parser/type/typeRefernce.ts:24-30` | ✅ |
| `P-01` | Heritage clauses bypass `parseType` → **no inheritance edge reaches the dep graph** | `parser/interface.ts:19`, `class.ts:17-18` | ✅ |
| `E-08` | No cross-file imports are ever emitted — 415/415 three.js files uncompilable | `phase/emitterPhase.ts:188-195` | ✅ |
| `T-02` **[FIXED]** | ~~`IRType.originalText` declared but never written — source text destroyed at parse~~ — written for every node at every depth from one place in `parseType` (S1.2), whitespace-normalised, no truncation | `type/sourceText.ts`, `type/type.ts` | ✅ |
| `E-03` | Type parameters never emitted — every generic declaration is uncompilable | `emitter/old/class.ts:17` | ✅ |
| `E-04` | `extends`/`implements` never emitted — whole inheritance graph dropped | all emitters | ✅ |
| `R-01` | Extensionless relative imports silently fail to resolve (most `@types/*` packages) | `transpiler.ts:86-96` | ✅ |
| `X-01` **[FIXED]** | ~~Test suite calls removed `Transpiler.transpileFromString`~~ — restored in S0.2 as a static wrapper over the three phases | `transpiler.ts` | ✅ |
| `E-16` **[FIXED]** | ~~No type-definitions section; degradation to `dynamic` is anonymous and unnamed~~ — minted, documented typedefs with named use sites, S1.5–S1.7. 68 typedefs over three.js + leaflet, 0 dangling, 0 duplicates; no `dart analyze` issue names one | `engine/alias/*`, `phase/emitterPhase.ts` | ✅ |
| `E-18` | Multi-member unions emit `js_facade_gen`'s inline `dynamic /* A\|B */` at every use site — pre-existing, conformant, but the pattern principle 2 replaces. Dedup is computed then discarded (`"a"\|"b"\|number` → `String\|String\|num`). Needs a Dart-side name derivation, not `E-16`'s text-side one | `emitter/old/type/emit.ts:70-92` | ✅ |
| `E-19` | TS `object` and `undefined` keywords have no `emitType` case and fall to `default:` → bare `dynamic`. 28 nodes over three.js + leaflet + h3. Dart's `Object` is a close match for the former | `emitter/old/type/emit.ts` | ✅ |
| `E-17` **[FIXED]** | ~~`dynamic?` emitted for nullable unions collapsing to dynamic~~ — guard bypassed by an early `return` (S1.4); the guard's exact-equality test then missed the commented form `dynamic /* A\|B */?`, live in 3 three.js files until S1.9. **Severity corrected: this is an analyzer *warning*, not a compile error** — `void?` is the hard error, and was already excluded | `emitter/old/type/emit.ts` | ✅ |

## S2 — Obviously broken / blocks a phase

| ID | Finding | Where | Ev. |
|---|---|---|---|
| `L-02` | Dotted qualified names never match table keys — 44/44 of leaflet's broken links (was 42; `T-13`'s fix exposed 2 more) | `phase/linkerPhase.ts:57-63` | ✅ |
| `E-02` | Constructor counter never incremented → duplicate factory names | `emitter/old/class.ts:25-31` | ✅ |
| `E-06` | Enum members unreachable (`static` in an `extension`) with per-member type drift | `emitter/old/enum.ts:19-29` | ✅ |
| `P-04` | Enum values always parsed as strings, never numbers | `parser/enum.ts:11` | ✅ |
| `P-03` / `I-05` | Interface call signatures never read; no IR field for them | `parser/interface.ts`, `ir/interface.ts` | ✅ |
| `E-07` | Hoisted anonymous classes get no factory → unconstructible | `emitter/old/interface.ts:21-29` | ✅ |
| `I-01` | Type params absent from IR except `IRClass` (and unemitted there) | `ir/{interface,function,typealias}.ts` | ✅ |
| `I-04` | Heritage stored as raw strings — loses generic args, dep edges, qualified names | `ir/interface.ts:9`, `ir/class.ts:13-14` | ✅ |
| `T-01` / `I-03` *(partial)* | ~~No `TypeKind` for unsupported constructs; all collapse to `Any`~~ — `TypeKind.Unsupported` + `UnsupportedReason` (S1.3). **Census 1,410 → 503 after Tier A (S1.4), 0 unclassified.** Remainder is 88% `typeof x`, which needs the checker and moves to Tier B | `type/unsupported.ts` | ✅ |
| `P-07` **[FIXED]** | ~~`this` type → `dynamic`, 900 occurrences — the #1 type gap~~ — resolves to the enclosing class/interface per js_facade_gen §3.10 (S1.4). Owner found via AST ancestors, not by parsing `currentFQN` | `type/thisType.ts` | ✅ |
| `E-09` | No Dart keyword escaping (`external bool get static;`) | all emitters | ✅ |
| `E-10` | Namespace flattening collides (two `abstract class ZoomOptions` in leaflet) | `phase/emitterPhase.ts:198-211` | ✅ |
| `E-05` | Variables emit mutable fields; `isReadonly`/`isConst` ignored | `emitter/old/variable.ts:13` | ✅ |
| `L-05` | Overload grouping + augmentation not implemented in the new pipeline | `phase/linkerPhase.ts` | ✅ |
| `L-08` | `LinkState` computed then discarded — emitter cannot use the graph | `phase/linkerPhase.ts:98-169` | 🔍 |
| `E-11` **[FIXED]** | ~~Emission coupled to `fs`~~ — split into `renderAllFiles()` / `writeAllFiles()` in S0.1 | `phase/emitterPhase.ts` | 🔍 |
| `T-09` **[FIXED]** | ~~Intersections parsed correctly, then dropped to `dynamic` at emit~~ — emits `Foo /*Foo&Bar*/` per js_facade_gen §5.3 (S1.9). It was the one gap making dartify *worse* than the tool it replaces | `emitter/old/type/emit.ts` | ✅ |
| `X-06` | **Zero test coverage of symbol table, linker, or emitter phase** | `test/` | ✅ |
| `D-01` *(quarantined)* | 5-pass pipeline orphaned. Excluded from `tsconfig` in S0.7 so its 5 stale errors stop masking real ones. **Still on disk** — S4 mines `transformers/` before deleting both | `engine/{passes,transformers}` | ✅ |
| `D-07` **[FIXED]** | ~~**95% of `dist/cli.js` was `@viz-js/viz`**~~ — a devDependency made reachable by a live import in `linkerPhase`. S0.4: **1.59 MB → 73.3 KB** | `tools/graph.ts` | ✅ |
| `X-03` **[FIXED]** | ~~`tsc --noEmit` → 15 errors~~ — now **0**. Dead dirs excluded from `tsconfig` (kept on disk for S4 mining), test signatures fixed | `tsconfig.json` | ✅ |

## S3 — Latent hazards & design debt

| ID | Finding | Where | Ev. |
|---|---|---|---|
| `T-03` **[FIXED]** | ~~Handlers mutate objects returned by reference from the shared cache~~ — **was not latent**: verified that `[x?: string]` made a later `[string]` optional. Cache removed (S1.1) and both handlers now spread instead of mutating | `type/{restType,tuple}.ts` | ✅ |
| `T-04` **[FIXED]** | ~~Type cache is global and text-keyed with no file/scope component~~ — cache removed entirely in S1.1 rather than re-keyed; a correct key needed `currentFQN`, which changes per declaration, so the hit rate would have collapsed anyway | `type/type.ts` | ✅ |
| `T-13` **[FIXED]** | ~~Cache hits skipped `collectTypeDep` for nested nodes, so the **second** occurrence of a generic type in a file contributed **zero** dep edges~~ — removed with the cache (S1.1) | `type/type.ts` | ✅ |
| `T-14` **[FIXED]** | ~~`typeof x` classified from syntax alone and written off as unrepresentable~~ — the checker resolves **393 of 449 (87%)** to a primitive, mostly the enum-as-consts idiom. Unsupported nodes 505 → 112 (S1.5b) | `type/typeQuery.ts` | ✅ |
| `T-15` **[FIXED]** | ~~`null \| undefined` left an empty `unionTypes` and `emitType` reached for `[0]`~~ — threw, and the emitter's per-symbol try/catch turned the declaration into a comment. Returns a nullable `Any` (S1.9) | `type/unions.ts` | ✅ |
| `T-16` **[FIXED]** | ~~`{}` synthesised a cyclic `typedef anon_dynamic = anon_dynamic;` registered under a non-FQN key~~ — emitted into 1 file while **117** use sites across **34** files referenced it. **Live in three.js.** `{}` is now `dynamic` (S1.9) | `type/typeLiterals.ts` | ✅ |
| `R-09` | `currentFQN` save/restore is manual and not `try/finally` — one parse error poisons every later FQN in the file | 31 sites across parsers | 🔍 |
| `I-11` | `deepCloneIRDeclaration` JSON round-trips — **throws on bigint literals** | `ir/declaration.ts:28-32` | 🔍 latent |
| `R-11` **[FIXED]** | ~~Context singleton never reset between runs~~ — `resetTranspilerState()` (`src/reset.ts`) called at the start of every run, S0.3. Verified: two `transpileFromString` calls no longer contaminate each other | `src/reset.ts` | ✅ |
| `T-06` **[FIXED]** | ~~`IRType.name` has three incompatible meanings; Dart names leak into the IR~~ — TS-side names only, guarded by an invariant test (S1.8). Surfaced a live defect: `name: "BigInt"` was the only thing separating a bigint literal from a number literal, so `10n` emitted `num` | `type/literals.ts` | ✅ |
| `L-03` | Ambiguous FQN matches silently resolve to `matches[0]`; the warning is unreachable for the common case | `symbol/resolve.ts` | 🔍 |
| `L-10` | `SymbolTable` has no `unregister`/`replace`; `getSymbolTable()` leaks the live `Map` | `symbol/table.ts` | 🔍 |
| `L-11` | Module scoping is textual; `declare module` / `namespace` / `global` indistinguishable | `phase/symbolGeneration.ts:239-253` | 🔍 |
| `I-06` / `P-06` | No JSDoc anywhere except an unread `IRConstructor.jsDoc` | `ir/class.ts:24` | 🔍 |
| `I-10` | No source location on IR nodes — diagnostics cannot point at source | `ir/*` | 🔍 |
| `I-09` | No `export`/`declare`/visibility modifiers in the IR | `ir/*` | 🔍 |
| `T-05` **[FIXED]** | ~~Depth not propagated through function types — recursion guard leaks~~ — `depth + 1` on both the return type and each parameter (S1.9); verified the guard now trips on 30 nested return positions | `type/function.ts` | ✅ |
| `T-08` **[FIXED]** | ~~Intersection dispatch compares source text instead of `SyntaxKind`~~ — shared kind predicates in `type/keywords.ts`, now used by both the union and intersection handlers (S1.9) | `type/intersection.ts`, `type/keywords.ts` | ✅ |
| `R-03` | `inputRoot` from first input file only → sibling trees collide in `outDir` | `transpiler.ts:142-144` | 🔍 |
| `R-02` | Unresolved deps reported only under `--enable-logs` | `transpiler.ts:113-116` | 🔍 |
| `X-02` **[FIXED]** | ~~1,648 whole-library snapshots~~ — retiered in S0.6 into sanity / smoke (3 files) / opt-in stress. **4.3 MB → 128 KB** of snapshots | `test/{simple,smoke,stress}.test.ts` | ✅ |
| `X-09` *(partial)* | ~~Nothing runs `dart analyze` on the output~~ — measured from S1.6 and the harness is in `CLAUDE.md`: **h3 clean**, probe 19, leaflet 507. Still **not automated** — no test tier runs it, so it is a manual gate, not a regression guard | — | ✅ |
| `I-07` / `D-03` | `IRLiteral` vestigial since hoisting moved to parse time | `ir/literal.ts` | ✅ |
| `I-08` | Two incompatible shapes for "constructor" | `ir/{class,interface}.ts` | 🔍 |
| `E-14` | Index signatures ignore parsed key/value types | `emitter/old/interface.ts:70-73` | 🔍 |
| `E-12` | Tuples collapse to `List<dynamic>`; `literalValue` discarded | `emitter/old/type/emit.ts` | ✅ |
| `T-07` | Bare `null` in type position → `dynamic` (should be `Null`) | `type/literals.ts:81-87` | 🔍 |
| `P-05` | `isReadonly` on variables can never be true | `parser/variable.ts:15` | 🔍 |
| `P-02` | Type param constraints/defaults not captured even for classes | `parser/class.ts:20` | ✅ |
| `R-10` | `currentDeps` shared across all declarators in one `var` statement | `phase/symbolGeneration.ts:200-219` | 🔍 |
| `P-08` | Return types parsed outside the pushed FQN scope (asymmetric hoist names) | `parser/function.ts:9` | 🔍 |
| `P-09` | Interface construct signatures stored as fake-named `IRMethod`; only `[0]` emitted | `parser/interface.ts:108-114` | 🔍 |

## S4 — Cosmetic, wasteful, drift

| ID | Finding | Where |
|---|---|---|
| `L-07` **[FIXED]** | ~~Visualiser wired into the production linker phase~~ — moved to `tools/graph.ts` (`pnpm graph`), consuming the `LinkReport` `runLinker` now returns. Stray logs gone; SVG untracked and gitignored | `tools/graph.ts` |
| `L-06` **[FIXED]** | ~~`resolveRealFQN` duplicated~~ — extracted to `src/symbol/resolve.ts`, shared by the linker and the graph tool | `symbol/resolve.ts` |
| `R-06` | `isStdlib` substring list duplicated with a different list | `transpiler.ts:211-216`, `typeRefernce.ts:47-53` |
| `R-08` / `D-05` | `-l` no longer produces the IR dump the README advertises; `log.ts` unused (251 lines) | `cli.ts`, `src/log.ts` |
| `E-13` | `stripQuotes` strips quotes globally, not just delimiters | `utils/utils.ts:2` |
| `R-04` | Emission order depends on `Map` insertion order — latent snapshot flake | `transpiler.ts:118-123` |
| `R-05` | Every program file materialised as a ts-morph object, including 51 stdlib files | `transpiler.ts:184-196` |
| `X-05` **[FIXED]** | ~~Snapshot path rewrite assumes POSIX separator~~ — normalises separators first | `vitest.config.ts` |
| `X-07` **[FIXED]** | ~~`pnpm test` is watch mode~~ — repointed at `vitest run`; `test:watch` unchanged | `package.json` |
| `X-08` **[FIXED]** | ~~`test:cli` placeholder path and wrong flags~~ — now `-d def_files/h3/h3.d.ts -o ./output` | `package.json` |
| `R-07` **[FIXED]** | ~~CLI `--version` hardcoded `v0.3`~~ — read from `package.json` | `cli.ts` |
| `X-10` **[FIXED]** | ~~Probe fixture only in the audit~~ — promoted to `def_files/synthetic/probe.d.ts`, now a smoke-tier snapshot | `def_files/synthetic/probe.d.ts` |
| `E-15` | Redundant `isReadonly` branch emitting identical getters | `emitter/old/interface.ts:35-44` |
| `T-12` **[FIXED]** | ~~Single-member unions keep a meaningless `Union` wrapper~~ — normalised in the parser (S1.9); this is what exposed `E-17`'s commented-form residue | `type/unions.ts` |
| `T-10` | `OptionalType` in tuples unreachable (ts-morph wrapping) — known, documented | `type/tuple.ts:21-26` |
| `T-11` | String literal values unquoted but not unescaped | `type/literals.ts:43` |
| `I-12` | Multi-declarator `var` grouping lost (benign) | `parser/variable.ts` |
| `D-06` | Verify dead code is tree-shaken from `dist/` after P0 | `package.json` |
| `E-11b` | `@typeEmitter/*` alias hardcodes `emitter/old/` | `tsconfig.json:29` |

---

## Corpus frequency data

Measured across all 1,648 `.d.ts` files in `def_files/`. Drives type-work priority.

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
| minted typedefs (three.js + leaflet) | n/a | **68**, 0 dangling, 0 duplicate |
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
