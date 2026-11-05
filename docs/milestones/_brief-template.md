# {{ID}} brief: {{short title}}

**Status:** Draft | Approved | In progress | Done ({{date}}, merged into `{{branch}}`)
**Implementer:** a fresh `implementer` (Sonnet 5.5, {{xhigh | high}}) | continues the {{ID}} agent | the planner itself
**Branch:** `{{id}}`, in a worktree the planner creates from `{{milestone branch}}`.
**Decisions:** D-NN, D-NN, **D-NN** (bold = set or changed for this brief).
**Read first:** `docs/process.md`, this brief, {{decisions by ID}}, {{the exact docs}}.
Code: {{the exact files or directories the work lives in}}.

## Outcome

<!-- Two or three sentences: what is true for the user when this is done. Not how. -->

## Items

<!-- Each item has an ID the report refers to. Pin decisions, boundaries and acceptance, not lines of code. Where a
     detail is genuinely open, say so and ask the implementer to choose and justify it in Deviations. -->

| ID | Item |
|----|------|
| {{X}}-1 | **{{name}}.** {{what, plus any constraint that matters}} |
| {{X}}-2 | **Tests.** {{the cases that would catch the likely mistakes — name them}} |
| {{X}}-3 | **Docs.** {{which docs to update to match what was built}}. Propose changelog lines; don't edit `CHANGELOG.md`. |

<!-- Optional, for a big brief:
## Phase A: {{name}} (stop and report at its end)
## Phase B: {{name}}
-->

## Allowed dependencies

{{None new | crate/package@version, why}}. Anything else is a proposal.

## Non-goals (binding)

{{What is explicitly not part of this brief, and where it belongs instead (milestone or decision).}} No git operations.

## Acceptance

1. `{{GATE_COMMAND}}` passes.
2. {{an observable, checkable criterion per item — a named test, a command's output, a hands-on step for the user}}

## History

<!-- Fix rounds append here: "fix1 (date): …, brief [fix1](<id>-fix1.md)". -->
