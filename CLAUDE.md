# CLAUDE.md: dartify

`dartify` (npm: `dart_bindgen`) — a TypeScript `.d.ts` → Dart JS-interop binding generator built on `ts-morph`.
Solo-developer project. v1 is a drop-in replacement for the archived `dart-lang/js_facade_gen`, targeting
`package:js`; the next published version is `1.0.0`. Written by an h3 maintainer to replace the archived tool h3
itself depends on.

## Source of truth

`docs/` is authoritative. Read `docs/architecture.md` and `docs/decisions.md` before any change; `docs/README.md` is the
index (reference data, corpora). Refer to decisions by ID (`D-NN`). Don't contradict a decision; propose a superseding
one instead. `D-01`–`D-07` and `I-01`–`I-15` also exist as pre-D3 **finding** IDs in
`docs/hardening/stage-register/`; outside it a bare `D-NN` / `I-NN` is a decision / issue (D-17).

**Where things stand:** S0–S6 and the post-S6 watch/e2e work are done. Next is the **hardening gate** (HG): every
verified finding of the v1 release audits (48: 3 high, 26 medium, 19 low) is fixed or explicitly decided before the
`1.0.0` publish; v2 starts after the publish (D-30). Status: `docs/roadmap.md`; register:
`docs/hardening/findings.md`. Do not re-derive findings from scratch; a new defect gets a new ID in the register, not
only a mention in chat.

## Non-negotiables

- v1 targets `package:js`. Do not suggest migrating the primary backend to `dart:js_interop`; that is v2, a second
  `Backend` behind a CLI flag (D-05, D-06).
- The next published version is `1.0.0`; no intermediate point releases (D-07).
- Input is declaration files only — no function-body, statement or expression lowering (D-08).
- Never degrade silently; degrade to a *named*, documented typedef, never bare `dynamic` (D-09, D-10).
- The IR is the contract; never recover a JS spelling by splitting a Dart identifier (D-11).
- Run-owned state: never reintroduce a singleton, broad mutable `CompilationContext` or serialization lock (D-20).
- Instruments (`tools/graph.ts`, `tools/ir.ts`) never sit inside the pipeline or the shipped bundle (D-13).
- `dart analyze` is the acceptance test, and analyzer-clean is not "works" (D-14). Watch output equals a cold build
  byte for byte (D-16).
- Finding IDs are never renumbered or deleted; commits cite them (D-17).
- No commits by implementation agents. No AI attribution anywhere (D-04).

## Process

D3: planner/implementer loop per `docs/process.md`. The implementer builds only what the current brief in
`docs/milestones/` (or `docs/hardening/milestones/` for HG briefs) lists and proposes everything else. Keep the
registers current in the same change as the code: the finding's row in `docs/hardening/findings.md` (and, for a pre-D3
ID, `docs/hardening/stage-register/FINDINGS.md` plus its area file), `docs/roadmap.md`, `CHANGELOG.md`. When an entry
under "Non-obvious things" stops being true, remove it — a stale warning is worse than none. Scratch files go in the
session scratchpad, never in the repo. `refactor/orchestration` is the working branch; `main` is what ships (D-18).

## Commands

Use `pnpm` (D-28), and prefer the existing scripts over ad-hoc `npx` invocations.

```bash
pnpm test                           # one-shot suite (test:run is the same)
pnpm test:watch                     # watch mode
pnpm test:ui                        # browser UI at localhost:51204/__vitest__/ (accepts CLI filters: `pnpm test:ui type`)
pnpm test:update                    # accept snapshot changes (vitest run -u) — inspect Dart diffs first
pnpm test:stress                    # opt-in full 1,654-file corpus, ~6–8 min (POSIX env syntax; see process.md for Windows)
pnpm test:dart                      # dart analyze baseline + dart2js runtime probe (needs Dart)
pnpm test:e2e                       # generated bindings run against real h3-js/three/leaflet (needs Dart)
pnpm test:incremental               # watch-mode differential suite incl. three.js (~40 s)
pnpm bench                          # watch rebuild latency, every build verified vs a cold one
pnpm test:s2                        # opt-in linker corpus gate
pnpm test:s3                        # opt-in declaration-fidelity census
pnpm test:s4                        # focused semantic + emitter-adapter gate
pnpm test:s5:fixture                # multi-file Dart + verbose CLI golden
pnpm test:coverage                  # v8 coverage to output/coverage/, no threshold
pnpm fixture:s5                     # emit it to output/s5_emitter/ with -lv
pnpm exec tsc --noEmit              # typecheck — must stay at 0 errors
pnpm dev -d "<glob>" -o <outdir>    # run the CLI from source
pnpm dev -d "<file>" -o <out> -l    # phase + module-resolution logs
pnpm dev -d "<file>" -o <out> -lv   # + detailed structured linker report
pnpm dev -d "<glob>" -o <out> -w    # watch mode: incremental rebuild on change
pnpm dev -d "<glob>" -o <out> --js-root THREE  # bind module globals under THREE.*
pnpm graph -d "<glob>" -o g.svg     # dependency graph SVG (internal tooling)
pnpm ir -d "<glob>" -o ir.json      # linked IR as JSON (internal tooling)
pnpm build                          # tsup → dist/
```

