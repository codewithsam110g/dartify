# 40 — Deployment (pass 4)

dartify is an npm CLI package. It has no services, containers, databases, monitoring, backups or restore procedures, so those items are **N/A**, not gaps. "Deployment" here covers build, package, CI, toolchain contracts, upgrade path and rollback. Source inspection does not prove live behaviour; no publish was performed, by design.

## Coverage

| Item | Method | Result | Label |
|---|---|---|---|
| Build (`pnpm build`, tsup → `dist/`) | executed | 3 ESM files: `cli.js` 15.3 KB (shebang, `+x`), shared chunk 262.7 KB, lazy `watch-*.js` 16.1 KB | Verified correct [runtime] |
| Built CLI runs | `node dist/cli.js --version` → `1.0.0`; h3 generation exit 0 | works | Verified correct [runtime] |
| Package contents | `npm pack --dry-run --json` | 6 files: LICENSE, README.md, 3 `dist` files, package.json. 77 KB packed / 322 KB unpacked. No fixtures, tests, tools or Viz | Verified correct [runtime] |
| Runtime dependencies | `package.json` | `fast-glob`, `ts-morph`, `yargs`; no lockfile ships, so consumers resolve fresh versions | Verified [static] |
| Node floor (X-15) | Node 20.19.0 and 24.22.2 downloaded to the scratchpad: `tsc`, `pnpm test`, `pnpm build`, built-CLI h3 run | all pass (299 passed / 10 skipped on each) | Verified correct [runtime], `logs/node-matrix.txt` |
| CI workflow | read `.github/workflows/ci.yml`; GitHub Actions API (read-only) | Run 12 for `17e8aa9`: all 4 jobs success (Node 20.19.0, 22.12.0, 24.x with coverage + incremental, Dart gate + e2e). Earlier v1 commits (runs 4–11) failed | Verified [live], `logs/live-ci.txt` |
| Dart SDK pin | CI `sdk: stable` vs exact 3.13 baseline; gate re-run under Dart 3.14 beta and 3.15 dev | mismatch is real; both newer SDKs still pass | CA-17 (low), `logs/dart-sdk-drift.txt` |
| Generated platform table | search for a generator/validator of `browserTypes.ts` | none committed | CA-29 |
| Action pinning / token scope | read | mutable tags, no `permissions:` | CA-18 |
| Release process | PLAN S6.9/S6.10: owner decision; no publish workflow | manual `npm publish` with `prepublishOnly: pnpm build` | Documented, not executed |
| Upgrade path 0.5.0 → 1.0.0 | compared `origin/main` CLI options and CHANGELOG | CLI flags are a superset (compatible); generated API changes are not documented as breaking | CA-24 |
| Rollback | docs search | no dist-tag/deprecate plan written; npm `next` tag is mentioned only as optional S6.9 | CA-24 |
| Gitignore vs tracked fixtures (X-16 bis) | `git ls-files` | `def_files/h3/h3_web.golden.dart`, runtime `main.dart` and e2e `main.dart` are tracked | Verified correct [runtime] |
| Reproducibility | `pnpm install --frozen-lockfile` | succeeded | Verified [runtime] |

## Observations

- Running `pnpm test:dart` and `pnpm test:e2e` requires network access to pub.dev (`dart pub get`) and an installed Dart SDK. The test header documents both. CI installs them; offline contributors cannot run the acceptance gate.
- Coverage is reported (90.43%) but no threshold is enforced, as documented.
- The three.js gate depends on `--js-root THREE`. A user who omits it gets `NATIVE_NAME_CONFLICT` diagnostics and analyzer-clean output that dart2js rejects. This is documented (E-44, README) and diagnosed.
