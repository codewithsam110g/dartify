# The hardening gate (HG)

**Baseline: `17e8aa932bd42aa9c667f40c2ac8567764799380`** (`refactor/orchestration`, the `1.0.0` candidate, 2026-11-05). Every finding, decision and brief in this folder is written against
that commit, and every HG fix lands after it. The baseline is recorded in names (this README, `audits/01-closing-17e8aa9/`, `audits/02-release-17e8aa9/`),
not as a git tag.

The hardening gate is an engineering gate, not a feature milestone (D-30). It starts from an **outside audit** and the
planner's **independent verification** of it, and it carries any hardening items already on the roadmap. When the gate is
done, a fresh, clean audit checks the fixes against [findings.md](findings.md).

## What's here

| Path | What |
|---|---|
| [decisions.md](decisions.md) | The gate's decisions, **HD-NN**. As binding as `D-NN`; where one changes a `D-NN`, that row in [../decisions.md](../decisions.md) points here |
| [pending.md](pending.md) | Decisions proposed but not yet agreed, kept until their brief comes up |
| [findings.md](findings.md) | The register: every finding with its reach, decision, brief and status |
| [milestones/](milestones/) | The gate's briefs, **HG-N** |
| [audits/](audits/README.md) | The audits, one numbered folder each (`NN-<kind>-<sha7>`), **documents only** |

## How an audit comes in

1. **Outside.** The audit runs outside this repo's normal loop (another session, model or tool, or a person), from a request
   written with `/d3-audit request`. It works only inside the repository's **git-ignored `/audit/`** folder: its reports,
   logs, build trees, reproducers and fixtures live there and are **never committed**.
2. **Verification** (the planner, `/d3-audit intake`). Every finding gets a verdict against the audited commit and the
   current tree: *Agree*, *Agree with qualification*, *Probable* (mechanism plausible, evidence incomplete), *Duplicate of*,
   *Disagree* (pushed back, with evidence), *Already fixed*. New defects found while verifying are `VFY-NNN`. The
   verification is a document of its own; it is not softened to agree with the audit, and not inflated to look thorough.
3. **Triage with the user.** The verdicts, the proposed decisions and the proposed brief split are agreed before anything
   is imported.
4. **Import.** The audit's documents are copied into `audits/NN-<kind>-<sha7>/` (renamed to lowercase, links rewritten,
   local paths and private details removed; every rename listed in that folder's README). Run artifacts stay in `/audit/`.
5. **Register and plan.** Findings go into [findings.md](findings.md); agreed decisions into [decisions.md](decisions.md),
   the rest into [pending.md](pending.md); briefs HG-1… into [milestones/](milestones/); a roadmap row for the gate.
6. **Close.** Each HG brief updates its rows at merge. The gate closes when the exit criteria hold and a closing audit
   has checked every row.

## IDs

- **CA-NN** (closing audit, Claude session) and **DAR-NNN** (release audit, Codex session): the outside audits' findings,
  keeping their own IDs. `CA-32` and `CA-33` were added by the fresh-session verification of both audits.
- **Pre-D3 IDs** (`R- P- T- I- L- E- D- X- W-`): the stage register in [stage-register/](stage-register/README.md);
  its still-open findings are carried into [findings.md](findings.md) with their IDs unchanged (D-17).
- **VFY-NNN**: new findings from the planner's verification.
- **PLN-NNN**: defects the planner finds during the gate, outside the audits.
- **HD-NN**: hardening decisions. **HG-N**: hardening briefs.

## Exit criteria

- Every finding in [findings.md](findings.md) is `Fixed`, or closed by an explicit HD decision (Won't fix / known issue,
  with the reason) — none by omission (D-30).
- Each fix carries a regression test (a reproducer from the audit becomes a test) and every site of the finding's
  *class* was checked, not only its wording (process.md guardrail 18).
- The gate in [../process.md](../process.md) is green on macOS and `linuxbox`, and `pnpm test:stress` is clean.
- The documented numbers (README, ROADMAP, CLAUDE.md, process.md) are re-measured (`CA-21`).
- A fresh closing audit has checked every row.

## The split

| Brief | Scope | Findings | Decisions | Status |
|---|---|---|---|---|
| HG-1 | Toolchain and CI first, so every later fix is tested on the final toolchain | CA-19, CA-20, CA-17, CA-18, VFY-001, VFY-002 | HD-08, HD-12 | Done 2026-11-05 — [brief](milestones/HG-1.md) (fix1: D-32) |
| HG-2 | Input boundary and CLI reporting (high: DAR-001) | DAR-001, DAR-002, CA-14, CA-09, CA-08, CA-13, CA-30, DAR-023 | HD-03, HD-04, HD-07 | Planned |
| HG-3 | Module and export identity (high: DAR-003) | DAR-003, CA-03, CA-06, CA-07 | HD-05, HD-06 | Planned |
| HG-4 | Type and class fidelity (high: CA-01) | CA-01, DAR-009, DAR-010, DAR-011, DAR-021, DAR-015, CA-16, CA-26, CA-31 | HD-02, HD-11 | Planned |
| HG-5 | Text and URI legality | CA-32, CA-11, CA-12, DAR-013, T-11 | — | Planned |
| HG-6 | Name allocation | CA-04, CA-05, DAR-005, DAR-006, DAR-007, DAR-008, CA-25 | — | Planned |
| HG-7 | Watch state | CA-02, DAR-016, DAR-017, CA-15 | — | Planned |
| HG-8 | Records, tests and docs; every documented number re-measured last | CA-21, CA-22, CA-23, CA-24, CA-27, CA-28, CA-29 | HD-09, HD-10 | Planned |

Duplicates (`CA-10`, `DAR-004`, `DAR-012`, `DAR-014`, `DAR-018`, `DAR-019`, `DAR-020`, `DAR-022`) close with their twin
in the same brief. `CA-33` was fixed at D3 adoption. Briefs are written one at a time with `/d3-brief HG-N`.
