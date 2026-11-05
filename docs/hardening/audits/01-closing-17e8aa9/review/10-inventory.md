# 10 — Inventory and necessity (pass 1)

Commit `17e8aa9`. Method: `git ls-files` plus line counts, reachability traced by reading imports from `src/cli.ts` and the built bundle (`pnpm build`, `npm pack --dry-run`). Evidence tags: **[static]** = read, **[runtime]** = executed.

## Components

| Component | Files / lines | Purpose | Consumers | Reachable from shipped CLI | Verdict |
|---|---|---|---|---|---|
| `src/cli.ts` | 1 / 285 | yargs CLI, glob expansion, watch loop | `bin` → `dist/cli.js` | entry | Needed [runtime] |
| `src/transpiler.ts` | 1 / 837 | Run orchestration, resolution run, public API seams | CLI, watch, tools, tests | yes | Needed [static] |
| `src/watch.ts` | 1 / 597 | Incremental `WatchSession` | CLI `-w` (dynamic import → `dist/watch-*.js`), `tools/bench.ts`, tests | yes (lazy chunk) | Needed [runtime] |
| `src/engine/phase/*` | 3 / 1,234 | Generation, linking, emission phases | transpiler, watch | yes | Needed |
| `src/engine/semantic/*` | 6 / 1,637 | Merge, naming, canonicalisation | linker, watch | yes | Needed |
| `src/engine/alias/*` | 3 / 450 | Minted degradation typedefs | semantic pass | yes | Needed. A second degradation mechanism lives in the backend (`types.ts fallback()`); both are live, and minted aliases cover `Unsupported` IR nodes |
| `src/engine/emitter/backend.ts` | 1 / 76 | `Backend` seam (v2 hook) | emitterPhase | yes | Needed |
| `src/engine/emitter/packagejs/*` | 8 / 3,805 | v1 `package:js` backend | emitterPhase, watch | yes | Needed. `browserTypes.ts` (535) is generated data |
| `src/engine/parser/**` | 26 / 2,165 | ts-morph AST → IR | generation | yes | Needed. `TypeParser` is a stateless singleton (not run state) |
| `src/ir/**` | 13 / 579 | IR types, clone, visitor | everything | yes | Needed |
| `src/symbol/**` | 6 / 640 | FQNs, table, resolver, module exports | linker, watch | yes | Needed |
| `src/resolution/**` | 3 / 157 | Module host, stdlib predicate, types | transpiler, parser | yes | Needed |
| `src/reporting/linker.ts` | 1 / 144 | CLI report formatting | CLI | yes | Needed |
| `tools/graph.ts`, `graphModel.ts`, `ir.ts`, `bench.ts` | 4 / 354 | Instruments (`pnpm graph`, `ir`, `bench`) | developers | **no** (no `src` import; bundle has 0 Viz/graphology matches) [runtime] | Needed as tooling; correctly outside the bundle (`D-07` holds) |
| `docs/history/legacy/**` | 3 / ~2,400 | Historical exhibit | none | no (not in `tsconfig` include or package `files`) | Keep (owner decision, documented) |
| `test/**` | 54 / 5,604 (+4 snapshots / 5,501) | Tiers: unit, smoke, conformance, h3 golden, s2–s5, dart, e2e, incremental, stress | `pnpm` scripts, CI | n/a | Needed |
| `def_files/**` | 1,678 files (1,661 `.d.ts`) | Third-party and synthetic corpora, goldens, runtime probe | tests | not shipped | Needed. Count differs from docs (CA-21) |
| Root docs (10) | 2,052 lines | README, ROADMAP, CHANGELOG, PLAN, PRE_STAGE5_PLAN, STAGE4_PLAN, CLAUDE, AGENTS, CONTRIBUTING, Tasks | humans, agents | README shipped | See pass 2 |
| `audit/*.md` | 13 / 4,807 | Finding registry and area audits | maintainers | no | Needed. Integrity issue CA-22 |

## Scripts (`package.json`)

All 27 scripts were checked for targets that exist. `dev`, `graph`, `ir`, `bench`, `build`, `test*`, `fixture:s5`, `test:cli` and `clean` all resolve. Runtime results for the gates are in `logs/gates.txt`. `test:debug` passes `--no-coverage`, which is valid for Vitest 3 [static].

## Dependencies

| Dependency | Kind | Consumer | Needed |
|---|---|---|---|
| `ts-morph ^28` | prod | parser, resolution | yes |
| `yargs ^18` | prod | CLI, tools | yes |
| `fast-glob ^3` | prod | CLI, tools, tests | yes |
| `@viz-js/viz` | dev | `tools/graph.ts` only | yes (tooling) |
| `h3-js`, `three`, `leaflet`, `jsdom` | dev | `test:e2e` | yes |
| `@vitest/coverage-v8`, `@vitest/ui`, `vitest`, `vite-tsconfig-paths` | dev | tests | yes; versions carry advisories (CA-19) |
| `tsup`, `tsx`, `typescript`, `@types/*` | dev | build, dev runs | yes |

## Configuration

`tsconfig.json` (path aliases `@/`, `@engine/`, `@ir/`, `@parser/`, `@typeParser/`, `@emitter/`), `vitest.config.ts`, `.gitignore`, `pnpm-workspace.yaml` and `.github/workflows/ci.yml` were all read [static]. No `.npmrc`, `.env`, Dockerfile or service configuration exists. The project has no services.

## Cleanup recommendations

None are made. Every component has a traced consumer. The two degradation mechanisms (alias registry vs backend `fallback()`) overlap in purpose but cover different IR shapes. Whether to consolidate them is left to the owner.

## Coverage of this pass

| Planned | Achieved |
|---|---|
| All tracked non-fixture files classified | 157 files listed with line counts (`git ls-files`), all classified above |
| Reachability of tools and legacy code | Verified: bundle grep, `src` import grep, `npm pack` file list |
