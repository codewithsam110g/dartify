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
| [`PRE_STAGE5_PLAN.md`](PRE_STAGE5_PLAN.md) | The completed 4.11–4.17 correctness barrier: contracts and gates |
| [`STAGE4_PLAN.md`](STAGE4_PLAN.md) | Decision-complete S4 semantic design, tests, audit workflow, and delivery sequence |
| [`ROADMAP.md`](ROADMAP.md) | The public short version of the same thing |
| [`def_files/synthetic/s5_emitter/README.md`](def_files/synthetic/s5_emitter/README.md) | Multi-file emitter fixture matrix |
| `def_files/js_facade_gen_test_cases.md` | 90 input/output pairs from the reference tool — the de facto spec, executed by `test/conformance/` |
| [`test/conformance/ledger.json`](test/conformance/ledger.json) | Status and reason for every non-parity reference case |
| [`test/dart/baseline.json`](test/dart/baseline.json) | The exact accepted `dart analyze` census per fixture set |

Do not re-derive findings from scratch. If you discover something new, add it to
the audit with a new ID rather than reporting it only in chat.

S0–S5 and S6.1–S6.8 are complete; what remains for v1 is the publish decision
(S6.9 beta, S6.10 merge to `main` and publish). `STAGE4_PLAN.md` is the
semantic contract, `PRE_STAGE5_PLAN.md` the completed barrier, and `PLAN.md`
S5 records the backend policies (constructors, overrides, default type
arguments, degradations, imports, Promise).

Platform types come from `src/engine/emitter/packagejs/browserTypes.ts`, a
port of js_facade_gen's `lib/dart_libraries_for_browser_types.ts` validated
against Dart SDK 3.13 (500 of 633 entries kept). It is generated: regenerate
and re-validate rather than hand-edit. Entries match checker-confirmed
`IRType.host` identity (`I-15`), never a leaf spelling. Utility aliases
`Partial`/`Required`/`Readonly`/`NonNullable` lower to their argument; every
other unmapped host type is a named `dynamic` typedef (`E-36`).

Task 4.11 is done: `src/context.ts` and `src/reset.ts` are deleted. Each
`Transpiler` call owns its project, resolution accumulators, symbol table,
namespace aliases, and diagnostics. Pass narrow dependencies to phases; never
reintroduce a singleton, broad mutable `CompilationContext`, or serialization
lock. The immutable parser `ParseContext` is unrelated and remains. Linking
returns an owned `LinkedProgram` that backends consume explicitly; generation
diagnostics are returned, never logged through global state.

## Commands

Use `pnpm` — the repo has a `pnpm-lock.yaml` and `packageManager` pinned.

```bash
pnpm test                           # one-shot suite (test:run is the same)
pnpm test:watch                     # watch mode
pnpm test:ui                        # browser UI at localhost:51204/__vitest__/
pnpm test:update                    # accept snapshot changes (vitest run -u)
pnpm test:stress                    # opt-in full 1,654-file corpus, ~6 min currently
pnpm test:dart                      # dart analyze baseline + dart2js runtime probe (needs Dart)
pnpm test:s2                        # opt-in linker corpus gate
pnpm test:s3                        # opt-in declaration-fidelity census
pnpm test:s4                        # focused semantic + emitter-adapter gate
pnpm test:s5:fixture                # multi-file Dart + verbose CLI golden
pnpm fixture:s5                     # emit it to output/s5_emitter/ with -lv
pnpm exec tsc --noEmit              # typecheck — must stay at 0 errors
pnpm dev -d "<glob>" -o <outdir>    # run the CLI from source
pnpm dev -d "<file>" -o <out> -l    # phase + module-resolution logs
pnpm dev -d "<file>" -o <out> -lv   # + detailed structured linker report
pnpm graph -d "<glob>" -o g.svg     # dependency graph SVG (internal tooling)
pnpm ir -d "<glob>" -o ir.json      # linked IR as JSON (internal tooling)
pnpm build                          # tsup → dist/
```

