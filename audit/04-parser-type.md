# 04 — Type Parsers

Covers `src/engine/parser/type/*.ts`.

`parseType(typeNode, depth)` in `type.ts` is the dispatcher; each `handle*`
module owns one `SyntaxKind` family.

---

## T-01 — Unsupported type nodes collapse to bare `dynamic` with no trace `[verified]` **[PARTIALLY FIXED — S1.3]**

> **The "with no trace" half is fixed.** The `default:` branch now produces
> `TypeKind.Unsupported` carrying `originalText` and a machine-readable
> `UnsupportedReason`, instead of being indistinguishable from a genuine `any`.
> Emitted Dart is still `dynamic` — S1.5/S1.7 turn these into named typedefs.
> The remaining work is representing them, tracked as S1.4 (Tier A) and S1.5
> (Tier B).
>
> ### Measured census — the number the table below was missing
>
> `three.js + leaflet + synthetic/probe`, **1,410 Unsupported nodes**:
>
> | reason | count | example |
> |---|---:|---|
> | `thisType` | 900 | `this` |
> | `typeQuery` | **443** | `typeof Class` |
> | `indexedAccess` | 22 | `HTMLElementTagNameMap[T]` |
> | `conditional` | 19 | `string extends number ? true : false` |
> | `mapped` | 8 | `{ [K in keyof T]: T[K] }` |
> | `templateLiteral` | 7 | `` `pre-${string}` `` |
> | `readonlyOperator` | 5 | `readonly [...T]` |
> | `keyOf` | 3 | `keyof Box<string>` |
> | `optionalMember` | 1 | `number?` |
> | `typePredicate` | 1 | `x is string` |
> | `constructorType` | 1 | `(new() => NodeMaterial)` |
> | `unclassified` | **0** | — |
>
> **`typeof x` is the surprise.** The occurrence table below counts it by
> *files* (43) and so ranks it as a minor item; by *occurrences* it is 443 —
> second only to `this` and 20× `keyof`. `keyof`'s 1,728 figure below is a
> whole-corpus count dominated by `typescript.d.ts` and `vscode.d.ts`; in the
> two libraries that actually gate v1 it appears 3 times.
>
> ### After Tier A (S1.4): 1,410 → 503
>
> | reason | count | note |
> |---|---:|---|
> | `typeQuery` | 443 | 88% of what remains |
> | `indexedAccess` | 22 | |
> | `conditional` | 19 | |
> | `mapped` | 8 | |
> | `templateLiteral` | 7 | |
> | `keyOf` | 3 | |
> | `constructorType` | 1 | |
>
> `thisType` (900), `readonlyOperator` (5), `typePredicate` (1) and
> `optionalMember` (1) are gone — represented, not renamed.
>
> **`typeof x` was moved from Tier A to Tier B on inspection, reversing an
> earlier call in this file.** The dominant corpus form is
> `export const BRDF_GGX: typeof TSL.BRDF_GGX` — `typeof` applied to a *value*,
> whose type only the type checker knows. It is not syntactically recoverable,
> and the obvious guess is wrong: `typeof Foo` for a class is the **constructor**
> type, not `Foo`, so resolving it to `Foo` would emit a confidently incorrect
> signature. Tier A is for constructs whose representation follows from the
> syntax; this one needs `ts.TypeChecker` and belongs with the other Tier C
> checker work, with Tier B giving it a name in the meantime.
>
> **Superseded — see `T-14`.** Every sentence above is true and the conclusion
> still does not follow: dartify can simply *ask* the checker, which resolves
> 87% of these to a primitive. Kept as written because the reasoning error is
> the interesting part.
>
> **`unclassified` is the metric to watch.** It reaching 0 means every
> degradation in these libraries has a name. Two constructs were found this way
> and would otherwise have been silently lumped together: `ConstructorType`
> (`new () => T`) and bare `OptionalType` (`[string?]`, see `T-10`).

Original finding follows.

