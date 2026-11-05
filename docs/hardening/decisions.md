# Hardening decisions

IDs are `HD-NN`, append-only, same rules as [../decisions.md](../decisions.md). A decision proposed but not yet agreed lives in
[pending.md](pending.md) under the number it will keep.

| ID | Decision | Date | Ref |
|----|----------|------|-----|
| HD-01 | The gate keeps its own decisions, register and briefs in `docs/hardening/`; the baseline commit is recorded in names, not as a git tag. Imported audits keep **documents only**: reproducers, probes, evidence scripts and logs of the two `17e8aa9` audits were untracked at D3 adoption and stay in the git-ignored `/audit/` (and in git history up to `c46a128`); each HG fix turns its reproducer into a test. | 2026-11-05 | |
