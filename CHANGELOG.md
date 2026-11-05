# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] — unreleased

The drop-in replacement for the archived `js_facade_gen`, targeting
`package:js`. Every gate below is measured on this repository's corpora.

### Breaking

- Requires Node `^22.12.0 || >=24` (`engines.node`); Node 20, past its
  end-of-life, is no longer supported. `0.5.0` declared no `engines` (D-32).

### Hardening (HG)

- Dev toolchain: vitest, `@vitest/ui` and `@vitest/coverage-v8` 5.1.0 with
  vite 7.3.7; clears the 3 critical and 26 high advisories in dev tooling
  (`CA-19`). The production dependency tree has no critical or high
  advisories (`CA-20`); one moderate `minimatch` advisory remains, see
  `docs/hardening/findings.md`.
- CI: Dart SDK pinned to 3.13.7 together with the analyzer baseline
  (`CA-17`); actions pinned to commit SHAs with a read-only token (`CA-18`);
  Node matrix 22.12.0 / 24.x / 26.x.
- The shipped bundle no longer embeds `package.json`'s scripts and dev
  dependencies (`VFY-002`); the run-isolation test has a coverage-safe
  timeout (`VFY-001`).

### package:js backend (S5)

- New `Backend` seam (`src/engine/emitter/backend.ts`) consuming the owned
  `LinkedProgram`; the v1 backend lives in `src/engine/emitter/packagejs/`.
  The transitional `emitter/old` is deleted.
- Cross-file imports from linked identity, `show`-imported unless a name would
  be captured, otherwise prefixed (including self and `dart:core`). Barrel
  files become `export` libraries with ambiguity `hide`s.
- Platform types by checker identity: js_facade_gen's browser registry (500
  SDK-validated entries) for `dart:html`, `dart:svg`, `dart:web_gl`,
  `dart:web_audio`, `dart:indexed_db`, `dart:web_sql`, `dart:typed_data`.
- Type parameters and bounds; `extends`/`implements`; external generative
  constructors with named overload factories; inherited constructors;
  covariant and parent-typed override correction.
- Getter/setter variables, uninstantiable enum classes, const-enum constants,
  callable-interface typedefs, `@anonymous` factories with inherited fields,
  typed index operators, polyfilled rest parameters, `Promise<T>` with
  `toFuture()`, JSDoc as dartdoc, escaped `@JS` strings.
- Multi-library runs share one `dartify_support.dart` (`Promise`,
  `PromiseToFuture`, `JSBigInt`), re-exported by each library that uses it, so
  a `Promise` from one generated library is accepted by another (`E-40`).
- Named degradations for unions, unresolved references, unmapped host types
  and unrepresentable syntax; list unions take their upper bound; utility
  aliases `Partial`/`Required`/`Readonly`/`NonNullable` lower to their argument.
- lib.dom.d.ts analysis 100 s → 6.5 s (`R-15`).

### Conformance and gates (S6)

- `test/conformance/`: the 90 js_facade_gen reference cases run as executable
  tests — 67 parity, 16 deliberately improved, 2 differ, 5 out of scope.
- `test/conformance/h3-golden.test.ts`: all 63 declarations of the
  js_facade_gen bindings shipped in h3 are reproduced.
- `pnpm test:dart`: categorized `dart analyze` baseline over h3, Leaflet,
  three.js (420 libraries), fixtures and every conformance case — 0 errors, 0
  warnings — plus a dart2js runtime probe. Runs in CI.
- The CLI prints backend and module-export diagnostics; `pnpm ir` dumps the
  linked IR; `src/legacy` moved to `docs/history/legacy`.

### Watch mode and end-to-end testing

- `dart_bindgen -w` rebuilds on change through `WatchSession`, which caches
  per file, per top-level statement and per declaration fingerprint and writes
  only changed libraries. Rebuilds: h3 ~35 ms, Leaflet ≤ 94 ms, three.js
  ~53 ms (420 libraries; cold build 4.2 s → ~2.3 s).
- `pnpm test:incremental` and `pnpm bench` compare every incremental build
  byte for byte with a cold compilation (declaration merging, re-exports,
  inheritance, generics, `typeof`, added/removed files, structural shapes).
- `pnpm test:e2e` compiles Dart programs against generated h3, three.js and
  Leaflet bindings with dart2js and runs them against the real npm packages.
