# Repository Guidelines

## Project Structure & Architecture

`dartify` (published as `dart_bindgen`) converts TypeScript `.d.ts` files into Dart `package:js` bindings. Its live pipeline is `src/cli.ts` → `src/transpiler.ts` → symbol generation, linker, and emission in `src/engine/phase/`. Parsers live in `src/engine/parser/`; models and resolution live in `src/ir/`, `src/symbol/`, and `src/resolution/`.

Tests are grouped in `test/type/`, `test/decl/`, and `test/linker/`; snapshots belong in `test/__snapshots__/`. `def_files/` contains third-party and synthetic fixtures; do not edit third-party data. Keep `tools/graph.ts` outside the shipped pipeline. `src/engine/{passes,transformers}/` is quarantined 5-pass code to mine during S4, while `src/legacy/` is a deliberate historical exhibit. Do not casually clean up these directories.

## Build, Test, and Development Commands

Use the pinned pnpm 10 toolchain.

- `pnpm install` installs locked dependencies.
- `pnpm dev -d "def_files/h3/h3.d.ts" -o output -lv` runs the source CLI with linker details.
- `pnpm build` bundles the Node 20 ESM CLI into `dist/`.
- `pnpm test` runs Vitest; `pnpm test:watch` watches changes.
- `pnpm exec tsc --noEmit` must report zero errors.
- `pnpm test:s2`, `pnpm test:s3`, and `pnpm test:stress` run opt-in corpus gates.
- `pnpm graph -d "<glob>" -o graph.svg` renders the dependency graph.
- `pnpm test:update` updates snapshots; inspect Dart diffs first.

Generated h3 output must pass `dart analyze`; also use Leaflet and three.js for cross-file, namespace, generic, and heritage behavior.

## Coding Style & Naming Conventions

Write strict TypeScript with two-space indentation and ESM imports. Avoid `any`; narrow `unknown` or extend explicit IR types. Prefer pure transformations, deterministic ordering, and immutable parse contexts. Use `camelCase` for values/functions/files and `PascalCase` for types/classes. Prefer aliases such as `@ir/*`. Comment why AST cases are special. Never silently degrade unsupported types: preserve their source and use named, documented aliases.

## Testing Guidelines

Name Vitest files `*.test.ts`. Add focused IR-boundary or linker assertions and minimal synthetic fixtures. Assert diagnostics and output, not merely that execution did not throw. No numeric coverage threshold is configured.

## Commits, Pull Requests, and Project Records

Follow Conventional Commits: `feat(ir): ...`, `fix(T-09): ...`, or `docs(plan): ...`. Keep commits scoped and reference finding IDs. PRs should explain behavior, link tasks, list validation commands, and show before/after Dart for emitter changes.

When addressing a finding, update `audit/FINDINGS.md` and its area file; never renumber IDs. Keep `PLAN.md` and `CLAUDE.md` current. The next release is v1.0.0; intermediate 0.x releases and a primary `dart:js_interop` backend are out of scope.
