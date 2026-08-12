# Contributing to dart_bindgen

`dart_bindgen` is a TypeScript `.d.ts` to Dart `package:js` binding compiler.
The live architecture is a three-phase pipeline: symbol generation, semantic
linking, and emission. The obsolete five-pass implementation was deleted in S4.

## Start Here

Read `AGENTS.md` for repository conventions, then use these project records:

- `PLAN.md` — canonical S0-S6 implementation sequence.
- `STAGE4_PLAN.md` — implemented semantic contract and acceptance plan.
- `ROADMAP.md` — concise public direction.
- `audit/FINDINGS.md` — stable finding IDs and current status.
- `def_files/js_facade_gen_test_cases.md` — reference-tool behavior.

S0-S4 and the targeted post-S4 deep-review corrections are complete. The
line-by-line post-S4 audit is the next gate; S5 then rebuilds the `package:js`
backend over stable semantic identities. Do not reintroduce output concerns
into parsing or linking.

## Development

Use the pinned pnpm 10 toolchain:

```sh
pnpm install
pnpm test
pnpm exec tsc --noEmit
pnpm build
```

Stage gates are `pnpm test:s2`, `pnpm test:s3`, `pnpm test:s4`, and
`pnpm test:stress`. Run the
source CLI with `pnpm dev -d "def_files/h3/h3.d.ts" -o output -lv`. Generated
h3 bindings must remain `dart analyze` clean; use Leaflet and three.js for
multi-file and namespace behavior.

## Change Requirements

- Write strict TypeScript with two-space indentation and ESM imports.
- Avoid `any`; narrow `unknown` or extend explicit IR types.
- Keep transformations deterministic and preserve unsupported source syntax.
- Add focused semantic assertions and inspect generated Dart diffs.
- Update the finding's area file and `audit/FINDINGS.md` in the same commit.
- Never renumber finding IDs.
- Use scoped Conventional Commits such as `fix(P-13): ...` or
  `feat(linker): ...`, with validation recorded in the body.

The next release is v1.0.0. Intermediate 0.x releases and a primary
`dart:js_interop` backend are out of scope.
