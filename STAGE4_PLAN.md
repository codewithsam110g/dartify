# Stage 4 Semantic Layer Implementation Plan

> **Status: implemented and verified.** Final commands, semantic totals, Dart
> analyzer categories, and finding closures are recorded in
> [`audit/S4-EVIDENCE.md`](audit/S4-EVIDENCE.md).
> A 2026-08-12 post-S4 deep review found and corrected eight acceptance gaps;
> the evidence ledger is authoritative for those errata.
> The subsequent full line-by-line audit in `audit/POST-S4-AUDIT.md` reopened
> `L-10` as partial and found adjacent pre-S5/S5 work. This document remains the
> historical S4 implementation contract, not the current defect ledger.

## Summary

Stage 4 adds a deterministic semantic transformation between parsing and
linking. It canonicalizes anonymous types, models modules explicitly, merges
supported declaration groups, preserves TypeScript type/value facets, renames
overloads and Dart collisions, and adapts the transitional emitter only far
enough to exercise those semantics.

The implementation started on `refactor/orchestration` after S0-S3 completed.
Stage 5 backend work--imports, full generics and heritage, callable
interfaces, and constructor-overload emission--remains out of scope.

Locked decisions:

- Number every function or method overload, including the first: `f_1...f_n`.
- Deduplicate anonymous structures within one source file only.
- Suppress external-module augmentation output and issue a visible diagnostic.
- Give top-level declarations priority for bare Dart names.
- Represent same-name type/value declarations as one symbol with multiple
  facets. Keep the type as `Name`; rename the runtime facet to `JS$Name`.
- Preserve unsafe merge groups, assign unique names, diagnose, and continue.
- Identify parser-hoisted anonymous declarations with explicit provenance,
  never a public-name prefix.
- Reserve backend-owned and generated helper/binding names during allocation.
- Use the transitional emitter as a thin adapter; do not begin the S5 rewrite.

## Semantic and Public Contracts

### Symbol model

Refactor `Symbol` into a canonical semantic binding:

- `fqn` remains the stable TypeScript identity and is not changed by Dart
  renaming.
- `facets` contains ordered type, value, or type-and-value declarations.
- Each facet records its IR declaration, `SymbolType`, source order,
  module/origin context, emission state, and provenance.
- `deps` is the union of live reference sites across all facets;
  `resolvedDeps` is the final sorted FQN set.
- Parsed groups may contain multiple symbols. The completed semantic table has
  one symbol per canonical FQN with one or more facets.

Add optional `dartName` and `jsName` fields to named declarations and members.
Preserve `name` as the exact TypeScript spelling. Add `resolvedDartName` to
reference targets instead of overwriting `IRType.name`.

### Symbol table safety

Implement the following contract:

```ts
getSymbolTable(): ReadonlyMap<string, readonly Symbol[]>
lookup(fqn): readonly Symbol[] | undefined
replace(fqn, symbols): void
unregister(fqn): readonly Symbol[]
apply(changes): void
```

Snapshots copy map and array structure rather than leaking the live table.
`apply()` validates a cloned draft and commits only when every mutation is
valid. Semantic passes operate on deep-cloned IR and rebuild dependency objects,
so a failed transformation cannot partially modify live state.

### Semantic report

Extend `LinkReport` with a `semantic` report containing:

- Input declaration/symbol counts and final binding/facet counts.
- Merge, overload, keyword, namespace, dual-facet, global-hoist,
  anonymous-dedup, and suppression counts.
- FQN redirects with their reasons.
- Suppressed external augmentations and their canonical targets.
- Structured diagnostics including
  `EXTERNAL_MODULE_AUGMENTATION_SUPPRESSED`,
  `DECLARATION_MERGE_CONFLICT`, `AMBIGUOUS_CONSTRUCTOR_COMPANION`, and
  `UNSUPPORTED_DECLARATION_GROUP`.

Normal CLI output prints a warning summary when semantic diagnostics exist;
`-lv` prints complete records. Suppression must never be silent.

## Implementation Sequence

### 1. Establish the evidence ledger

Create an S4 evidence file under `audit/` before changing behavior. Record:

- The 21 repository Markdown context files reviewed.
- Starting commit, clean status, and baseline commands.
- Analyzer counts: overloads 18, augmentation 11, keywords 9, modules 25.
- Each finding's reproduction, focused test, implementation commit,
  verification command, and observed result.

For every audit point, preserve or add the failing reproduction first,
implement the change, run its focused proof immediately, and only then mark the
finding fixed. Give new discoveries a stable finding ID and minimal reproduction
before deciding whether they block S4.

### 2. Fix structural identity and module parsing

