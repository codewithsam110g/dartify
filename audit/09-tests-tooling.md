# 09 — Tests & Tooling

Covers `test/**`, `vitest.config.ts`, `tsconfig.json`, `package.json`.

---

## X-01 — The test suite calls an API the refactor removed `[verified]`

```
pnpm test:run
→ Test Files  3 failed | 3 passed (6)
→      Tests  1654 failed | 48 passed (1703)
→ 1654 × "Transpiler.transpileFromString is not a function"
```

`test/simple.test.ts:5` and `test/snapshot.test.ts:18` both call:

```ts
const result = await Transpiler.transpileFromString(content, {
  fileName, debug: false,
});
expect(result.content).toMatchSnapshot(...);
```

A **static** method taking a source string and returning `{ content, errors }`.
The current `Transpiler` (`src/transpiler.ts:61`) is instance-based, takes file
*paths*, and writes to disk with no string-returning path (`E-11`).

**Fix direction:** restore `transpileFromString` as a static wrapper —
create a virtual source file via `project.createSourceFile`, run
`generateSymbols` → `runLinker` → `renderAllFiles`, return the rendered string
plus collected errors. This depends on `E-11` (split render from write) and
`R-11` (reset the singleton between runs, or tests leak symbols into each other).

---

## X-02 — 27 obsolete snapshots, and the suite snapshots the entire corpus `[verified]`

`test/snapshot.test.ts:9-10` globs **every** `.d.ts` under `def_files/` — 1,648
files — and produces one snapshot each.

Two problems:

1. **Volume.** 1,648 snapshots of whole generated libraries (three.js alone is
   415 files, `vscode.d.ts` is 21k lines) is not a reviewable diff. A change to
   `emitType` rewrites all of them; nobody can tell a fix from a regression.
2. **Staleness.** 27 snapshots are already orphaned (`axios.dart`,
   `lib.dom.dart`, `express-serve-static-core.dart`, …) from an earlier
   directory layout.

**Fix direction:** split into three tiers —
- **conformance**: `def_files/legacy_tests/*` + the `js_facade_gen` cases,
  asserted against *expected output*, not snapshots;
- **smoke**: 3-5 representative libraries (h3, leaflet, a three.js subtree),
  snapshotted;
- **stress**: the full corpus behind an opt-in script, asserting only
  "no crash, N broken links ≤ baseline" rather than byte-exact output.

---

## X-03 — `tsc --noEmit` reports 15 errors `[verified]`

| Count | Location | Cause |
|---|---|---|
| 5 | `engine/passes`, `engine/transformers` | dead code, `getCurrentFileName` removed (`D-01`) |
| 8 | `test/simple.test.ts`, `test/snapshot.test.ts` | `transpileFromString` gone (`X-01`) |
| 1 | `test/decl/decl-parser.test.ts:65` | `parseVariableStmt` gained an `fqnPrefix` param |
| 1 | `test/snapshot.test.ts:33` | implicit `any` on `(error, index)` |

`tsconfig.json` has `"strict": true` and `"include": ["src", "test"]`, so all 15
are real. None are in live `src` code — which is a genuinely good signal: the
live path is type-clean.

`test/decl/decl-parser.test.ts:65` is worth noting separately — `parseVariableStmt`
changed signature to `(fqnPrefix, varStmt)` (`parser/variable.ts:7-10`) to
thread FQN context. That is the same global-state threading flagged in `R-09`;
if that is refactored to explicit scope passing, this test signature changes again.

---

## X-04 — `test-helper.ts` is a good foundation and is underused `[inspection]`

`test/test-helper.ts` provides `createStatementNode(src)` and
`createTypeNode(snippet)` (the latter wraps a snippet in
`type __DUMMY = ${snippet};` and returns the inner node — a neat trick).

These are exactly the primitives needed for a `js_facade_gen` conformance suite:
each of the ~120 cases in `def_files/js_facade_gen_test_cases.md` is a
snippet → expected-Dart pair. Currently only the four unit test files use them.

