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

| Brief | Scope |
|---|---|
