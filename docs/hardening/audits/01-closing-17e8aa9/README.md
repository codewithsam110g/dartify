# 01 — Closing v1 audit of `17e8aa9`

Closing audit of the `1.0.0` candidate (Claude session), findings `CA-01`–`CA-31`, followed by a fresh-session
re-run that added `CA-32` and `CA-33` and combined the result with the independent release audit
([../02-release-17e8aa9/](../02-release-17e8aa9/README.md)). Imported at D3 intake on 2026-11-05.

Start with [summary.md](summary.md).

| File | What |
|---|---|
| [summary.md](summary.md) | Intake summary: verdict counts, new findings, the HG split |
| [verification.md](verification.md) | The planner's intake verdict on every `CA` finding, `VFY-001`, `VFY-002` |
| [verification-pass1.md](verification-pass1.md) | The earlier fresh-session re-run of every CA finding, reproducer, falsification row and gate (Linux, Dart 3.13.7) |
| [combined-report.md](combined-report.md) | The combined, verified result of both audits: 48 distinct defects and the release verdict |
| [review/](review/) | The audit's own documents, text unedited apart from links |

## Renames on import

| Original (in `/audit/`) | Here |
|---|---|
| `10-closing-17e8aa9/00_REQUEST.md` … `60_CLOSING.md`, `MASTER.md`, `findings.md`, `findings.json`, `summary.md` | `review/00-request.md` … `review/60-closing.md`, `review/master.md`, `review/findings.md`, `review/findings.json`, `review/summary.md` (lowercase, `_` → `-`) |
| `11-closing-verification.md` | `verification-pass1.md` |
| `12-MASTER-REPORT.md` | `combined-report.md` |
| `10-closing-17e8aa9/verification.md` (written at intake) | `verification.md` |

## Left out

Run artifacts stay in the git-ignored `/audit/10-closing-17e8aa9/` and in git history up to `c46a128` (HD-01):
`fixtures/` (the reproducers: backend, CLI, runtime and watch cases) and `logs/`. Where the text cites one, the path
remains as plain text marked "not imported". Nothing private was found to remove from this folder.