Audit every recursive `parseType` call and add deterministic child paths:

- `union_0`, `intersection_1`, `tuple_2`, and `arg_0`.
- `array_element`, `rest_inner`, `operator_inner`, and
  `parenthesized_inner`.
- Indexed-signature key/value roles.
- Indexed property, method, accessor, heritage, parameter, return, and
  type-parameter positions.

The P-13 probe must first create distinct names such as
`Anon_f_overload_0_param_0_x_union_0` and
`Anon_f_overload_0_param_0_x_union_1`.

Replace the textual module stack with explicit scope records for namespaces,
ambient external modules, external-module augmentations, and global
augmentations. Use one scope-to-FQN helper for generation and checker
candidates. `declare global` contributes neither a `global|` FQN nor a JS
prefix. Distinguish a primary ambient `declare module "h3"` from an augmentation
inside an external module; suppress only the latter.

### 3. Add the semantic pass pipeline

Run a pure semantic pipeline before reference linking:

1. Normalize module/global identities and collect suppressed augmentations.
2. Canonicalize anonymous structural declarations.
3. Merge declaration groups and construct semantic facets.
4. Mint existing unsupported-type aliases against the transformed table.
5. Number overloads.
6. Allocate Dart-visible names.
7. Apply transitive FQN redirects and target Dart names.
8. Recompute dependencies, clear stale link metadata, validate, and commit
   atomically.
9. Run the existing reference linker over the committed table.

The anonymous shape key must include member/type structure, flags, literals,
generic structure, constraints, defaults, and reference identities. Sort
structurally unordered members and overload signatures. Exclude locations,
documentation, FQNs, output names, aliases, and resolved-link metadata. Include
`unsupportedReason` and normalized `originalText` for unsupported leaves. Keep
type-parameter names rather than attempting alpha-equivalence. The earliest
source occurrence is canonical, and identical shapes in different files remain
distinct.

### 4. Implement the measured declaration merge matrix

| Source group | Stage 4 result |
|---|---|
| `interface + interface` | Merge compatible heritage and members in source order; deduplicate exact members |
| `class + interface` | Merge compatible interface heritage and instance members into the class |
| `interface X + var X: { ... }` | Fold object members into `X` as static and make the binding type-and-value |
| `interface XType + var X: { prototype; new(...) }` | Synthesize `IRClass X`, move instance members from `XType`, constructors/statics from the value object, and redirect `XType -> X` |
| Same-name singleton/callable interface and variable | One symbol with type and value facets; value becomes `JS$Name` |
| `type Name + const/var Name` | One symbol with two facets; do not speculate a class |
| Function declarations | One value binding with every overload facet retained |
| Unsupported or incompatible group | Preserve every facet, allocate unique names, and diagnose |

Compatibility requires matching type-parameter shape. Deduplicate exact
properties/accessors. Conflicting non-overload members, incompatible type
parameters, ambiguous prototype targets, or unsupported callable/construct
shapes prevent the whole merge rather than losing part of it.

Retain merged docs in source order and preserve member-level locations/docs.
The canonical declaration uses the earliest contributing source order and
records all contributing provenance.

### 5. Implement overload and identifier naming

Overload rules:

- Group free functions by canonical FQN.
- Group methods by owner, source name, and static/instance category.
- For groups larger than one, assign every declaration `name_1...name_n` in
  source order and retain the exact source name as `jsName`.
- Leave constructors and call/construct signatures for S5.
- Remove every `.split("_")[0]` recovery path.

Identifier rules:

- Use a checked-in Dart 3 reserved/built-in identifier table.
- Prefix reserved words with `JS$` in declaration, value, member, parameter,
  and type contexts.
- Prefix built-in identifiers only in declaration/type contexts; legal
  built-in member/value names remain unchanged.
- Include simple parameters and type parameters. Binding-pattern lowering
  remains S5.
- Add explicit `@JS("sourceName")` annotations to renamed members.

Allocate top-level names per generated Dart library:

1. Escape the source base name for its context.
2. Apply overload numbering.
3. Give top-level declarations priority for the bare candidate.
4. Otherwise let the earliest scoped binding keep the bare candidate.
5. Prefix conflicts with the shortest innermost namespace segment, expanding
   outward when needed.
6. Use a numeric suffix only after scope expansion is exhausted.
7. Give a dual binding's type facet priority and start its value at `JS$Name`.
8. Rewrite type uses through `resolvedDartName`.

Suppressed facets do not reserve output names.

### 6. Add the thin transitional emitter adapter

