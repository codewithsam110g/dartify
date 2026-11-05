# HG-1 brief: toolchain and CI

**Status:** Done (2026-11-05, merged into `refactor/orchestration`, `838c4e5`)
**Implementer:** a fresh `implementer` (Sonnet 5.5, high)
**Branch:** `hg-1`, in a worktree the planner creates from `refactor/orchestration`.
**Decisions:** D-14, D-28, **HD-08**, **HD-12**.
**Read first:** `docs/process.md`, this brief, `docs/hardening/decisions.md` (HD-08, HD-12),
`docs/hardening/findings.md` (rows CA-17, CA-18, CA-19, CA-20, VFY-001, VFY-002),
`docs/hardening/audits/01-closing-17e8aa9/verification.md` (VFY-001, VFY-002 evidence).
Code: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vitest.config.ts`, `.github/workflows/ci.yml`,
`test/run-isolation.test.ts`, `src/cli.ts`, `test/dart/baseline.json` (read only: its SDK note).

## Outcome

The test and build toolchain is free of known critical and high advisories, and the shipped package's production
dependency tree has none that can be patched. CI checks exactly the Dart SDK the analyzer baseline was taken with,
runs with least privilege on immutable action references, and can't go red on a slow runner because of a timeout.
Every later hardening brief is then tested on this final toolchain. No user-visible behaviour of the CLI or of the
generated Dart changes, apart from the bundle no longer carrying `package.json`'s scripts and dev metadata.

## Items

| ID | Item |
|----|------|
| HG1-1 | **Dev toolchain to vitest 5** (CA-19, HD-12). Move `vitest`, `@vitest/ui` and `@vitest/coverage-v8` to the latest 5.x, together with whatever peers they require (vite etc.). Migrate `vitest.config.ts` to the v5 configuration (the `pool` / `poolOptions.threads` shape changed in v4; keep threads, non-single-thread, the custom `resolveSnapshotPath`, the coverage settings and `testTimeout`). **Snapshot contents must stay byte-identical**: the only acceptable change to a `.snap` file is a header or format line written by vitest itself, and each such change is listed in the report. If a real blocker makes v5 impossible, fall back to the latest 3.2.x (≥ 3.2.7, which clears the three critical advisories), stop that item, and report the blocker with evidence. |
| HG1-2 | **Production advisories** (CA-20, HD-12). All nine are transitive (`ts-morph → @ts-morph/common → minimatch`, `→ tinyglobby → picomatch`; `fast-glob → micromatch → picomatch`); `ts-morph` 28.0.0 is already the latest. First refresh the lockfile within the declared semver ranges; then add `pnpm.overrides` only for what remains, choosing the lowest patched version **inside the dependent's declared range**. An override that crosses a major of what the dependent declares (e.g. `minimatch` 11 under a `^10` range) is not applied: report it with the advisory, its reach (input globs only) and your recommendation. `pnpm audit --prod` must end at 0 critical / 0 high. |
| HG1-3 | **Remaining dev advisories** (HD-12). After HG1-1, run `pnpm audit`. Apply in-range updates or overrides for any critical or high that remains. List every advisory still left (severity, package, path, why it can't be cleared) in the report. Do not add overrides that cross a dependent's declared major. |
| HG1-4 | **CI Dart SDK pin** (CA-17, HD-08). Pin `dart-lang/setup-dart` to the exact SDK the baseline was taken with: **3.13.7** (the release-audit verification measured the identical census on 3.13.7; local runs on 3.13.5 match too). State the pinned version beside the existing SDK note in `test/dart/baseline.json`'s `comment`, so the two are bumped together. |
| HG1-5 | **CI hardening** (CA-18). Add a top-level `permissions: contents: read` (and nothing broader unless a step needs it; justify any widening). Pin every third-party action (`actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `dart-lang/setup-dart`) to a full commit SHA with the version as a trailing comment (`# v4.2.2`). Resolve each SHA from the action's own release tag (`gh api` read-only) and list them in the report. |
| HG1-6 | **Run-isolation timeout** (VFY-001). Give "overlapping transpileFromString calls never observe each other" (`test/run-isolation.test.ts`) an explicit timeout sized for coverage instrumentation on a slow 4-CPU runner (it measured 32.8 s against the 30 s default): set it per test, with a comment saying why. Don't change the global `testTimeout` and don't weaken the test (still 10 overlapping pairs). |
| HG1-7 | **Version without the whole `package.json`** (VFY-002). `src/cli.ts:18` imports all of `package.json` for `pkg.version`. Change it so the bundle carries only the version string (for example a named JSON import that the bundler tree-shakes, or a build-time define; choose one and justify it in Deviations). `dartify --version` must print the package version both from `pnpm dev` (tsx) and from `dist/cli.js`. |
| HG1-8 | **Tests.** No new test file is required. Prove HG1-1 by the whole gate passing with zero snapshot content changes, and HG1-7 by the two `--version` runs and a `grep` showing `devDependencies` / `"scripts"` absent from `dist/cli.js`. If vitest 5 changes how a tier is selected (env-gated tiers such as `DARTIFY_STRESS`, `DARTIFY_DART`, `DARTIFY_E2E`, `DARTIFY_INCREMENTAL`, the S2/S3 corpus flags), verify each tier still runs **and** still skips when its flag is unset, and report both counts. |
| HG1-9 | **Docs.** Update `docs/process.md` → Verification only where a command or count actually changed (e.g. the coverage command or a skipped-test count). Propose `CHANGELOG.md` lines (under `[1.0.0] — unreleased`); don't edit it. Don't edit `docs/hardening/findings.md` (the planner updates rows at merge). |