The merge gate, the test tiers and the current gate counts are in `docs/process.md` → Verification. A single generated
file can be checked with `docs/procedures/dart-analyze-single-file.md`. Today h3, complete Leaflet, the S5 fixture,
synthetic and legacy fixtures, all 90 conformance cases and all 420 three.js libraries have zero analyzer errors and
zero warnings; the only output is `dart:html`/`dart:svg` deprecation info.

## Non-obvious things that will bite you

- **`src/ir/visit.ts` is the live IR walker**; the obsolete transformer walker and `passes/**`/`transformers/**` are
  gone. `src/engine/semantic/shape.ts` provides metadata-free structural identity and same-file canonicalization.
- **Semantic names do not overwrite source names** (D-11): `name` stays; `dartName`/`jsName`/`resolvedDartName` carry
  output identity.
- **`docs/history/legacy/` is an exhibit** — do not "clean it up" (D-29).
- **h3 passing is necessary but NOT sufficient — it is the easiest file in the corpus** (D-15): 0 `extends`, 0
  `implements`, 0 generics, 0 interfaces, single file. Never conclude the emitter works because h3 looks right — run
  `pnpm test:dart` (Leaflet: 92 `extends`, 15 namespaces; three.js: 420 files).
- **`T-10` is resolved upstream in ts-morph 28.0.0** (the author filed it); the repo was pinned at `^26.0.0`, which is
  why it still looked broken until S1.4. "The tuple wrapper" is about **optional** members (`OptionalTypeNode`), not
  rest — `RestTypeNode` was already wrapped at 26 (D-28).
- **The old three.js "0 broken links" result is historical, not a baseline.** S2 removed the fuzzy fallback. Today:
  8,184 resolved edges, 0 ambiguous, 31 honest misses from the absent `webxr` and `@webgpu/types` packages. Don't make
  that report artificially green; provide the packages or keep the explicit failures. Leaflet: 1,050/1,050.
- **The type checker is available and cheap — use it before declaring something unrepresentable.** `T-14`: `typeof x`
  was written off from syntax and turned out 87% resolvable (`export const NearestFilter: 1003`); all 449 three.js
  `typeof` nodes cost ~60 ms. The question is never "can Dart represent this" but "can dartify *find out* what it means".
- **A finding's wording is not its defect class.** `T-05` was fixed exactly as worded while `ParenthesizedType` and
  `readonly` had the same bug (`T-17`). Before closing a finding, enumerate every site of the class (process.md
  guardrail 18).
- **"Nothing throws" is much weaker than it sounds** (D-26): per-declaration `try/catch` turns errors into
  `// ERROR emitting …` markers. Assert on output, never on the absence of an exception.
- **The Dart 3.13 analyzer crashes on two shapes** (`E-37`, D-23). If `dart analyze` prints a stack trace, look there.
- **TypeScript checks overrides structurally, Dart nominally** (D-24): the override machinery exists because three.js
  narrows members to structurally compatible but nominally unrelated types.
- **`dart analyze` clean is not "works"** (D-14): e2e found `E-42` (missing `L.` roots for `export as namespace`),
  `E-43` (structural assignability) and `E-44` (dart2js native-class conflicts). three.js must be generated with
  `--js-root THREE`; a bare-global `AudioContext` class breaks every dart2js program that imports it. For computed
  keys, never stringify a symbol expression (D-25). When you change dispatch, extend `def_files/synthetic/runtime/`.
- **Watch caches must never change output** (D-16): a new invalidation shortcut needs a differential edit in
  `test/watch-differential.test.ts`. When unsure, invalidate more.
- **`.gitignore` ignores generated `*.dart`** but tracks `def_files/**` and `test/**` Dart (`X-16`); a hand-written Dart
  fixture elsewhere must be allow-listed or it silently never reaches CI (D-28).
- **The conformance ledger and the analyzer baseline change only deliberately** (D-27): the conformance test fails
  both on a regression and when a non-parity case starts matching.
- **`browserTypes.ts` is generated** — regenerate and re-validate, never hand-edit (D-22).
