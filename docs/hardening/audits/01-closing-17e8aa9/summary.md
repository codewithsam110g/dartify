# Intake summary — v1 release audits of `17e8aa9`

Covers both audits of the `1.0.0` candidate: [the closing audit](README.md) (`CA-01`–`CA-33`) and
[the independent release audit](../02-release-17e8aa9/README.md) (`DAR-001`–`DAR-023`). Triage agreed with the user
on 2026-11-05.

## Verdict

**Not releasable as `1.0.0` under its current public claims.** Every documented gate passes, and the gated corpora (h3,
Leaflet, all 420 three.js libraries) are analyzer-clean and pass the dart2js e2e suite. Targeted probing outside those
corpora found **48 distinct defects: 3 high, 26 medium, 19 low.** The two audits never saw each other's work and
overlap on only 8 of them.

The three high findings:

1. `CA-01` = `DAR-012`: TS `Date` is bound as Dart `DateTime`, giving `NaN` or `JsNoSuchMethodError` at runtime with no
   analyzer error. The mapping comes from js_facade_gen's own table (`'Date': 'DateTime'`), which only worked under
   Dartium's automatic `dart:js` conversion; `package:js` under dart2js has never converted `Date` (HD-02).
2. `DAR-003`: default, `export =` and aliased exports dispatch to JavaScript properties that don't exist.
3. `DAR-001` (⊃ `CA-10`): malformed declaration files produce "successful" output; error recovery can absorb the next
   declaration, with exit 0 even under `-lv`.

## Verification

| | CA (33) | DAR (23) |
|---|---:|---:|
| Agree | 28 | 16 |
| Agree with qualification | 3 (`CA-17`, `CA-22`, `CA-23`) | — |
| Duplicate | 1 (`CA-10` → `DAR-001`) | 7 (each → its CA twin) |
| Already fixed | 1 (`CA-33`, D3 adoption `18a3b0b`) | — |
| Disagree | 0 | 0 |

Every finding was re-executed once in a fresh session ([verification-pass1.md](verification-pass1.md) and
[combined-report.md](combined-report.md), Linux, Dart 3.13.7). At intake the planner re-ran a risk-weighted sample of
10 on macOS with Dart 3.13.5, including all three highs; every one reproduced. See [verification.md](verification.md)
and [../02-release-17e8aa9/verification.md](../02-release-17e8aa9/verification.md) for each verdict and its evidence.

**New findings from verification:** `VFY-001` (the run-isolation test fails under coverage instrumentation; CI risk)
and `VFY-002` (the CLI bundle inlines all of `package.json`). The open pre-D3 finding `T-11` (string-literal escapes
not decoded, the same class as `DAR-013`) joins the register.

## Groups and the HG split

| Brief | Cluster | Findings |
|---|---|---|
| HG-1 | Toolchain and CI first, so every later fix is tested on the final toolchain | CA-19, CA-20, CA-17, CA-18, VFY-001, VFY-002 |
| HG-2 | Input boundary and CLI reporting (high H3) | DAR-001, DAR-002, CA-14, CA-09, CA-08, CA-13, CA-30, DAR-023 |
| HG-3 | Module and export identity (high H2) | DAR-003, CA-03, CA-06, CA-07 |
| HG-4 | Type and class fidelity (high H1) | CA-01, DAR-009, DAR-010, DAR-011, DAR-021, DAR-015, CA-16, CA-26, CA-31 |
| HG-5 | Text and URI legality | CA-32, CA-11, CA-12, DAR-013, T-11 |
| HG-6 | Name allocation | CA-04, CA-05, DAR-005, DAR-006, DAR-007, DAR-008, CA-25 |
| HG-7 | Watch state | CA-02, DAR-016, DAR-017, CA-15 |
| HG-8 | Records, tests and docs; every documented number re-measured last | CA-21, CA-22, CA-23, CA-24, CA-27, CA-28, CA-29 |

Decisions HD-02–HD-12 govern the fixes with a design choice ([../../decisions.md](../../decisions.md)); the register
is [../../findings.md](../../findings.md).

## Not verified by any audit

Hosted CI for this exact tree, Windows, browser-native execution, and a real npm publish/install/rollback; `CA-17`'s
behaviour under newer Dart SDKs; exploit reachability of the dependency advisories. 48 defects found by targeted
probing means more almost certainly exist in the same clusters, which is why the gate closes with a fresh audit.
