# Contributing to dart_bindgen

`dart_bindgen` is a TypeScript `.d.ts` to Dart `package:js` binding compiler.
The live architecture is a three-phase pipeline: symbol generation, semantic
linking, and emission. The obsolete five-pass implementation was deleted in S4.

## Start Here

Read `AGENTS.md` and `docs/process.md` (guardrails, coding style, the merge
gate) for repository conventions, then use these project records:

- `docs/README.md` — the project documentation index (the repository follows
  docs-driven development: `docs/` is authoritative).
- `docs/decisions.md` — the decisions every change must respect.
- `docs/roadmap.md` — milestone status; `ROADMAP.md` — concise public direction.
- `docs/hardening/findings.md` — open defects with stable IDs;
  `docs/hardening/stage-register/FINDINGS.md` — the full historical register.
- `docs/milestones/S4-semantic-layer.md` — the semantic contract.
- `def_files/js_facade_gen_test_cases.md` — reference-tool behavior.

S0–S6 are complete and the hardening gate before `1.0.0` is next
(`docs/roadmap.md`); the `package:js` backend lives in
`src/engine/emitter/packagejs/` behind the `Backend` seam. Do not reintroduce
output concerns into parsing or linking: a backend consumes the owned
`LinkedProgram` and nothing else.

## Development

Use Node `^22.12.0 || >=24` (the floor is set by D-32 and declared in
`engines`; `yargs@18`'s own floor is lower) and the pinned pnpm 10 toolchain:

```sh
pnpm install
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Stage gates are `pnpm test:s2`, `pnpm test:s3`, `pnpm test:s4`,
`pnpm test:s5:fixture` and `pnpm test:stress`. `pnpm test:dart` is the Dart
acceptance gate: it needs a Dart SDK on `PATH`, compares a categorized
`dart analyze` census with `test/dart/baseline.json`, and runs a dart2js
runtime probe; CI runs it on every push. Run the source CLI with
`pnpm dev -d "def_files/h3/h3.d.ts" -o output -lv`. The js_facade_gen
reference cases (`test/conformance/`) and the shipped h3 golden run in the
default suite; update `test/conformance/ledger.json` deliberately when a case
changes status.

## Change Requirements

- Write strict TypeScript with two-space indentation and ESM imports.
- Avoid `any`; narrow `unknown` or extend explicit IR types.
- Keep transformations deterministic and preserve unsupported source syntax.
- Keep compilation state run-owned. Do not add process-global phase state or a
  broad mutable context/service locator; pass narrow dependencies explicitly.
- Add focused semantic assertions and inspect generated Dart diffs.
- Update the finding's row in `docs/hardening/findings.md` (and, for a pre-D3 ID,
  `docs/hardening/stage-register/FINDINGS.md` and its area file) in the same commit.
- Never renumber finding IDs.
- Use scoped Conventional Commits such as `fix(P-13): ...` or
  `feat(linker): ...`, with validation recorded in the body.

The next release is v1.0.0. Intermediate 0.x releases and a primary
`dart:js_interop` backend are out of scope.
