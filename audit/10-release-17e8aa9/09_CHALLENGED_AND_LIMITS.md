# Challenged candidates, rejected claims and limits

Every retained finding has a dedicated falsification field. These additional observations were deliberately not promoted:

| Candidate or tempting inference | Conclusion | Reason/evidence |
|---|---|---|
| Callable interface with members must fail legacy JS calls | Verified correct for probe | dart2js/Node calls the callable and returns 5 |
| Nullable function reference/call must be broken | Verified correct for probe | Native and Dart return n4 and null as expected |
| Multiline unsupported type must inject source into Dart comments | Verified correct for probe | Preserved normalized comment output analyzes clean |
| Fixed five-slot rest expansion is a defect | Verified correct as documented policy | Explicit reference/backend policy; only collision behavior is reported |
| No-argument generic should always expand TS defaults | Verified correct as documented policy | PLAN explicitly keeps raw zero-argument uses to Dart instantiate-to-bounds |
| Anonymous defaults/augmentations are silently lost by definition | Verified correct within documented policy | Suppression is documented/diagnosed; named export dispatch and watch warning loss have separate concrete proofs |
| Every TypeScript semantic error must abort | Unverified requirement | Tool intentionally supports named unresolved/degraded references; syntax acceptance has a narrower demonstrated inconsistency |
| Every dependency registry critical is a critical CLI exploit | Unverified application exposure | Version matching, developer-tool exposure and application reachability differ |
| Nonatomic multi-file writes are automatically a proven durability violation | Unverified | Failure exit signaling observed; no transactional/power-loss guarantee established |
| SymbolTable transaction draft/live accessor is definitely externally exploitable | Unverified | No real shipped external consumer path demonstrated; normal isolation gates pass |
| Old logger/legacy code should be deleted | Blocked | Historical exhibit is intentional; no Git-history necessity check authorized |
| Offline package-smoke failure proves missing production dependencies | Verified correct after harness correction | Pinned pnpm production-only rerun succeeds |
| Watch created-dependency case passes | Incorrect earlier control | Old b file contaminated one rerun; clean case fails and is retained |
| All quoted members in escaped-key probe fail | Unverified beyond first access | Runtime stops on first escaped getter; decoded-key control succeeds |

Coverage limits are explicit in MASTER.md and coverage.json: all live implementation/tests/local fixtures were manually read, but neither all 180,799 repository lines nor every prior historical finding was manually adjudicated. The full third-party .d.ts corpus is stress-executed; it is not a runtime correctness oracle. Existing snapshots are exactly rechecked plus sampled manual review. Historical audit status text is not accepted as current evidence.

The audit did not modify tracked sources, third-party fixtures or prior registers. All generated artifacts and installed dependencies are under this ignored folder. The only Git metadata write was the earlier explicitly authorized local exclude entry; after the user prohibited Git, none was accessed. Both original captured paths and the isolated tracked snapshot were finally rehashed: all 1,848 match the initial manifest. A changed ref with identical contents cannot be detected by that check.

Next independent step: $audit-verify in a fresh session. It should attempt to disprove each DAR finding against the intended fixed/current SHA, starting from the retained bytes and real consumer checks. No finding should be carried to a newer commit without revalidation.