- `export as namespace L` libraries bind `L.<name>` (`E-42`); classes
  implement property-only shapes they structurally satisfy, e.g. three.js
  `Vector3` implements `Vector3Like` (`E-43`); `--js-root <name>` binds module
  libraries under a global (three.js: `--js-root THREE`), and bare-global
  classes that would clash with dart2js native classes are diagnosed (`E-44`).

## [Unreleased — pre-S5 barrier]

### Declaration identity and type truth (tasks 4.12–4.13)

- Anonymous default exports keep an absent source name; const enums are marked
  `isConst`; `export =`, default identifiers, export lists and star/namespace
  re-exports are resolved into `LinkedProgram.moduleExports` (`P-15`–`P-17`).
- Intersections that reduce to `never` (including `T & null`) now produce
  `Never` instead of widening to `T?` (`T-18`).
- The bare-name linker fallback no longer binds declarations exported from an
  unrelated module (`L-19`).

### Tooling (task 4.16)

- Declared `engines.node` as `^20.19.0 || ^22.12.0 || >=23` (`X-15`).
- `pnpm test:coverage` now runs with `@vitest/coverage-v8` (`X-16`).

### Host type provenance (task 4.17)

- References to TypeScript/Node/Undici host declarations carry a non-linkable
  `IRType.host` identity (family, libraries, qualified name), so platform
  substitutions can match checker identity instead of leaf spelling (`I-15`).

### Deterministic names (task 4.14)

- Minted alias names no longer depend on traversal order; colliding derived
  names are all hashed (`E-29`).
- Scope-derived collision names are revalidated as Dart identifiers, and
  underscore-leading JavaScript names emit as public `JS$_x` bindings (`E-30`).

### Run ownership (task 4.11)

- Deleted the process-global `context.ts` singleton and `reset.ts` seam. Every
  `analyze`, `analyzeProgram`, `render`, `transpile` and `transpileFromString`
  call owns its project, resolution maps, symbol table, namespace aliases and
  diagnostics; overlapping calls are independent (`R-14`).
- `SymbolTable` now deep-clones on register and read and exposes validated
  `transaction()` drafts (`L-10`).
- Symbol-generation failures are returned as `AnalysisReport.generation` and in
  `transpileFromString().errors`; `transpile()` refuses to write when any
  statement failed (`R-13`).
- The linker returns an owned `LinkedProgram`; `Transpiler.analyzeProgram()`
  exposes it and emission consumes it explicitly.

### Semantic layer

- Added atomic facet-based symbols, explicit module/global origins, positional
  anonymous identities, same-file structural canonicalization, and redirects.
- Added supported declaration merging for reopened interfaces,
  class/interface groups, constructor companions, default static values, and
  type/value facets. Unsafe groups are preserved with structured diagnostics.
- Added deterministic overload, Dart keyword, computed-member, dual-facet, and
  namespace collision naming while preserving exact JavaScript spellings.
- Hardened post-S4 semantics so unsupported callable/constructable and indexed
  value merges preserve their facets, and parser-hoisted anonymous declarations
  carry explicit provenance.
- Reserved backend-owned and generated Dart names, and made digit-leading
  declaration filenames produce valid library identifiers.
- Lowered renamed class overloads through runtime-valid extension or qualified
  top-level interop bindings; computed symbol keys now produce an explicit
  unsupported diagnostic rather than a false string-key binding.
- Added semantic counts, suppression records, normal CLI warnings, and verbose
  diagnostics. External module augmentations are modeled and visibly
  suppressed until a later merge policy is implemented.

### Validation and maintenance

- Added a four-file pre-S5 acceptance fixture and `pnpm test:s5:fixture`,
  snapshotting complete Dart output and normalized verbose CLI diagnostics.
- Completed a 107-file post-S4 line-by-line audit. It records 16 new findings,
  reopens `L-10` as partial, and assigns a correctness barrier before S5.
- Locked the first pre-S5 repair to delete the temporary context/reset
  singleton, move all compiler state per run, return generation diagnostics,
  and expose an owned linked program to emitters and future backends.
- Audited the original full browser-type library/name registries and added
  `I-15`: host-library provenance is currently discarded. S5 now requires
  identity-safe, SDK-validated platform substitutions and one collision-safe
  import planner instead of leaf-text replacements.
- Corrected the utility-type plan after verifying that `Record<K, V>` bypasses
  unsupported aliasing and emits an unresolved Dart name (`E-36`); S5 now owns
  a valid lowering-or-documented-fallback policy.
