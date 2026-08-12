# 07 — Emitter

Covers `src/engine/phase/emitterPhase.ts`, `src/engine/emitter/old/*`,
`src/engine/emitter/shared/shared.ts`.

**Context:** the author intends to rewrite this layer once the linker, symbol
table, overload and augmentation work lands. The current emitter was designed
for the 5-pass, single-file architecture and was adapted rather than rebuilt.
Findings here are therefore recorded as *requirements for the rewrite* as much
as bugs to fix in place.

The verified output samples below come from a synthetic probe run
(`audit/fixtures/probe.d.ts` reconstruction is in `09-tests-tooling.md`).

---

## E-01 — `.split("_")[0]` truncates JS names at the first underscore `[verified]` **[FIXED — S4]**

S4 added separate source `name`, output `dartName`, and runtime `jsName`
contracts. The semantic pass numbers overloads; every emitter reads the
explicit names, and all split-based recovery paths are deleted. Rendered tests
prove `under_score_1` and `_2` both bind `@JS("under_score")`. Original finding
follows.

**`emitter/old/function.ts:11`**
```ts
const internalVal = stripQuotes(`${prefix}${irFunction.name.split("_")[0]}`);
```
**`emitter/old/class.ts:83`**, **`emitter/old/interface.ts:48`**
```ts
dartParts.push(`  @JS("${method.name.split("_")[0]}")`);
```

The intent was to strip an `_1`/`_2` overload suffix and recover the original JS
name. The effect is to truncate **any** identifier containing an underscore.

```ts
declare function my_func(a: string): void;
```
```dart
@JS("my")                       // ← binds to window.my, which does not exist
external void my_func(String a);
```

This is the most dangerous class of defect in the codebase: it produces
plausible-looking Dart that silently calls the wrong JS symbol. Snake_case is
common in real `.d.ts` files.

**Fix direction:** the overload renamer (P3) must carry the original JS name on
the IR node (`jsName?: string`) rather than encoding it in the Dart identifier
and recovering it by string surgery.

---

## E-02 — Constructor disambiguation counter is never incremented `[verified]`

**`emitter/old/class.ts:25-31`**
```ts
let constructorCount = 0;
for (let constructor of irClass.constructors) {
  let constructorName = irClass.name + "_".repeat(constructorCount);
  //                                              ^ always 0
```

`constructorCount` is declared, read, and never incremented.

```ts
declare class Box { constructor(a: string); constructor(a: string, b: number); }
```
```dart
class Box {
  external factory Box(String a);
  external factory Box(String a, num b);   // duplicate member — invalid Dart
}
```

Note the intended naming scheme (`Box`, `Box_`, `Box__`) is also poor; Dart
named constructors (`Box.withCount(...)`) are the idiomatic answer.

---

## E-03 — Type parameters are never emitted `[verified]`

`emitter/old/class.ts:17` emits `class ${irClass.name} {` — `IRClass.typeParams`
is parsed (`parser/class.ts:20`) and available but unused. Interfaces, functions
and type aliases have no type params in the IR at all (`I-01`).

```ts
declare class Box<T> { value: T; map<U>(fn: (t: T) => U): Box<U>; }
```
```dart
class Box {                        // no <T>
  external T get value;            // T undeclared
  external Box<U> map(U Function(T) fn);   // U, T undeclared
}
```

Every generic declaration in the corpus produces uncompilable Dart. `Array<`
alone appears 699 times.

---

## E-04 — `extends` / `implements` are never emitted `[verified]`

`IRClass.extends`, `IRClass.implements` and `IRInterface.extends` are populated
by the parsers and read by no emitter.

```ts
declare class Box<T> extends Base<T> implements Holder<T>, Named {}
interface Child extends Parent1, Parent2 { x: string; }
```
```dart
class Box { }                       // heritage gone
abstract class Child{}              // heritage gone
```

The entire inheritance graph is dropped at emit. Combined with `P-01` (heritage
not dep-tracked) the information is absent from both the graph and the output.