---


**`parser/type/type.ts:187-189`**
```ts
default:
  result = { kind: TypeKind.Any, name: TypeKind.Any, isNullable: false };
  break;
```

Every syntax kind without a `case` lands here and becomes indistinguishable from
a genuine `any`. There is no `TypeKind` for, and therefore no representation of:

| TS construct | SyntaxKind | Corpus occurrences |
|---|---|---|
| `this` | `ThisType` | ~1,100 |
| `keyof T` | `TypeOperator` | 1,728 (20 files) |
| `T extends U ? A : B` | `ConditionalType` | 22 files |
| `T[K]` | `IndexedAccessType` | — |
| `{[K in keyof T]: V}` | `MappedType` | 37 (17 files) |
| `` `pre-${T}` `` | `TemplateLiteralType` | 26 (6 files) |
| `infer U` | `InferType` | 368 (7 files) |
| `x is T` | `TypePredicate` | 296 (16 files) |
| `typeof x` | `TypeQuery` | 43 files |
| `readonly T[]` | `TypeOperator` | 12 files |
| `import("m").T` | `ImportType` | 0 in corpus |
| `unique symbol` | `TypeOperator` | 1 file |

**Frequency is highly concentrated.** `keyof` is 1,728 occurrences but only 20
of 1,648 files — it is a "large library" problem (`typescript.d.ts`,
`vscode.d.ts`, lodash), not a universal one. `this` is the genuinely pervasive
gap.

---

## T-02 — `IRType.originalText` is declared but never written or read `[verified]` **[FIXED — S1.2]**

> **Resolved.** `parseType` now writes `originalText` on every node it returns,
> at every depth, from a single assignment after the dispatch switch — not in
> the handlers, so a `SyntaxKind` added later cannot forget to record it. The
> `default:` branch and the `depth > 15` bail-out both carry it too, which is
> the whole point: those are precisely the paths where the text was being
> destroyed.
>
> Text is whitespace-normalised to one line (`sourceTextOf`, `type/sourceText.ts`)
> because `.d.ts` types are routinely written across several indented lines and
> a dartdoc comment is one line. No truncation — how much of a long expression
> to show is the emitter's decision (`E-16`), and it cannot make that decision
> on text it never received.
>
> Verified by walking the full IR for 8 representative types and asserting no
> node lacks the field. The nested case is the one that matters:
>
> ```
> Map<string, Array<keyof Box>>
>   └─ genericArgs[1]              originalText: "Array<keyof Box>"
>        └─ genericArgs[0]  any    originalText: "keyof Box"   ← recoverable now
> ```
>
> Emitted Dart is unchanged (byte-exact smoke snapshots pass untouched); this
> stage only makes the information available to S1.3–S1.7.

Original finding follows.

---


**`src/ir/type.ts:42`** declares `originalText?: string`.

```
$ grep -rn "originalText" src --include="*.ts"
src/ir/type.ts:42:  originalText?: string;
```

One hit. The field is inert.

This is the single highest-leverage gap in the codebase. `js_facade_gen`'s
entire fidelity strategy is visible degradation — `dynamic /*TypeName<num>*/`
(§5.8), `bool /*value is ByteBuffer*/` (§6.6), `List<num> /*ReadonlyArray<num>*/`
(§14.4). Because `parseType` discards the source text at the `default:` branch,
**no emitter rewrite can ever recover it.** The information is destroyed at
parse time.