**`dart analyze` is the v1 acceptance test** — use it, don't just eyeball the
Dart. `pnpm test:dart` is the gate (it needs a Dart SDK on PATH; CI installs
one). For a single file a throwaway harness is enough:

```bash
mkdir -p /tmp/dc/lib && cd /tmp/dc
printf 'name: dc\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  js: ^0.6.7\n' > pubspec.yaml
dart pub get && cp <generated>.dart lib/ && dart analyze
```

Today h3, complete Leaflet, the S5 fixture, synthetic and legacy fixtures, all
90 conformance cases and all 420 three.js libraries have **zero analyzer errors
and zero warnings**; the only output is `dart:html`/`dart:svg` deprecation
info. `test/dart/baseline.json` is exact: a new category, a changed count or a
missing one fails the gate.

Analyzer-clean output is not sufficient evidence for JS dispatch or local type
capture. `def_files/synthetic/runtime/` is the dart2js probe (`probe.d.ts`,
`probe.js`, `main.dart`, `main.expected`); extend it when you change how a
binding dispatches. For computed keys, never stringify a symbol expression;
retain it in IR and emit an explicit unsupported diagnostic.

`test:ui` accepts the same filters as the CLI — `pnpm test:ui type` opens the UI
scoped to the type tests. `test:stress` sets `DARTIFY_STRESS=1` inline, which is
POSIX-shell syntax; on Windows use `pnpm test:run test/stress.test.ts` with the
variable set separately.

`test:coverage` runs `vitest run --coverage` (v8) and writes to
`output/coverage/` (90.1% lines); no numeric threshold is enforced.

Test tiers: `simple` (sanity) · `smoke` (3 files, byte-exact snapshots) ·
`conformance` (90 js_facade_gen cases + the h3 golden, in the default suite) ·
`test:s2` (link corpus) · `test:s3` (declaration-fidelity census) · `test:s4`
(semantic contract + backend behaviour) · `test:s5:fixture` (multi-file
golden) · `test:dart` (analyzer + dart2js, opt-in locally, CI) · `stress`
(1,654-file corpus, opt-in; fails on throws, returned errors and
`// ERROR emitting` markers). Stress's 719 empty outputs are files with no
declarations a single-file run can bind (barrels and comment-only files).

Current gates: 294 passed / 6 skipped; S2 2/2, S3 1/1, S4 53/53, S5 fixture
3/3, Dart gate 2/2, conformance 67/90 parity + 16 improved + 2 differ + 5 out
of scope, h3 golden 63/63, stress 1,655/1,655 (the runtime probe is the 1,655th file). The protected S3 input floor
remains 2,530 declarations.

The conformance ledger changes only deliberately: the test fails both when a
parity case regresses and when a non-parity case starts matching. Promote it
in `ledger.json` with the reason removed.

Useful corpora in `def_files/` (1,654 `.d.ts` files, not shipped to npm):

| Path | Why |
|---|---|
| `h3/h3.d.ts` | **the motivating use case, not a demo** — see below |
| `leaflet/*.d.ts` | namespaces + qualified names — exercises `L-02` |
| `three/src/Three.Core.d.ts` | 420-file transitive resolution, ~5 s |
| `legacy_tests/*.d.ts` | the `js_facade_gen` conformance fixtures |
| `synthetic/probe.d.ts` | **hand-written.** One run reproduces ~16 findings |
| `synthetic/s3-complete.d.ts` | executable declaration-IR fidelity contract |
| `synthetic/s5_emitter/*.d.ts` | multi-file S5 Dart/CLI golden |
| `synthetic/runtime/` | dart2js runtime probe used by `pnpm test:dart` |
| `h3/h3_web.golden.dart` | js_facade_gen output shipped in h3 — the real-consumer golden |

## Architecture

