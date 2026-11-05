# Procedures

Step-by-step instructions for operations that are **done**, not built: setting up a machine, running a gated command,
provisioning, deploying, rotating a credential, rolling back, cutting a release. A procedure says *how*; the *why* and
the limits live in decisions, and the procedure cites them.

**Rules**

- One procedure per file, `kebab-case.md`, listed in the table below.
- A procedure is written (or updated) in the same change as the code or decision that makes it necessary. A procedure
  that no longer matches what the code does is a bug; `/d3-merge` checks the ones a round touched.
- Each procedure states: **when** it is used, **who** may run it (user, planner, implementer, a helper), the
  **prerequisites**, the numbered **steps** with exact commands, how to **verify** it worked, and how to **undo** it.
- Steps that change shared or external state (cloud resources, deployed services, published artifacts) say so, and say
  whose approval they need.
- Procedures don't create rules. A rule found while writing one becomes a decision (or a `process.md` guardrail) first.
- Implementers follow procedures when their brief involves one, and propose edits in their report rather than working
  around a step that is wrong.

| Procedure | Used for | Who runs it | Decisions |
|---|---|---|---|
| [dart-analyze-single-file.md](dart-analyze-single-file.md) | Quick `dart analyze` of one generated file outside the gate | planner, implementer, helper | D-14, D-23 |
