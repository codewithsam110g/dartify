# CLI, mangled inputs, watch and error reporting

**Coverage:** cli.ts, transpiler.ts, watch.ts, resolution and report formatters read completely as part of the 73-file source pass. Checked-in CLI/reporting/generation/watch tests read completely; default, incremental and e2e gates executed. Built CLI used for adverse cases; WatchSession used for controlled differential cases.

**Incorrect:** DAR-001/002 (input validation), DAR-016/017/018 (watch freshness), DAR-019 (truthful link states), DAR-023 (watch reporting). The output defects in findings.md also have error-reporting implications, but their roots are not duplicated as extra findings.

| Case | Local result | Conclusion |
|---|---|---|
| Valid declaration / BOM / CRLF / unicode identifier | CLI exits 0 | Verified correct for these examples |
| Missing single file / no-match glob | CLI exits 1 | Verified correct |
| Valid + explicit missing file | Exit 0, missing file hidden without -l | Incorrect, DAR-002 |
| Directory operand named .d.ts | Exit 0, no Dart | Incorrect, DAR-002 |
| Truncated signature / missing type / invalid UTF-8 identifier | Exit 0, recovery AST emitted | Incorrect, DAR-001 |
| Invalid byte in a comment | Exit 0 | Observed; separate encoding strictness policy Unverified, not a separate finding |
| Declaration file with executable body/statement | Exit 0 | Incomplete declaration-only validation; retained in CLI matrix, not treated as arbitrary TS support requirement |
| Missing tsconfig | Exit 1 with diagnostic | Verified correct |
| Output directory already a regular file | Exit 1 with EEXIST context | Verified correct failure signaling; partial multi-file atomicity not proven |
| Numeric/repeated malformed options | Exit 1 with raw path/option error | Observed poor polish; no extra severity finding without a stronger contract |
| Unknown --ouput flag | Accepted | Optional strict-option improvement; no separate blocker claimed |
| Dry-run on missing input | Exit 0, would process 0 | Included in DAR-002 input policy |
| Forced generation failure in existing tests | Errors returned, writes blocked | Verified correct in targeted suite |
| Watch normal edited declarations/global/barrel/export-root cases | Equals cold | Verified correct for the retained controls |
| Create missing dependency during session | Stale output; importer edit throws | Incorrect, DAR-016 |
| Empty loaded file gains Promise API | Cached library keeps local Promise | Incorrect, DAR-017; consumer analyzer fails |
| Explicit sibling-prefix input directories | Native watcher misses one input | Incorrect, DAR-018 |
| Unsupported computed member warning | One-shot warns, watch says wrote 1 | Incorrect reporting, DAR-023 |

Evidence: probes/cli/results.json, probes/cli-additional/results.json, probes/watch/results.json, probes/watch-impact/result.json, probes/cli-watch/result.json probes/watch-reporting/results.json and probes/fs-boundary/results.json. These retain command arguments, exits or explicit harness termination, stdout/stderr and emitted content. Paths, spaces and URI metacharacters were exercised in synthetic inputs; no claim of Windows-native filesystem verification.

For watch-reporting rerun `python3 audit/10-release-17e8aa9/probes/watch-reporting.py`. The two CLI watch reproducers terminate only their own child PID. watch-probes.ts removes only its own audit scenario folders before each case; the earlier contaminated control is quarantined and excluded from final proof.

**Verified correct within added filesystem checks:** spaces, Unicode input/output paths, input symlink and source/output overlap complete with exit 0 and the source hash unchanged. A real read-only output directory under unprivileged UID 501 reports EACCES and exit 1. A single unreadable input fails; mixed readable/unreadable input silently succeeds, further proving DAR-002. Permission modes were restored in finally. See probes/fs-boundary/results.json.

**Unverified:** OS permission configurations beyond these synthetic owner-permission cases; power loss or transactional multi-output durability; infinite/very large declaration denial-of-service budgets; OS signal handling beyond stopping our own synthetic watch runs. Existing depth/recursive tests and stress are bounded local evidence, not resource-exhaustion proof.
