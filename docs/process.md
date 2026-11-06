# Development process

Decisions: D-03, D-04.

## D3: docs-driven development

dartify is built **docs-first**, much as TDD is tests-first. Decisions, briefs and registers are written before
the code, and the code is written to satisfy them. `docs/` is the **only shared, persistent state**. Conversations, agent
transcripts and auto-memory are ephemeral. Anything decided in a conversation (a principle, a limit, a workaround, a
trade-off) is written into `docs/` before the session ends. New directions are discussed with the user before anything
is written.

## Roles

- **User:** product owner and final decision-maker. Tests hands-on and reports findings.
- **Planner** (the main session, Opus 5.5, high effort): designs, keeps `docs/` authoritative, writes briefs, reviews
  implementation diffs and verification output, reports to the user, merges. Makes small changes itself (a few files,
  no brief needed) instead of spawning an agent.
- **Implementer** (subagent `implementer`, Sonnet 5.5, xhigh effort by default): implements exactly one brief.
  One agent is kept for a whole milestone section, so context carries across rounds (small follow-ups go back to it via
  SendMessage). Each new section gets a fresh agent. A brief may name a different effort (`high` for light work); the
  planner passes it when spawning.
- **Outside auditor and architect** (Codex, gpt-6.1-sol, high): audits into the git-ignored `/audit/` (taken in with
  `/d3-audit intake`), design dossiers into the git-ignored `/dossier/`. It may also make small standalone changes when
  the user asks (its `$d3-change` follows this file), never while an implementer round is open.
- **Helpers** (Haiku 5.5): `Explore` for searches; mechanical, checked work such as running the gate and summarising its
  output, or merge bookkeeping. Not for judgement calls or normal briefs.

## Pushback

Every role pushes back. The planner tells the user when a request is contradictory, wrong, or workable but clearly worse
than an alternative, and builds it as asked only after the user explicitly confirms with the concern on the table; the
choice and its trade-off are then recorded as a decision. The implementer raises the same about its brief under Issues /
conflicts instead of complying silently. The planner verifies implementer reports and audit findings rather than
accepting them.

## Sizing work

Split by weight: one brief when a milestone fits one agent; sub-milestones (M3a, M3b) for a heavy milestone; numbered
briefs (M3a-1, M3a-2) for a big sub-milestone; phases inside a brief (phase A, phase B) when one brief is truly big. The
planner proposes the split, and the user decides.

## Loop

```
plan (user + planner) → brief in docs/milestones/ → implementer builds
   → implementer report (done / verified / deviations / questions)
   → planner reviews diff + reruns checks → user decides (ok / changes / new info)
   → implementer continues … → acceptance criteria verified → user review → merge (commit + registers)
```

## Guardrails for the implementer

1. Implement **only** what the brief lists. Non-goals are binding.
2. Anything outside the brief (a refactor, an extra feature, a new dependency not named in the brief, a change to a
   decision) is **proposed in the report, not done**.
3. If the brief conflicts with reality (the API is not as assumed, the data breaks an assumption, or a decision looks
   wrong), **stop that item and report** with evidence. Continue with independent items.
4. Never edit `docs/decisions.md` or ADRs. Suggest changes in the report instead. Other docs may be updated only to
   reflect what was actually built, and each such edit is listed in the report. Never edit `CHANGELOG.md`; propose lines.
5. No git commits, pushes, branches or stashes.
6. Never read, copy or reference data the project marks as private (see "Data" below).
7. All checks (format, lint, tests) pass before reporting "done".
8. If the code needs something the docs don't say, **stop and report**; don't invent it.
9. Do not claim anything works unless it was verified. Say what could not be verified (for example a visual check).
10. Background tasks and monitors: at most three alive at once; stop the previous one before starting the next, and stop
    them all before the report.
11. Never read or touch the git-ignored `/audit/` folder unless the brief says so: outside audits work there.
12. The user's machine rules (screenshots, processes, browsers, shell quirks) are in the user's global `CLAUDE.md`, which
    every agent loads. They are binding here too.
