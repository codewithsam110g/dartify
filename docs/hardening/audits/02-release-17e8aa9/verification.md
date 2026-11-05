# Planner verification — release audit `DAR-001`–`DAR-023` (baseline `17e8aa9`)

Intake of `10-release-17e8aa9/` into the hardening gate (2026-11-05). See `10-closing-17e8aa9/verification.md` for the
closing audit and the two VFY findings.

## Method and limits

- **Two passes.** (1) A fresh-session verification (Linux x64, Dart 3.13.7) that **rebuilt every trigger from its
  "Minimal trigger" text**, because the codex probes depend on a git-ignored `work/` snapshot and macOS paths. It
  confirmed strict `tsc --noEmit` is clean for each input (except DAR-019's deliberately missing type) and checked
  each one with its own CLI run, `dart analyze`, Dart consumers, dart2js + Node, or a `WatchSession` harness compared
  byte for byte with cold builds (`12-MASTER-REPORT.md`, "How it was verified"). (2) This intake, on macOS arm64 with
  Dart 3.13.5, re-ran a risk-weighted sample independently. The user agreed to this scope.
- **Code delta.** No source change since `17e8aa9`, so no verdict is *Already fixed*.
- **Re-run at intake** (outputs in `/audit/intake-spotcheck/`):
  - DAR-001: `broken(x: number: string;` + `const fine` → `broken(num x, dynamic string, dynamic JS$binding, dynamic JS$binding_2, num fine)`; exit 0; `-lv` has 0 error lines.
  - DAR-002: `valid.d.ts missing.d.ts` → exit 0, no mention of the missing file; directory `dir.d.ts` → exit 0, 0 files.
  - DAR-003: `--js-root Root`: `export default function named` → `@JS("Root.named")`; `export {hidden as publicName}` → `@JS("Root.hidden") … hidden(…)`, and no `publicName`.
  - DAR-004: `probe.d.ts` = `export {A} from "./b"` (with `b` = `export *`) → `probe.dart` has no export.
  - DAR-009: `f<T>(x: Pair<string>)` → `external T f<T>(Pair<String, T> x)`.
  - DAR-012 (as CA-01) and DAR-022 (as CA-32): see the closing audit's verification.
- **Not re-run at intake:** DAR-005–008, 010, 011, 013–021 and 023. Their verdicts rest on pass (1).

## Verdicts

| Verdict | Count | IDs |
|---|---:|---|
| Agree | 16 | DAR-001–003, 005–011, 013, 015–017, 021, 023 |
| Duplicate | 7 | DAR-012 → CA-01, DAR-018 → CA-15, DAR-019 → CA-13, DAR-020 → CA-16, DAR-022 → CA-32, DAR-004 → CA-03 (union: adds the chained-barrel and rename cases), DAR-014 → CA-11 (union: adds `#`) |
| Disagree / Qualified / Already fixed | 0 | |

The duplicates point to the CA row because the closing audit registered first; each fix covers the union of both
audits' cases, and the DAR row closes with its CA twin.

| ID | Sev. | Verdict | Evidence |
|---|---|---|---|
| DAR-001 | high | Agree | Re-run at intake. Also covers CA-10 |
| DAR-002 | medium | Agree | Re-run at intake (both cases); missing-only control exits 1 |
| DAR-003 | high | Agree | Re-run at intake; `export =` → `Root.named` (pass 1); named-export control correct |
| DAR-004 | medium | Duplicate of CA-03 | Re-run at intake |
| DAR-005 | medium | Agree | Pass 1: `switch` emitted as a parameter name; duplicate `p_d`; `args1` collision |
| DAR-006 | medium | Agree | Pass 1: `INVALID_OVERRIDE` through two levels; Base+Mid control clean |
| DAR-007 | medium | Agree | Pass 1: `DUPLICATE_DEFINITION` on `Child_foo`; control clean |
| DAR-008 | medium | Agree | Pass 1: alias allocated `…_2`, use sites keep the stale name → `UNDEFINED_CLASS` |
| DAR-009 | medium | Agree | Re-run at intake; a valid consumer is rejected (pass 1) |
| DAR-010 | medium | Agree | Pass 1: `accept(Maybe x)`; `accept(42)` analyzes clean |
| DAR-011 | medium | Agree | Pass 1: `{value: T}` hoisted over `typedef T = dynamic`; `Box(value: 42)` accepted |
| DAR-012 | high | Duplicate of CA-01 | `date().year` throws `JsNoSuchMethodError` (pass 1) |
| DAR-013 | medium | Agree | Pass 1: `"ab"` binds JS property `ab`; runtime `_TypeError` |
| DAR-014 | medium | Duplicate of CA-11 | `#` → `URI_DOES_NOT_EXIST` (pass 1) |
| DAR-015 | medium | Agree | Pass 1: `asserts x is T` → `bool`; JS `undefined` lands in a non-nullable `bool` |
| DAR-016 | medium | Agree | Pass 1 (`WatchSession`): created file never emitted; next importer edit throws "node was removed or forgotten" |
| DAR-017 | medium | Agree | Pass 1: watch keeps `a.dart`'s own `Promise` where cold switches to shared support |
| DAR-018 | medium | Duplicate of CA-15 | |
| DAR-019 | medium | Duplicate of CA-13 | |
| DAR-020 | medium | Duplicate of CA-16 | |
| DAR-021 | medium | Agree | Pass 1: `external Child(T value)` over `typedef T = dynamic`; `Child(42)` accepted |
| DAR-022 | medium | Duplicate of CA-32 | Codex shape gives syntax errors; the closing fixture gives analyzer-clean injection |
| DAR-023 | medium | Agree | Pass 1: watch prints no semantic/emission diagnostics and ignores `-lv`; one-shot warns on the same input |

## New findings

None beyond VFY-001 and VFY-002 (recorded in the closing audit's verification).

## Proposed grouping

`12-MASTER-REPORT.md` root-cause clusters; the HG split proposed at triage follows them.
