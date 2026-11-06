# Findings register

Every finding of the two v1 release audits ([01-closing](audits/01-closing-17e8aa9/README.md), [02-release](audits/02-release-17e8aa9/README.md)) at baseline `17e8aa9` (plus VFY-NNN from the verification and PLN-NNN found by the planner),
plus the open pre-D3 finding `T-11` from the [stage register](stage-register/FINDINGS.md), with the planner's triage 2026-11-05. The brief that fixes a finding updates its row at merge; the closing audit checks
each row.

- **Severity** is the audit's (high, medium, low), unless the verification changed it (then both, `medium→low`).
- **Verdict** is the verification's: Agree · Qualified · Probable · Duplicate · Disagree · Already fixed.
- **Reach** is how real use gets there: **R** ordinary inputs or user actions; **M** malformed inputs that real-world
  producers can emit; **A** only through a direct API call or a hostile input; **T** only in tests or tools; **D** docs.
- **Decision**: the HD that governs the fix ([decisions.md](decisions.md) or [pending.md](pending.md)); — means a plain
  defect against existing decisions.
- **Status**: `Open`, `Fixed (HG-N[, version])`, `Won't fix (reason)`, `Duplicate of …`, `Not a defect (evidence)`.

| ID | Finding | Severity | Verdict | Reach | Decision | Brief | Status |
|----|---------|----------|---------|-------|----------|-------|--------|

