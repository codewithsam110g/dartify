# 02 — Independent release audit of `17e8aa9`

Independent release audit of the `1.0.0` candidate (Codex session, `codex-audit` branch, merged unchanged), findings
`DAR-001`–`DAR-023`. Its combined verification with the closing audit is in
[../01-closing-17e8aa9/combined-report.md](../01-closing-17e8aa9/combined-report.md). Imported at D3 intake on
2026-11-05.

Start with [../01-closing-17e8aa9/summary.md](../01-closing-17e8aa9/summary.md), which covers both audits.

| File | What |
|---|---|
| [verification.md](verification.md) | The planner's intake verdict on every `DAR` finding |
| [review/](review/) | The audit's own documents, text unedited apart from links and the path scrub below |

## Renames on import

| Original (in `/audit/10-release-17e8aa9/`) | Here |
|---|---|
| `00_REQUEST.md` … `09_CHALLENGED_AND_LIMITS.md`, `MASTER.md`, `PUBLICATION.md`, `REMAINING_MANUAL_READ.md`, `REPRODUCE.md`, `findings.md`, `findings.json`, `candidates.json`, `summary.md` | `review/<same name>` in lowercase with `_` → `-` (e.g. `review/09-challenged-and-limits.md`, `review/remaining-manual-read.md`) |
| `verification.md` (written at intake) | `verification.md` |

## Removed or changed on import

- **Local paths:** 131 absolute paths under the user's home directory were rewritten: the repository prefix to
  `<repo>/` (128) and the rest to `~/` (3). Nothing else in the text was changed.
- **Links to run artifacts** became plain text marked "not imported".

## Left out

Run artifacts stay in the git-ignored `/audit/10-release-17e8aa9/` and in git history up to `c46a128` (HD-01):
`probes/` (402 files), `evidence/` (gate logs, dependency audit, package tarball, hashes), `package-smoke/`, the Python
drivers (`prepare_work.py`, `run_gates.py`, `verify_evidence.py`, `write_findings.py`, `write_reports.py`),
`coverage.json`, `PUBLICATION_MANIFEST.json`, and the never-tracked `work/` source snapshot, `cache/`, `home/` and `tmp/`.
The findings' GitHub permalinks are pinned to `17e8aa9` and stay valid.