## Allowed dependencies

Version changes to existing dev dependencies required by HG1-1 (`vitest`, `@vitest/ui`, `@vitest/coverage-v8` and
peers they require, such as `vite`), in-range lockfile refreshes, and `pnpm.overrides` per HG1-2 / HG1-3. No new
direct dependency. No change to the production dependency ranges in `package.json` (`fast-glob`, `ts-morph`, `yargs`).

## Non-goals (binding)

- **No other upgrades:** not TypeScript (7.x), `tsup` 9, `jsdom`, `@types/node`, `ts-morph`, `yargs`, the e2e
  libraries (`h3-js`, `three`, `leaflet`) or `tsx`, unless HG1-1 strictly requires one; then it's a proposal, not done.
- **No change to the Node CI matrix** (20.19.0 / 22.12.0 / 24.x) or to which jobs run.
- **No Dependabot/Renovate config** — propose it if you think it's worth it.
- **No compiler or emitter change.** Generated Dart must be byte-identical; any diff is a stop-and-report.
- **No edits** to `docs/decisions.md`, `docs/hardening/decisions.md`, `docs/hardening/findings.md`, `CHANGELOG.md`.
- No git operations.

## Acceptance

1. The gate in `docs/process.md` passes in the worktree: `pnpm exec tsc --noEmit && pnpm test && pnpm test:s2 &&
   pnpm test:s3 && pnpm test:s4 && pnpm test:s5:fixture && pnpm test:dart && pnpm test:incremental && pnpm test:e2e &&
   pnpm build`, with the same passed/skipped counts as before the upgrade (299 / 10 for `pnpm test`), or each
   difference explained.
2. `pnpm test:coverage` passes with the **default** configuration (no `--testTimeout` flag).
3. `git diff --stat -- test/__snapshots__` shows no content change (header/format lines only, each listed).
4. `pnpm audit --prod`: 0 critical, 0 high. `pnpm audit`: 0 critical; every remaining high/moderate listed with its
   reason.
5. `.github/workflows/ci.yml`: `permissions: contents: read`; every `uses:` is a 40-hex SHA with a version comment;
   `setup-dart` pinned to `3.13.7`. Checked with `grep`; hosted CI itself is not run by the implementer.
6. `node dist/cli.js --version` and `pnpm dev --version` both print `1.0.0`; `grep -c devDependencies dist/cli.js` is 0.
7. `pnpm test:stress` passes once at the end (1,655 files), since the toolchain under it changed.

## History

- fix1 (2026-11-05): vitest 5.1.0 declares no Node 20 support while `engines` and CI promised Node ≥ 20.19. The user chose to drop Node 20 (**D-32**) and keep vitest 5. Follow-up to the same implementer: `engines`, CI matrix (22.12.0 / 24.x / 26.x), tsup target, Node-version mentions in README/CONTRIBUTING/architecture, and code comments citing finding IDs replaced by decision IDs or plain reasons (decisions.md rule).
- Merged 2026-11-05 (`838c4e5`). Gate rerun by the planner: `pnpm test` 299/10, S2 2/2, S3 1/1, S4 54/54, S5 3/3, Dart 2/2, incremental 5/5, e2e 3/3, coverage 299/10 with the default timeout (90.23 % lines), no snapshot change; default suite also 299/10 on Node 22.12.0 and 26.13.0 (implementer). Not verified: hosted CI (incl. `26.x` resolution). Proposals not taken: Dependabot/Renovate, a printed stress file count.
