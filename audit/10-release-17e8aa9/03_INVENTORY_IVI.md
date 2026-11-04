# Inventory and intent mapping

Audited source: `17e8aa932bd42aa9c667f40c2ac8567764799380`, verified by content hashes against the pre-captured Git blob manifest. Git has not been accessed since the user prohibited it. Session contains memory instructions; no project memory consulted.

The shipped product is the CLI bundled from `src/cli.ts`. Public task: declaration input to usable `package:js` Dart bindings. TypeScript/morph performs syntax/checker/module work, fast-glob selects inputs and yargs parses options. All three production dependencies are reachable. Graph, IR dump and benchmarks are separate tools; historical implementation remains intentional documentation. Tests and fixtures are required acceptance evidence, not shipped code. A lockfile, pinned package manager and CI define reproducibility. Existing audit files are tracked project records and are untouched.

D3 process pair is absent; current README/PLAN/stage contracts and CLAUDE form the intent side. Scope preserves `package:js` and declaration-only input. Known accepted limitations include named degradations, fixed five-slot rest polyfill, suppressed external-module augmentations, flattened namespaces and anonymous-default suppression. These are controls when challenging candidates, not automatic defects.

Fresh review has read every live source file line by line. Retained findings were independently exercised through generated Dart, Dart analyzer, strict TypeScript/consumer checks and dart2js+Node; final evidence validation passes for all 23 records. No candidate inherits a prior finding status. Every source conclusion remains bound to this SHA.

## Initial promise map

| Promise | Implementing boundary | Evidence and current challenge |
|---|---|---|
| Correct dispatch, overloads and imports | packagejs declarations/types/library/index | Existing runtime/e2e gates pass; adversarial export/Date/escaping cases show failures confirmed in findings.md |
| Real generics and inheritance | parser signatures/type literals; types substitution; declaration overrides | Valid test cases expose binder/default/override holes |
| Never degrade silently; preserve original syntax | parser Unsupported; aliases; reports | Named fallbacks generally preserved; filesystem syntax validation differs from string API |
| Incremental output equals cold output | watch state and backend render caches | Existing differential suite passes; two additional transitions differ |
| Every input failure observable and generation failure write-blocking | CLI filters; Transpiler.transpile | Forced-generation test passes; malformed AST and missing-input probes bypass that protection |
| Release gates and package | package.json, CI, lockfile | All 11 requested local gates pass; package smoke passed; dependency matches and reachability limits in 07_RELEASE.md / 08_SECURITY.md |

Historical necessity claims requiring Git history are Blocked by the explicit no-Git constraint. No cleanup recommendation will assert unused status without reachability/history evidence. Runtime execution is local macOS arm64 with Node 24.22.1, pnpm 10.9.0, Dart 3.13.5. It is not Linux/Windows/native-browser/live deployment proof.
