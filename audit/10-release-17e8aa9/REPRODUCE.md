# Reproduction and evidence index

All commands below operate under audit/10-release-17e8aa9. No Git command is needed or authorized. The source snapshot has the captured HEAD's 1,848 tracked files; dependencies/build/outputs are separate audit artifacts. The snapshot's files match their recorded SHA256 values.

Local versions: Node 24.22.1, pnpm 10.9.0, Dart 3.13.5 macOS arm64. Python is used only as a standard-library subprocess/file harness, with no installed Python dependencies. Dart scripts invoke /Users/ssrk/flutter/bin/cache/dart-sdk/bin/dart directly, avoiding the Flutter shim. PUB_CACHE/TMPDIR/XDG caches point into this audit. For another machine, change that explicit Dart path and preserve containment.

## Existing project gates

`python3 audit/10-release-17e8aa9/run_gates.py` reproduces typecheck, build, default, S2, S3, S4, S5 fixture, Dart, actual-library e2e, incremental and stress gates from work/. Inspect the script's environment and command list first. The original logs and exits are retained. Coverage was separately run as `pnpm test:coverage` from work/ with the same environment; it passed.

Dependencies were installed with pinned pnpm 10.9.0, frozen lock, --ignore-scripts and --store-dir pointing at cache/pnpm-store. Native optional esbuild worked in the observed install. The unsuccessful unsupported --state-dir attempt is preserved in install.log; install-retry.log contains the successful installation. No source/lockfile mutation was needed.

## Output and type proofs

From audit/10-release-17e8aa9/work, run in order:

```sh
pnpm exec tsx ../probes/output-probes.ts
pnpm exec tsx ../probes/controls.ts
pnpm exec tsx ../probes/extra-controls.ts
pnpm exec tsx ../probes/validate-inputs.ts
pnpm exec tsx ../probes/validate-controls.ts
pnpm exec tsx ../probes/generic-proofs.ts
```

From the repository root:

```sh
python3 audit/10-release-17e8aa9/probes/analyze-probes.py
python3 audit/10-release-17e8aa9/probes/runtime-probes.py
python3 audit/10-release-17e8aa9/probes/final-controls.py
python3 audit/10-release-17e8aa9/probes/final-analyzers.py
python3 audit/10-release-17e8aa9/probes/extra-runtime.py
```

analyze-results.json contains expected failures, not an audit harness failure. runtime-results.json records compile exit and observed output separately. Runtime bodies catch JS errors to retain readable evidence; a Node exit 0 is therefore not a passing binding. compiler-oracles.json uses actual TS-compiled CommonJS implementations for the export cases. generic-consumer-typescript.json and generic-consumer-dart.json compare consumer typing in both languages. Strict input validity is separate from consumer misuse intentionally introduced by those probes.

## CLI and watch proofs

```sh
python3 audit/10-release-17e8aa9/probes/cli-probes.py
python3 audit/10-release-17e8aa9/probes/cli-additional.py
python3 audit/10-release-17e8aa9/probes/cli-watch.py
python3 audit/10-release-17e8aa9/probes/watch-reporting.py
```

From work/: `pnpm exec tsx ../probes/watch-probes.ts`. Then from the root: `python3 audit/10-release-17e8aa9/probes/prove-watch-impact.py`. The watch script resets only its own synthetic scenario directories, captures build errors rather than aborting all scenarios, and records every completed comparison. The initial contaminated result is excluded and kept only to explain falsification. CLI watchers are terminated by their harness after bounded observations.

## Package and security

`python3 audit/10-release-17e8aa9/probes/package-smoke.py` extracts the retained tarball and uses pinned corepack pnpm@10.9.0 for a production-only installation and CLI version/help/h3 checks. It uses the audit cache and locked dependency harness; it does not publish or install globally. Review its replacement/reset paths before reuse.

Security evidence/dependency-audit.json is a registry response from `pnpm audit --json` in work/. Advisory results are time-sensitive and separate from source defect proofs. The location-only secret scan, final source integrity, original source manifest and evidence hashes are retained under evidence/ and coverage.json.

Additional filesystem checks: `python3 audit/10-release-17e8aa9/probes/fs-boundary.py` covers spaces, Unicode paths, input symlink, source/output overlap, unreadable inputs and non-writable output under the current unprivileged UID. Permissions are restored in finally. `pnpm exec tsx ../probes/watch-recovery-isolated.ts` from work reproduces the missing-dependency sequence without any intervening cold compilation. `python3 audit/10-release-17e8aa9/verify_evidence.py` validates all 23 proof-artifact predicates; it does not rerun the compilers.
