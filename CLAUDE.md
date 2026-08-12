# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## What this is

`dartify` (npm: `dart_bindgen`) — a TypeScript `.d.ts` → Dart JS-interop binding
generator. Built on `ts-morph`. Solo-developer project.

The input contract is declaration files, not arbitrary executable `.ts`.
Support ambient/exported declarations, declaration merging, module/global
augmentation, and type syntax; do not expand S5 into function-body, statement,
implementation-inference, or general expression lowering.

**v1 goal: a drop-in replacement for the archived `dart-lang/js_facade_gen`,
targeting `package:js`.** This target is deliberate — do not suggest migrating
the primary backend to `dart:js_interop`. Existing users have codebases whose
`package:js` / `dart:html` dependencies extend past the generated bindings, so a
drop-in replacement is near-zero friction where a migration is a project.
**v2** adds a `js_interop` backend behind a CLI flag — the IR is
output-language agnostic, so a backend is a pair of string tables, not a second
compiler.

**The next published version is `1.0.0`.** There is no 0.6/0.7/0.8/0.9 — the old
version ladder was drawn against the 5-pass architecture and is void. Do not
propose intermediate point releases.

## Read these first

| File | What it gives you |
|---|---|
| [`audit/FINDINGS.md`](audit/FINDINGS.md) | Every known defect, severity-ranked, with stable IDs |
| [`audit/README.md`](audit/README.md) | Index into the per-area audit files |
| [`PLAN.md`](PLAN.md) | Staged implementation plan S0–S6 to v1; every task cites a finding ID |
| [`PRE_STAGE5_PLAN.md`](PRE_STAGE5_PLAN.md) | Decision-complete task order, contracts, commits, and gates for the 4.11–4.17 correctness barrier |
| [`STAGE4_PLAN.md`](STAGE4_PLAN.md) | Decision-complete S4 semantic design, tests, audit workflow, and delivery sequence |
| [`ROADMAP.md`](ROADMAP.md) | The public short version of the same thing |
| [`def_files/synthetic/s5_emitter/README.md`](def_files/synthetic/s5_emitter/README.md) | Pre-S5 multi-file emitter fixture matrix and measured baseline |
| `def_files/js_facade_gen_test_cases.md` | ~120 input/output pairs from the reference tool — the de facto spec |

Do not re-derive findings from scratch. If you discover something new, add it to
the audit with a new ID rather than reporting it only in chat.

S0-S4 are complete. `STAGE4_PLAN.md` is the semantic contract and
`audit/S4-EVIDENCE.md` is its measured record, including the post-S4 corrections
`L-17`, `L-18`, `P-14`, and `E-24`–`E-28`. The full line-by-line post-S4 audit
is complete in `audit/POST-S4-AUDIT.md`. Complete `PLAN.md` tasks 4.11–4.17
before beginning S5; in particular, do not build the backend on process-global
run state or unresolved module-export semantics.

S5 platform mappings use the original
`lib/dart_libraries_for_browser_types.ts` as a compatibility baseline, covering
HTML, IndexedDB, WebGL, Web SQL, SVG, Web Audio, and typed data plus Dart-side
renames. Do not implement this as a global leaf-name replacement map. Complete
`I-15` first, match checker-confirmed TypeScript host identity, validate the
snapshot against the supported Dart SDK, and route platform plus sibling
imports through one deterministic collision-safe prefix allocator.

`I-15` also gates standard utility aliases. `Record<K, V>`, `Partial<T>`, and
similar lib definitions currently remain unresolved Dart leaves (`E-36`), not
Tier-B aliases. S5 must provide either a verified lowering or a named documented
fallback. Precise checker expansion may remain post-v1; analyzer-invalid names
may not.

Task 4.11 is a locked deletion, not an abstraction rename: remove
`src/context.ts` and `src/reset.ts`. A `Transpiler` run owns its project,
resolution accumulators, symbol table, namespace aliases, and diagnostics.
Pass narrow dependencies to phases; do not introduce a singleton, broad mutable
`CompilationContext`, or serialization lock. The immutable parser
`ParseContext` is unrelated and remains. Linking returns an owned program that
S5 and later backends consume explicitly. Bring `R-13` into this work by
returning generation diagnostics instead of passing global logging state.

## Commands

