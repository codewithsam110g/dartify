# Decisions (master list)

This is the single authoritative list of project decisions. Each entry is one or two lines. Longer reasoning lives in
an ADR or a linked doc.

**Rules**

- IDs are `D-NN`, assigned in order and never reused or renumbered.
- A decision is changed only by adding a new entry that **supersedes** it. The old entry stays, its text prefixed with
  *Superseded by D-NN.* (or *Refined by D-NN.* when the new one narrows rather than replaces it).
- Status is one of:
  - `Accepted`
  - `Observed` — recorded from an existing codebase by `/d3-adopt`; binding as a description of what is, but the user
    hasn't chosen it yet. Confirming it makes it `Accepted`; rejecting it needs a superseding decision and a brief.
  - `Deferred` — decided *not now*, with a trigger for revisiting.
  - `Pending` — an open question, with the milestone that owns it.
- Code, docs and briefs refer to decisions by ID ("per D-09"). Code comments cite only decision IDs, never brief or
  finding IDs, which are temporary.
- Implementers never edit this file. They propose decisions in their report; the planner writes them after the user
  agrees.
- **ID namespaces (D-17).** The pre-D3 stage register uses `D-01`–`D-07` and `I-01`–`I-15` as *finding* IDs (dead code,
  IR). They keep their numbers, so `D-01`–`D-07` exist as both decisions and findings. Outside the stage register a bare
  `D-NN` / `I-NN` means a D3 decision / issue; a pre-D3 finding is written "finding `D-07`" wherever it could be read
  either way. Inside `hardening/stage-register/` the old meaning stands. Hardening decisions are `HD-NN`
  ([hardening/decisions.md](hardening/decisions.md)).

## Accepted

D-05–D-18 were the project's documented choices in `PLAN.md` / `CLAUDE.md` before adoption; D-19–D-29 were recorded
from the code as Observed and confirmed by the user at adoption (2026-11-05). Long-form reasoning for D-05–D-15 is in
[history/plan-s0-s6.md](history/plan-s0-s6.md).