`js_facade_gen` reference: §2.2-2.4 (`class X extends Y implements Z`), §3.2
(`abstract class X implements Y, Z`), §14.5 (`implements List<T>`).

---

## E-05 — Variables emit as mutable fields; `isReadonly`/`isConst` ignored `[verified]`

**`emitter/old/variable.ts:13`**
```ts
return `${jsAnnotation}\nexternal ${emitType(irVariable.type)} ${irVariable.name};`;
```

```ts
declare const readonly_const: number;
```
```dart
@JS("readonly_const")
external num readonly_const;        // mutable
```

`js_facade_gen` §1.1 emits a getter/setter pair, and §1.9 emits a getter only
for `const`:

```dart
@JS() external num get a;
@JS() external set a(num v);
```

The IR carries `isReadonly` and `isConst` (`ir/variable.ts:7-8`); both are
unread. (Note `isReadonly` is also always `false` — see `P-05`.)

---

## E-06 — Enums emit unreachable members with inconsistent types `[verified]`

**`emitter/old/enum.ts:19-21`**
```ts
return `${jsAnnotation}\nclass ${irEnum.name}{}\n${jsAnnotation}\n` +
       `extension ${irEnum.name}Enum on ${irEnum.name}{\n${members}\n}`;
```

```ts
declare enum E { A = 1, B }
```
```dart
@JS("E") class E{}
@JS("E") extension EEnum on E{
  external static String get A;      // String?
  external static dynamic get B;     // dynamic?
}
```

Three defects:
1. Static members inside a Dart `extension` are not accessible as `E.A`.
2. Per-member type inference (`inferDartType`, `:24-29`) switches on the JS
   runtime type of `value`, which is *always a string* (`P-04`) or `undefined` —
   hence `String` for an explicit `1` and `dynamic` for an implicit member,
   within one enum.
3. `@JS("E")` is emitted twice.

`js_facade_gen` §7.1/§7.3 emits a plain class with `external static num get`
members, uniformly `num` regardless of initialiser.

---

## E-07 — Hoisted anonymous classes have no factory constructor `[verified]`

**`emitter/old/interface.ts:21-29`** emits a factory only when
`irInterface.constructors.length > 0`. Anonymous object literals have no
construct signature, so hoisted types always take the `abstract class X{}`
branch and are **unconstructible from Dart**.

```dart
@JS() @anonymous
abstract class Anon_h3_CoordIJ{}
extension Anon_h3_CoordIJExtension on Anon_h3_CoordIJ {
  external num get i;  external set i(num value);
}
```

The v0.4 CHANGELOG claims "hoisted anonymous types now have idiomatic Dart
factory constructors with named parameters" — that behaviour lived in the now-dead
transformers and did not survive the refactor.

`formatNamedParameters` (`emitter/shared/shared.ts:44-58`) already implements
exactly the needed `{required T x, U y}` rendering and is currently called from
only one place. `js_facade_gen` §3.3 is the reference.

---

## E-08 — No cross-file imports are ever emitted `[verified]`

**`emitter/phase/emitterPhase.ts:188-195`** — the file header is fixed:

```dart
// Generated by dart_bindgen from <file>
// Do not edit directly

@JS()
library <name>;

import 'package:js/js.dart';
```

Verified on three.js: **415 of 415** emitted files contain exactly one import
(`package:js/js.dart`) while referencing types declared in sibling files.
`leaflet.dart` references `Feature` and `GeoJsonObject` from `geojson.dart` with
no import.

Every multi-file output is uncompilable. This is the branch's whole purpose and
the last unwired step: the linker computes the graph (`L-08`) and the emitter
never reads it.

Also missing: `dart:html` / `dart:typed_data` substitution imports
(`js_facade_gen` §14.1-14.3), which v1 explicitly targets.

---

## E-23 — Cross-file leaf names can silently bind to the wrong local type `[verified]`

The pre-S5 declaration fixture contains this correctly linked edge:

```text
consumer.d.ts::Consumer
  --Toolkit.Options-->
foundation.d.ts::Toolkit|Options
```

The use site retains the full `resolvedFQN`, and S4 correctly assigns the
target's library-local `resolvedDartName` as `Options`. The transitional type
emitter reads only that leaf name:

```ts
const resolvedName = type.reference?.resolvedDartName;
let typeName = resolvedName ?? type.name;
```

It has no current-library/import context and ignores `resolvedFQN`. Consequently
`consumer.dart` emits:

```dart
external Options get options;
```

That file also contains its own `Options`, translated from `Alpha.Options`, so
Dart accepts the output and binds `Consumer.options` to the **wrong type**. This
is distinct from `E-08`: a missing foreign type produces an analyzer error;
`E-23` is analyzer-clean semantic corruption caused by accidental local capture.

S5.2 must allocate deterministic, collision-safe prefixes for foreign Dart
libraries and make type emission use both pieces of linked identity:

```dart
import 'foundation.dart' as foundation;

external foundation.Options get options;
```

Same-file references remain unqualified. Cross-file references must derive the
target library from `resolvedFQN` and the declaration token from
`resolvedDartName`; `resolvedDeps` supplies the file-level import set. Do not
fix this by renaming whichever local declaration happened to collide—the same
foreign reference must be stable regardless of consumer-local names.

**S5 acceptance:** keep the exact linker-edge assertion, assert a prefixed
`foundation.dart` import and `foundation.Options`, and assert that the property
does not emit as bare `Options`. `dart analyze` alone is insufficient because
the current incorrect output already passes name resolution.

---

## E-09 — Dart keyword escaping is absent `[verified]` **[FIXED — S4]**

`semantic/keywords.ts` contains the checked Dart identifier classes and
`semantic/names.ts` applies them by declaration/member/parameter/type context.
Renamed members retain exact `@JS` spellings; the keyword fixture falls from 9
analyzer issues to 0 errors/warnings. Original finding follows.

No identifier is checked against Dart's reserved words. Observed in three.js
output:

```dart
external bool get static;      // `static` is a reserved word
```

`js_facade_gen` §10.1-10.3 renames to `JS$rethrow`, `JS$abstract`, while
correctly *allowing* built-in identifiers in property position (§10.3).

Note this interacts with `E-01`: any escaping scheme must keep the original JS
name for the `@JS()` annotation, which the current `split("_")` approach cannot.

**Confirmed uncompilable, not merely non-idiomatic.** `dart analyze` over the
probe output (S1.6):

```
error - lib/probe.dart:145:12 - 'class' can't be used as an identifier
        because it's a keyword - expected_identifier_but_got_keyword
error - lib/probe.dart:147:12 - 'extends' can't be used as an identifier ...
```

`static` — the case originally recorded above — turns out to be *accepted* in
property position, which is exactly the §10.3 distinction `js_facade_gen` draws.
The reserved words that actually break the build are the true keywords. This
puts `E-09` on the `X-09` v1 gate rather than in the polish pile. It is in fact
*more* severe than `E-17`, which turns out to be a warning — see the severity
correction under that finding.

---

## E-10 — Namespace flattening collides `[verified]` **[FIXED — S4]**

S4 allocates per-library names with top-level priority, then the shortest
innermost namespace suffix, then a numeric fallback, and publishes the selected
name through `resolvedDartName`. Complete Leaflet now has zero
`duplicate_definition` diagnostics (245 before S4). Original finding follows.

All symbols from one source file are emitted into one Dart library with their
bare names (`emitterPhase.ts:198-211`), so `namespace A { interface Opts }` and
`namespace B { interface Opts }` both emit `abstract class Opts`.

Verified: `leaflet.dart` contains two `abstract class ZoomOptions`.

`js_facade_gen` §8.4/§8.5 renames the second occurrence (`m2_A`, `m2_x`, `x2`)
and annotates with the full JS path.

---

## E-22 — Computed member spellings are not Dart identifiers `[verified]` **[FIXED — S4 identifier legality]**