Use `pnpm` — the repo has a `pnpm-lock.yaml` and `packageManager` pinned.

```bash
pnpm test                           # one-shot suite (test:run is the same)
pnpm test:watch                     # watch mode
pnpm test:ui                        # browser UI at localhost:51204/__vitest__/
pnpm test:update                    # accept snapshot changes (vitest run -u)
pnpm test:stress                    # opt-in full 1,654-file corpus, ~3 min currently
pnpm test:s2                        # opt-in linker corpus gate
pnpm test:s3                        # opt-in declaration-fidelity census
pnpm test:s4                        # focused semantic + emitter-adapter gate
pnpm test:s5:fixture                # pre-S5 Dart + verbose CLI golden
pnpm fixture:s5                     # emit it to output/s5_emitter/ with -lv
pnpm exec tsc --noEmit              # typecheck — must stay at 0 errors
pnpm dev -d "<glob>" -o <outdir>    # run the CLI from source
pnpm dev -d "<file>" -o <out> -l    # phase + module-resolution logs
pnpm dev -d "<file>" -o <out> -lv   # + detailed structured linker report
pnpm graph -d "<glob>" -o g.svg     # dependency graph SVG (internal tooling)
pnpm build                          # tsup → dist/
```

**`dart analyze` is available on this machine and it is the v1 acceptance
test** — use it, don't just eyeball the Dart. A throwaway harness is enough:

```bash
mkdir -p /tmp/dc/lib && cd /tmp/dc
printf 'name: dc\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  js: ^0.6.7\n' > pubspec.yaml
dart pub get && cp <generated>.dart lib/ && dart analyze
```

At S4 close, h3 has zero analyzer errors/warnings (plus the expected
`package:js` deprecation info), the four semantic fixtures have no S4-owned
errors, and complete Leaflet has 239 issues with zero duplicates or syntax
errors. three.js has zero duplicate, syntax, or identifier errors; its
remaining diagnostics are S5 import/generic categories.

Analyzer-clean output is not sufficient evidence for JS dispatch or local type
capture. For renamed class members, compile with dart2js and inspect/run the
JavaScript call target. For computed keys, never stringify a symbol expression;
retain it in IR and emit an explicit unsupported diagnostic until a backend can
lower the key correctly.

`test:ui` accepts the same filters as the CLI — `pnpm test:ui type` opens the UI
scoped to the type tests. `test:stress` sets `DARTIFY_STRESS=1` inline, which is
POSIX-shell syntax; on Windows use `pnpm test:run test/stress.test.ts` with the
variable set separately.

`test:coverage` is currently nonfunctional because the Vitest coverage provider
is not installed (`X-16`). Do not report coverage until that command is repaired.
The S5 fixture is a golden, not an executable Dart correctness gate: `X-14`
requires analyzer and dart2js/runtime probes before S5 output can be accepted.

Test tiers: `simple` (sanity) · `smoke` (3 files, byte-exact snapshots) ·
`test:s2` (link corpus) · `test:s3` (declaration-fidelity census) · `test:s4`
(semantic contract) · `test:s5:fixture` (multi-file pre-emitter golden) ·
`stress` (1,654-file corpus, opt-in). S4's independent
census found 0 returned errors and 0 emission-error comments; 719 empty outputs
are the 710 known barrels/comment files plus 9 Lodash augmentation-only files.

The final post-S4 audit gate is 252 passed / 4 skipped; S2 2/2, S3 1/1,
S4 34/34, S5 fixture 3/3, and stress 1,654/1,654 with 719 known empty outputs.
The protected S3 input floor remains 2,530 declarations; the current
post-semantic census is 2,342 facets and 25,268 parsed types.

Useful corpora in `def_files/` (1,654 `.d.ts` files, not shipped to npm):

| Path | Why |
|---|---|
| `h3/h3.d.ts` | **the motivating use case, not a demo** — see below |
| `leaflet/*.d.ts` | namespaces + qualified names — exercises `L-02` |
| `three/src/Three.Core.d.ts` | 420-file transitive resolution, ~5 s |
| `legacy_tests/*.d.ts` | the `js_facade_gen` conformance fixtures |
| `synthetic/probe.d.ts` | **hand-written.** One run reproduces ~16 findings |
| `synthetic/s3-complete.d.ts` | executable declaration-IR fidelity contract |
| `synthetic/s5_emitter/*.d.ts` | multi-file S5 Dart/CLI before-and-after baseline |