13. **Verify by running the tool, not by reading alone.** Tag claims `[verified]` (reproduced by running) or
    `[inspection]` (established by reading), and say which.
14. **`def_files/` is third-party fixture data** — read-only, except to add a deliberate synthetic case under
    `def_files/synthetic/`.
15. **Scratch files go in the session scratchpad**, never in the repo. A new hand-written Dart fixture outside
    `def_files/**` / `test/**` must be allow-listed in `.gitignore` or it silently never reaches CI (D-28).
16. **Before `pnpm test:update`, inspect the Dart diffs.** `test/conformance/ledger.json` and `test/dart/baseline.json`
    change only deliberately, and the report says why (D-27).
17. **When a change dispatches differently at runtime, extend the dart2js probe** (`def_files/synthetic/runtime/`);
    analyzer-clean is not evidence (D-14). Any watch-cache shortcut needs a differential edit (D-16).
18. **Before closing a finding, enumerate every site of the *class* it describes**, not just the wording (finding
    `T-05` was fixed as worded while `T-17` had the same bug). A brief that fixes a finding names the class and the grep
    or test that proves every site.
19. **`browserTypes.ts` is generated** — regenerate and re-validate, never hand-edit (D-22).
20. Coding style: strict TypeScript, two-space indentation, ESM imports, path aliases such as `@ir/*`; no `any` (narrow
    `unknown` or extend explicit IR types); pure, deterministic transformations; `camelCase` values/functions/files,
    `PascalCase` types/classes; comment *why* an AST case is special. Tests are `*.test.ts`, assert diagnostics and
    output (never merely "did not throw"), and use minimal synthetic fixtures. Tests are grouped in `test/type/`,
    `test/decl/`, `test/linker/`, `test/conformance/` (js_facade_gen cases and the h3 golden), `test/dart/` (the Dart
    gate), `test/e2e/`; snapshots belong in `test/__snapshots__/`.

## Data

dartify handles no private data. `def_files/` (1,654 `.d.ts` files: h3, Leaflet, three.js, js_facade_gen fixtures,
synthetic probes) is third-party or hand-written fixture data, tracked in git and not shipped to npm (`package.json`
`files` is `dist` only). Generated output goes to the git-ignored `output/`. Never commit secrets, npm tokens or
machine-local paths; outside-audit run artifacts stay in the git-ignored `/audit/`.

## Token budget rules for implementer agents

These are cost controls. An agent's cost grows with its context size multiplied by its number of tool calls, not with
the amount of code it writes.

1. **300–400k tokens is a soft guideline, not a cutoff.** An agent that already holds a task's context works better than
   a fresh one that has to re-read it, so it keeps going through its brief and small dependent follow-ups. Around
   300–400k the planner decides: **continue** the same agent when the next work is small and depends on its context, or
   **start a fresh agent** (a short handoff: the brief plus the last report) when it doesn't. Continuity lives in
   `docs/`, not in transcripts.
2. **Batch feedback.** Collect the user's hands-on findings into one fix round. Don't send one issue at a time.
3. **Small fixes get small agents.** A fix of a few dozen lines goes to a fresh agent (Haiku 5.5 is a candidate) with a
   tight brief that names the exact files to read — or the planner just makes it.
4. **Lean verification.** Targeted tests while iterating; the full suite **once**, at the end.
5. **Lean reading and reporting.** Read only what the brief needs. Don't re-read unchanged large files. Reports carry
   pass/fail lines and trimmed excerpts, not full output.

## Report format (every round)

```
## Status: done | partial | blocked
## Implemented        — bullets, per brief item ID
## Verification       — commands run + trimmed output
## Deviations         — anything done differently from the brief, and why
## Issues / conflicts — with evidence
## Proposals          — out-of-scope ideas, awaiting approval
## Files changed      — list
```

## Branches, worktrees and commits

- **Branches.** `refactor/orchestration` is the milestone branch for all work up to the `1.0.0` release (D-18);
  each brief gets a short-lived branch `<brief-id>` from it and merges back at `/d3-merge`. `main` is what npm ships
  (`0.5.0` today) and is merged into only at a release, which is the user's decision. Commit messages follow
  Conventional Commits (`fix(E-32): …`, `docs(hardening): …`) and cite finding IDs (D-17). A PR (only when the user asks for one)
  explains the behaviour change, lists the validation commands run, and shows before/after Dart for emitter changes.