The first S4 three.js analyzer run exposed methods named
`[Symbol.iterator]` emitted literally, causing four `MISSING_IDENTIFIER`
syntax errors plus parser cascades in `Color.dart` and `Euler.dart`. Keyword
tables alone do not cover this defect class: a source property can be legal
TypeScript without being an identifier at all.

`legalDartName` sanitizes non-identifier spellings deterministically, removing
the Dart parser errors. The S4 close incorrectly treated preservation of the
text in `@JS("[Symbol.iterator]")` as runtime correctness. Post-S4 review proved
that annotation addresses a string/path, not the ECMAScript symbol key; `E-25`
records and fixes that distinct dispatch defect.

---

## E-24 — Renamed legacy class overloads dispatch to nonexistent properties `[verified]` **[FIXED — post-S4 review]**

`@JS("f")` on a legacy `package:js` class instance member is ignored by
dart2js. S4 therefore generated analyzer-clean Dart methods `f_1`/`f_2` whose
compiled JavaScript called `receiver.f_1` and `receiver.f_2`.

Renamed instance members now emit in an external extension on the class.
Renamed static members lower to collision-reserved top-level bindings annotated
with the fully qualified path, such as `@JS("Factory.make")`. Analyzer,
dart2js, and Node probes produce four expected values; compiled calls are
`widget.f(...)` and `self.Factory.make(...)`, never the Dart overload names.

---

## E-25 — Symbol-keyed members are emitted as string-keyed members `[verified]` **[FIXED — post-S4 review]**

Stringifying `[Symbol.iterator]` in `@JS` silently targets the wrong JavaScript
member. The transitional backend has no safe symbol-key lowering, so semantic
analysis now reports `UNSUPPORTED_COMPUTED_MEMBER`, retains the complete member
in IR, and emission writes an explicit unsupported comment without an external
binding. This is deliberate preservation for a later symbol-aware backend, not
an invented string dispatch.

---

## E-26 — Source declarations capture backend-owned Dart names `[verified]` **[FIXED — post-S4 review]**

Three.js declares `class String` in `examples/jsm/transpiler/AST.d.ts`. Before
the fix, every primitive TypeScript `string` in that Dart library resolved to
the local class, including its own constructor parameter, while analysis could
remain clean.

The allocator now reserves unqualified primitive, collection, async, and
annotation names emitted by the backend. The source class becomes `JS$String`
with `@JS("String")`; primitive positions remain Dart `String`, and linked uses
of the declaration receive `JS$String`.

---

## E-27 — Generated helper names bypass collision allocation `[verified]` **[FIXED — post-S4 review]**

Emission invented `${name}Extension` and `${name}Enum` after top-level names
were allocated. Real three.js declarations named `SmoothstepExtension`, `Mix`,
and `Select` then produced duplicate definitions.

Top-level allocation now reserves interface/class extensions, enum helpers,
and qualified static binding names together with their declarations. Tests
cover collisions in both source orders; targeted three.js analysis reports no
duplicate definitions in the affected files.

---

## E-28 — Digit-leading filenames produce invalid Dart library names `[verified]` **[FIXED — post-S4 review]**

Punctuation was replaced, but leading digits were retained. The real
`3MFLoader.d.ts` and `3DMLoader.d.ts` inputs emitted invalid `library` directives
and parser cascades. Sanitization now checks the first character and prefixes
such names with `dartify_`; both real outputs parse as valid Dart libraries.

---

## E-11 — Emission is coupled to the filesystem `[inspection]`

**`emitterPhase.ts:44-55`** interleaves rendering and writing:

```ts
const dartContent = emitFileContent(sourceFile, symbols, debug);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, dartContent, "utf-8");
```

There is no way to render to a string. This is what broke `test/simple.test.ts`
and `test/snapshot.test.ts`, both of which call a
`Transpiler.transpileFromString(...)` that returned `{ content, errors }`
(`X-01`). The v0.3 CHANGELOG lists "fully decoupled core logic from the
filesystem" as a shipped achievement; the refactor regressed it.