| ID | Decision | Date | Ref |
|----|----------|------|-----|
| D-01 | Project name **dartify**, published to npm as **`dart_bindgen`**. Public GitHub repository `codewithsam110g/dartify`. Solo-developer project. | 2026-11-05 | `package.json` |
| D-02 | License: **Apache-2.0**. | 2026-11-05 | `LICENSE` |
| D-03 | Process: **D3** (docs-driven development) with a planner/implementer loop, per `docs/process.md`. | 2026-11-05 | [process.md](process.md) |
| D-04 | **No commits by implementation agents.** The planner commits verified checkpoints after review. **No AI attribution** in commits, PRs, code or docs. | 2026-11-05 | [process.md](process.md) |
| D-05 | *Refined by D-31.* **v1 is a drop-in replacement for the archived `dart-lang/js_facade_gen`, targeting `package:js`.** Deliberate: existing users' `package:js` / `dart:html` dependencies extend past the generated bindings, so swapping the tool is near-zero friction where a migration is a project. v1 also emits the `dart:html` / `dart:typed_data` substitution imports js_facade_gen produced. Do not propose migrating the primary backend to `dart:js_interop`. The README states the `package:js` target explicitly. | 2026-11-05 | [history/plan-s0-s6.md](history/plan-s0-s6.md) "Product direction" |
| D-06 | **v2 adds a `dart:js_interop` backend behind a CLI flag** — a second `Backend` (`src/engine/emitter/backend.ts`) consuming the same owned `LinkedProgram`, not a second compiler. Platform types map to `package:web` instead of `dart:html`. | 2026-11-05 | [roadmap.md](roadmap.md) |
| D-07 | **Versioning: the next published version is `1.0.0`.** No 0.6/0.7/0.8/0.9 (that ladder was drawn against the deleted 5-pass architecture and is void); no intermediate point releases. Optional `1.0.0-beta.n` under the npm `next` tag before the `latest` promotion. After v1: `2.0.0` (D-06). `0.5.0` stays on `main` until v1 replaces it wholesale. | 2026-11-05 | [history/plan-s0-s6.md](history/plan-s0-s6.md) "Release policy" |
| D-08 | **The input contract is declaration files**, not arbitrary executable `.ts`: ambient/exported declarations, declaration merging, module/global augmentation and type syntax. No function-body, statement, implementation-inference or general expression lowering. | 2026-11-05 | |
| D-09 | **Never degrade silently.** Every unrepresentable construct survives into the output with its origin visible, and unsupported cases get a diagnostic. | 2026-11-05 | design principle 1 |
| D-10 | **Degrade to a *named* type, never bare `dynamic`** (`E-16`): mint a documented `typedef KeyOfBoxString = dynamic;` stated once, and use the name at every use site. | 2026-11-05 | design principle 2 |
| D-11 | **The IR is the contract**: anything not captured at parse time is unrecoverable. IR nodes retain the source `name`; output identity lives in `dartName` / `jsName` and reference `resolvedDartName`. Never recover a JS spelling by splitting a Dart identifier. | 2026-11-05 | design principle 3 |
| D-12 | **The linker owns cross-declaration semantics** (overloads, augmentation, renaming, imports). Linking returns an owned `LinkedProgram` that backends consume explicitly. | 2026-11-05 | design principle 4 |
| D-13 | **Instruments are not pipeline stages.** The dependency graph, IR dumps and diagnostics consume phase output and live outside the shipped entry graph (`tools/graph.ts`, `tools/ir.ts`). When the graph was imported from `linkerPhase`, `@viz-js/viz` was 95% of the bundle (finding `D-07`). | 2026-11-05 | design principle 5 |
| D-14 | **`dart analyze` is the v1 acceptance test**, gated by an exact categorized census (`test/dart/baseline.json`): a new category, changed count or missing one fails. Analyzer-clean is **not** "works": dispatch and local type capture are proven by the dart2js runtime probe (`def_files/synthetic/runtime/`) and the e2e suite against the real npm packages. | 2026-11-05 | [history/plan-s0-s6.md](history/plan-s0-s6.md) "The v1 acceptance test" |
| D-15 | **h3 is the real consumer and gate.** The author maintains uber/h3's Dart bindings, generated by js_facade_gen; `def_files/h3/h3.d.ts` is the motivating input and `h3_web.golden.dart` (63/63 declarations reproduced) is a floor that must not break — never evidence that anything else works (h3 has no `extends`, `implements`, generics, interfaces or cross-file imports). | 2026-11-05 | [architecture.md](architecture.md) "Purpose" |
| D-16 | **Watch mode output equals a cold build, byte for byte.** When unsure, invalidate more. Every new invalidation shortcut needs a differential edit in `test/watch-differential.test.ts`; heritage and structural-shape changes re-render everything. | 2026-11-05 | |
| D-17 | **Finding IDs are stable**: never renumbered or deleted (renumbering was considered at adoption and rejected: hundreds of commit messages, the CHANGELOG, tests and both release audits cite them, and history can't be rewritten); resolved ones are marked `[FIXED]`. Commit messages and PR text cite them. Pre-D3 finding prefixes (`R P T I L E D X W CA DAR`) coexist with D3's `D-NN` / `I-NN` as described under Rules above. | 2026-11-05 | [hardening/stage-register/README.md](hardening/stage-register/README.md) |
| D-18 | **Branches:** `refactor/orchestration` is the working branch (broken states between briefs are fine); `main` is what ships to npm and is touched only at a release. | 2026-11-05 | [process.md](process.md) |
| D-19 | **Three-phase pipeline**: symbol generation (`phase/symbolGeneration.ts` → `parser/*` → IR → `SymbolTable`) → semantic + linker (`semantic/*`, `linkerPhase.ts`) → emission (`phase/emitterPhase.ts` → `Backend`). `Transpiler` seams: `analyze()`, `analyzeProgram()`, `render()`, `transpile()`, static `transpileFromString()`. | 2026-11-05 | `src/transpiler.ts` |
| D-20 | **Run-owned compiler state** (task 4.11): each `Transpiler` call owns its project, resolution accumulators, symbol table, namespace aliases and diagnostics. No singleton, broad mutable `CompilationContext` or serialization lock; phases get narrow dependencies; generation diagnostics are returned, never logged through global state. The immutable parser `ParseContext` is unrelated and stays. | 2026-11-05 | [milestones/S4-pre-s5-barrier.md](milestones/S4-pre-s5-barrier.md) |
| D-21 | **FQN scheme**: `<abs file path>::<scope|segments|>Name`; `::` splits physical from logical, `|` splits scope segments; anonymous hoisted types are `<file>::Anon_<sanitised scope>`, marked explicitly (provenance is never inferred from the `Anon_` prefix). | 2026-11-05 | `src/symbol/fqn.ts` |
| D-22 | *Refined by HD-10* (a committed validator). **Platform types** come from `src/engine/emitter/packagejs/browserTypes.ts`, a port of js_facade_gen's `lib/dart_libraries_for_browser_types.ts` validated against Dart SDK 3.13 (500 of 633 entries kept). It is generated: regenerate and re-validate, never hand-edit. Entries match checker-confirmed `IRType.host` identity (`I-15`), never a leaf spelling. `Partial`/`Required`/`Readonly`/`NonNullable` lower to their argument; every other unmapped host type is a named `dynamic` typedef (`E-36`). | 2026-11-05 | `browserTypes.ts` |
| D-23 | **Never emit the two shapes that crash the Dart 3.13 analyzer** (`E-37`): a type-parameter bound naming a `dynamic` typedef, and a `dynamic` typedef instantiated with a generic function's own type parameter. Bounds are emitted only when class-like; dynamic-like aliases drop their arguments. | 2026-11-05 | |
| D-24 | **Overrides must be provable against every overridden declaration**, not only the nearest (TypeScript checks structurally, Dart nominally): `provableSubtype`, the inherited-member chain, `covariant` and parameter padding. | 2026-11-05 | `src/engine/emitter/packagejs/` |
| D-25 | **Computed / symbol keys** are retained in the IR and emitted as an explicit unsupported diagnostic; a symbol expression is never stringified. | 2026-11-05 | |
| D-26 | **Emission errors are contained and visible**: each declaration is wrapped in a `try/catch` that produces a `// ERROR emitting …` marker plus an `EMIT_ERROR` diagnostic. The stress tier asserts on output (no markers, no returned errors), not merely on the absence of an exception; new tiers do the same. | 2026-11-05 | `test/stress.test.ts` |
| D-27 | **Reference ledgers change only deliberately.** `test/conformance/ledger.json` fails both when a parity case regresses and when a non-parity case starts matching (promote it with the reason removed); `test/dart/baseline.json` is exact. | 2026-11-05 | `test/conformance/` |
| D-28 | **Toolchain**: pnpm (`packageManager` pinned, `pnpm-lock.yaml`); Node `^20.19.0 \|\| ^22.12.0 \|\| >=23` (floor set by `yargs@18`); ESM bundle via tsup; `ts-morph` ≥ 28 (tuple `OptionalTypeNode`, `T-10`). Generated `*.dart` is git-ignored; hand-written Dart under `def_files/**` and `test/**` is allow-listed (`X-16`). | 2026-11-05 | `package.json`, `.gitignore` |
| D-29 | **`docs/history/legacy/`** is the author's original 3-day implementation, kept as an architectural exhibit: not built, not type-checked, not to be "cleaned up". | 2026-11-05 | [history/README.md](history/README.md) |
| D-30 | **Hardening before release and v2.** Every verified finding of the v1 release audits (the 48 of the combined master report) and the open pre-D3 findings go through the hardening gate ([hardening/](hardening/README.md)) before the `1.0.0` publish; v2 starts after the publish. A finding that turns out impractical to fix is closed only by an explicit HD decision (Won't fix / known issue), never by omission. | 2026-11-05 | [roadmap.md](roadmap.md) |
| D-31 | **Refines D-05: js_facade_gen parity is a floor, not the goal.** dartify's aim is type safety and a better developer experience instead of `dynamic` everywhere. Output matches js_facade_gen where that serves users and may be better where it can (named types, correct dispatch, typed interop). Every departure is deliberate: recorded in `test/conformance/ledger.json` (D-27) or, for a design-level one, in an HD. Command-line parity is best effort (HD-07). | 2026-11-05 | [hardening/decisions.md](hardening/decisions.md) HD-02, HD-07 |

## Deferred

| ID | Decision | Revisit when | Ref |
|----|----------|--------------|-----|

## Pending

| ID | Question | Owner milestone | Notes |
|----|----------|-----------------|-------|