- Flatten emittable facets globally by source order.
- Use `dartName`, `jsName`, explicit module paths, and `resolvedDartName`.
- Emit both facets of type/value bindings.
- Emit synthesized constructor companions as classes.
- Emit merged variable-side properties, methods, and accessors as static.
- Preserve qualified JS annotations for runtime-bearing declarations.
- Emit `@JS` on renamed members.
- Remove the dead commented overload block and `getOverloadFuncs`.
- Preserve h3 output byte-for-byte unless an explicit semantic rule applies.

Do not add cross-file Dart imports, full generic/heritage emission,
callable-interface lowering, or named constructors.

### 7. Remove quarantined code and drift

Only after semantic tests protect the retained behavior:

- Delete `src/engine/passes/**` and `src/engine/transformers/**`.
- Remove their TypeScript path aliases and exclusions.
- Prove no live imports remain.
- Keep `src/legacy/**` and `src/log.ts`.
- Correct the six X-13 comments.
- Update the stale Stage 4 paragraph in `AGENTS.md`.

## Test and Acceptance Plan

Add focused SymbolTable, semantic-linker, and rendered-output tests covering:

- Snapshot isolation, replacement/removal, invariant rejection, and rollback.
- P-13 distinct siblings, same-file dedup, cross-file separation, and nested
  array/generic/union/tuple/wrapper positions.
- Namespace, ambient-module, external-augmentation, and global-augmentation
  classification.
- External-augmentation suppression, canonical-target reporting, and CLI
  warnings.
- Interface/interface, class/interface, constructor-companion, default-static,
  dual-facet, and conflict-preservation cases.
- Free-function and method overload numbering, static separation, stable order,
  and underscore-containing JS names.
- Keyword contexts, renamed-member annotations, namespace-prefix expansion,
  numeric fallback, top-level priority, and reference rewrites.
- Semantic counts, redirects, diagnostics, and verbose formatting.

Run and record:

```sh
pnpm test
pnpm test:s2
pnpm test:s3
pnpm test:stress
pnpm exec tsc --noEmit
pnpm build
```

Add `pnpm test:s4` for the focused semantic gate. Update the S3 corpus gate to
traverse facets and prove the pre-semantic declaration count remains 2,530.

Generate and inspect all four legacy fixtures. Acceptance is category-based:

- No S4-owned duplicate-definition errors in overload/module fixtures.
- No keyword identifier errors in the keyword fixture.
- No duplicate declarations from supported augmentation patterns.
- References use renamed canonical types.
- Suppressed external augmentations produce diagnostics and no Dart.
- h3 remains analyzer-clean.
- Leaflet namespace duplicates are eliminated and its total is remeasured.
- Three.js has no Dart-visible semantic name collisions.
- No returned transpilation errors or `// ERROR emitting` comments appear.

Review every snapshot diff. Also run `git diff --check`, deletion/import scans,
and a final clean-worktree inventory.

## Audit, Documentation, and Delivery

Close only verified findings: `L-10`, `P-13`, `L-11`, `L-05`, `P-10`, `E-01`,
`E-09`, `E-10`, `D-01`, `D-02`, and `X-13`. Do not falsely close remaining S5
emitter debt.

Update `PLAN.md`, `ROADMAP.md`, `README.md`, `CLAUDE.md`, `CHANGELOG.md`,
`CONTRIBUTING.md`, `Tasks.md`, the relevant audit files, fixture guidance, and
the approved stale lines in `AGENTS.md`. Record exact final test and analyzer
counts, bundle size, semantic input/output counts, and any new findings.

Use scoped Conventional Commits with detailed bodies, approximately:

1. `feat(symbol): establish atomic semantic bindings`
2. `fix(parser): give structural types positional identity`
3. `feat(linker): model module semantics and canonical shapes`
4. `feat(linker): merge declaration facets and companions`
5. `feat(linker): assign overload and Dart-visible names`
6. `refactor(core): remove quarantined five-pass pipeline`
7. `test(S4): lock semantic and analyzer acceptance`
8. `docs(S4): close the semantic-layer audit`

Each commit references its finding IDs and focused validation. Exclude generated
Dart, logs, caches, and temporary analyzer packages. After the full validation
matrix, push `refactor/orchestration` and confirm a clean, synchronized branch.

## Assumptions

- Internal `Symbol` changes are acceptable before v1; the package publishes a
  CLI bundle rather than a stable library API.
- S4 supports the measured declaration families, not every possible TypeScript
  namespace-merging combination.
- External-module augmentation merging is deferred, but its omission is
  explicit and observable.
- S4 fixes its owned semantic defect classes; fully analyzer-clean output
  remains the S5 target.
- Stage 4 implementation stays single-agent unless the user explicitly changes
  that constraint.