| `CA-01` | TypeScript `Date` is bound as Dart `DateTime`, which silently produces wrong values under dart2js | high | Agree | R | HD-02 | HG-4 | Open |
| `CA-02` | Watch mode diverges from a cold build when a module file's `declare global` declarations change | medium | Agree | R | — | HG-7 | Open |
| `CA-03` | Barrel re-exports are silently lost or renamed: import-then-export, `export * as ns`, and `export { A as B }` | medium | Agree | R | — | HG-3 | Open |
| `CA-04` | Members named like dart:core `Object` members produce analyzer errors (INVALID_OVERRIDE) | medium | Agree | R | — | HG-6 | Open |
| `CA-05` | A member that shares its enclosing type's name produces analyzer errors | low | Agree | R | — | HG-6 | Open |
| `CA-06` | Ambient external modules bind `@JS("<module specifier>.<name>")`; non-identifier specifiers crash dart2js | medium | Agree | R | HD-05 | HG-3 | Open |
| `CA-07` | Cross-file global declaration merging is unsupported: partial duplicate classes and `dynamic` use sites | medium | Agree | R | HD-06 | HG-3 | Open |
| `CA-08` | Default CLI output omits link failures (missing/ambiguous type references) | low | Agree | R | — | HG-2 | Open |
| `CA-09` | A bigint literal type with numeric separators (`1_000n`) aborts the whole run | low | Agree | R | — | HG-2 | Open |
| `CA-10` | The CLI/programmatic path does not report TypeScript syntax errors; malformed input yields plausible output and exit 0 | low→high | Duplicate | M | HD-13 | HG-2 | Duplicate of DAR-001 |
| `CA-11` | File names containing `'` or `$` produce invalid Dart import/export directives | low→medium | Agree | M | — | HG-5 | Open |
| `CA-12` | Private-use characters in source text are interpreted as backend placeholder tokens | low | Agree | A | — | HG-5 | Open |
| `CA-13` | Link report memoisation misreports symbols inside a reference cycle | low→medium | Agree | R | — | HG-2 | Open |
| `CA-14` | `.d.mts` / `.d.cts` inputs are silently dropped | low | Agree | R | HD-04 | HG-2 | Open |
| `CA-15` | Watch mode computes its root directory by string prefix, not by path segment | low→medium | Agree | R | — | HG-7 | Open |
| `CA-16` | A class whose constructors are all private/protected gets Dart's implicit public constructor | low→medium | Agree | R | — | HG-4 | Open |
| `CA-17` | CI installs Dart `stable` while the analyzer baseline is an exact census for Dart 3.13 | low | Qualified | T | HD-08 | HG-1 | Fixed (HG-1) |
| `CA-18` | CI hardening: actions pinned to mutable tags and no explicit `permissions:` | low | Agree | T | — | HG-1 | Fixed (HG-1) |
| `CA-19` | Lockfile pins dev tooling with critical advisories (Vitest UI arbitrary file read/execute, tinypool RCE gadgets) | medium | Agree | T | HD-12 | HG-1 | Fixed (HG-1) |
| `CA-20` | Production transitive glob libraries carry high ReDoS advisories | low | Agree | A | HD-12 | HG-1 | Fixed (HG-1): 0 critical/high; 1 moderate remains (`minimatch` GHSA-g3hv-75wg-m249 via `ts-morph > @ts-morph/common`, patched only in 11.x while the dependent declares `^10`; reach A, input globs only; recorded per HD-12, revisit when ts-morph widens the range) |
| `CA-21` | Documented gate numbers drifted from measured values | low | Agree | D | — | HG-8 | Open |
| `CA-22` | Finding registry integrity: `X-16` is assigned to two different findings; `Where` columns point to deleted files | low | Qualified | D | — | HG-8 | Open |
| `CA-23` | Several registered fixes work but have no regression test. Mutation re-run: reverting P-18 or E-20 fails the normal suite (conformance `type_aliases`/2.5, Leaflet smoke); only E-44's diagnostic and the misnamed optional-parameter test are uncovered | low | Qualified | T | — | HG-8 | Open |
| `CA-24` | No upgrade or rollback notes for existing 0.5.0 users | low | Agree | D | — | HG-8 | Open |
| `CA-25` | Distinct inline object types can hoist to the same anonymous FQN and be merged into one wrong shape | medium | Agree | R | — | HG-6 | Open |
| `CA-26` | `this` in a generic class is emitted as the raw type; the rationale in the code is stale | low | Agree | R | — | HG-4 | Open |
| `CA-27` | Watch-latency claims are only partly reproduced (Leaflet edit and three.js core edit) | low | Agree | D | HD-09 | HG-8 | Open |
| `CA-28` | The e2e oracle script is never executed by the suite | low | Agree | T | — | HG-8 | Open |
| `CA-29` | The platform-type registry has no committed generator or SDK validation script | low | Agree | T | HD-10 | HG-8 | Open |
| `CA-30` | The CLI is not invocation-compatible with js_facade_gen, and its semantics-changing flags are silently ignored | low | Agree | R | HD-07, HD-14 | HG-2 | Open |
| `CA-31` | Construct signatures on type-only interfaces are dropped without a diagnostic (and the class is marked `@anonymous`) | low | Agree | R | HD-11 | HG-4 | Open |
| `CA-32` | A lone CR in JSDoc escapes the `///` comment and injects Dart declarations (found by the independent re-run and, independently, as codex `DAR-022`; it overturns the closing audit's "falsified" lone-CR row) | medium | Agree | M | — | HG-5 | Open |
| `CA-33` | The closing-audit registration corrupted this file: a `$`-pattern in the `CA-11` title spliced a copy of the header and every pre-CA row into that row, and `CA-30`/`CA-31` sit outside any table | low | Already fixed | D | — | — | Fixed (D3 adoption, `18a3b0b`) |
| `DAR-001` | Filesystem compilation accepts malformed declarations and reports success | high | Agree | M | HD-13 | HG-2 | Open |
| `DAR-002` | Explicit input failures are silently dropped when another file is readable | medium | Agree | R | HD-04 | HG-2 | Open |
| `DAR-003` | Export identity is ignored when choosing JavaScript dispatch paths | high | Agree | R | — | HG-3 | Open |
| `DAR-004` | Named re-exports lose aliases and cannot traverse barrels | medium | Duplicate | R | — | HG-3 | Duplicate of CA-03 (union: adds chained barrels and renames) |
| `DAR-005` | Parameter lowering introduces keywords and duplicate names after allocation | medium | Agree | R | — | HG-6 | Open |
| `DAR-006` | Override arity correction fails through a second inheritance level | medium | Agree | R | — | HG-6 | Open |
| `DAR-007` | Inherited static-member hoisting creates unreserved top-level names | medium | Agree | R | — | HG-6 | Open |
| `DAR-008` | Minted alias references retain a name that semantic allocation renames | medium | Agree | R | — | HG-6 | Open |
| `DAR-009` | Dependent generic defaults resolve against the caller binder | medium | Agree | R | — | HG-4 | Open |
| `DAR-010` | Nullable generic aliases discard their explicit type arguments | medium | Agree | R | — | HG-4 | Open |
| `DAR-011` | Hoisted object literals lose enclosing generic parameters | medium | Agree | R | — | HG-4 | Open |
| `DAR-012` | JavaScript Date is exposed as Dart DateTime without conversion | high | Duplicate | R | HD-02 | HG-4 | Duplicate of CA-01 |
| `DAR-013` | Quoted member names keep TypeScript escape text instead of the decoded key | medium | Agree | R | — | HG-5 | Open |
| `DAR-014` | Sibling Dart imports embed raw filenames as unescaped URIs | medium | Duplicate | M | — | HG-5 | Duplicate of CA-11 (union: adds `#`) |
| `DAR-015` | Assertion signatures are emitted as boolean-returning functions | medium | Agree | R | — | HG-4 | Open |
| `DAR-016` | Watch cannot recover when a previously missing imported file is created | medium | Agree | R | — | HG-7 | Open |
| `DAR-017` | Watch misses the transition from one emitted library to shared support | medium | Agree | R | — | HG-7 | Open |
| `DAR-018` | CLI watch chooses a common root by textual prefix | medium | Duplicate | R | — | HG-7 | Duplicate of CA-15 |
| `DAR-019` | Linker caches successful members of cycles before discovering a missing dependency | medium | Duplicate | R | — | HG-2 | Duplicate of CA-13 |
| `DAR-020` | Private-only constructors leave a public implicit Dart constructor | medium | Duplicate | R | — | HG-4 | Duplicate of CA-16 |
| `DAR-021` | Inherited constructors do not substitute superclass generic arguments | medium | Agree | R | — | HG-4 | Open |
| `DAR-022` | Carriage-return-only JSDoc escapes the generated Dart comment | medium | Duplicate | M | — | HG-5 | Duplicate of CA-32 |
| `DAR-023` | Watch CLI suppresses diagnostic warnings that one-shot mode reports | medium | Agree | R | — | HG-2 | Open |
| `T-11` | String literal values are unquoted but not unescaped (`type/literals.ts:43`); same class as DAR-013 | low | Agree (inspection) | R | — | HG-5 | Open |
| `VFY-001` | The run-isolation test has no explicit timeout and fails under coverage instrumentation (32.8 s vs 30 s) | low | Agree | T | — | HG-1 | Fixed (HG-1) |
| `VFY-002` | The CLI bundle inlines all of `package.json` (scripts, devDependencies) to read `version` | low | Agree | R | — | HG-1 | Fixed (HG-1) |

**Counts:** 59 rows = 48 distinct defects (3 high, 26 medium, 19 low) + 8 duplicates + `T-11` + 2 VFY. Open: 44 · Fixed: 7 (`CA-33`; HG-1: `CA-17`–`CA-20`, `VFY-001`, `VFY-002`) · Duplicate: 8 (`CA-10` and seven `DAR`); each duplicate closes with its twin.
