# Pre-Stage-5 Correctness Barrier

## Purpose and Scope

Complete tasks 4.11–4.17 before rebuilding the Stage 5 emitter. This barrier
removes process-global compiler state, preserves module and host identities,
repairs known semantic errors, stabilizes Dart names, and establishes executable
correctness gates. Inputs remain TypeScript declaration files (`.d.ts`) and v1
continues to target `package:js`.

Do not replace `src/context.ts` with another singleton, mutex, or broad mutable
service locator. Do not begin S5 while an S1 pre-S5 finding remains open.

## Delivery Order

Implement and validate each task as a separate Conventional Commit. The
dependency-safe order is 4.11, 4.12, 4.13, 4.14, 4.17, 4.15, then 4.16. Update
this ledger, `PLAN.md`, `Tasks.md`, `audit/FINDINGS.md`, the affected audit area,
and `CHANGELOG.md` in the same commit that changes behavior.

### 4.11 — Run-owned pipeline state

Commit: `refactor(context): make compiler runs independently owned`

- [ ] Delete `src/context.ts` and `src/reset.ts`; retain immutable parser-local
  `ParseContext`.
- [ ] Construct the `ts.Project`, resolved-file maps, fallback records,
  `SymbolTable`, namespace aliases, and diagnostics independently per public
  invocation, including calls on the same `Transpiler` instance.
- [ ] Make phase dependencies explicit:
  `generateSymbols(file, sourceFile, symbolTable, namespaceExports)`,
  `runLinker(symbolTable, namespaceExports)`, and
  `renderAllFiles(linkedProgram, outDir, inputRoot)`.
- [ ] Return a `GenerationReport` and an owned `LinkedProgram`; keep
  `AnalysisReport` report-only and move symbol-inspecting tests to explicit
  phase fixtures.
- [ ] Deep-clone table inputs and consumer reads. Provide callback-based,
  validated transactional mutation that commits only after the complete draft
  passes validation.
- [ ] Return partial analysis/render results with generation diagnostics.
  `transpile()` must block all writes and throw `GENERATION_FAILED`; the CLI
  exits nonzero. `transpileFromString()` returns the diagnostics in `errors`.
- [ ] Prove sequential, cross-instance, and same-instance overlap isolation;
  independent debug settings; nested snapshot isolation; rollback; and zero
  live imports of the deleted modules.

### 4.12 — Export and declaration identity

Commit: `feat(ir): preserve module exports and const-enum identity`

- [ ] Represent anonymous class/function declarations explicitly. Keep their
  source name absent, use a stable internal default-export FQN, and allocate a
  collision-safe Dart-only name; never invent `anonFunc` or emit `@JS("")`.
- [ ] Add module-export records for direct named/default declarations,
  `export =`, identifier default exports, export lists, namespace re-exports,
  and star re-exports. Resolve targets and chains into `LinkedProgram` with
  explicit unresolved/ambiguous diagnostics.
- [ ] Add `IREnum.isConst`. Until S5 emits compile-time constants, suppress
  const-enum and anonymous-default runtime bindings with structured diagnostics
  rather than targeting nonexistent JavaScript properties.
- [ ] Cover callable CommonJS exports, namespace/class exports, named and
  anonymous defaults, re-export chains, ambient const enums, and computed
  const-enum members.

### 4.13 — Type truth and module visibility

Commit: `fix(linker): preserve impossible types and module visibility`

- [ ] Ask the TypeScript checker whether intersections reduce to `never` and
  emit Dart `Never`, not nullable or assignable substitutes.
- [ ] Record whether symbols originate in script-global, external-module,
  nested ambient-module, or `declare global` scope.
- [ ] Limit syntax fallback to same-file/module declarations and declarations
  proven globally visible. Never bind an unrelated external module by a unique
  terminal name.
- [ ] Test impossible intersections, explicit `never`, external-module
  isolation, valid globals, checker-backed imports, ambiguity, and re-exports.

### 4.14 — Deterministic legal Dart names

