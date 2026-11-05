# Planner verification — closing audit `CA-01`–`CA-33` (baseline `17e8aa9`)

Intake of `10-closing-17e8aa9/` into the hardening gate (2026-11-05). The release audit `DAR-*` has its own
verification in `10-release-17e8aa9/verification.md`; the two overlap on eight defects.

## Method and limits

- **Two passes.** (1) A fresh-session re-run of every finding, reproducer, falsification row and gate on Linux x64,
  Dart 3.13.7, recorded in `11-closing-verification.md` and combined with the release audit in `12-MASTER-REPORT.md`.
  (2) This intake, on macOS arm64 with Dart 3.13.5 and Node, which re-ran a risk-weighted sample of the findings
  independently instead of re-running all of them. The user agreed to this scope at intake.
- **Code delta.** `git diff 17e8aa9..18a3b0b` touches no file under `src/`, `tools/`, `.github/` or `package.json`.
  The only `test/` changes are two comment lines from the D3 adoption, so every verdict holds at HEAD and nothing is
  *Already fixed* except `CA-33`.
- **Re-run at intake** (outputs in `/audit/intake-spotcheck/`): `CA-01` (dart2js + Node: `now().year = NaN`,
  `yearOf(DateTime.utc(2030)) = not a Date: object`), `CA-32` (`lonecr.dart` keeps a raw CR; a consumer calling
  `injected()` gets `dart analyze`: *No issues found*), `CA-25` (`-lv`: `merges=1`, `A` and `A$` both link to
  `Anon_A_property_0_x {p, q}`), `CA-03` via the overlapping `DAR-004` trigger (`probe.dart` exports nothing) and
  `CA-10` via the overlapping `DAR-001` trigger (exit 0, `fine` absorbed into `broken(…)`, no diagnostic).
- **Not re-run at intake:** everything else. Those verdicts rest on pass (1), which re-executed each one. `CA-17`'s
  impact under newer SDKs was never reproduced by anyone; only the configuration is confirmed.

## Verdicts

| Verdict | Count | IDs |
|---|---:|---|
| Agree | 28 | CA-01–09, CA-11–16, CA-18–21, CA-24–32 |
| Agree with qualification | 3 | CA-17 (configuration only), CA-22 (worse: see CA-33), CA-23 (partly refuted) |
| Duplicate | 1 | CA-10 → DAR-001 |
| Already fixed | 1 | CA-33 (D3 adoption, `18a3b0b`) |
| Disagree | 0 | |

Severities follow `12-MASTER-REPORT.md` (the higher of the two audits where they overlap). Raised from the closing
audit's own rating: CA-10 low→high (as DAR-001), CA-11 low→medium, CA-13 low→medium, CA-15 low→medium, CA-16
low→medium.

