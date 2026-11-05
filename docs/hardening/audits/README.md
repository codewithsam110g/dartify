# Audits

Independent audits of dartify, one folder each, numbered in order and named with what they audit and the commit
they audited (`NN-<kind>-<sha7>`). Each folder holds the audit's **documents only**, with a README listing them and every
rename made on import; run artifacts (build trees, binaries, logs, reproducers, fixtures) stay in the git-ignored `/audit/`
folder outside the history. Findings an audit raises go into the [findings register](../findings.md).

| # | Folder | Commit | Date | What | Outcome |
|---|---|---|---|---|---|
| 01 | [`01-closing-17e8aa9`](01-closing-17e8aa9/README.md) | `17e8aa9` | 2026-11 | Closing v1 audit (Claude session), `CA-01`–`CA-31`; verified with the release audit in a fresh session (adds `CA-32`, `CA-33`) | Imported 2026-11-05: 28 agree, 3 qualified, 1 duplicate, 1 already fixed; VFY-001, VFY-002 — [summary](01-closing-17e8aa9/summary.md) |
| 02 | [`02-release-17e8aa9`](02-release-17e8aa9/README.md) | `17e8aa9` | 2026-11 | Independent release audit (Codex session), `DAR-001`–`DAR-023`; the combined verified master report covers both | Imported 2026-11-05: 16 agree, 7 duplicates of CA findings — [verification](02-release-17e8aa9/verification.md) |
| — | — | after the gate | — | Closing audit: the fixes checked against the register | Planned |

## Each audit folder

```
NN-<kind>-<sha7>/
├── README.md         what each file is; renames on import; what was left out and where it stays
├── summary.md        start here: verdict counts, new findings, groups (written at intake)
├── verification.md   the planner's verdict on every finding, VFY-NNN, pushback with evidence
└── review/           the audit's own documents, text unedited apart from links
    ├── 00_request.md the request, with the user's words and scope changes verbatim
    ├── 01_plan.md    scope and the coverage denominator
    ├── master.md     P0/P1 first, root causes, coverage achieved
    └── findings.md   (and findings.json, per-area reports, verification/ if a Codex
                      $audit-verify pass ran)
```