Note the helper builds its own `ts.Project` with `target: ESNext` and no
`moduleResolution` setting — so tests exercise a different resolution
configuration than the CLI (`R-01`). Cross-file behaviour cannot be tested
through this helper as written.

---

## X-05 — Snapshot path rewriting assumes a POSIX separator `[inspection]`

`vitest.config.ts:9-12`
```ts
resolveSnapshotPath: (testPath, snapExtension) =>
  testPath.replace("/test/", "/test/__snapshots__/") + snapExtension,
```
`"/test/"` is a literal; on Windows `testPath` uses `\`, so the replace is a
no-op and snapshots land beside the tests. Minor, but the project targets
Node on all platforms and `transpiler.ts:204` already has a
`toForwardSlash` helper for exactly this class of problem.

---

## X-06 — No test asserts linker or symbol-table behaviour `[verified]`

`test/` now contains 13 test files after S0/S1, including reset, smoke/stress,
alias registration and type normalisation coverage. The emitter is exercised
both directly and end to end. One alias-registration test calls
`Transpiler.analyze()`, but it asserts only alias counters — not a link result.
There is still **no behavioural assertion** for `SymbolTable`, link states, FQN
construction, dep collection, `resolveRealFQN`, cycles or ambiguity.

The smoke and stress suites call the single-file string API. They cannot expose
wrong cross-file ownership, renamed imports, ambiguity, graph-ID collisions or
extensionless module resolution. They also do not assert `LinkReport` directly.

Every resolution finding in `06-symbol-linker.md` was found by probes and
reading runtime state, because the normal suite never checks it. `L-01` and
`L-02` in particular are straightforward fixture tests once a multi-file
project helper exists.

**This is the highest-value test gap** — the linker is where the active
development is, and it has zero coverage.

---

## X-07 — `pnpm test` ran vitest in watch mode `[inspection]` **[FIXED — S0.8]**

`test` and `test:run` now both execute `vitest run`; `test:watch` owns watch
mode.

---

## X-08 — `test:cli` referenced a placeholder path `[inspection]` **[FIXED — S0.8]**

It now builds and invokes the bundled CLI against `def_files/h3/h3.d.ts` with
the current `-d`/`-o` flags. The old script used a nonexistent placeholder and
obsolete flag names.

---

## X-09 — No `dart analyze` validation exists `[inspection]`

The tool's output is Dart, but nothing in the repo compiles or analyses it.
Every correctness claim about generated code is currently made by reading it.

`def_files/leaflet_project/`, `three_project/` and `express_project/` exist as
scaffolding (`package.json` + `tsconfig.json`) but contain no Dart side.

**This is the acceptance test that matters for v1** — "h3 and leaflet bindings
pass `dart analyze` with zero errors" is the single claim that would make the
project credible, and it is the one thing currently unmeasurable.

---

## X-11 — Stress-tier baseline: 43% of the corpus renders empty, and that is correct `[verified]`

First full-corpus run after the S0.6 retier:

```
DARTIFY_STRESS=1 pnpm test:run test/stress.test.ts
→ 1 passed, 262 s
→ ⚠️  710/1649 file(s) rendered empty
→ 0 files threw
```

**Zero crashes over 1,649 files** is the headline. The empty-render warning
looks alarming and is not:

| Category | Count | Verdict |
|---|---|---|
| re-export / barrel files (`export * from`, `export { X } from`) | 697 | correct — nothing to emit |
| comment-only or near-empty | 13 | correct |
| genuinely dropped declarations | **0** | — |

The corpus is dominated by barrels. `three/src/Three.Core.d.ts` is 163 lines of
which 153 are `export *`; it has no declarations of its own at all. A
single-file string API has nothing to emit for these by construction, and the
real multi-file pipeline emits them as the empty libraries they are.

**Use 710/1649 as the regression baseline.** A jump means declarations started
being dropped; a drop means barrel handling changed. Either is worth
investigating. The stress tier deliberately does not assert on this number —
it warns — because the right value moves as `def_files/` gains fixtures.

---

## X-10 — Probe fixture used for this audit

Several `E-*` findings were verified with one synthetic file. Recording it here
so the findings are reproducible:

```ts
declare class Box<T> extends Base<T> implements Holder<T>, Named {
  constructor(a: string);
  constructor(a: string, b: number);
  value: T;
  map<U>(fn: (t: T) => U): Box<U>;
}
declare function my_func(a: string): void;
declare const readonly_const: number;
interface Callable { (n: number): boolean; }
interface Child extends Parent1, Parent2 { x: string; }
declare var keyofThing: keyof Box<string>;
declare var tmpl: `pre-${string}`;
declare var cond: string extends number ? true : false;
declare var idx: Box<string>["value"];
type Mapped<T> = { [K in keyof T]: T[K] };
declare enum E { A = 1, B }
```

Covers `E-01`, `E-02`, `E-03`, `E-04`, `E-05`, `E-06`, `P-03`, `T-01`.
Worth promoting into `def_files/synthetic/` as a permanent regression fixture.

> **Partially addressed — S1.6/S1.10.** `dart analyze` is installed on the
> development machine and is now run by hand against generated output; the
> throwaway-package harness is recorded in `CLAUDE.md`. First measurements:
> **h3 clean**, probe 19 issues, leaflet 510 — the latter two dominated by
> `E-03` (type parameters) and `L-05`/`E-10` (declaration merging and namespace
> flattening), which between them account for well over 400 of leaflet's 510.
>
> It found two things reading could not: `E-09` produces hard parse errors for
> `class`/`extends` but *not* for `static`, which is exactly the §10.3 built-in
> identifier distinction; and `E-17`'s "uncompilable Dart" claim was wrong —
> `dynamic?` is a warning, `void?` is the error.
>
> **Still open**, and the reason this stays unticked: nothing automates it. It
> is a manual gate, so it cannot catch a regression between runs. Wiring an
> opt-in `pnpm test:analyze` tier belongs with S6.

---

## X-12 — The stress tier asserts less than its name implies `[verified]`

`test/stress.test.ts` runs all 1,649 files and asserts exactly one thing:

```ts
expect(failures).toEqual([]);   // failures = things that ESCAPED transpileFromString
```

Three layers swallow failure before it can reach that array:

1. `transpileFromString` has its own `try/catch` and reports through
   `result.errors` — **never inspected by the test**.
2. `emitFileContent` catches per symbol and substitutes
   `// ERROR emitting <fqn>: <msg>` into the output — **never inspected**.
3. `generateSymbols` only prints its error list when `--enable-logs` is on, and
   the stress run passes `debug: false`.

So a file in which every declaration failed to emit would render a document of
`// ERROR` comments and pass. This is exactly the mechanism that let `T-15`
(`null | undefined` throwing at emit) survive a green stress tier.

**Measured, so the finding is not alarmist.** Over all 1,649 files:

| | count |
|---|---:|
| threw out of `transpileFromString` | 0 |
| files with `result.errors` non-empty | **0** |
| files containing `// ERROR emitting` | **0** |
| files rendering empty | 710 |

Nothing is currently hiding. The guard is still weaker than it reads, and the
fix is one line — assert on `result.errors` and on the absence of `// ERROR`
comments, not merely on the absence of an exception.

**`X-11`'s empty-render claim is confirmed.** All 710 are barrels or
comment-only files: 708 classify automatically as import/export-only, and the
2 that did not (`three/src/Three.d.ts`, `three/src/nodes/Nodes.d.ts`) are
`export * from` / `export { default as X } from` barrels that the classifier's
line matcher did not recognise. Zero are real content loss.
