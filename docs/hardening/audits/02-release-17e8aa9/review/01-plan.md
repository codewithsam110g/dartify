# v1 release audit plan — approved; execution disposition below

Audited HEAD: `17e8aa932bd42aa9c667f40c2ac8567764799380`
Branch: `refactor/orchestration`; initial tracked tree clean.
Proposed stable finding prefix: `DAR`, starting at `DAR-001`, scoped to this audit.

## Scope and priorities

Independent outside release audit of this exact HEAD: generated Dart correctness and JS dispatch first; malformed, semantically wrong, unsupported and adversarial declaration inputs; CLI and filesystem behavior; diagnostics, error handling and truthful exit/reporting behavior; remaining library, watch/incremental, tooling, packaging, CI, dependency and security concerns. The input contract is declaration files, not arbitrary executable TypeScript. A `package:js` backend is the intentional v1 target.

No implementation fixes, commits, pushes, PRs, release/publish operations, production or remote changes, tracked report updates, or edits to third-party fixtures. Existing known findings are independent claims, not accepted evidence. No requirement to make the historical exhibit behave like the live compiler.

## HEAD attribution and evidence rules

- Every finding records the full audited SHA, repository-relative path, exact line, symbol/caller path, and a local clickable source reference plus immutable commit/blob link when origin supports it. Source links always pin the audited SHA, never a moving branch. The structured record includes `audited_head` and `source_blob` in addition to the required schema.
- Record input hashes, exact commands, tool versions, stdout/stderr, exit status, generated output and probe expectations inside this folder. Findings about outputs trace source input through parser, IR, semantic/linker and backend to the emitted artifact.
- Originally planned: recheck HEAD and tracked tree before major phases and completion. Superseded by the explicit no-Git instruction: verify captured source content hashes only; do not access refs or metadata. If either changes, stop attribution for the affected code, preserve the old evidence and report the mismatch. No evidence from a different commit is silently folded into this audit.
- Every candidate gets an attempted disproof: nearest passing control, documented intentional degradation, caller/config reachability, duplicate-root-cause check, and runtime evidence where practical. Rejected candidates are recorded with reasons. A passing snapshot/analyzer is not runtime dispatch proof.
- All claims use **Verified correct · Incorrect · Incomplete · Blocked · Unverified**. Confidence is separately **confirmed · probable · needs runtime evidence**. Separate static, local runtime and live deployment evidence.

## Coverage denominator

All **1,848 tracked files / 180,799 physical lines** at this HEAD are in the inventory. `02_COVERAGE.md` enumerates every file and planned method. `coverage.json` records Git blob IDs, SHA-256, planned method, later exact read ranges and evidence. Generated audit artifacts and installed third-party dependencies are not part of the tracked-file denominator. Dependencies receive package/version/reachability review separately.

| Area | Files | Lines |
|---|---:|---:|
| CI | 1 | 49 |
| dependency lock | 1 | 2,504 |
| historical exhibit | 4 | 2,457 |
| internal tools | 4 | 354 |
| live source | 73 | 12,606 |
| prior reports | 13 | 4,807 |
| reference corpus | 1,657 | 143,742 |
| root docs and configuration | 16 | 2,434 |
| snapshots | 4 | 5,501 |
| synthetic fixtures | 21 | 741 |
| tests and test assets | 54 | 5,604 |

Manual line-by-line reading covers all live source, test implementations and local test assets, synthetic fixtures, internal tooling, CI, root docs/configuration, historical exhibit and prior reports. Snapshots receive expectation-level review with runtime/compiler controls. The third-party/reference corpus and dependency lock receive full automated inventory and supported execution/validation, plus manual investigation of relevant slices; this is **not** a promise to manually read every third-party line. These files stay in the denominator, with automated/manual coverage reported separately; any unread, unexecuted or deferred area remains visible. Claims of comprehensive manual source review require completed per-file read ranges.

## Ordered work and checkboxes

### 1. Inventory and necessity

- [x] Read the project intent documents and inventory every top-level component, script, configuration, dependency and doc. This is a non-D3 project: there is no `docs/process.md` + `docs/decisions.md` pair.
- [ ] Map the shipped CLI graph, public/internal seams, generated tables, fixture consumers and preserved history; check reachability and relevant git history before cleanup recommendations. No deletion actions.
- [x] Establish an immutable HEAD snapshot below this folder for builds and tests. Inspect test harness write paths first. Use audit-contained working/output/cache/temp directories and frozen pnpm dependencies. Record actual Node/pnpm/Dart availability. No plain install/build/test invocation that can write outside the audit folder.

### 2. IVI: promises versus implementation

- [x] Map README, CLAUDE, PLAN, stage contracts, changelog, CLI help and documented acceptance claims to implementing symbols and meaningful tests. Treat historical promises as historical where stated.
- [x] Review declaration fidelity, name/JS identity, export/import resolution, host identity, aliases and supported/degraded semantics. Verify the claim of drop-in compatibility against the reference ledger and real-consumer contract.
- [ ] Only after the fresh code pass, compare prior registers with current HEAD and document independently confirmed, refuted and unverified claims without editing the registers.

### 3. Implementation defects — focus order