Commit: `fix(names): stabilize generated Dart identifiers`

- [ ] Give every minted unsupported alias a readable base plus a stable hash of
  its source text and reason. Never use an unhashed first claimant or a
  traversal-order counter; lengthen the hash deterministically on collision.
- [ ] Centralize public Dart identifier sanitization for declarations,
  namespace/module prefixes, generated companions, aliases, and composites.
- [ ] Prefix digit-leading, underscore-leading, keyword, empty, and
  punctuation-only results without changing exact JavaScript names.
- [ ] Prove reversed traversal and unrelated insertions produce identical
  aliases and complete Dart output.

### 4.17 — TypeScript host provenance

Commit: `feat(ir): preserve TypeScript host type provenance`

- [ ] Add non-linkable `IRHostTypeIdentity` containing the source family,
  sorted canonical declaration-library names, and checker-qualified symbol.
- [ ] Distinguish TypeScript libraries, Node declarations, and Undici
  declarations. Host identities must never become generated-file dependencies
  or linker edges.
- [ ] Verify `HTMLElement`, `Uint8Array`, `Record`, and `Promise`, plus lexical
  type parameters and project declarations with the same spellings.
- [ ] Close `I-15`. Leave `E-36` open for S5.18, which must give every standard
  utility alias a verified lowering or named documented fallback.

### 4.15 — Executable Dart correctness gate

Commit: `test(gates): execute Dart analyzer and interop probes`

- [ ] Add opt-in `pnpm test:dart:pre-s5`; do not make the default Node suite
  require a Dart SDK.
- [ ] Generate temporary Dart packages and run machine-readable
  `dart analyze`, `dart compile js`, and Node runtime probes.
- [ ] Keep h3 clean apart from the accepted `package:js` deprecation. Store an
  exact categorized S5-fixture baseline mapped to finding IDs; unknown, newly
  introduced, and unexpectedly missing categories fail the gate.
- [ ] Exercise successful overload dispatch and explicit known-failure probes
  for S5-owned rest dispatch and constructability.
- [ ] Remove unit expectations that bless impossible intersections or
  list-as-rest JavaScript dispatch.

### 4.16 — Runtime, coverage, and CI contracts

Commit: `build(tooling): enforce runtime and coverage contracts`

- [ ] Declare `engines.node` as `^20.19.0 || ^22.12.0 || >=23` and align
  contributor documentation.
- [ ] Install the Vitest-3-compatible `@vitest/coverage-v8`; make
  `test:coverage` run `vitest run --coverage`. Do not invent a numeric coverage
  threshold.
- [ ] Add Node CI for 20.19.0, 22.12.0, and 24.x with frozen pnpm installation,
  tests, typecheck, and build. Run coverage once.
- [ ] Keep Dart validation as the documented opt-in command rather than a
  required Node CI job.

## Public and Internal Contracts

- `AnalysisReport` gains structured generation diagnostics but does not expose
  mutable compiler state.
- `LinkedProgram` owns deeply detached symbols, namespace aliases, resolved
  references, module exports, and its `LinkReport`; emitters consume this value
  explicitly.
- A generation failure is observable and write-blocking. Callers needing
  partial output use `render()` or `transpileFromString()` and inspect returned
  diagnostics.
- Host identity is separate from `IRReferenceTarget`: host types do not enter
  the generated declaration graph.
- The S5 platform registry and import planner must match canonical host identity
  rather than leaf spelling.

## Final Acceptance

Run and record:

```sh
pnpm test
pnpm test:s2
pnpm test:s3
pnpm test:s4
pnpm test:s5:fixture
pnpm test:coverage
pnpm test:dart:pre-s5
pnpm test:stress
pnpm exec tsc --noEmit
pnpm build
```

Also run h3 `dart analyze` and categorized Leaflet/three.js analyzer censuses.
The barrier is complete only when every task above is checked, the audit and
roadmap agree with the implementation, no pre-S5 S1 finding remains open, and
the branch is clean and synchronized with its remote.