- **Worktrees.** Each implementer works in its own git worktree, which **the planner creates from the milestone branch**
  (`git worktree add .claude/worktrees/<brief-id> -b <brief-id> <branch>`), so the agent's tree already holds the brief.
  (The harness's own `isolation: worktree` branches from the default branch, which may lack the brief.) Git-ignored
  inputs such as test data are symlinked from the main checkout. Each worktree runs its own `pnpm install --frozen-lockfile` (the pnpm store is shared, so this is fast).
- **One agent at a time** by default. Parallel agents only on the user's request, in separate worktrees, with the files
  each may touch written into the briefs.
- **Commits.** The planner commits verified checkpoints after the user's review (`/d3-merge`). Messages are descriptive
  (`M1: parser with error recovery`) with no AI attribution.
- **At every merge**, in the same change: `CHANGELOG.md` Unreleased, `roadmap.md`'s status, `issues.md`, the brief's
  status line, any procedure in `docs/procedures/` whose steps the round changed; when a stage-register finding is touched, its row in `docs/hardening/stage-register/FINDINGS.md` and its area file; for an HG brief,
  its rows in `docs/hardening/findings.md`.
- **Audits** are done outside the loop, in the git-ignored `/audit/` folder, and taken in with `/d3-audit intake`: the
  planner verifies every finding and the user agrees the triage before anything enters `docs/hardening/`.
- **Nothing public without the user's explicit approval:** no publishing, upstream issues or PRs.

## Verification

- **Gate** — must pass before a merge:

  ```
  pnpm exec tsc --noEmit && pnpm test && pnpm test:s2 && pnpm test:s3 && pnpm test:s4 \
    && pnpm test:s5:fixture && pnpm test:dart && pnpm test:incremental && pnpm test:e2e && pnpm build
  ```

  `test:dart` and `test:e2e` need a Dart SDK on `PATH` (the baseline is Dart 3.13). `pnpm test:stress` (1,654-file
  corpus, ~6–8 min) runs once when a gate or milestone closes, not every round. CI (`.github/workflows/ci.yml`) runs
  `tsc`, `test`, `build`, `test:coverage`, `test:incremental`, `test:dart` and `test:e2e` on every push.
- **Current gate counts** (re-measured at every milestone close; drift is a finding — `CA-21`): suite 449 passed /
  11 skipped (`test/cli.test.ts` bundles the CLI into the git-ignored `output/` and spawns it, ~1 s); e2e 3/3; incremental 7/7; S2 2/2; S3 1/1; S4 53/53 (54/54 measured by the release audit); S5 fixture
  3/3; Dart gate 3/3; conformance 67/90 parity + 16 improved + 2 differ + 5 out of scope; h3 golden 63/63; stress
  1,655/1,655 files (the runtime probe is the 1,655th; 719 empty outputs are barrels and comment-only files). The
  protected S3 input floor is 2,530 declarations. Coverage (v8, `output/coverage/`) ~90 % lines, no threshold.
- **Test tiers:** `simple` (sanity) · `smoke` (3 files, byte-exact snapshots) · `conformance` (90 js_facade_gen cases +
  the h3 golden, default suite) · `test:s2` (link corpus) · `test:s3` (declaration-fidelity census) · `test:s4`
  (semantic contract + backend behaviour) · `test:s5:fixture` (multi-file golden) · `test:dart` (analyzer + dart2js) ·
  `test:stress` (fails on throws, returned errors and `// ERROR emitting` markers) · `test:e2e` (dart2js programs
  against the real npm packages) · `test:incremental` (watch output equals a cold build after every scripted edit).
- **Other hosts:** `linuxbox` (Linux) and `winbox` (Windows), headless over SSH, run by the planner only. On Windows,
  `test:stress`'s inline `DARTIFY_STRESS=1` is POSIX syntax: set the variable separately and run
  `pnpm test:run test/stress.test.ts`.