**Fix direction:** split into `renderAllFiles(): Map<path, string>` and a thin
`writeAll(map)`. Prerequisite for restoring the test suite.

---

## E-12 — Intersections, tuples and literal values degrade silently `[verified]`

`emitType` (`emitter/old/type/emit.ts`) has no case for `TypeKind.Intersection`
(→ `dynamic`, `T-09`), collapses all tuples to `List<dynamic>` unless
homogeneous (`:83-95`), and discards `literalValue` entirely — `StringLiteral`
becomes `String`, losing `"success"`.

Union rendering is the one place the emitter *does* preserve information:
`dynamic /* String|num */` (`:66-72`). That comment style is the model to
generalise — and per the author's stated preference, to improve on by minting
named aliases (`typedef StringOrNum = dynamic;`) instead of inline comments.

---

## E-13 — `stripQuotes` removes quotes globally `[inspection]`

`utils/utils.ts:2` — `str.replace(/['"]/g, "")` strips every quote character
anywhere in the string, not just delimiters. A JS property legitimately
containing a quote is mangled. Also duplicated logically by
`extractJsPrefix` (`emitterPhase.ts:117-120`).

---

## E-14 — Index signatures ignore their key type `[inspection]`

**`emitter/old/interface.ts:70-73`** emits a fixed pair regardless of the parsed
`keyType`/`valueType`:

```dart
external dynamic operator [](Object key);
external void operator []=(Object key, dynamic value);
```

`IRIndexSignatures` carries both types and `isReadonly`; none are read.
`Tasks.md` tracks this as "Proper `operator []`/`[]=` support".

---

## E-16 — There is no type-definitions section, and degradation is anonymous `[verified]` **[FIXED — S1.5–S1.7]**

Emitted files are a flat list of translated declarations. Nothing declares the
types that the translation *invented*, and nothing records what a `dynamic`
used to be.

```ts
declare var keyofThing: keyof Box<string>;
declare var cond: string extends number ? true : false;
declare function pick(k: keyof Box<string>): void;
```
```dart
@JS("keyofThing") external dynamic keyofThing;
@JS("cond")       external dynamic cond;
@JS() external void pick(dynamic k);
```

Three `dynamic`s, three different origins, no way to tell them apart — and the
second use of `keyof Box<string>` has no relationship to the first.

`js_facade_gen`'s answer is an inline comment at each use site
(`dynamic /*keyof Box<string>*/`). That preserves the origin but does not create
a type: it cannot be referenced, it repeats at every occurrence, and it is
invisible to the analyser and to IDE hover.

### Requirement for the rewrite

Every unrepresentable type becomes a **named symbol** with a **documented
definition**, and use sites refer to it by name:

```dart
// ── Type definitions ─────────────────────────────────────────
/// Unrepresentable in Dart: `keyof Box<string>`
typedef KeyOfBoxString = dynamic;

/// Unrepresentable in Dart: `string extends number ? true : false`
typedef StringExtendsNumberCond = dynamic;
// ─────────────────────────────────────────────────────────────

@JS("keyofThing") external KeyOfBoxString keyofThing;
@JS("cond")       external StringExtendsNumberCond cond;
@JS() external void pick(KeyOfBoxString k);
```

Why the definition site rather than the use site:

- **It is a real type.** `KeyOfBoxString` is a Dart identifier — referenceable,
  aliasable, greppable, and a stable target for a future non-`dynamic`
  representation. Changing one `typedef` upgrades every use site at once.
- **`///` beats `/* */`.** A dartdoc comment surfaces on IDE hover at every use
  of the name. The inline-comment approach only shows where the developer is
  already reading the generated source, which is the one place they are least
  likely to be.
- **It says it once.** 1,728 `keyof` occurrences collapse to one typedef per
  distinct type expression, not 1,728 repeated comments.
