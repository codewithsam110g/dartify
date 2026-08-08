# 03 — Declaration Parsers

Covers `src/engine/parser/{interface,class,function,variable,enum,typealias,index}.ts`.

These turn a ts-morph declaration node into IR. They are the *only* place source
fidelity can be captured — anything not recorded here is unrecoverable
downstream.

> **S3 closure:** `P-02`–`P-06`, `P-08`, `P-09`, `P-11` and `P-12` are fixed at
> the IR boundary. Declaration parsers share metadata and signature helpers,
> retain every call/construct overload, and use immutable parse scopes. See
> `test/decl/s3-ir.test.ts` and `def_files/synthetic/s3-complete.d.ts` for the
> executable acceptance contract. The historical sections below retain the
> original evidence and failure modes.

---

## P-01 — Heritage clauses bypass `parseType`, so inheritance edges never reach the dep graph `[verified]` **[FIXED — S2]**

Class and interface heritage now route through `parseType` and are represented
as `IRType[]`, preserving generic arguments, qualified references and graph
edges. Focused tests cover generic `extends` and `implements`.

**`parser/interface.ts:19`**
```ts
let extenders = interfaceDecl.getExtends().map((e) => e.getText());
```
**`parser/class.ts:17-18`**
```ts
let extenders = classDecl.getExtends()?.getText();
let implementers = classDecl.getImplements().map((impl) => impl.getText());
```

`getText()` is raw source text. `parseType()` is never called, therefore
`collectTypeDep()` (which only fires from `parseType`'s `TypeReference` branch,
`parser/type/type.ts:41-43`) never runs for a base type.

### Repro

```ts
// derived.d.ts — base.d.ts deliberately unresolvable
export interface OnlyExtends extends BaseThing {}
export declare class OnlyDerives extends BaseCls {}
export interface UsesInProp { p: BaseThing; }
```

```
❌ Broken Link: ...::UsesInProp        ← property reference IS tracked
✅ Graph Verification Complete: 2 valid, 1 broken.
                                 ↑ OnlyExtends + OnlyDerives counted VALID
```

If heritage were tracked, all three would be broken. **The dependency graph is
missing every inheritance edge** — which is precisely the set of imports a
binding file most needs.

Re-verified before S2 with generic heritage: `Box extends Base<T> implements
Holder<T>, Named` records only `Box`'s non-heritage dependencies; `Child extends
Holder<string>, Named` records none. The IR retains only the raw strings, so the
generic arguments are unavailable to both linking and later emission.

Consequences: (a) `tools/graph.ts` renders a falsely-connected graph;
(b) import emission (`E-08`) will omit base-class imports.

**Fix direction:** parse heritage through `parseType` and store as `IRType[]`
(see `I-04`) — this fixes the dep tracking and the lost generic arguments in
one change.

---

## P-02 — Type parameters are captured for classes only, and never emitted `[verified]` **[FIXED — S3 IR]**

**`parser/class.ts:20`** — `classDecl.getTypeParameters().map(tp => tp.getName())`
is the *only* type-parameter capture in the codebase.

Not captured at all:

| Declaration | File | Consequence |
|---|---|---|
| `interface X<T>` | `parser/interface.ts` | `abstract class X{}` used as `X<num>` |
| `function f<T>()` | `parser/function.ts:7-35` | `external T f()` with `T` undeclared |
| `type A<T> = ...` | `parser/typealias.ts:6-13` | `typedef A = dynamic;` |
| `method<U>()` | `parser/{interface,class}.ts` | `Box<U> map(...)`, `U` undeclared |

Even the captured `IRClass.typeParams` is dropped by the emitter (`E-03`).

Also missing: constraints (`T extends Foo`) and defaults (`T = string`), which
`js_facade_gen` renders as `/*<K extends keyof A>*/` (ref §5.14).

---

## P-03 — Call signatures on interfaces are never read `[verified]` **[FIXED — S3 IR]**

`interfaceDecl.getCallSignatures()` is never called. `parser/interface.ts` reads
properties, methods, construct signatures, get/set accessors and index
signatures — but not call signatures.

```ts
interface Callable { (n: number): boolean; }
```
emits
```dart
@JS() @anonymous
abstract class Callable{}
extension CallableExtension on Callable {
}
```

The entire meaning of the declaration is silently discarded. `js_facade_gen`
§3.6/§3.7 renders these as `typedef bool F(num n);` /
`typedef B F<A, B>(A a);`.

Also blocks declaration augmentation: the `interface`+`var` merge pattern
(§4.1) requires reading `new(a: string, b: number): XType` from a type literal.

---

## P-04 — Enum member values are always strings `[verified]` **[FIXED — S3]**

**`parser/enum.ts:11`**
```ts
value: member.getInitializer()?.getText() ?? undefined,
```

`getText()` returns source text, so `A = 1` yields the string `"1"`, never the
number `1`. `IREnum.members[].value` is typed `string | number` but the number
branch is unreachable.

The emitter then switches on JS runtime type (`emitter/old/enum.ts:22-27`), so
`enum E { A = 1, B }` produces `String get A` and `dynamic get B` — two
different Dart types for members of the same enum. Confirmed in output.

**Fix direction:** record both the raw text and a parsed value + an
`isImplicit` flag; `js_facade_gen` §7.1/§7.3 emits `num` for all numeric members
regardless of explicit initialisers.

---

## P-05 — `isReadonly` on variables is always false `[inspection]` **[FIXED — S3]**

**`parser/variable.ts:15`**
```ts
let isReadonly = varDecls.hasModifier(ts.SyntaxKind.ReadonlyKeyword);
```

`readonly` is not a legal modifier on a `VariableDeclarationList` — it applies
to properties and index signatures. This predicate can never be true.
`isConst` (line 13-14) is correct.

Currently invisible because the variable emitter ignores both flags (`E-05`).

---

## P-06 — No JSDoc is captured anywhere except class constructors `[inspection]` **[FIXED — S3 IR]**

`getJsDocs()` appears exactly once, at **`parser/class.ts:89-93`**, and the
result is stored on `IRConstructor.jsDoc` — a field no emitter reads.

Every other declaration, property, method and parameter discards documentation.
`js_facade_gen` §11 emits `/// A` doc comments, translates `{@link x}` to
`[x]`, and strips `@param`/`@return` tags.