**Design note (author's stated preference):** dartify should *not* degrade to
bare `dynamic` as readily as `js_facade_gen` does. Preferred approach is a named
alias — `typedef KeyOfBoxString = dynamic;` — so the call site reads as a
meaningful type even when the underlying representation is `dynamic`. That is
strictly better DX than an inline comment and it composes with the existing
symbol table (the alias is just another registered symbol). See `PLAN.md` P2.

---

## T-03 — Handlers mutate objects returned from the shared cache `[verified]` **[FIXED — S1.1]**

> **Resolved.** The audit called this latent; it was not. Direct probe:
>
> ```
> parseType("[x?: string]") → member { isOptional: true }
> parseType("[string]")     → member { isOptional: true }   ← wrong, and the same object
> parseType("[...number[]]")→ member { isRestParameter: true }
> parseType("[number[]]")   → member { isRestParameter: true } ← wrong
> ```
>
> The reasoning below ("latent because tuples emit as `List<...>`") was right
> about the *emitter* and wrong about the *IR* — the corruption was real and
> observable at the IR boundary, which is what the linker and any future emitter
> read. Fixed by removing the cache (`T-04`) and rewriting both handlers to
> spread into a fresh object. Post-fix the same probe gives
> `isOptional: undefined` for `[string]` and distinct object identities.

Original finding follows.

---


`TypeParser.parseType` caches by value **and returns the cached object by
reference** (`type.ts:49-51`, `:193`). Several handlers then mutate what they
receive:

**`parser/type/restType.ts:6-8`**
```ts
let res = parseType(node.getTypeNode(), depth + 1);
res.isRestParameter = true;   // mutates the cached IRType
return res;
```

**`parser/type/tuple.ts:9-11, 13-20`**
```ts
let res = parseType(e.getTypeNode(), depth + 1);
res.isOptional = true;        // same hazard
res.isRestParameter = true;
```

Worked example: `type A = [x?: string, y: string];` — both members parse
`string` at `depth+1`, hitting cache key `string_depth_1`. The first sets
`isOptional = true` on the shared object; the second reads it back already
flagged optional.

**Currently latent**: tuples are emitted as `List<...>`
(`emitter/old/type/emit.ts:83-95`), which ignores `isOptional` and
`isRestParameter` entirely, so the corruption is invisible today. It becomes a
real bug the moment tuple emission improves (named tuples, or Dart records in a
v2 backend).

`parser/type/intersection.ts:59-62` does this correctly — it spreads into a new
object rather than mutating.

**Fix direction:** return a shallow copy from `parseType`, or freeze cached
values and require handlers to spread.

---

## T-04 — The type cache is global, text-keyed, and never cleared `[inspection]` **[FIXED — S1.1]**

> **Resolved by deleting the cache, not by re-keying it.**
>
> `PLAN.md` S1.1 said "key on file+scope+text+depth, or drop it — measure".
> Measured, via `analyze()` in-process (no tsx startup), best of 3:
>
> | corpus | with cache | without |
> |---|---|---|
> | three.js (420 files) | 836 ms | 987 ms |
> | leaflet | 31 ms | 31 ms |
>
> 151 ms on the largest library in the corpus. And the re-key option was worse
> than it looks: a correct key needs the scope, the only scope handle is
> `transpilerContext.currentFQN`, and that changes per declaration — so the hit
> rate would have collapsed to "the same type twice inside one declaration" and
> recovered very little of the 151 ms while keeping all the machinery.
>
> Removing it also deleted the workaround at the top of `parseType` that called
> `collectTypeDep` on every cache hit, which meant two type-checker resolutions
> per type reference. See `T-13` for the bug that workaround was masking.

Original finding follows.

---


**`parser/type/type.ts:15, 46`**
```ts
private cache: Map<string, IRType> = new Map();
const cacheKey = `${typeNode.getText()}_depth_${depth}`;
```

The `TypeParser` is a process-wide singleton (`:215`) and `clearCache()` is
never called by any live code path. The key is source text + depth, with no file
or scope component — so `interface Opt` in `a.d.ts` and a structurally different
`interface Opt` in `b.d.ts` share a cache entry, as do two distinct `T` type
parameters in different classes.

**Currently latent** for `TypeReference` because the IR for a reference stores
only the *name* (resolution is deferred to the linker), so colliding entries
happen to be identical. `TypeLiteral` is excluded from cache *reads* (`:49`)
but still *written* (`:193`), leaving stale entries that nothing reads.

It stops being latent as soon as `IRType` carries per-site data — which is
exactly what `T-02` (`originalText`) and `I-04` (heritage as `IRType[]`) will
add. **Fix this before P2, not after.**

**Fix direction:** key on `filePath + scope + text + depth`, or drop the cache
(measure first — three.js is 10 s with it).

---

## T-05 — Depth is not propagated through function types `[inspection]` **[FIXED — S1.9]**

**`parser/type/function.ts:11`**
```ts
let returnIR = parseType(retType);      // depth resets to 0
```
**`parser/type/function.ts:29`**
```ts
const paramType = parseType(param.getTypeNode(), depth);   // not depth + 1
```

The `depth > 15` guard (`type.ts:53`) is the only recursion protection. A type
that recurses through function return positions can exceed it without ever
tripping the guard. Combined with `T-04`'s depth-keyed cache, it also means the
same type parses to different cache slots depending on the path taken.

---

## T-06 — `IRType.name` has three incompatible meanings `[inspection]` **[FIXED — S1.8]**

Across the parsers, `name` is variously:

| Source | Value | Semantics |
|---|---|---|
| `type.ts:69-73` | `TypeKind.String` = `"string"` | TS kind |
| `literals.ts:19` | `"double"` | **Dart** type name |
| `literals.ts:42` | `"String"` | **Dart** type name |
| `literals.ts:58` | `"bool"` | **Dart** type name |
| `typeRefernce.ts:79` | `"Foo"` | user-declared TS name |
| `type.ts:127` | `"Object"` | Dart-ish |

For an IR that is meant to be output-language agnostic, embedded Dart type names
are a layering violation — the `literals.ts` values are already a partial
emitter. Any second backend (js_interop, another language) inherits Dart
vocabulary it cannot use.

**Fix direction:** `name` should be the TS-side name only; all Dart mapping
belongs in the emitter's string table.

> **Resolved.** `name` is now the TypeScript-side name everywhere: for every
> kind except `TypeReference` it equals `kind`, and `TypeReference` keeps the
> declared TS name. `literals.ts`, `typeQuery.ts`, `type.ts` and
> `intersection.ts` no longer contain a Dart identifier.
>
> Guarded by an invariant test rather than a case list (`test/type/irNaming.test.ts`),
> so a new `SyntaxKind` handler cannot quietly reintroduce it. The test was
> checked against a deliberately reintroduced `name: "String"` and fails on it.
>
> **This surfaced a live defect.** `name: "BigInt"` was the *only* thing
> distinguishing a bigint literal from a number literal — both were
> `TypeKind.NumberLiteral` — and `name` is read by nothing outside the
> `TypeReference` branch of `emitType`. So `10n` in type position emitted `num`
> while a plain `bigint` emitted `BigInt`. Purging the name forced the
> distinction into `kind`, where the emitter can see it: bigint literals are now
> `TypeKind.BigInt`.
>
> Emitted output over three.js + leaflet + h3 + probe is byte-identical, because
> none of them contains a bigint literal type (verified). The fix is real but
> latent in this corpus.

---

## T-07 — Bare `null` in type position degrades to `dynamic` `[inspection]` **[FIXED — S1.4]**

> **Resolved.** A `NullKeyword` case was added to `handleLiteralType`, which is
> the only place it can be caught — in type position `null` is a `LiteralType`
> wrapping a `NullKeyword`, so the `NullKeyword` case in `parseType` really is
> unreachable, exactly as this finding says. `null` now yields `TypeKind.Null`
> and emits `Null` (js_facade_gen §1.10). `string | null` is untouched and still
> collapses to `String?`.
>
> The second half of this finding — `UndefinedKeyword` and `NullKeyword` sharing
> `TypeKind.Undefined` — is **not** fixed. Still benign (both are `Null` in
> Dart), still an IR-level information loss.

Original finding follows.

---


**`type.ts:100-107`** handles `ts.SyntaxKind.NullKeyword` — but in a *type*
position, `null` is parsed as a `LiteralType` wrapping a `NullKeyword`, not a
bare `NullKeyword`. So that case is unreachable; the node instead reaches
`handleLiteralType`, whose `switch` has no `NullKeyword` case and falls to
`default:` → `TypeKind.Any` (`literals.ts:81-87`).

`var foo: null` should give `Null` per `js_facade_gen` §1.10; it gives `dynamic`.

Note also that `UndefinedKeyword` and `NullKeyword` are mapped to the *same*
`TypeKind.Undefined` (`type.ts:100-107`), losing the distinction. In Dart both
are `Null`, so this is benign today — but it is another IR-level information loss.

---

## T-08 — Intersection dispatch uses source-text string comparison `[inspection]` **[FIXED — S1.9]**

**`parser/type/intersection.ts:17-32`**
```ts
const text = typeNode.getText().trim();
if (text === "null" || text === "undefined") { ... }
if (text === "never") { ... }
if (text === "void") { continue; }
```

Comparing rendered source text rather than `SyntaxKind`. Breaks on a type alias
named `never`, on comments inside the node, and on any whitespace the printer
does not normalise. Every other handler uses `getKind()`; this one is the
outlier.

`void` members are dropped silently with a comment acknowledging the context
problem (`:29-32`).

---

## T-09 — Intersections have no emitter representation `[verified]` **[FIXED — S1.9]**

`handleIntersectionType` builds a proper `TypeKind.Intersection` IR node with
all members, but `emitType` has no `case TypeKind.Intersection` — it falls to
`default: baseType = "dynamic"` (`emitter/old/type/emit.ts:129-132`).

The parser work is done and correct; the result is thrown away at emit.
`js_facade_gen` §5.3 emits the first member plus a comment:
`Foo /*Foo&Bar*/ foo()`.

> **Resolved.** `emitType` now has an `Intersection` case emitting exactly that
> form. Not a minted alias: a named `dynamic` would satisfy design principle 2
> to the letter while telling the reader less than the supertype does — `Foo &
> Bar` *is* a `Foo`, so `Foo` hands them a real API. Naming beats anonymity, a
> usable type beats both.
>
> The **first** member as written, not the most specific: `any & T` is `any` in
> TypeScript, so promoting `T` out of it would give callers a `T` API over a
> value the source never promised was one. Leaflet's dominant shape is exactly
> that — `any & typeof Class`, which correctly stays `dynamic /*dynamic&TypeOfClass*/`.
>
> The comment is deduplicated. `E-18` computes a unique set for its union
> comment and then joins the original list anyway; repeating that here would be
> repeating a known defect.

---

## T-10 — `OptionalType` inside tuples is unreachable `[inspection]` **[FIXED — S1.4]**

> **Resolved by upgrading ts-morph to 28.0.0**, where `OptionalTypeNode` and
> its `getTypeNode()` exist. `tuple.ts` now reads the inner node through the
> typed API via `ts.Node.isOptionalTypeNode`.
>
> Visible in real output immediately: leaflet's
> `type LatLngTuple = [number, number, number?]` was emitting
> `typedef LatLngTuple = List<dynamic>` because the optional third member
> parsed as `any`, making the tuple heterogeneous. It now emits
> `typedef LatLngTuple = List<num>`.

Original finding follows.

---


**`parser/type/tuple.ts:21-26`**, with the author's own comment:
```ts
} else if (e.getKind() === ts.SyntaxKind.OptionalType) {
  // This fails as ts-morph didnt wrap OptionalTypeNode
  // so we cant parseType and it will return any
```
Known and documented. Retained here for completeness.

**Fixed upstream — the repo was simply pinned behind it.**

A first pass in S1.3 checked ts-morph **26.0.0** (the installed version) and
concluded the gap was still real. That conclusion was wrong as a statement about
ts-morph: it was only true of the pin. `package.json` had `"ts-morph": "^26.0.0"`
while npm was at **28.0.0**.

| | 26.0.0 | 28.0.0 |
|---|---|---|
| `Node.isOptionalTypeNode` | `undefined` | `function` |
| `OptionalTypeNode` class | `undefined` | `function` |
| `[string?]` element ctor | `Node` | `OptionalTypeNode` |
| `[string?]` `getTypeNode()` | `undefined` | `function` |
| `[...number[]]` element ctor | `RestTypeNode` | `RestTypeNode` |

Note the last row: `RestTypeNode` was already wrapped at 26. So the upstream
issue this project prompted was about **optional** tuple members, not rest ones
— which is what the author said, and what `CLAUDE.md` previously got backwards.

Resolved in S1.4 by upgrading to `^28.0.0` and reading the inner node through
the typed API. The `forEachChildAsArray()` workaround is unnecessary.

---

## T-11 — String literal values are unquoted but not unescaped `[inspection]`

**`parser/type/literals.ts:43`** — `.getText().slice(1, -1)` strips the
delimiters but leaves escape sequences raw. A literal type `"a\"b"` yields
`a\"b`. Only matters once literal values are emitted (they currently are not —
`StringLiteral` maps to `String`, discarding the value).

---

## T-12 — Union of a single member keeps a `Union` wrapper `[inspection]` **[FIXED — S1.9]**

`handleUnionType` (`unions.ts:16-21`) always returns `TypeKind.Union`, even
after null-filtering leaves one member. `emitType` compensates at
`emit.ts:73-79` by unwrapping. Correct output, but the IR carries a node that
means nothing — and any second backend must reimplement the same unwrapping.
Normalise in the parser instead.

---

## T-13 — Cache hits dropped dependency edges for nested types `[verified]` **[FIXED — S1.1]**

Found while fixing `T-03`/`T-04`; not present in the original audit.

At the time of this finding, `parseType` had a side effect — `collectTypeDep`,
which recorded a pseudo-FQN into `transpilerContext.currentDeps` — and a cache
that skipped it. The
workaround at the top of `parseType` re-collected the dep for the *outermost*
node on every hit:

```ts
if (typeNode.getKind() === ts.SyntaxKind.TypeReference) {
  collectTypeDep(typeNode as ts.TypeReferenceNode);
}
```

Nested nodes got no such treatment. So the second and every later occurrence of
a generic type expression in a file contributed **no** dep edges from its type
arguments. Probe, two declarations of `Map<Foo, Bar>` in one file:

```
one  deps: [ 'Bar', 'Foo' ]
two  deps: []                 ← Map is stdlib-filtered; Foo and Bar are simply lost
```

**Impact.** This silently under-reported the dependency graph, which is the
input to link verification and (in S3) to import emission — so `E-08` would have
inherited it as missing imports. Fixed by removing the cache; both declarations
now report `[ 'Bar', 'Foo' ]`.

**It was also masking `L-02`.** With the edges restored, leaflet's link
verification moved from 276 valid / 42 broken to **274 valid / 44 broken**. The
two newly-broken symbols are `Marker` and `marker`, and the reason is a
pre-existing defect, not a regression:

```
❌ Broken Link: leaflet.d.ts::Marker
   Missing 'leaflet.d.ts::L.Control.Attribution'
   via [Handler -> Map -> L.Control.Attribution]
```

The symbol table holds `leaflet.d.ts::Control|Attribution`; the dep records
`L.Control.Attribution` — wrong separator *and* a stray `L.` prefix. That is
`L-02`. The count going **up** here is the linker becoming more truthful, and
`44` is the correct new baseline for leaflet.

---

## T-14 — `typeof x` was classified from syntax, so 87% of it degraded needlessly `[verified]` **[FIXED — S1.5b]**

`TypeQuery` had no case in `parseType`, so every `typeof x` fell to the
`default:` branch. After `S1.3` that meant a correctly-labelled
`Unsupported/typeQuery` node — honest, but far more pessimistic than necessary.

At **443 of 503 remaining nodes**, `typeof` was by a wide margin the largest
category of degradation left after `S1.4`. This file previously recorded a
decision to leave it that way:

> `typeof x` was moved from Tier A to Tier B on inspection. The dominant corpus
> form is `export const BRDF_GGX: typeof TSL.BRDF_GGX` — `typeof` applied to a
> *value*, whose type only the type checker knows.

**That reasoning was right and the conclusion was wrong.** It only knows what
the checker knows — so the thing to do was ask the checker, not give up. Asking
it, over three.js + leaflet + probe:

| resolved to | count | Dart |
|---|---:|---|
| number literal | 199 | `num` |
| string literal | 191 | `String` |
| plain `number` | 3 | `num` |
| callable | 28 | *stays unsupported* |
| object (`typeof L.DomEvent`) | 21 | *stays unsupported* |
| constructor (`typeof L.Class`) | 7 | *stays unsupported* |

**393 of 449 (87%) resolve to a primitive.** The driver is the
enum-as-consts idiom, which three.js uses throughout `src/constants.d.ts`:

```ts
export const NearestFilter: 1003;
export const LinearFilter: 1006;
export type TextureFilter = typeof NearestFilter | typeof LinearFilter;
```

Syntactically `typeof NearestFilter` is opaque. Resolved, it is `1003`, and the
whole alias collapses to `num` — which is what `js_facade_gen` emits.

**Impact.** Unsupported nodes **505 → 112**; minted typedefs **463 → 89**.
Output diff over three.js + leaflet + h3: 17 files, 66 lines, **66 improvements,
0 regressions**, e.g. `typedef CullFace = dynamic` → `typedef CullFace = num`.
Cost: three.js end-to-end 5,144 ms → 5,202 ms, inside run-to-run noise — the
checker was already instantiated for module resolution.

The 56 that stay unsupported are deliberate. `typeof Foo` on a class is the
*constructor* type, not `Foo`; emitting `Foo` would be confidently wrong rather
than honestly degraded. They get a minted alias instead (`E-16`).

**Generalisable lesson.** `S1.4`'s Tier A/Tier B split was drawn by reading
syntax. Syntax is the wrong axis: the question is not "can this construct be
represented" but "can dartify *find out* what it means". Any remaining category
should be re-checked against the type checker before being written off.

---

## T-15 — `null | undefined` threw at emit `[verified]` **[FIXED — S1.9]**

Found while normalising single-member unions; not in the original audit.

`handleUnionType` filtered `null` and `undefined` out of the member list and
returned a `TypeKind.Union` regardless. For `null | undefined` that left
`unionTypes: []`, and `emitType` reached straight for `unionTypes![0]`:

```
declare var x: null | undefined;
→ // ERROR emitting /e.d.ts::x: Cannot read properties of undefined (reading 'kind')
```

The throw was caught by `emitFileContent`'s per-symbol `try/catch`, so it
degraded one declaration into a comment rather than failing the run — which is
also why it survived: the stress tier asserts nothing *throws*, and nothing did.

Fixed by returning a nullable `Any`. Not present in the shipping corpus; found
by probing the degenerate case directly.

---

## T-16 — The empty type literal emitted a cyclic typedef `[verified]` **[FIXED — S1.9]**

`handleTypeLiterals` special-cased `{}` by synthesising a symbol whose type was
a `TypeReference` to *itself*:

```dart
typedef anon_dynamic = anon_dynamic;
```

Two defects in one. The typedef is cyclic, and it was registered under the bare
key `"anon_dynamic"` rather than a `file::Name` FQN — so the `has()` guard
tested a key shaped unlike every other one in the table, and the symbol was
unreachable through normal resolution. Since the guard was global-ish and the
emission per-file, the typedef was emitted into exactly **one** file while
**117** use sites across **34** files referred to the name.

**This was live in three.js**, not just synthetic input:

```dart
external InterleavedBuffer clone(anon_dynamic data);   // undefined in this library
```

`{}` in TypeScript means "any non-null value", so there is no structure to hoist
and `dynamic` says everything there is to say. The special case is gone.
Occurrences of `anon_dynamic` in emitted output: **117 → 0**.

---

## T-17 — Two type nodes consume nesting without charging depth `[verified]` **[FIXED — audit pass]**

Found by re-reading every `parseType` call site after `T-05` was marked fixed.
**`T-05` was closed prematurely.** S1.9 fixed the function-type positions and
nothing else, but two handlers still forwarded `depth` unchanged:

```ts
// type.ts — ParenthesizedType
result = this.parseType(node.getTypeNode(), depth);   // unwrap is free
// typeOperator.ts — readonly T[]
return parseType(node.getTypeNode(), depth);
```

Measured, before the fix:

```
40 nested parens        -> GUARD NEVER TRIPS
40 nested readonly[]    -> guard tripped   (the inner ArrayType pays for it)
40 nested plain arrays  -> guard tripped
```

Parenthesised types were therefore **unbounded**: `((((…))))` recursed as deep
as the source nested, no matter the `depth > 15` guard. `readonly` only escaped
because `readonly T[]` always wraps an `ArrayType`, which does increment — the
bug was masked by its neighbour, not absent.

Both now pass `depth + 1`. No corpus output changes: nothing in `def_files/`
nests parentheses anywhere near 15 deep. The point is that the guard is the
program's only recursion protection, and it had a hole in it.

**Lesson for the audit process, not just the code.** `T-05` read "depth is not
propagated through function types" and was fixed exactly as literally worded.
The defect class is "a handler that recurses without charging depth", and the
right close-out was to enumerate every `parseType` call site — which takes one
grep and would have caught both.

---

## T-18 — Intersection normalization widens impossible types `[verified]`

`handleIntersectionType` treats `null` and `undefined` as if they were nullable
union constituents and silently drops `void`. That reverses intersection
semantics: an intersection must satisfy every member, so incompatible primitive
members collapse to `never`; they do not make another member nullable.

Post-S4 checker comparison:

| TypeScript | Current IR/emission | Checker |
|---|---|---|
| `string & null` | nullable string / `String?` | `never` |
| `string & undefined` | nullable string / `String?` | `never` |
| `string & void` | string / `String` | `never` |
| `null & undefined` | nullable any / `dynamic` | `never` |

The existing explicit `never` branch works only when the source writes
`never`; it does not detect intersections the checker reduces to `never`.
Normalize primitive contradictions truthfully (using syntax plus checker where
needed), retain the original intersection text, and add negative type/emitter
tests. This is S1 because impossible inputs currently become callable/assignable
Dart API values without a diagnostic.

---

## I-15 — Standard-library reference provenance is discarded `[verified]`

`collectTypeDep` deliberately returns `undefined` when every declaration for a
type reference belongs to a TypeScript standard-library file. That keeps
`lib.dom.d.ts` out of the generated-file dependency graph, but it also removes
the only trustworthy fact S5 can use to distinguish a host type from a
same-spelled project declaration or lexical type parameter.

A focused checker probe resolved one `HTMLElement` to the interface and value
declarations in `lib.dom.d.ts`; a second `HTMLElement` resolved to a local type
parameter. `collectTypeDep` returned `undefined` for both. The remaining
`IRType.name` text is therefore not safe input to a global replacement map.

Before S5.3, retain a non-linkable host identity such as the canonical
TypeScript library family plus qualified symbol name. It must not become a
normal `resolvedDep` or generated Dart import edge. The emitter can then select
its backend-owned platform mapping only for checker-confirmed host symbols.
Tests must cover a DOM reference, a typed array, a lexical shadow, and a
project declaration with the same leaf name.