- **The linker already has the machinery.** A minted alias is just another
  registered `Symbol`; it participates in dedup, in the dep graph, and in
  cross-file import emission for free.

### What this needs upstream

| Requirement | Finding |
|---|---|
| `originalText` populated on every `IRType`, at every depth — the comment body | `T-02` |
| `TypeKind.Unsupported` carrying that text plus a reason code | `T-01`, `I-03` |
| Type cache keyed so per-site text is not shared between sites | `T-03`, `T-04` |
| Minting + dedup of alias symbols during linking | `L-05` |

Name derivation must be deterministic and collision-checked against the symbol
table (`keyof Box<string>` → `KeyOfBoxString`), since two distinct expressions
can sanitise to the same identifier.

The same section is the natural home for callable-interface typedefs (`I-05`)
and hoisted-anonymous-type aliases, so it is a structural feature of the output
format, not a special case for degradation.

---

## E-15 — Getter/setter pairs are emitted for readonly properties `[inspection]`

**`emitter/old/interface.ts:35-44`** — the `isReadonly` branch and the
non-readonly branch emit an *identical* getter line; only the setter differs.
The `if` is redundant as written but the intent (suppress the setter when
readonly) is correctly realised. Cosmetic; noted so the rewrite does not
reproduce it.

---

## E-17 — `dynamic?` is emitted `[verified]` **[FIXED — S1.4, hardened S1.9]**

Found while diffing S1.4's output, not present in the original audit.

`emitType`'s union branch returns early when the union collapses to a single
member:

```ts
if (type.isNullable) {
  return emitType(type.unionTypes![0]) + "?";   // no guard
}
```

The guard applied to every other kind — `baseType !== "dynamic" && baseType !==
"void"` at the end of the function — is bypassed by that early `return`. So any
nullable union whose surviving member emits as `dynamic` produced `dynamic?`:

```
any | null              → dynamic?
unknown | null          → dynamic?
keyof T | null          → dynamic?
(keyof T) | undefined   → dynamic?
```

`dynamic` already admits null in Dart, and `dynamic?` is a compile error. Every
occurrence was an uncompilable declaration — directly against the `X-09` v1 gate
("h3 and leaflet pass `dart analyze` with zero errors").

**Fixed** by repeating the guard inside the early-return branch. Real nullable
types are unaffected: `string | null` → `String?`, `string[] | null` →
`List<String>?`. One occurrence existed in the leaflet smoke output
(`Object.create`); `test/type/tier-a.test.ts` covers both directions.

**Lesson for the S5 emitter rewrite:** the nullability rule lives at the bottom
of `emitType` while three branches `return` before reaching it. Any rule that
must hold for all kinds should be applied at a single exit, not duplicated at
each one.

---

## E-18 — Multi-member unions still use `js_facade_gen`'s inline-comment pattern `[verified]`

`emitType`'s union branch emits the reference tool's shape verbatim:

```ts
if (uniqueNames.length > 1) {
  return "dynamic " + "/* " + type.unionTypes!.map((e) => emitType(e)).join("|") + " */";
}
```

```dart
external List<H3Index> polygonToCells(
    dynamic /* List<List<num>>|List<List<List<num>>> */ coordinates, num res, ...);
typedef H3IndexInput = dynamic /* String|List<num> */;
```

This is **pre-existing** — it dates to `a5433d7` (2025-08-19) and h3's output is
byte-identical to the pre-S1 baseline. It is not a regression from the type
layer work, and it is `js_facade_gen`-conformant.

But it is exactly the pattern design principle 2 exists to replace: the
information is repeated at every use site, it is not referenceable, it does not
show on IDE hover, and improving the representation means editing every
occurrence. The `typedef` case above is fine — that one *is* named. The
parameter case is not.

**Also, the dedup is computed and then thrown away.** `uniqueNames` gates the
branch but the comment re-maps the original list, so duplicates survive:

```
"a" | "b" | number         ->  dynamic /* String|String|num */
string | number | boolean  ->  dynamic /* String|num|bool */
```

