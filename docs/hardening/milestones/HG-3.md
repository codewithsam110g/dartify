# HG-3 brief: module and export identity

**Status:** Approved (2026-11-06)
**Implementer:** a fresh `implementer` (Sonnet 5.5, xhigh) for Phase A; Phase B by the same agent or a fresh one, the
planner's call at the Phase A review.
**Branch:** `hg-3`, in a worktree the planner creates from `refactor/orchestration`.
**Decisions:** D-09, D-10, D-11, D-12, D-14, D-16, D-20, D-27, D-31, HD-05, HD-06, **HD-17**, **HD-18**, **HD-19**,
**HD-20** (agreed for this brief).
**Read first:** `docs/process.md` (guardrails 13–18 especially), this brief, `docs/hardening/decisions.md` (HD-05, HD-06,
HD-17–HD-20 — they are the spec, in detail), `docs/decisions.md` (D-09–D-12, D-14, D-16, D-27, D-31),
`docs/hardening/findings.md` (rows DAR-003, CA-03, DAR-004, CA-06, CA-07), and the finding records in
`docs/hardening/audits/01-closing-17e8aa9/review/findings.md` (CA-03, CA-06, CA-07) and
`docs/hardening/audits/02-release-17e8aa9/review/findings.md` (DAR-003, DAR-004: each has a "Minimal trigger").
**Reproducers (read-only, guardrail 11 lifted for these paths only):** `audit/10-closing-17e8aa9/fixtures/backend/`
`barrels/`, `ambient/`, `globalmerge/`, `audit/10-closing-17e8aa9/fixtures/runtime-ambient/`, and
`audit/10-release-17e8aa9/probes/outputs/` (`defaults/`, `reexport-alias/`, `reexport-chain/`, `namespace-export/`,
`export-consumers.json`, `compiler-oracles.json`). Turn them into tests and fixtures under `test/` or
`def_files/synthetic/`; never modify `/audit/`.
Code: `src/symbol/exports.ts` (module export records and resolution), `src/engine/phase/linkerPhase.ts` and
`src/engine/phase/emitterPhase.ts` (`LinkedProgram.moduleExports`, library inputs), `src/engine/emitter/backend.ts`,
`src/engine/emitter/packagejs/declarations.ts` (`jsPath`), `src/engine/emitter/packagejs/index.ts` (`reExports`,
`namespaceRoot`, library rendering), `src/engine/phase/symbolGeneration.ts` (where export records are collected);
Phase B adds `src/symbol/fqn.ts`, `src/symbol/resolve.ts`, `src/engine/semantic/merge.ts`, `src/watch.ts`.
Runtime probe: `def_files/synthetic/runtime/` and `test/dart/dart-gate.test.ts`.

## Outcome

Bindings call the JavaScript that actually exists. Under `--js-root` (or a UMD `export as namespace`), every value binds
to the path its package really exports it under, so default exports, `export =` modules, renamed and re-exported
declarations work at runtime instead of compiling and then throwing `NoSuchMethodError`. A barrel's Dart library exposes
the same public names as its TypeScript entry point, ambient `declare module "@scope/pkg"` declarations never crash
dart2js, and a global interface declared across several files becomes one Dart class. Anything dartify cannot express
is a counted, visible diagnostic — never a silent loss.

## Phase A: exports, dispatch, ambient modules (stop and report at its end)

