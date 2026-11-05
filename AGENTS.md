# Repository Guidelines

`dartify` (published as `dart_bindgen`) converts TypeScript `.d.ts` files into Dart `package:js` bindings. Its live
pipeline is `src/cli.ts` → `src/transpiler.ts` → symbol generation, semantic linking and emission in
`src/engine/phase/`; the `package:js` backend lives in `src/engine/emitter/packagejs/` behind the `Backend` seam in
`src/engine/emitter/backend.ts`.

## Source of truth

This repository follows **D3** (docs-driven development). `docs/` is authoritative and the only shared state:

- `docs/README.md` — index; `docs/architecture.md` — components, flow, invariants;
- `docs/decisions.md` — the decision list (`D-NN`); don't contradict a decision, propose a superseding one;
- `docs/process.md` — roles, guardrails (including coding style and testing conventions), the merge gate and test
  tiers; `docs/roadmap.md` — status;
- `docs/hardening/` — the hardening gate: findings register, `HD-NN` decisions, `HG-N` briefs, imported audits.
  `docs/hardening/stage-register/` is the pre-D3 per-area audit; its `D-nn` / `I-nn` are **finding** IDs, not
  decisions or issues (D-17).

`CLAUDE.md` holds the commands and the gotchas every session must see; read it too.

## Codex in this repository

- **Outside auditor:** audits work only inside the git-ignored `/audit/` folder (reports, logs, reproducers, fixtures,
  build trees), from a request written by `/d3-audit request`. Nothing there is committed; the planner verifies and
  imports findings with `/d3-audit intake`.
- **Architect:** design dossiers go into the git-ignored `/dossier/`.
- **Small standalone changes** (`$d3-change`) only when the user asks, following `docs/process.md`, and never while an
  implementer round is open.
- No commits or pushes unless the user explicitly asks; no AI attribution anywhere (D-04). Commit messages follow
  Conventional Commits and cite finding IDs (`fix(E-32): …`, D-17).

## Rules that are easy to miss

- `def_files/` is third-party and synthetic fixture data: read-only except deliberate synthetic cases.
- `tools/graph.ts` and `tools/ir.ts` stay outside the shipped pipeline (D-13); `docs/history/legacy/` is an exhibit
  (D-29).
- Never silently degrade unsupported types: preserve their source and use named, documented aliases (D-09, D-10).
- Generated output must pass `pnpm test:dart` at the exact baseline (D-14); `pnpm exec tsc --noEmit` stays at 0 errors.
- The next release is `1.0.0`; intermediate 0.x releases and a primary `dart:js_interop` backend are out of scope
  (D-05, D-07).
