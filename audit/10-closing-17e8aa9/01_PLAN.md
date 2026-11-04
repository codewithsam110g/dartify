# 01 — Audit plan

## Scope

A closing audit of the v1.0.0 candidate at `17e8aa9` on `refactor/orchestration`. The question it answers: is the code that `PLAN.md`, `ROADMAP.md`, `README.md` and `CHANGELOG.md` describe as "v1 code-complete" correct, honestly documented and releasable? And is every fix registered in `audit/FINDINGS.md` real, tested and complete?

### Challenged scope (recorded before starting)

1. **"We have just completed the implementation of v1."** The clone at session start (`aefc992`) did not contain v1. The v1 work is the 17 commits `4856e6a..17e8aa9`. This audit targets `17e8aa9` (see `00_REQUEST.md`).
2. **"v1 complete" vs. the plan.** `PLAN.md` marks S6.9 (beta soak, optional) and S6.10 (merge to `main` and publish) as pending owner decisions. Code-completeness is audited here. The release itself is not performed and remains out of scope.
3. **"Deployment" pass.** dartify is a CLI/npm package with no services, containers, backups or monitoring. In this project, "deployment" means the npm package contents, the build, the CI workflow, the Node/Dart toolchain contracts, upgrade compatibility for `0.5.0` → `1.0.0` users, and rollback via npm dist-tags. Containers, backups, restore and monitoring are recorded as N/A, not as gaps.
4. **"Security" pass.** The tool runs locally on developer-supplied `.d.ts` files. There is no authentication or authorization surface. The trust boundary is the input files and globs (path handling, output-path containment, code injection into generated Dart through names, strings and comments), plus supply chain (dependencies, CI actions, publish contents) and secrets in the tree and history.

## Exclusions

| Excluded | Reason |
|---|---|
| `def_files/**` third-party `.d.ts` corpora (1,654 files) | Fixture data, not product code. Used as **inputs** to runtime checks, not audited line by line. Hand-written fixtures (`synthetic/runtime/*`, `h3/h3_web.golden.dart`, `js_facade_gen_test_cases.md`) are read where gates depend on them. |
| `docs/history/legacy/**` (3 files, ~2.4k lines) | Declared non-built historical exhibit. Only its non-reachability from the build, the type-check and the package is verified. |
| `pnpm-lock.yaml` line content | Checked with `pnpm audit` and by matching against `package.json`, not read line by line. |
| Vitest snapshot files (4 files, 5,501 lines) | Sampled: each snapshot's test is read, and the snapshot is spot-checked against `dart analyze` and runtime output rather than read in full. |
| Publishing to npm, merging to `main` | Owner decision (S6.9/S6.10). Never performed by an audit. |
| Live npm registry state for `dart_bindgen` | Read-only `npm view` only, if the network allows. |

## Coverage denominator

| Area | Files | Lines | Method |
|---|---:|---:|---|
| `src/` root (`cli.ts`, `transpiler.ts`, `watch.ts`) | 3 | 1,719 | Full line-by-line read + runtime probes |
| `src/engine/emitter/**` (v1 backend) | 9 | 3,881 | Full line-by-line read + `dart analyze` + dart2js probes |
| `src/engine/parser/**` | 26 | 2,165 | Full read + synthetic probes |
| `src/engine/phase/**` | 3 | 1,234 | Full read |
| `src/engine/semantic/**` | 6 | 1,637 | Full read |
| `src/engine/alias/**` | 3 | 450 | Full read |
| `src/ir/**` | 13 | 579 | Full read |
| `src/symbol/**` | 6 | 640 | Full read |
| `src/resolution/**`, `src/reporting/**` | 4 | 301 | Full read |
| **`src/` total** | **73** | **12,606** | |
| `test/**` (excluding snapshots) | 54 | 5,604 | Read for assertion strength (does the test fail when the behaviour breaks?) |
| `tools/**` | 4 | 354 | Full read (non-shipped instruments) |
| Config: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `pnpm-workspace.yaml`, `.github/workflows/ci.yml` | 6 | 229 | Full read |
| Root docs: `README`, `ROADMAP`, `CHANGELOG`, `PLAN`, `PRE_STAGE5_PLAN`, `STAGE4_PLAN`, `CLAUDE`, `AGENTS`, `CONTRIBUTING`, `Tasks` | 10 | 2,052 | Claim extraction and verification |
| `audit/*.md` registry | 13 | 4,807 | `FINDINGS.md` fully; area files consulted per finding |

## Runtime checks (planned)

1. Every gate the docs advertise: `tsc`, `pnpm test`, `build`, `test:dart` (Dart 3.13.7), `test:e2e`, `test:incremental`, `test:s2`/`s3`/`s4`/`s5:fixture`, `test:coverage`, `test:stress`. Results are compared with the documented numbers.
2. Packaging: `pnpm pack` contents, a bundle smoke run of `dist/cli.js` under the declared Node floor, and `--help`/`--version`/exit codes.
3. Independent `dart analyze` of CLI-generated output (not only through the test harness) for h3, Leaflet and three.js.
4. Adversarial synthetic fixtures under `fixtures/` in this folder, targeting the v1 backend: name injection into `@JS` strings and doc comments, output-path containment, collisions, generics/overrides, watch-mode edge cases, and CLI error paths.
5. Security: secret scan of the tree and history, `pnpm audit`, CI permissions/pinning review.

## Audit sections (report files)

| File | Pass |
|---|---|
| `10_INVENTORY.md` | 1. Inventory and necessity |
| `20_INTENT.md` | 2. Intent vs implementation (docs, claims, metrics) |
| `30_IMPLEMENTATION.md` | 3. Implementation (line-by-line notes per area, coverage table) |
| `40_DEPLOYMENT.md` | 4. Build, package, CI, toolchain, upgrade/rollback |
| `50_SECURITY.md` | 5. Security |
| `60_CLOSING.md` | Registered-fix verification + regression sweep |
| `findings.md` / `findings.json` | Finding register (`CA-NN` IDs, so they cannot collide with the project's `E-`/`L-`/… IDs) |
| `MASTER.md`, `summary.md` | Synthesis |
| `logs/` | Small committed logs (gate summaries, analyzer census) |
| `fixtures/` | Synthetic reproducers |

## Labels

Each conclusion is labelled **Verified correct**, **Incorrect**, **Incomplete**, **Blocked** or **Unverified**. Evidence is tagged **[static]**, **[runtime]** or **[live]**. Severity (critical/high/medium/low) follows concrete user impact on a v1 adopter.

## Approval

Not obtained interactively. See `00_REQUEST.md` §"Setup events", item 4.