| ID | Item |
|----|------|
| HG3-1 | **Export graph** (HD-17, HD-18; DAR-004). Resolve module exports over the whole export graph, not per file: named records resolve through barrel chains (`export { A } from "./b"` where `b` only `export *`s `a`), through import-then-export (`import { A } from "./a"; export { A }`, via the checker's alias target), `export { default as X }`, and local aliases (`export { hidden as publicName }`). From it, derive for each value its runtime export route(s) from the input files, and for each library the public names it exposes. Representation is yours (choose and justify in Deviations); it must be run-owned (D-20), deterministic, and correct under watch (D-16 — add differential edits for a re-export added, removed and renamed). Today's diagnostics for unresolvable records (`MODULE_EXPORT_UNRESOLVED`, `MODULE_EXPORT_TARGET_MISSING`) stay. |
| HG3-2 | **Dispatch follows the exports** (HD-17; DAR-003). Under a root, `@JS` paths come from HG3-1's routes, exactly per HD-17: `R.<export path>`; the input file's own default export → `R.default`; `export = x` → `x` is `R` and its merged namespace members bind `R.member`; first route in a deterministic order; several inputs combined, two different values at one path → counted diagnostic; a value with no runtime route keeps `R.<local name>` with a counted diagnostic; type-only exports (`export type`, interfaces) are not runtime routes. **Without a root, nothing changes.** UMD `export as namespace L` is a root as today (`namespaceRoot`). Before closing, enumerate every site that builds a JS path (guardrail 18), not only `jsPath`. |
| HG3-3 | **Public names in Dart** (HD-18; CA-03(c), DAR-004). Exactly per HD-18: alias-only exports emitted under the alias; an additional public name is a `typedef B<T> = A<T>;` (type parameters and bounds kept) for classes, interfaces, enums and type aliases, or a second `external` binding with the right `@JS` path for functions and variables (no tear-offs); `export { default as X }` gives `X`; a bare `default` keeps the local name; barrel libraries expose the TypeScript public names, not internal ones. Prove with **consumer** Dart files that import the barrel and use each public name (type, constructor, static member, function call), analyzed by the Dart gate — barrel syntax alone is not proof (DAR-004's falsification). |
| HG3-4 | **`export * as ns`** (HD-19; CA-03(b)). Exactly per HD-19: no re-export of `ns`; the barrel carries `// export * as ns from './m': import 'm.dart' as ns;` (the URI as emitted); `m.dart` is always emitted even when `ns` is its only route; a counted diagnostic gives the same import line; dispatch `R.ns.<name>` under a root. A barrel whose only content is namespace re-exports is still emitted (with the comments). |
| HG3-5 | **Import-then-export barrels** (CA-03(a)). `import { A } from "./a"; export { A };` emits the barrel library exposing `A`; today it emits nothing and says nothing. |
| HG3-6 | **Ambient modules** (HD-05, HD-20; CA-06). Exactly per HD-20: with `--js-root`, HD-17's rule; no root and a specifier that is a valid JavaScript property path (`h3`, `a.b`) → `<specifier>.<name>` as today (h3 must not change); no root and any other specifier → bare globals plus a counted diagnostic suggesting `--js-root`. No generated `@JS` string may ever contain a segment that is not a JavaScript identifier (assert this in a test over every corpus you generate in tests). External-module augmentations stay suppressed as today. |
| HG3-7 | **Diagnostics.** Every new loss or guess (no runtime route, path conflict, namespace re-export, ambient bare-global fallback) is a named diagnostic code counted in the default output's `Emission: N diagnostic(s)` line and itemized with `-lv` (the HG-2 reporting path, `src/reporting/run.ts`). List each code, its message and when it fires in the report. |
| HG3-8 | **Runtime probe** (guardrail 17, D-14). Extend `def_files/synthetic/runtime/` (or add a second rooted probe beside it, wired into `test/dart/dart-gate.test.ts`) so dart2js-compiled Dart proves each HD-17/HD-18/HD-20 case against JavaScript shaped like what TypeScript/bundlers produce: the input's default export under a root; `export =` function with a merged namespace; a local alias; a renamed re-export; `export { default as X }` through a barrel; a namespace re-export path (`R.ns.x`); an ambient `@scope/pkg` module without a root (bare global) and with a root. Each case prints a value that `main.expected` checks. |
| HG3-9 | **Phase A tests.** At least: DAR-003's minimal trigger (default named function under a root → `R.default`; `export = named` → root callable; `hidden as publicName` → `R.publicName`); DAR-004's trigger (chained barrel `export {A} from "./b"`; `export {A as B}`) with consumer files; CA-03's three forms; `export =` + merged namespace members; a value reachable by two routes (deterministic, order-independent: permute input order); two inputs exporting different values under one name (diagnostic); an unreachable value (diagnostic, keeps local path); type-only export not a route; no-root runs unchanged (a control on the S5 fixture and h3); CA-06's trigger compiles with dart2js; the "no invalid `@JS` segment" assertion. |

**Phase A report:** the usual format, plus every Dart change: snapshot, analyzer baseline (`test/dart/baseline.json`),
conformance ledger, h3 golden, and the three.js output under `--js-root THREE` — counted per corpus and per kind of
change (e.g. "41 `@JS` paths moved from `THREE.<local>` to `THREE.<public>`"), each kind explained by its HD. **h3 output
must be byte-identical.** Leaflet: report whether anything changed and why. three.js e2e must pass. Then stop.

## Phase B: cross-file global merging

| ID | Item |
|----|------|
| HG3-10 | **Global declarations merged across files** (HD-06; CA-07). Global declarations that TypeScript merges into one symbol across files (script-file declarations and `declare global` blocks) become **one** Dart class: owned by the first declaring file in the cold run's deterministic file order (inputs, then dependencies, each sorted), with the members of every part merged by the existing D-12 rules; other files emit no partial class and import the owner where they use it. No ambiguous link edge, no `dynamic` typedef, no partial duplicate. Ownership must be identical in watch mode: add differential edits for a third part added, the owner's part removed (ownership moves), and a member added to a non-owner part. |
| HG3-11 | **Phase B tests.** CA-07's trigger (`part1.d.ts` / `part2.d.ts`): one `Settings` class with both members, `configure(Settings settings)` typed, link report clean; three parts across three files; a merged interface plus a same-named `declare var` value; input order permuted → same output; watch differentials above. |

## Both phases

| ID | Item |
|----|------|
| HG3-12 | **Docs.** `README.md`: barrels and public names, `--js-root` semantics (dispatch follows the exports), `export * as ns` and the `import … as ns` idiom, ambient modules and when to pass `--js-root`, cross-file global merging. `docs/architecture.md` where a component's responsibility changed (the export graph's owner). `docs/process.md` → Verification counts. Conformance ledger (D-27) only deliberately, each case change explained. Propose `CHANGELOG.md` lines, including every user-visible output change. |

## Allowed dependencies

None new.

## Non-goals (binding)

- **Augmenting browser/lib types** (`interface Window { … }` in a user file): behaviour unchanged; report what happens
  today in Proposals. External-module augmentations stay suppressed.
- Name legality after allocation (`CA-04`, `CA-05`, `DAR-005`…: HG-6), text legality (`CA-32`…: HG-5), `Date` and type
  fidelity (HG-4), watch-root prefix and watch state (`CA-02`, `CA-15`: HG-7). Note anything you see in Proposals.
- No per-module root option beyond `--js-root` (HD-20 decided the no-root fallback).
- No new decisions: if an HD case proves unworkable, stop that item and report with evidence. No edits to
  `docs/decisions.md`, `docs/hardening/decisions.md`, `docs/hardening/findings.md`, `CHANGELOG.md`. No git operations.

## Acceptance

1. The gate in `docs/process.md` passes after each phase (`tsc`, `pnpm test`, S2–S5, `test:dart`, `test:incremental`,
   `test:e2e`, `pnpm build`); `pnpm test:stress` passes once at the end of Phase B.
2. Every HG3-9 / HG3-11 test exists and passes; the finding triggers are shown failing on `refactor/orchestration` (a
   representative few, via a temp copy, not git operations in the worktree).
3. The runtime probe (HG3-8) passes under dart2js and covers every listed case.
4. Every changed snapshot, baseline, ledger or golden hunk is accounted for in the report by kind and count; h3 is
   byte-identical; the Dart analyzer census stays at 0 errors / 0 warnings on every gated corpus.
5. By hand from the built CLI, quoted in the report: DAR-003's trigger with `--js-root Root` (the three `@JS` paths);
   DAR-004's chained and renamed barrels (the barrel library text); `export * as ns` (the comment and the default-output
   diagnostic count); CA-06's trigger without a root (bare globals, diagnostic) and with `--js-root PKG`; CA-07's trigger
   (Phase B: one class).

## History
