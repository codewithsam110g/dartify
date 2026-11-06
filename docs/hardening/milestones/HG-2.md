# HG-2 brief: input boundary and CLI reporting

**Status:** Approved (2026-11-06)
**Implementer:** a fresh `implementer` (Sonnet 5.5, xhigh)
**Branch:** `hg-2`, in a worktree the planner creates from `refactor/orchestration`.
**Decisions:** D-08, D-09, D-10, D-31, HD-04, **HD-13** (supersedes HD-03), **HD-14** (refines HD-07).
**Read first:** `docs/process.md`, this brief, `docs/hardening/decisions.md` (HD-04, HD-13, HD-14),
`docs/hardening/findings.md` (rows DAR-001, CA-10, DAR-002, CA-14, CA-09, CA-08, CA-13, DAR-019, CA-30, DAR-023), and the
finding records in `docs/hardening/audits/01-closing-17e8aa9/review/findings.md` (CA-08, CA-09, CA-10, CA-13, CA-14,
CA-30) and `docs/hardening/audits/02-release-17e8aa9/review/findings.md` (DAR-001, DAR-002, DAR-019, DAR-023: each has a
"Minimal trigger").
Code: `src/cli.ts` (options, input collection, `processFiles`, `watchFiles`), `src/transpiler.ts` (`analyzeProgram`,
`render`, `transpile`, `transpileFromString`), `src/watch.ts` (build result and write gating), `src/reporting/linker.ts`,
`src/engine/phase/linkerPhase.ts` (`checkDeps`), `src/engine/parser/type/literals.ts` (number/bigint literal values).

## Outcome

dartify never reports success for input it didn't understand. A malformed declaration file, a missing or unreadable
input, or a file it would silently skip makes the run fail with a message that names the file and line, and nothing is
written. Everything the one-shot CLI reports — warnings, link failures, diagnostics, `-l`/`-lv` detail — is reported the
same way in watch mode, on the first build and on every rebuild. People coming from js_facade_gen can run their old
command line and either get the same kind of result or a clear message saying what to use instead.

## Items

