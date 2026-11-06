# HG-3 fix1 brief: lib-type augmentation gaps

**Status:** Approved (2026-11-06)
**Implementer:** a fresh `implementer` (Sonnet 5.5, xhigh)
**Branch:** `hg-3` (Phase A and Phase B are committed there), in the existing worktree `.claude/worktrees/hg-3`.
**Decisions:** HD-06, HD-22, **HD-23** (agreed for this round), D-10, D-14, D-16, D-22.
**Read first:** `docs/process.md`, this brief, [HG-3.md](HG-3.md) (its History summarises Phases A and B),
`docs/hardening/decisions.md` (HD-06, HD-22, HD-23), `docs/issues.md` (`I-01`, `RS-14`), and the Phase B commit on `hg-3`
(`git show --stat HEAD`) with the files it touched, notably `src/engine/semantic/globals.ts`, `src/ir/interface.ts`
(`hostAugmentation`), `src/engine/parser/type/typeRefernce.ts`, `src/engine/emitter/packagejs/declarations.ts`,
`types.ts`, `program.ts`.

## Outcome

Augmenting any platform or core type (`Window`, `Document`, `Array<T>`, `String`…) never shadows the Dart SDK type: the
user's additions are a typed extension on the SDK type, references keep the SDK type, and every augmented member works at
runtime under dart2js, collections included. Repeating an identical global declaration in two files gives one binding.

## Items

| ID | Item |
|----|------|
| HG3F1-1 | **Core-mapped lib types** (HD-23). Augmentations of lib types that the core lowering maps to a Dart SDK type (`Array`/`ReadonlyArray` → `List`, `String`, and every other entry of that table — enumerate them in the report) follow HD-22: an extension on the SDK type, generic where the lib type is (`extension ArrayAugment<T> on List<T>`, bounds kept), and references keep the SDK type (`Array<string>` → `List<String>`, never a project class). One lookup decides "has an SDK mapping" for both tables. |
| HG3F1-2 | **Interface plus value companion** (HD-23). When one file declares both `interface Window { … }` and `declare var Window: { … }` (or any mapped lib type and its value), the augmentation survives the interface+value merge: the interface becomes the extension; each companion member gets `AUGMENTATION_MEMBER_UNSUPPORTED`; no standalone class. Report what `lib.dom.d.ts` as a stress input now produces (it was 14 extensions, `Window`/`Document` still classes). |
| HG3F1-3 | **Runtime-safe collection members** (HD-23, D-14). Extend the globals dart2js probe with augmented members typed `string[]`, `Array<number>`, a `Promise`-free generic container if lowering produces one, and a method returning `string[]`. If `getProperty<List<String>>` (or `callMethod`) fails a cast at runtime, lower those reads so they don't (e.g. read as `List<Object?>` and `.cast<String>()`, or whatever the existing external-member lowering relies on) — choose and justify in Deviations; every case must print the expected values. |
| HG3F1-4 | **Identical global redeclarations** (HD-06). The same global declared identically in several script files (`declare var shared: number;`, an identical function signature) is one declaration TypeScript-side, so it gives **one** binding owned per HD-06, with no `shared_2` and no `UNSUPPORTED_DECLARATION_GROUP`. Non-identical redeclarations keep today's behaviour (D-12 rules: overloads stay overloads, conflicts stay visible). Define "identical" by the IR's structural identity (`src/engine/semantic/shape.ts`), not by source text. |
| HG3F1-5 | **Tests.** Each item: `interface Array<T> { myExt(): T }` augmentation (extension on `List<T>`; a function `f(a: Array<string>)` elsewhere still takes `List<String>`); `interface String { shout(): string }`; `Window` interface + value companion in one file; collection-typed members at runtime (probe); identical `declare var` / function in two files → one binding, and a non-identical pair → today's behaviour; watch differentials for adding and removing an augmentation of a core-mapped type and for an identical redeclaration appearing in a second file (D-16). |
| HG3F1-6 | **Docs.** `README.md`'s augmentation section (core types, generics), `docs/process.md` counts. Propose `CHANGELOG.md` lines. |

## Allowed dependencies

None new.

## Non-goals (binding)

Lib types with no Dart mapping (`RS-14`); everything else in HG-3's Non-goals. No new decisions: if HD-23 proves
unworkable for a case, stop that item and report. No edits to `docs/decisions.md`, `docs/hardening/decisions.md`,
`docs/hardening/findings.md`, `docs/issues.md`, `CHANGELOG.md`. No git operations.

## Acceptance

1. The full gate passes (`tsc`, `pnpm test`, S2–S5, `test:dart`, `test:incremental`, `test:e2e`, `pnpm build`), and
   `pnpm test:stress` once at the end.
2. Every Dart change against the Phase B commit is accounted for by kind and count per corpus; h3, Leaflet, three.js and
   the 90 conformance cases byte-identical unless an HD explains the change.
3. The dart2js probe prints the expected values for every augmented member, collections included.
4. By hand from the built CLI, quoted in the report: the `Array<T>` augmentation (the extension and a `List<String>`
   parameter elsewhere), the `Window` interface + value file, and two files with `declare var shared: number;`.

## History
