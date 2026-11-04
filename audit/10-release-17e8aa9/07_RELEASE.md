# Build, packaging and deployment boundary

**Coverage:** package.json, pnpm-workspace.yaml, lock metadata, tsconfig, Vitest config and 49-line CI fully inspected as appropriate (lock dependency graph automated plus targeted package entries). All four tools read, historical exhibit read. All builds/test/install/pack outputs are contained in this audit folder.

**Verified correct, local:** locked pnpm 10.9.0 install; TypeScript noEmit; ESM bundle; default/S2/S3/S4/S5/Dart/e2e/incremental/stress gates; coverage command. Default is 299 passed / 10 opt-in skipped, with opt-in tiers separately run. Coverage reports 90.43% statements/lines, 86.72% branches, 96.41% functions. Coverage is execution reach, not semantic correctness.

The packed artifact has six entries: README, LICENSE, package.json, dist/cli.js, its shared chunk and its lazily loaded watch chunk. In a separate extraction, production-only frozen/offline install succeeded; --version returns 1.0.0; --help succeeds; real h3 input generates successfully. Only 41 production packages install. The initial smoke harness used an unpinned global pnpm and failed offline metadata lookup; initial-results.json is preserved, and the successful rerun explicitly uses corepack pnpm@10.9.0. It is a harness correction, not a project defect.

The tarball does not include the declaration corpus, tests, historical exhibit, graph/IR/bench tools or development dependencies. ts-morph, yargs and fast-glob remain external production dependencies and are reachable from the CLI graph. The packed CLI's successful generation is local package completeness evidence; its existence is not a publication/deployment claim.

**Verified correct as configuration only:** engines.node is ^20.19.0 || ^22.12.0 || >=23, and CI names 20.19.0, 22.12.0 and 24.x. CI includes TypeScript/default/build, coverage/incremental on 24.x, and separate Dart/e2e gates. The prepublishOnly hook builds; it does not itself run the full correctness gates. These observations are not inherently a deployment finding.

**Unverified:** Node 20.19.0 and 22.12.0 runtime on this machine; Windows/Linux-native execution; hosted CI results for this commit; a fresh registry consumer installation without the retained lock harness; npm publication and live installation. No remote write, publication, CI change, release or deployment was performed. No current CI failure is inferred from these limits.

Evidence: evidence/gates.json and gate-*.log, evidence/gate-coverage.log, evidence/dart_bindgen-1.0.0.tgz and package-smoke/results.json. Local toolchain: Node 24.22.1, pnpm 10.9.0, Dart 3.13.5 stable, macOS arm64. The ts-morph 28.0.0 oracle uses TypeScript 6.0.2; evidence/toolchain.json records the observed versions.
