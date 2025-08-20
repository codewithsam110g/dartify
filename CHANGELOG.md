# Changelog

All notable changes to this project will be documented in this file.

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