For a binding generator this is a significant DX loss: generated bindings have
no hover documentation in the IDE.

---

## P-07 — `this` return types resolve to `dynamic` `[verified]`

`parseType` has no `ThisType` case (`parser/type/type.ts:66-190`), so
`bar(): this` falls to `default:` → `TypeKind.Any` → `dynamic`.

**Corpus frequency: ~1,100 occurrences** across `def_files/` — the single most
common construct that currently degrades. Fluent/builder APIs (three.js
especially) are pervasive.

Resolution is cheap: `this` in a member position means the enclosing
declaration's name, which is already available as `transpilerContext.currentFQN`.
`js_facade_gen` §3.10 does exactly this (`bar(): this` → `external Foo bar();`).

The ROADMAP schedules this for v0.7. The corpus says it should be much earlier.

---

## P-08 — Function/method return types are parsed outside the pushed FQN scope `[inspection]` **[FIXED — S3]**

**`parser/function.ts:9`** parses the return type *before* any scope push, while
parameters push `|paramName` (`:17-20`). A `TypeLiteral` in return position
therefore hoists to `Anon_<funcName>` while one in a parameter hoists to
`Anon_<funcName>_<paramName>`.

Not currently a collision (the names differ), but the scheme is asymmetric and
will collide once overload renaming introduces `f_1`, `f_2` sharing a scope.
Same pattern in `parser/interface.ts:48`, `parser/class.ts:50`.

---

## P-09 — `getConstructSignatures` on interfaces is stored with a fake name `[inspection]` **[FIXED — S3 IR]**

**`parser/interface.ts:108-114`** pushes `{ name: "constructor", ... }` into an
`IRMethod[]`. `IRInterface.constructors` is `IRMethod[]`, whereas
`IRClass.constructors` is `IRConstructor[]` — two different shapes for the same
concept. The interface emitter only ever reads `constructors[0]`
(`emitter/old/interface.ts:21-26`), silently dropping additional construct
signature overloads.

---

## P-10 — Static modifiers are captured for classes but hardcoded `false` for interfaces `[inspection]`

`parser/class.ts` correctly reads `prop.isStatic()`, `method.isStatic()`, etc.
`parser/interface.ts` hardcodes `isStatic: false` at lines 37, 76, 113, 129, 148.

That is correct for a plain TS interface, but declaration augmentation (§4.2)
requires marking members that came from the `var` side as **static**. The IR
field exists and is ready; the linker will need to set it.

---

## P-11 — Parameter destructuring and default values are not represented `[inspection]` **[FIXED — S3 IR]**

`param.getName()` on a destructured parameter (`function x({p, d} = {})`)
returns a synthesised binding-pattern text. There is no `IRParameter` field for
an initialiser, so `function x(a = 42)` loses the default.

`js_facade_gen` §6.2 renders defaults as optional params (`external x([a, b]);`)
and §12.1 renders destructuring as `Object p_d /*{p = null, d = false}*/`.
Low frequency; noted for conformance completeness.

---

## P-12 — Classes drop index signatures entirely `[verified]` **[FIXED — S3 IR]**

`parseInterface` reads `interfaceDecl.getIndexSignatures()` and populates
`IRInterface.indexSignatures`. `parseClass` does neither: it never calls
`getIndexSignatures()`, and **`IRClass` has no field to hold them**. The
`IRIndexSignatures` type is imported at `parser/class.ts:5` and never used —
the import is the fossil of an intent that was not carried through.

```ts
declare class Bag { [key: string]: number; }
```

The index signature is gone before the IR exists, so no emitter rewrite can
recover it (design principle 3). Interfaces with the same member survive as far
as `E-14`, which at least emits a placeholder `operator []`.

Fix requires an IR change (`IRClass.indexSignatures`), so it lands with the
declaration work in S3, not as a parser patch.
