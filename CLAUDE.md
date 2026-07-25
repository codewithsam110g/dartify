# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## What this is

`dartify` (npm: `dart_bindgen`) — a TypeScript `.d.ts` → Dart JS-interop binding
generator. Built on `ts-morph`. Solo-developer project.

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
| [`ROADMAP.md`](ROADMAP.md) | The public short version of the same thing |
| `def_files/js_facade_gen_test_cases.md` | ~120 input/output pairs from the reference tool — the de facto spec |

Do not re-derive findings from scratch. If you discover something new, add it to
the audit with a new ID rather than reporting it only in chat.

## Commands

Use `pnpm` — the repo has a `pnpm-lock.yaml` and `packageManager` pinned.

```bash
pnpm test                           # one-shot suite (test:run is the same)
pnpm test:watch                     # watch mode
pnpm test:ui                        # browser UI at localhost:51204/__vitest__/
pnpm test:update                    # accept snapshot changes (vitest run -u)
pnpm test:stress                    # opt-in full 1,649-file corpus, ~5.5 min
pnpm exec tsc --noEmit              # typecheck — must stay at 0 errors
pnpm dev -d "<glob>" -o <outdir>    # run the CLI from source
pnpm dev -d "<file>" -o <out> -l    # + verbose: resolution summary, linker report
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

Probe currently reports 19 errors, all of them known findings — `E-03` (type
params never emitted), `E-09` (keyword escaping), `L-05` (augmentation
duplicates). Check new errors against `audit/FINDINGS.md` before assuming
they're new.

`test:ui` accepts the same filters as the CLI — `pnpm test:ui type` opens the UI
scoped to the type tests. `test:stress` sets `DARTIFY_STRESS=1` inline, which is
POSIX-shell syntax; on Windows use `pnpm test:run test/stress.test.ts` with the
variable set separately.

Test tiers: `simple` (sanity) · `smoke` (3 files, byte-exact snapshots) ·
`stress` (whole corpus, opt-in, asserts only that nothing throws).

Useful corpora in `def_files/` (1,649 `.d.ts` files, not shipped to npm):

| Path | Why |
|---|---|
| `h3/h3.d.ts` | **the motivating use case, not a demo** — see below |
| `leaflet/*.d.ts` | namespaces + qualified names — exercises `L-02` |
| `three/src/Three.Core.d.ts` | 420-file transitive resolution, ~5 s |
| `legacy_tests/*.d.ts` | the `js_facade_gen` conformance fixtures |
| `synthetic/probe.d.ts` | **hand-written.** One run reproduces ~16 findings |

## Architecture

```
cli.ts → transpiler.ts
           ├ PHASE 1  phase/symbolGeneration.ts  → parser/* → IR → SymbolTable
           ├ PHASE 2  phase/linkerPhase.ts       → mints alias symbols, dep graph,
           │                                        (future) overloads + augmentation
           └ PHASE 3  phase/emitterPhase.ts      → emitter/old/* → .dart

Transpiler seams:  analyze()   phases 1-2, returns LinkReport, no emission
                   render()    + phase 3, returns Map<path, RenderedFile>
                   transpile()  + writes to disk
                   static transpileFromString()  one virtual file → string

tools/graph.ts consumes analyze(); it is NOT part of the shipped bundle.
```

FQN scheme: `<abs file path>::<scope|segments|>Name`. `::` splits physical from
logical; `|` splits scope segments. Anonymous hoisted types become
`<file>::Anon_<sanitised scope>`.

This replaced a 5-pass architecture. `src/engine/passes/**` and
`src/engine/transformers/**` are **orphaned** — see below.

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

- **~4,400 of ~9,100 `src` lines are dead.** `engine/passes/**` (880),
  `engine/transformers/**` (804), `legacy/**` (2,450), `log.ts` (251). The
  first two are excluded from `tsconfig` but still on disk; `legacy/**` is
  **not** excluded, so it is typechecked on every run.
  `ir/literal.ts` (44) is the awkward one: dead in effect but **imported by the
  live `ir/type.ts`**, so it cannot just be deleted — `IRType.objectLiteral`
  has to go first, and no parser has ever written it (`I-14`).
- **Do not delete `engine/transformers/**` yet.** It holds the overload grouper
  worth keeping and a recursive IR walker. Mine it during S4, then delete
  (`D-02`). There is a *second*, trivial grouper dead inside
  `emitter/old/class.ts` behind a commented-out block — mine both (`E-21`).
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
- **three.js reporting "0 broken links" is not proof multi-file works.** It
  passes because it is modern ESM with explicit `.js` extensions. Extensionless
  relative imports — most of DefinitelyTyped — silently resolve to nothing
  (`R-01`). And the linker's fuzzy name matcher masks a systematic wrong-file
  FQN bug (`L-01`).
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