**Blocker for a fix.** Union members cannot go through `deriveAliasName`
unchanged. That derivation tokenises identifier runs out of the source text and
drops everything else, so `number[][] | number[][][]` yields `NumberNumber` —
uninformative *and* collision-prone, since both operands are `number`-shaped. A
union alias has to be derived from the **emitted Dart member types**
(`ListListNumOrListListListNum`), not from the TypeScript text. That is a
different code path from `E-16`'s, which is why this is filed separately rather
than folded into it.

### Resolution — S1.5 through S1.7

Delivered as specified above. `deriveAliasName` derives the identifier from
`originalText` (`src/engine/alias/name.ts`), `AliasRegistry` makes it unique
against the file's symbol table (`registry.ts`), `registerAliasSymbols` runs
during linking and registers each as a real `Symbol` (`register.ts`), and
`emitFileContent` collects them into a section under a header.

Three refinements the plan did not anticipate:

- **An author's own `type X = <unrepresentable>` is not given a second name.**
  It is already a named degradation. Minting produced
  `typedef Mapped = MappedKInKeyOfTTK;` on top of
  `typedef MappedKInKeyOfTTK = dynamic;` — a hop naming nothing new. Author
  aliases stay where they were written and are documented in place; only minted
  ones move into the section.
- **Use sites keep `kind: TypeKind.Unsupported`** and carry `aliasName`, rather
  than being rewritten into `TypeReference`. `unsupportedReason` therefore
  survives linking, so "how much are we still degrading, and of what?" stays a
  query over the IR rather than a grep over generated Dart.
- **The doc comment needs a computed Markdown fence.** Template literal types
  carry their own backticks, so `` `pre-${string}` `` in a single-backtick code
  span renders wrong; the fence has to out-length the longest run inside and pad
  when the content touches a backtick at either end.

**Verified.** Over three.js + leaflet + probe: 68 typedefs, 0 dangling
references, 0 duplicate typedefs, bare `dynamic` tokens 2,239 → 2,191. `dart
analyze` on the probe output reports 19 issues and on leaflet 507, and **not one
of them names a minted typedef**. h3 is byte-identical throughout — it contains
no unrepresentable types, which is the `E-18` union path, not this one.

### `dart analyze` baselines at the close of S1.7

Recorded so later stages can be measured against them rather than re-argued.

| Output | Issues | Dominated by |
|---|---:|---|
| `synthetic/probe.dart` | 19 | `E-03` type params, `E-09` keywords, `L-05` duplicates |
| `leaflet.dart` | 507 | 245 `duplicate_definition` (`L-05`, `E-10`), 141 `undefined_class` (`E-03`, `E-08`), 61 `non_type_as_type_argument` (`E-03`) |

`E-03` and `L-05`/`E-10` are the whole game. Type parameters and declaration
merging between them account for well over 400 of leaflet's 507.

### Severity correction, and the residue S1.9 found

**This finding originally said "not valid Dart". That is wrong**, and it was
asserted from reading rather than from running the analyser. Measured:

| emitted | `dart analyze` |
|---|---|
| `dynamic?` | **warning** — `unnecessary_question_mark` |
| `dynamic /* Foo\|Bar */?` | **warning** — same |
| `Alias?` where `typedef Alias = dynamic` | clean, no diagnostic |
| `void?` | **error** — `Expected to find ';'` |

So `dynamic?` is a lint, not a compile error. It still blocks the v1 gate —
`dart analyze` exits non-zero on warnings — but it is not in the same class as
`E-09`, and the note under that finding claiming they are equivalent overstates
it. `void?` is the genuine parse error, and the guard already excluded `void`.

**The residue.** The S1.4 guard compared for exact equality with `"dynamic"`,
so the *commented* form slipped straight through:

```dart
external dynamic /* Node|String */? build(NodeBuilder builder, ...);
```

