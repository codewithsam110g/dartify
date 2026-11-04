# Summary — closing audit of `17e8aa9` (dartify / `dart_bindgen` 1.0.0 candidate)

## Counts

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 1 |
| Medium | 6 |
| Low | 17 |
| **Total** | **24** |

| Category | Count | IDs |
|---|---:|---|
| Implementation | 13 | CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-09, CA-11, CA-13, CA-14, CA-15, CA-16, CA-23 |
| Intent | 5 | CA-07, CA-08, CA-10, CA-21, CA-22 |
| Security | 4 | CA-12, CA-18, CA-19, CA-20 |
| Deployment | 2 | CA-17, CA-24 |
| Inventory | 0 | — (every component has a traced consumer; see `10_INVENTORY.md`) |

| Confidence | Count |
|---|---:|
| Confirmed | 20 |
| Probable | 4 (CA-06, CA-15, CA-16, CA-17) |

## Suggested fix groups

1. **Before publishing 1.0.0.**
   - CA-01: map `Date` to a named interop type and add a runtime probe case.
   - CA-04, CA-05: reserve Object member names and the owner name in member allocation.
   - CA-03, CA-06: at minimum emit diagnostics for lost re-exports and non-identifier ambient-module paths.
   - CA-19: upgrade Vitest.
   - CA-21, CA-22, CA-24: refresh the numbers, fix the `X-16` clash, write breaking-change and rollback notes.
2. **Watch mode** (CA-02, CA-15): invalidate on global-visibility changes in module files, compute the root segment-wise, and add both scenarios to the differential suite.
3. **Global merging and reporting** (CA-07, CA-08, CA-13): merge or diagnose cross-file globals, print link failures by default, fix cycle memoisation.
4. **Input robustness** (CA-09, CA-10, CA-11, CA-12, CA-14, CA-16): numeric separators, syntax-error reporting, URI escaping, control-token isolation, `.d.mts`/`.d.cts`, private-only constructors.
5. **CI and supply chain** (CA-17, CA-18, CA-20, CA-23): pin Dart to the baseline SDK, pin actions by SHA with read-only permissions, refresh the lockfile, add regression tests for P-18, E-44 and E-20.

## Verdict

**Code-complete and gate-verified for the corpora it targets, but not yet releasable under its current public claims.**

The v1 work is real. Every documented gate passes and was reproduced independently, including analyzer-clean h3, Leaflet and all 420 three.js libraries. The h3 drop-in claim holds even under a stricter comparison than the project's own. No earlier fix regressed. For the motivating consumer, h3, the output is safe to adopt.

One confirmed high finding (CA-01) contradicts README's "correct runtime dispatch" in a gated library (Leaflet). The medium findings show that the v1 acceptance sentence and "never degrade silently" hold on the gated corpora but not across the declared input contract: barrels, cross-file globals, Object-member names, ambient modules, and watch-mode equivalence.

Recommendation: fix CA-01, and add diagnostics or fixes for CA-03, CA-04 and CA-06, before the S6.10 publish. Alternatively, publish the optional S6.9 `1.0.0-beta.0` under `next` with these findings listed as known issues.

## Unverified or uncovered

- ≈20% of `src/` (≈2,500 lines) is gate-only.
- Most unit tests were not reviewed individually.
- Watch-latency claims (`pnpm bench` not run).
- Node 20.19 and 24.
- Live CI.
- js_facade_gen CLI-invocation compatibility.
- R-15 timing.
- Runtime confirmation of CA-06 and CA-16.

**Independent verification in a fresh session is recommended** (`MASTER.md` F-8).