## Architecture

```
cli.ts → transpiler.ts
           ├ PHASE 1  phase/symbolGeneration.ts  → parser/* → IR → SymbolTable
           ├ PHASE 2  semantic/* + linkerPhase.ts → canonicalizes/merges/names,
           │                                        mints aliases, links dep graph
           └ PHASE 3  phase/emitterPhase.ts      → emitter/old/* → .dart

Transpiler seams:  analyze()   phases 1-2, returns LinkReport, no emission
                   render()    + phase 3, returns Map<path, RenderedFile>
                   transpile()  + writes to disk
                   static transpileFromString()  one virtual file → string

tools/graph.ts consumes analyze(); it is NOT part of the shipped bundle.
src/ir/visit.ts is the live recursive IR walker used by generation and aliases.
```

FQN scheme: `<abs file path>::<scope|segments|>Name`. `::` splits physical from
logical; `|` splits scope segments. Anonymous hoisted types become
`<file>::Anon_<sanitised scope>`.

This replaced a 5-pass architecture. Its orphaned `passes/**` and
`transformers/**` directories were deleted in S4; `src/legacy/**` remains as a
deliberate historical exhibit.

## Why this project exists

The author maintains **uber/h3**'s Dart bindings (they did the v3→v4 upgrade;
it is their first FOSS contribution and got them listed as an official h3
maintainer). h3's **web** support was generated by `js_facade_gen` — which is
archived, tells you not to use it, and is still load-bearing for h3 and many
other packages on `package:js`.

dartify is the replacement for the tool the author's own project depends on.

Consequences worth holding on to:

- `def_files/h3/h3.d.ts` is **not** an arbitrary fixture. It is the real
  consumer. "h3 bindings pass `dart analyze` cleanly" is the true v1
  acceptance test and h3 is the first adopter. **h3 has passed cleanly since
  before S1** — its output has been byte-identical since `4879732`. Treat that
  as a floor you must not break, never as evidence anything works.
- This independently confirms the `package:js` v1 target: h3 is exactly a
  codebase whose `package:js` dependency extends past the generated bindings.
- Public positioning should say it — "written by an h3 maintainer to replace
  the archived tool h3 itself depends on" is far stronger than "another
  `.d.ts` → Dart generator".

## Non-obvious things that will bite you

- **The obsolete transformer walker is gone.** `src/ir/visit.ts` is the live
  walker; `src/engine/semantic/shape.ts` provides metadata-free structural
  identity and same-file canonicalization.
- **Semantic names do not overwrite source names.** IR nodes retain `name`,
  while `dartName`/`jsName` and reference `resolvedDartName` carry output
  identity. Never recover JS spellings by splitting a Dart identifier.
- **`src/legacy/**` is the author's original 3-day implementation.** Self-contained,
  compiles clean, deliberately kept as an architectural exhibit. Do not "clean
  it up".
- **The dependency graph is deliberate tooling, not cruft** — it is how linker
  regressions get spotted. It lives in `tools/graph.ts` and must stay out of
  `src/`: when it was imported from `linkerPhase`, the `@viz-js/viz`
  devDependency it pulls in was **95% of the shipped bundle** (`D-07`).
  Instruments consume phase output; they are never steps inside it.
- **h3 passing is necessary but NOT sufficient — it is the easiest file in the
  corpus.** `h3.d.ts` has 0 `extends`, 0 `implements`, 0 generics, 0
  `interface`s, and is a single file. So `E-03` (type params never emitted),
  `E-04` (heritage never emitted) and `E-08` (no cross-file imports) are all
  *structurally invisible* from h3. Its output has shipped since the 3-day
  version for exactly this reason. Never conclude the emitter works because h3
  looks right — check leaflet (92 `extends`, 15 namespaces) and three.js
  (420 files) before believing anything.
- **`ts-morph`'s tuple `OptionalTypeNode` wrapper exists because of this
  project** — the author filed the upstream issue and it was fixed. `T-10` is
  **resolved upstream and shipped in ts-morph 28.0.0**; the repo was pinned at
  `^26.0.0`, which is why it still looked broken. Upgraded in S1.4. The
  distinction that misled a previous session: `RestTypeNode` was *already*
  wrapped at 26, `OptionalTypeNode` is the one that landed later — so "the
  tuple wrapper" is about **optional** members, not rest.