Three three.js files carried this until S1.9 — `nodes/core/Node.dart`,
`renderers/common/Renderer.dart`, `scenes/Scene.dart`. It only became visible
once `T-12` normalised single-member unions away, which changed which branch
those types took. The guard is now `isDynamicLike`, covering the commented form,
and `TypeKind.Unsupported` returns early for the same reason: a minted alias is
a typedef for `dynamic`, so `KeyOfBoxString?` is the same construct wearing a
name.

---

## E-19 — `object` and `undefined` fall through to bare `dynamic` `[verified]`

Found while attributing S1's residual `dynamic` at the IR level rather than by
grepping output.

`emitType` has no `case TypeKind.Object` and no `case TypeKind.Undefined`, so
both land in `default:` and emit bare `dynamic`. Over three.js + leaflet + h3
that is **22** `object` nodes and **6** `undefined` — the entire remainder of
S1's "zero bare `dynamic` outside genuine `any`/`unknown`" criterion, once the
727 genuine `any`s and the 84 typedef right-hand sides are set aside.

TypeScript's `object` means "any non-primitive"; Dart's `Object` means "any
non-null". Not identical, but far closer than `dynamic`, and it is a real type
the analyser can check. Bare `null` already parses/emits as `Null` (`T-07` is
fixed); the distinct `undefined` keyword deliberately remains
`TypeKind.Undefined` and needs an explicit S5 emission policy.

Left for S5 rather than fixed in S1.9: both are simple emitter cases, but their
mapping is a backend policy and should land with the rewrite.

> **`T-09`'s fix raised leaflet's analyzer count, on purpose.** 507 → 510, and
> all three additions are `undefined_class`: the intersections' first members
> are type parameters (`TEventData`, `BaseEvent<T>`) that `E-03` does not emit.
> Bare `dynamic` was hiding them. Honest output that exposes a known gap beats
> quiet output that conceals it — and `E-03` was already leaflet's largest
> single category at 141.

---

## E-20 — `isAbstract` is parsed and never emitted `[verified]`

`parseClass` reads `classDecl.isAbstract()` into `IRClass.isAbstract`.
`emitClass` emits `class ${irClass.name} {` unconditionally. An abstract class
therefore emits as a concrete one, and Dart will happily let a consumer try to
construct it.

Same shape as `E-03`/`E-04`: the parser did its half, the emitter never read the
field. Cheap to fix, but it belongs with the S5 rewrite that also handles
heritage — emitting `abstract` without `extends`/`implements` produces a class
that is unconstructible *and* unrelated to its base.

---

## E-21 — Dead code and unused parameters in the emitter layer `[verified]` **[PARTIAL — S4]**

S4 deleted the commented overload branch and `getOverloadFuncs`, and
`emitInterface` now consumes the explicit JS prefix. The passthrough
`returnTypeAliasName` and compatibility `debug` parameters remain for the S5
backend rewrite, so the finding stays open for that residue.

Not bugs; recorded so the S5 rewrite starts from an accurate picture.

- **`emitter/old/class.ts:115`** — `getOverloadFuncs` is referenced only from a
  32-line commented-out block above it. It is a second, trivial overload
  grouper (group by name, no renaming), which makes `CLAUDE.md`'s "`transformers/`
  holds the *only* working overload grouper" imprecise. Mine both in S4.
- **`emitter/shared/shared.ts:5`** — `returnTypeAliasName(t)` is
  `return emitType(t)`. A passthrough with a name that promises alias
  resolution it does not do; used in four places where `emitType` would read
  more honestly.
- **`emitter/old/interface.ts:10`** — `emitInterface` accepts `prefix` and never
  uses it, so the namespace path never reaches the annotation. Harmless *today*
  because every interface is emitted `@JS() @anonymous`, where the name is
  ignored — but it silently pre-breaks any future non-anonymous path, and it
  reads as though scoping were handled.
- **Emitter signatures** — `debug` is unused throughout the old templates;
  several `prefix` parameters are also unused. S3 removed the four stale
  parser locals and corrected the double-slash imports, so those original
  sub-findings are closed.