```
cli.ts → transpiler.ts
           ├ PHASE 1  phase/symbolGeneration.ts  → parser/* → IR → SymbolTable
           ├ PHASE 2  semantic/* + linkerPhase.ts → canonicalizes/merges/names,
           │                                        mints aliases, links dep graph
           └ PHASE 3  phase/emitterPhase.ts      → Backend (emitter/backend.ts)
                                                     → emitter/packagejs/* → .dart

Transpiler seams:  analyze()   phases 1-2, returns AnalysisReport, no emission
                   analyzeProgram()  + the owned LinkedProgram backends consume
                   render()    + phase 3, returns Map<path, RenderedFile>
                   transpile()  + writes to disk
                   static transpileFromString()  one virtual file → string

tools/graph.ts and tools/ir.ts consume phase output; they are NOT part of the
shipped bundle.

Backend (emitter/packagejs): program.ts indexes the LinkedProgram; library.ts
plans imports and allocates support-typedef names *after* the whole library is
rendered (emission writes placeholder tokens); types.ts lowers IRType;
declarations.ts lowers declarations; index.ts renders all libraries and
resolves barrel export ambiguity. v2 adds a second Backend, not a second
compiler.
src/ir/visit.ts is the live recursive IR walker used by generation and aliases.
```

FQN scheme: `<abs file path>::<scope|segments|>Name`. `::` splits physical from
logical; `|` splits scope segments. Anonymous hoisted types become
`<file>::Anon_<sanitised scope>`.

This replaced a 5-pass architecture. Its orphaned `passes/**` and
`transformers/**` directories were deleted in S4; the original implementation
remains in `docs/history/legacy/` as a deliberate historical exhibit.

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
  before S1.** Its bytes changed deliberately in S5 (dartdoc, named unions,
  `CoordIJ` instead of `Anon_h3_CoordIJ`, getter-only consts), and
  `test/conformance/h3-golden.test.ts` now proves all 63 declarations of the
  js_facade_gen bindings h3 ships are reproduced. Treat that as a floor you
  must not break, never as evidence anything works.
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
- **`docs/history/legacy/` is the author's original 3-day implementation.**
  Moved out of `src/` in S6.8; it is not built or type-checked, and is kept as
  an architectural exhibit. Do not "clean it up".
- **The dependency graph is deliberate tooling, not cruft** — it is how linker
  regressions get spotted. It lives in `tools/graph.ts` and must stay out of
  `src/`: when it was imported from `linkerPhase`, the `@viz-js/viz`
  devDependency it pulls in was **95% of the shipped bundle** (`D-07`).
  Instruments consume phase output; they are never steps inside it.
- **h3 passing is necessary but NOT sufficient — it is the easiest file in the
  corpus.** `h3.d.ts` has 0 `extends`, 0 `implements`, 0 generics, 0
  `interface`s, and is a single file, so generics, heritage and cross-file
  imports are structurally invisible from it. Never conclude the emitter works
  because h3 looks right — `pnpm test:dart` covers leaflet (92 `extends`, 15
  namespaces) and three.js (420 files); run it.
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
- **"Nothing throws" is a much weaker guarantee than it sounds.** The backend
  wraps each declaration in a `try/catch` that turns a thrown error into a
  `// ERROR emitting ...` comment plus an `EMIT_ERROR` diagnostic. The stress
  tier asserts on the output (no markers, no returned errors), not merely on
  the absence of an exception. Keep it that way when you add tiers.
- **The Dart 3.13 analyzer crashes on two shapes dartify must never emit**
  (`E-37`): a type-parameter bound naming a `dynamic` typedef, and a `dynamic`
  typedef instantiated with a generic function's own type parameter. Bounds are
  therefore emitted only when class-like, and dynamic-like aliases drop their
  arguments. If `dart analyze` prints a stack trace, look here first.
- **TypeScript checks overrides structurally; Dart checks them nominally.**
  Most of the S5 override machinery (`provableSubtype`, the inherited-member
  chain, `covariant`, parameter padding) exists because three.js narrows
  members to structurally compatible but nominally unrelated types. An override
  must be provable against *every* overridden declaration, not only the
  nearest one.
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