- Added a decision-complete root pre-S5 implementation ledger for tasks
  4.11–4.17, including phase contracts, commit boundaries, failure policy, and
  executable acceptance gates.
- Revalidated the expanded 1,654-file declaration corpus with no thrown errors;
  the known empty-output count remains 719.
- Made parsed `this` types link to their enclosing declaration so constructor-
  companion redirects update fluent return names after semantic merging.
- Expanded `pnpm test:s4` to 34 focused tests and retained the exact 2,530
  pre-semantic S3 declaration census.
- Removed the orphaned 1,684-line five-pass pipeline and its TypeScript aliases.
- Kept h3 output stable; removed all Stage 4 duplicate, keyword, and syntax
  analyzer errors from the legacy fixtures, Leaflet, and three.js.

## [0.5.0] - 2025-08-20

### Features
- **Logging**: New and Per run based Logging system for Full IR Dump between 5 stages. Integrated with `-l` cli flag

### Fixes
- **Data Loss for Hyrbid Augementation**: Fixed a critical data and ir loss issue from v0.4, where any combination of declaration statements not having same key and having function tag, are ignored

### Internal
- **Reorganization**: Reorganized entire `src/` folder to be more clean and correct pathing
- **Prefixed Imports**: Now entire codebase uses `import @smth/` like imports instead of relative imports.


## [0.4.0] - 2025-08-10

### 🚀 Features

-   **TypeLiteral Hoisting:** Anonymous object literal types (e.g., `{ name: string; }`) are now automatically "hoisted" into their own uniquely named, reusable `@JS()` `@anonymous` classes. This is a massive improvement for type safety and code clarity, replacing countless `dynamic` types with strong, concrete shapes.
-   **Function & Method Overload Resolution:** Multiple declarations for the same function or method are now correctly handled. The system intelligently groups them and emits uniquely named Dart functions (e.g., `myFunc_1`, `myFunc_2`) with a shared `@JS()` annotation, allowing developers to call the correct overload.

###  architectural

-   **New 5-Pass Compiler Architecture:** The transpiler's engine has been completely re-architected into a robust, multi-pass pipeline (`Type Pass` -> `Type Transformer` -> `Declaration Pass` -> `Declaration Transformer` -> `Emission Pass`). This provides a powerful foundation for more advanced semantic analysis and future features.
-   **IR Purification:** The Intermediate Representation (IR) is now fully decoupled from the TypeScript AST. It is a pure, serializable data structure, which simplifies transformations and improves system integrity.

### Improvements

-   **Blazing Performance:** Despite the more complex architecture, performance is now consistently **~2.7 seconds** for the entire test suite, a **~50% improvement** over v0.3.0. This is due to a new global type cache and the elimination of legacy parsing logic.
-   **Enhanced API Design:** Hoisted anonymous types now have idiomatic Dart factory constructors with **named parameters**, dramatically improving the developer experience.

### Internal

-   **Legacy Code Removal:** A significant amount of old, redundant parsing logic has been purged, resulting in a **~17% reduction** in the final bundled package size.
-   **State Management:** A new singleton `TranspilerContext` has been introduced to manage state cleanly across the new compiler passes.

## [0.3.0] - 2025-07-29

### Added

-   **Comprehensive Testing Framework:** Integrated `vitest` for robust unit and snapshot testing across the entire transpilation pipeline.
-   **`stdout` Output Option:** Added a new `--stdout` CLI flag to print transpiled code directly to the console.

### Improvements

-   **Major Performance Boost:** Refactored the emitter pipeline to use pure functions and a single file write, resulting in a **~4x speed improvement** over v0.2.0.
-   **Enhanced Type Correctness:** Fixed several type emission bugs, especially for `void` return types and complex unions.
-   **Improved Enum Generation:** Rewrote the enum emitter to generate valid `@JS()` classes with static getters.

### Internal

-   **Architectural Hardening:** Fully decoupled core logic from the filesystem.

## [0.2.0] - 2025-07-23

### Added

-   New modular, IR-based system for parsing and emitting types.

### Improvements

-   Improved performance and recursion depth by migrating to a modular architecture for type processing.
-   Better preservation of user-defined type references within generics.
-   Fixed issues with optional, rest, and nullable types.

## [0.1.0] - 2025-07-17

### Added

-   Initial public beta release of `dart_bindgen`.
-   Core functionality to transpile `.d.ts` files to `package:js` bindings.
-   Support for interfaces, classes, enums, functions, and type aliases.
