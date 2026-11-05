# v1 release audit — 17e8aa9

**Verdict: not ready for an unconditional v1 correctness claim.** The measured project gates pass, but 23 independently reproduced defects remain: **0 critical, 3 high (P1), 20 medium**. All are confidence **confirmed**, conclusion **Incorrect** under their explicit triggers. No speculative security finding is included in that count.

The three P1 findings are DAR-001 (malformed filesystem inputs falsely succeed), DAR-003 (default/export-assignment/aliased exports dispatch to nonexistent JS properties), and DAR-012 (JS Date is exposed as an incompatible Dart DateTime). These are first priority regardless of report category.

| ID | Severity | Finding |
| --- | --- | --- |
| [DAR-001](findings.md#dar-001) | high | Filesystem compilation accepts malformed declarations and reports success |
| [DAR-003](findings.md#dar-003) | high | Export identity is ignored when choosing JavaScript dispatch paths |
| [DAR-012](findings.md#dar-012) | high | JavaScript Date is exposed as Dart DateTime without conversion |
| [DAR-002](findings.md#dar-002) | medium | Explicit input failures are silently dropped when another file is readable |
| [DAR-004](findings.md#dar-004) | medium | Named re-exports lose aliases and cannot traverse barrels |
| [DAR-005](findings.md#dar-005) | medium | Parameter lowering introduces keywords and duplicate names after allocation |
| [DAR-006](findings.md#dar-006) | medium | Override arity correction fails through a second inheritance level |
| [DAR-007](findings.md#dar-007) | medium | Inherited static-member hoisting creates unreserved top-level names |
| [DAR-008](findings.md#dar-008) | medium | Minted alias references retain a name that semantic allocation renames |
| [DAR-009](findings.md#dar-009) | medium | Dependent generic defaults resolve against the caller binder |
| [DAR-010](findings.md#dar-010) | medium | Nullable generic aliases discard their explicit type arguments |
| [DAR-011](findings.md#dar-011) | medium | Hoisted object literals lose enclosing generic parameters |
| [DAR-013](findings.md#dar-013) | medium | Quoted member names keep TypeScript escape text instead of the decoded key |
| [DAR-014](findings.md#dar-014) | medium | Sibling Dart imports embed raw filenames as unescaped URIs |
| [DAR-015](findings.md#dar-015) | medium | Assertion signatures are emitted as boolean-returning functions |
| [DAR-016](findings.md#dar-016) | medium | Watch cannot recover when a previously missing imported file is created |
| [DAR-017](findings.md#dar-017) | medium | Watch misses the transition from one emitted library to shared support |
| [DAR-018](findings.md#dar-018) | medium | CLI watch chooses a common root by textual prefix |
| [DAR-019](findings.md#dar-019) | medium | Linker caches successful members of cycles before discovering a missing dependency |
| [DAR-020](findings.md#dar-020) | medium | Private-only constructors leave a public implicit Dart constructor |
| [DAR-021](findings.md#dar-021) | medium | Inherited constructors do not substitute superclass generic arguments |
| [DAR-022](findings.md#dar-022) | medium | Carriage-return-only JSDoc escapes the generated Dart comment |
| [DAR-023](findings.md#dar-023) | medium | Watch CLI suppresses diagnostic warnings that one-shot mode reports |

## Attribution and method

Every finding pins full commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, exact source file/line, captured Git blob and SHA256, a SHA-pinned source permalink, retained source/input/output evidence, repro command, attempted falsification, concrete consequence and remediation direction. See [findings.md](findings.md) and [findings.json](findings.json). Related old IDs are references, not inherited conclusions. No fixes or tracked register updates were made.

The initial tree/HEAD were captured before the no-Git instruction. After that instruction no Git command or metadata read/write occurred. Final content checks match **all 1,848 captured files** in both the repository and isolated snapshot. This proves source-content identity with the captured HEAD, **not a fresh ref-pointer check** or remote availability of constructed GitHub permalinks. No newer commit's evidence is folded in. evidence/final-integrity.json records the check without source contents.

Single auditor, no subagents. Audit skill: ~/.claude-shared/d3/codex-skills/audit/SKILL.md. Session included memory instructions but no project memory was consulted; this is not claimed to be a confirmed memory-disabled audit-profile run. Runtime probes are local macOS arm64; static, local runtime and live evidence are kept separate. No live/production action or remote write was performed.

## Achieved coverage against the complete denominator

| Area | Files | Total lines | Manually read lines | Fully read files |
| --- | ---: | ---: | ---: | ---: |
| CI | 1 | 49 | 49 | 1 |
| dependency lock | 1 | 2504 | 0 | 0 |
| historical exhibit | 4 | 2457 | 2457 | 4 |
| internal tools | 4 | 354 | 354 | 4 |
| live source | 73 | 12606 | 12606 | 73 |
| prior reports | 13 | 4807 | 1124 | 4 |
| reference corpus | 1657 | 143742 | 125 | 7 |
| root docs and configuration | 16 | 2434 | 2434 | 16 |
| snapshots | 4 | 5501 | 420 | 0 |
| synthetic fixtures | 21 | 741 | 741 | 21 |
| tests and test assets | 54 | 5604 | 5604 | 54 |

**Full manual implementation coverage:** all 73 live source files / 12,606 lines, all tests/local test assets, synthetic fixtures, internal tools, CI, root docs/configuration and historical exhibit. Every captured file has a disposition and hash in coverage.json. Full source reading does not prove every behavior correct.

**Automated coverage:** 1,661 declaration files in stress (1,645 reference + 16 synthetic), all default/conformance/snapshot assertions, categorized Dart analyzer baseline, actual-library dart2js e2e, checked-in incremental scenarios, locked dependency install/audit and package smoke. The third-party corpus and lock were not represented as manually read line by line. Snapshots have exact comparisons plus manually reviewed slices.

**Incomplete planned historical-document scope:** 1,124/4,807 prior-report lines are conservatively marked read. All 524 historical claim-bearing lines were machine-inventoried; not every old row was independently closed. The unread 3,683 lines remain in the denominator. No historical claim is required to prove a retained DAR finding. This is a fresh source/release audit, not a completed closing audit of the entire historical register.

## Verification

All 11 requested baseline gates passed: typecheck, build, default (299 passed / 10 opt-in skipped), S2/S3/S4/S5, Dart, actual-library e2e, incremental and stress (1,661 files; 720 classified empties). Coverage also passed: 90.43% lines, 86.72% branches, 96.41% functions. The opt-in tiers were run separately; default skips are not silently called executed. Package tarball production-only install/version/help/h3 generation passed with pinned pnpm. Logs are in evidence/gate-*.log and package-smoke/results.json.

Targeted probes expose gaps beyond those green gates: strict TS inputs, Dart analyzer/compiler errors, wrong runtime dispatch, consumer API/type checks and incremental/cold comparisons. Expected negative analyzer/consumer exits are proof outputs, not baseline failures. Commands and environment are in [REPRODUCE.md](reproduce.md). All 23 retained proof-artifact predicates pass in evidence/proof-validation.json; these assertions validate the evidence files and do not replace the actual compiler/runtime executions.

## Fix groupings and next independent work

1. Input/failure boundary: DAR-001/002; shared ordinary/watch reporting DAR-023.
2. Module identity/public API: DAR-003/004.
3. Names, literals and comments: DAR-005/007/008/013/014/022.
4. Type and class fidelity: DAR-006/009/010/011/012/015/020/021.
5. Incremental state/reporting: DAR-016/017/018/019.

Preserve each ID when triaging and add regression assertions against actual public consumers/runtime behavior. First have a fresh $audit-verify session independently challenge these records. Do not reuse their status at a later HEAD without rerunning proof against that source.

**Blocked by user constraint:** final ref-pointer check, history/blame-based necessity analysis and historical secret exposure. **Unverified/deferred:** hosted CI, Node 20/22 native runtime, Windows/Linux/browser-native execution, registry-publication/live installation, unbounded resource exhaustion, full per-advisory exploit reachability, power-loss durability and remaining historical register adjudication. No P0/P1 is manufactured from these gaps.

Reports, in pass order: [inventory/IVI](03-inventory-ivi.md), [IVI](04-ivi.md), [implementation](05-output-implementation.md), [CLI/watch/errors](06-cli-watch-errors.md), [release](07-release.md), [security](08-security.md), [challenged candidates and limits](09-challenged-and-limits.md).
