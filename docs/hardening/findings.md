# Findings register

Every finding of the audits at baseline `17e8aa9` (plus VFY-NNN from the verification and PLN-NNN found by the planner),
with the planner's triage (pending `/d3-audit intake`). The brief that fixes a finding updates its row at merge; the closing audit checks
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

<!-- Filled at /d3-audit intake from audits/01-closing-17e8aa9 and audits/02-release-17e8aa9 (48 verified findings) plus
     the open pre-D3 findings (T-11; I-12, E-41 and W-01 are benign/accepted notes in the stage register). CA-33 was
     fixed at D3 adoption (the stage-register FINDINGS.md was repaired when it moved). -->