| ID | Sev. | Verdict | Evidence / qualification |
|---|---|---|---|
| CA-01 | high | Agree | Re-run at intake (above). Same defect as DAR-012, which throws `JsNoSuchMethodError` for another call shape |
| CA-02 | medium | Agree | Pass 1: `b.dart` watch `typedef Gfoo = dynamic` vs cold `import 'c.dart' show Gfoo`; link valid 1 vs 2 |
| CA-03 | medium | Agree | Re-run (DAR-004 trigger) + pass 1: import-then-export and `export * as ns` emit nothing; `export {A as B}` → `show A` |
| CA-04 | medium | Agree | Pass 1: 5 × `INVALID_OVERRIDE` |
| CA-05 | low | Agree | Pass 1: `MEMBER_WITH_CLASS_NAME` ×2 and constructor errors |
| CA-06 | medium | Agree | Pass 1: `@JS("@scope/pkg.make")`, analyzer clean, dart2js crashes; `--js-root` ignored |
| CA-07 | medium | Agree | Pass 1: two partial `Settings`; `typedef Settings_cdbad5 = dynamic`; 1 ambiguous edge |
| CA-08 | low | Agree | Pass 1: default output "0 unresolved references", `-l` shows 1 broken |
| CA-09 | low | Agree | Pass 1: `Cannot convert 1_000 to a BigInt`, exit 1, nothing written |
| CA-10 | high | Duplicate of DAR-001 | DAR-001 is the stronger statement: recovery can absorb the next declaration |
| CA-11 | medium | Agree | Pass 1: `UNTERMINATED_STRING_LITERAL`, `URI_WITH_INTERPOLATION`. Fixed together with DAR-014 (`#`) |
| CA-12 | low | Agree | Pass 1: private-use doc text rewritten to `Foo` |
| CA-13 | medium | Agree | Pass 1: `B => LinkedResolved` though it reaches broken `A`. Same as DAR-019 |
| CA-14 | low | Agree | Pass 1: `.d.mts` alone exit 1; mixed silently dropped |
| CA-15 | medium | Agree | Pass 1 (real `-w`): `types2` edits → 0 rebuilds. Same as DAR-018 |
| CA-16 | medium | Agree | Pass 1: dart2js constructs a local object. Same as DAR-020 |
| CA-17 | low | Qualified | `ci.yml` `sdk: stable` vs a 3.13-exact census is real; impact under 3.14+/3.15 not reproduced |
| CA-18 | low | Agree | Mutable `@v4`/`@v1` tags, no `permissions:` |
| CA-19 | medium | Agree | `pnpm audit`: 53 advisories, 3 critical (vitest 3.2.4 UI, tinypool ×2). Dev tooling only |
| CA-20 | low | Agree | `pnpm audit --prod`: 9 (6 high ReDoS) in glob matchers; reachable only through input globs |
| CA-21 | low | Agree | 1,661 files / 720 empty, S4 54/54, 262.72 KB, 90.43 % vs documented numbers |
| CA-22 | low | Qualified | Two `X-16` rows and `Where` columns citing deleted `emitter/old/*`; the register was also corrupted (CA-33) |
| CA-23 | low | Qualified | Mutation test: reverting P-18 or E-20 fails the suite; only E-44's `NATIVE_NAME_CONFLICT` and the misnamed optional-parameter test remain uncovered |
| CA-24 | low | Agree | `[1.0.0]` has no breaking-change / migration / rollback notes |
| CA-25 | medium | Agree | Re-run at intake (above) |
| CA-26 | low | Agree | `external Box clone();` in `Box<T>`; stale `E-03` rationale; `tier-a.test.ts:43` locks it |
| CA-27 | low | Agree | `pnpm bench`: Leaflet leaf 204.7 ms, three.js core 909.3 ms vs "under 100 ms" |
| CA-28 | low | Agree | Nothing runs `expected.cjs`; all three oracles match by hand today |
| CA-29 | low | Agree | No generator or validator for `browserTypes.ts` in `tools/` |
| CA-30 | low | Agree | js_facade_gen invocations fail; its five flags are accepted and ignored (byte-identical output) |
| CA-31 | low | Agree | `Constructable { new (n): Box<number> }` → `@anonymous abstract class Constructable {}`, no diagnostic |
| CA-32 | medium | Agree | Re-run at intake (above). The closing audit had marked it falsified; independently found as DAR-022 |
| CA-33 | low | Already fixed | Register repaired when it moved to `docs/hardening/stage-register/FINDINGS.md` (`18a3b0b`) |

## New findings (VFY)

### VFY-001 — The run-isolation test has no explicit timeout and fails under coverage instrumentation

- **Severity:** low · **Reach:** T · **Location:** `test/run-isolation.test.ts:33`; `vitest.config.ts:32`
  (`testTimeout: 30000`)
- **Evidence:** pass 1 observed "overlapping transpileFromString calls never observe each other" at 32.8 s in two
  consecutive `pnpm test:coverage` runs on 4 CPUs; it passes with `--testTimeout=180000` and in the plain suite. CI
  runs `test:coverage`, so a slower runner can turn red without a code change.
- **Remediation:** give the test an explicit timeout sized for instrumentation, or reduce its work.

### VFY-002 — The CLI bundle inlines all of `package.json`

- **Severity:** low · **Reach:** R · **Location:** `src/cli.ts:18` (`import pkg from "../package.json"`)
- **Evidence:** `dist/cli.js` contains the `devDependencies` block (1 match), along with `scripts`, only to read
  `version`. No dev code is bundled, so finding `D-07` (bundle composition) still holds; this is metadata leakage and
  size.
- **Remediation:** import only the version (a build-time define, or a JSON import the bundler tree-shakes).

## Proposed grouping

See `12-MASTER-REPORT.md` "root cause clusters"; the HG split proposed at triage follows those clusters.
