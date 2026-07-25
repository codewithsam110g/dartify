# 04 — Type Parsers

Covers `src/engine/parser/type/*.ts`.

`parseType(typeNode, depth)` in `type.ts` is the dispatcher; each `handle*`
module owns one `SyntaxKind` family.

---

## T-01 — Unsupported type nodes collapse to bare `dynamic` with no trace `[verified]`

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

## T-02 — `IRType.originalText` is declared but never written or read `[verified]`

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

## T-05 — Depth is not propagated through function types `[inspection]`

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

## T-06 — `IRType.name` has three incompatible meanings `[inspection]`

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

---

## T-07 — Bare `null` in type position degrades to `dynamic` `[inspection]`

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

## T-08 — Intersection dispatch uses source-text string comparison `[inspection]`

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

## T-09 — Intersections have no emitter representation `[verified]`

`handleIntersectionType` builds a proper `TypeKind.Intersection` IR node with
all members, but `emitType` has no `case TypeKind.Intersection` — it falls to
`default: baseType = "dynamic"` (`emitter/old/type/emit.ts:129-132`).

The parser work is done and correct; the result is thrown away at emit.
`js_facade_gen` §5.3 emits the first member plus a comment:
`Foo /*Foo&Bar*/ foo()`.

---

## T-10 — `OptionalType` inside tuples is unreachable `[inspection]`

**`parser/type/tuple.ts:21-26`**, with the author's own comment:
```ts
} else if (e.getKind() === ts.SyntaxKind.OptionalType) {
  // This fails as ts-morph didnt wrap OptionalTypeNode
  // so we cant parseType and it will return any
```
Known and documented. Retained here for completeness.

---

## T-11 — String literal values are unquoted but not unescaped `[inspection]`

**`parser/type/literals.ts:43`** — `.getText().slice(1, -1)` strips the
delimiters but leaves escape sequences raw. A literal type `"a\"b"` yields
`a\"b`. Only matters once literal values are emitted (they currently are not —
`StringLiteral` maps to `String`, discarding the value).

---

## T-12 — Union of a single member keeps a `Union` wrapper `[inspection]`

`handleUnionType` (`unions.ts:16-21`) always returns `TypeKind.Union`, even
after null-filtering leaves one member. `emitType` compensates at
`emit.ts:73-79` by unwrapping. Correct output, but the IR carries a node that
means nothing — and any second backend must reimplement the same unwrapping.
Normalise in the parser instead.

---

## T-13 — Cache hits dropped dependency edges for nested types `[verified]` **[FIXED — S1.1]**

Found while fixing `T-03`/`T-04`; not present in the original audit.

`parseType` had a side effect — `collectTypeDep`, which records a pseudo-FQN
into `transpilerContext.currentDeps` — and a cache that skipped it. The
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