- **Treat the old three.js "0 broken links" result as historical, not a
  baseline.** S2 removed the fuzzy wrong-file/name fallback, linked checker
  targets at each IR use site and made missing modules visible. The current
  corpus result is 8,184 resolved edges, 0 ambiguous edges and 31 honest missing
  edges caused by the absent `webxr` and `@webgpu/types` packages. Do not make
  that report artificially green; install/provide those packages or retain the
  explicit failures. Leaflet is fully linked at 1,050/1,050 edges.
- **The type checker is available and it is cheap — use it before declaring
  something unrepresentable.** The parser is otherwise syntax-only, which makes
  it easy to conclude a construct "can't be known statically". `T-14` is the
  cautionary tale: `typeof x` was written off from syntax and turned out to be
  87% resolvable, because DefinitelyTyped is full of
  `export const NearestFilter: 1003`. Calling `node.getType()` on every one of
  three.js's 449 `typeof` nodes cost ~60 ms end-to-end. The question is never
  "can this be represented in Dart" — it is "can dartify *find out* what it
  means".
- **A finding's wording is not its defect class.** `T-05` said "depth is not
  propagated through function types". It was fixed exactly as worded and marked
  `[FIXED]` — while `ParenthesizedType` and `readonly` had the same bug, leaving
  `(((…)))` unbounded (`T-17`). Before closing a finding, enumerate every site
  of the *class* it describes; here that was one grep over `parseType(` call
  sites.
- **"Nothing throws" is a much weaker guarantee than it sounds.**
  `emitFileContent` wraps each symbol in a `try/catch` that turns a thrown
  error into a `// ERROR emitting ...` comment. The stress tier asserts the
  corpus never throws, and it never did — while `null | undefined` was
  silently emitting that comment instead of a declaration (`T-15`). When you
  add a stress-style assertion, assert on the *output*, not on the absence of
  an exception.
- **`refactor/orchestration` is the working branch.** `main` is what ships to
  npm. Broken states on the working branch are fine.

## Working conventions

- Verify claims by running the tool, not by reading alone. Tag findings
  `[verified]` vs `[inspection]`; say which you did.
- Prefer `pnpm` scripts that already exist over ad-hoc `npx` invocations.
- Reference finding IDs (`L-01`, `E-08`, …) in commit messages and PR text.
- Scratch files go in the session scratchpad, never in the repo.
- `def_files/` is third-party fixture data — do not edit except to add a
  deliberate synthetic case.

## Maintenance contract

**Keep these three documents current — this is part of the task, not an extra.**

1. **`audit/`** — when you change code a finding covers, update the finding in
   the same commit. Mark resolved ones `[FIXED]`; never renumber or delete an
   ID. New subsystem → new section.
2. **`PLAN.md`** — tick the stage table as work lands. Re-measure the baseline
   metrics in `audit/FINDINGS.md` at the end of each stage.
3. **`CLAUDE.md`** — when an entry under "Non-obvious things" stops being true,
   remove it. A stale warning is worse than none.

## Design principles (from `PLAN.md`)

1. Never degrade silently.
2. **Degrade to a *named* type, never bare `dynamic`.** `js_facade_gen` emits
   `dynamic /*keyof Box<string>*/` at each use site. dartify instead mints a
   real symbol and documents it once, in a type-definitions section:

   ```dart
   /// Unrepresentable in Dart: `keyof Box<string>`
   typedef KeyOfBoxString = dynamic;
   ```

   Use sites then say `KeyOfBoxString`. Same information as the reference tool's
   comment, but it is a referenceable type, it shows on IDE hover, it is stated
   once rather than per occurrence, and one typedef edit upgrades every use site
   when a better representation is found. This is `E-16` and it is **S1 — the
   first feature after the floor is restored**.
3. The IR is the contract — anything not captured at parse time is unrecoverable.
4. The linker owns cross-declaration semantics (overloads, augmentation,
   renaming, imports). This is the place the previous two architectures lacked.
5. **Instruments are not pipeline stages.** The graph, IR dumps and diagnostics
   consume phase output; they never sit inside it, and they live outside the
   shipped entry graph.