- [x] Read every live source file line by line, tracing both callers and consumers. Start at CLI/transpiler/resolution and follow generation → parsing/IR → semantic/linker → backend → filesystem/reporting.
- [x] Output correctness: JS annotations and roots; exported/global/module namespaces; class/interface dispatch; constructors, callable/constructable values, getters/setters, methods/fields, optional/rest/overloaded signatures; primitive/literal/union/intersection/tuple/object/function/generic types; bounds/defaults/substitution; inheritance and structural versus nominal typing; recursive/unsupported types; stdlib/browser mapping; name collisions/escaping/comments; barrels/augmentations/imports and stable output paths.
- [x] Invalid/mangled input: syntax truncations, invalid UTF-8/BOM and unusual line endings, executable `.ts` passed as declarations, wrong extensions and empty/comment-only files; duplicate/ambiguous/missing/cyclic imports; unresolved exports/names; inconsistent merges; malformed options and globs; recursion/resource limits and unsupported syntax. Check rejection versus explicit documented degradation, retained source/location, partial outputs and exit codes.
- [ ] CLI/filesystem: required and unknown flags, help/version, aliases/coercions, cwd/relative/absolute paths, spaces/unicode/platform separators, globs/no matches, invalid roots, stdout/stderr, permission/write failures, output collisions, input/output overlap, symlinks, stale files, deterministic repeated runs, interruption and watch cleanup. Exercise destructive-looking cases only in synthetic audit sandboxes.
- [x] Error/reporting: caught/uncaught failures, swallowed exceptions, diagnostic severity/location/aggregation, `EMIT_ERROR`, misleading summaries, process exit state, incomplete/partial generation and recovery.
- [x] Watch/programmatic API: owned state, repeat/concurrent calls, cache invalidation, deletion/rename/dependency/heritage changes, incremental-versus-cold equivalence and resource lifetime.
- [x] Review every test for what its assertions actually prove, missing negative cases, self-confirming snapshots, opt-in skips and exact baselines.

### 4. Deployment and release packaging (source and local package only)

- [x] Review CI gates, package exports/bin, Node/ESM compatibility, pinned package manager/lock, production-versus-dev dependency graph, packed artifact completeness and prepublish behavior. Build/pack locally into this folder, without publishing.
- [x] Run available default/typecheck/stage/conformance/fixture gates, then Dart analyzer/runtime, real-package e2e, incremental and stress gates from the isolated snapshot as feasible. Record every skip, missing SDK, timeout and failure; do not infer success from prior docs. Inspect mandatory checks before choosing exact commands.

### 5. Security

- [x] Assess untrusted declaration → diagnostics/output/path trust boundaries, output path escape/overwrite, dangerous dependency-resolution/filesystem behavior, escaping and comment/code injection, denial of service and dependency risks.
- [ ] Review current tree and relevant git history for credential exposure without reproducing values. Report locations and classification only. Use primary authoritative sources where external standards/advisory checks are needed, recording retrieval time. No live service probing or exploit execution outside synthetic local inputs.

## Runtime verification and containment

A pristine snapshot of this SHA under `work/` will preserve content identity while allowing harness-generated files within the ignored audit directory. Inputs, dependencies, tool caches, temporary homes/pub caches and tool outputs will be directed there where tools permit. Inspect scripts and test write paths before running; if a runner cannot be safely redirected, report the limitation rather than modifying tracked code or silently running it. Any audit-only wrapper/config change is labeled a harness adaptation, with exact diff and limitations. Pack/build/test results apply only to the audited source and recorded toolchain/platform. Local native runtime, analyzer, dart2js and live deployment evidence remain distinct. No live deployment check is authorized.

## Deliverables

- `00_REQUEST.md`, this plan, `02_COVERAGE.md`, `coverage.json`.
- Separate area reports with read ranges, verified behavior, candidate findings, rejected candidates, runtime evidence and gaps, in pass order.
- `findings.md` and `findings.json`, each record containing stable ID, severity, confidence, category, exact HEAD/file/line/symbol/blob, intent reference, evidence, reproduction, falsification, consequence, remediation direction and related IDs.
- `MASTER.md`: P0/P1 first regardless of category; collapse duplicate root causes; achieved/manual/automated/deferred coverage against the complete denominator; remaining check queue.
- `summary.md`: severity/category counts, fix groupings, release verdict and exact evidence limits.

## Approval checkpoint

The local-ignore exception is complete. This is a large audit; the audit skill requires approval of this concrete scope and coverage plan before the substantive audit begins. Approval also agrees to the `DAR` finding prefix and the explicitly separate manual-source versus automated-corpus coverage methods.

## Execution disposition

The later evidence/Git instruction in 00_REQUEST.md authorized proceeding with this plan. Inventory, isolated snapshot, all live source/test/fixture/tool/root-doc/history reading, output/CLI/watch/error probes, 11 baseline gates, coverage, package smoke and targeted security review are complete. No fixes were authorized or made.

Plan deviation kept explicit: full historical-report manual reading/closure remains Incomplete (1,124/4,807 lines marked read); all old claim lines were inventoried. No inherited status is used as proof. Git-history/ref checks are Blocked by the later prohibition. Other runtime/security/deployment limits are in MASTER.md. Original unchecked scope items above are the request checklist, not a false claim that unexecuted history/live work passed.

Remaining unchecked items above are deliberately partial/blocked: historical necessity/history access; full old-register closure; exhaustive platform/filesystem matrix; historical security exposure. All retained findings have completed falsification and concrete local proof.