| ID | Item |
|----|------|
| HG2-1 | **Syntax errors are generation failures** (DAR-001, CA-10; HD-13). Collect TypeScript **syntactic** diagnostics for every file `analyzeProgram()` generates symbols from (inputs and parsed dependency files) and carry them in the analysis report as generation failures with `file`, `line`, `column` and the `TSnnnn` code. `transpile()` then throws `GENERATION_FAILED` and writes nothing (the existing rule); the CLI prints **each** failure (`path:line:col TSnnnn message`), not only the first, and exits 1; watch mode prints them and writes nothing. Semantic (type-check) diagnostics are **not** failures. `transpileFromString()` keeps its current contract (it already returns pre-emit diagnostics in `errors`). |
| HG2-2 | **Explicit inputs are validated** (DAR-002, CA-14; HD-04). Every explicit (non-glob) input must be a readable regular file with a declaration extension (`.d.ts`, `.d.mts`, `.d.cts`): a missing, unreadable, directory or non-declaration explicit path is reported by name — **regardless of `-l`** — and the run exits 1 before any generation, even when other inputs are fine. A glob that matches no declaration file prints a warning naming the pattern (the run continues if other inputs exist; if nothing at all remains, exit 1 as today). |
| HG2-3 | **`.d.mts` / `.d.cts` inputs** (CA-14; HD-04). Accepted from explicit paths and from globs, emitted as `<stem>.dart`. Two inputs that would map to the same output path are an error naming both, **except** a glob-matched `.d.mts`/`.d.cts` whose `.d.ts` sibling with the same stem is also an input: dual-package typings describe one API, so the `.d.ts` wins and a one-line notice names the skipped file. Check how module resolution and library naming treat these extensions and say what you found. |
| HG2-4 | **Numeric separators** (CA-9). Number and bigint literal types with `_` separators (`1_000`, `1_000n`, `0x1_0n`, `0b1_0`) produce their correct values instead of aborting the run (bigint) or silently becoming `NaN` (number). Prefer the checker's literal value if it is available at that site; otherwise strip separators before conversion. |
| HG2-5 | **Link failures are always visible** (CA-08). Default CLI output (no `-l`) states the number of broken symbols and ambiguous edges whenever either is non-zero, with a pointer to `-lv`; it no longer reads as fully resolved when the link report has failures. Link failures stay warnings (exit 0, D-10). |
| HG2-6 | **Cycle-correct link report** (CA-13, DAR-019). `checkDeps` must not cache a provisional result taken while a cycle member is still in progress. Compute final states over strongly connected components (or an equivalent fixed point): every symbol that can reach a broken symbol is reported broken, and the result does not depend on declaration order. |
| HG2-7 | **One reporting path for one-shot and watch** (DAR-023). Factor the report printing (`processFiles`' warnings, emission diagnostics, link summary per HG2-5, resolution summary, `-lv` records, and HG2-1's failures) into one function used by the one-shot run and by watch mode on the initial build **and every rebuild**. Watch keeps its one-line build status. |
| HG2-8 | **js_facade_gen invocation shapes** (CA-30; HD-14). Implement HD-14 exactly: positional inputs ≡ `-d`; `--destination` ≡ `-o`; `--base-path` overrides the output-path input root (error if an input lies outside it); positional inputs without `-o`/`--destination` print a single-library result to stdout (all logs to stderr) and error on multi-library output; `--skip-formatting` no-op; the four semantic flags exit 1 with a message stating dartify's behaviour (derive each message from what the code actually does — e.g. names are always made collision-free — and keep it to one line); unknown flags rejected (strict mode). `-d` is no longer `demandOption`, but at least one input (flag or positional) is required. |
| HG2-9 | **Tests.** For each item, a test that fails on today's code. At least: the DAR-001 minimal trigger (`broken(x: number: string;` + `const fine`) → `GENERATION_FAILED`, nothing written, `fine` never bound; a missing-brace file; a syntax error in one file of a multi-file run → nothing written for any file; a file with only semantic errors (`const a: Missing`) still emits; DAR-002 both cases (missing explicit file beside a valid one; directory named `x.d.ts`) exit 1 naming the path; explicit `foo.ts` rejected; a glob matching nothing warns; `.d.mts` alone and mixed; the dual-package sibling rule and a true output collision; `1_000n`, `1_000`, `0x1_0n`; CA-08 default output names the broken count; cycle cases A↔B with A→Missing in **both** declaration orders, a 3-cycle with one broken member, a clean cycle → all resolved; DAR-023 trigger in watch prints the same warnings as one-shot on initial build and after an edit; each HD-14 shape (positional, `--destination`, `--base-path` inside/outside, stdout single-library, multi-library error, each rejected flag, an unknown flag). CLI tests may spawn the built or `tsx` CLI; keep them fast. |
| HG2-10 | **Docs.** `README.md` (getting started / CLI usage: the input and failure rules, the js_facade_gen mapping), `docs/architecture.md` only if a component's responsibility changed, and `docs/process.md` → Verification only if a count or command changed. Propose `CHANGELOG.md` lines (some of these are behaviour changes: exit 1 where 0 was returned before). |

## Allowed dependencies

None new.

## Non-goals (binding)

- Other findings, even if you touch their code: watch-root prefix (`CA-15`, HG-7), re-exports and module identity
  (HG-3), name/text legality (HG-5, HG-6). Note anything you notice in Proposals.
- No change to how unresolved references degrade (D-10) or to emitted Dart for valid input: the generated output for
  every corpus and fixture stays byte-identical (the snapshot, conformance, h3 golden and Dart gates prove it).
- No change to `transpileFromString()`'s contract, to `render()`'s "partial results" contract, or to the Transpiler seam
  signatures beyond adding fields to reports.
- No new decisions: if HD-04/HD-13/HD-14 turn out unworkable in a case, stop that item and report.
- No edits to `docs/decisions.md`, `docs/hardening/decisions.md`, `docs/hardening/findings.md`, `CHANGELOG.md`. No git
  operations.

## Acceptance

1. The gate in `docs/process.md` passes (`tsc`, `pnpm test`, S2–S5, `test:dart`, `test:incremental`, `test:e2e`,
   `pnpm build`), with no snapshot or golden change; `pnpm test:stress` passes once at the end (the corpus has no syntax
   errors; if it does, stop and report which files).
2. Every HG2-9 test exists, fails on `refactor/orchestration` (show it for a representative few) and passes on `hg-2`.
3. By hand from the built CLI, outputs quoted in the report: the DAR-001 trigger exits 1 with `path:line:col TSnnnn`
   and writes nothing; `-d valid.d.ts missing.d.ts` exits 1 naming `missing.d.ts`; `dart_bindgen h3.d.ts`
   (positional, no `-o`) prints the h3 library to stdout; `--trust-js-types` exits 1 with its message; a run with a
   broken reference shows the broken count without `-l`.
4. The report lists every behaviour change visible to existing users (new exit-1 cases, new warnings, stdout mode).

## History
