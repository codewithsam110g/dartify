# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2025-07-29

### Added

-   **Comprehensive Testing Framework:** Integrated `vitest` for robust unit and snapshot testing across the entire transpilation pipeline. This includes:
    -   End-to-end snapshot tests for real-world `.d.ts` files.
    -   Unit tests for declaration parsers (`ts.Node` -> `IR`).
    -   Unit tests for type parsers (`ts.TypeNode` -> `IRType`).
    -   Unit tests for all emitters (`IR` -> `string`).
-   **`stdout` Output Option:** Added a new `--stdout` CLI flag to print transpiled code directly to the console instead of writing to a file.

### Improvements

-   **Major Performance Boost:** Refactored the emitter pipeline to be composed of pure functions, collecting all output in memory before a single file write. This dramatically reduces I/O overhead, resulting in a **~4x speed improvement** over v0.2.0.
-   **Enhanced Type Correctness:** The new testing framework immediately identified and helped fix several type emission bugs, leading to more accurate and idiomatic Dart code, especially for `void` return types and complex unions.
-   **Improved Enum Generation:** The emitter for TypeScript enums has been completely rewritten to generate valid and robust `@JS()` classes with static getters, correctly supporting enums with assigned string or number values.

### Internal

-   **Architectural Hardening:** The transpiler's core logic is now fully decoupled from the filesystem, enabling programmatic and testable invocation.
-   All declaration emitters have been refactored into pure functions that return strings, centralizing I/O operations.

## [0.2.0] - 2025-07-23

### Added

-   New modular, IR-based system for parsing and emitting types.
-   Moved the old `ts.Type`-based parser to a legacy folder.

### Improvements

-   Improved performance and recursion depth by migrating to a modular, pure-function-based architecture for type processing.
-   Better identification of user-defined type references within generics (e.g., `Array<MyType>` is now correctly preserved).
-   Fixed several issues with optional, rest, and nullable type generation.

### Breaking Changes

-   The initial type system revamp focused on core types (Literals, Primitives, Type References, basic Unions, Tuples, and Functions). Support for more complex types will be added progressively.

## [0.1.0] - 2025-07-17

### Added

-   Initial public beta release of `dart_bindgen`.
-   Core functionality to transpile TypeScript `.d.ts` files to Dart `package:js` bindings.
-   Support for interfaces, classes, enums, functions, type aliases, and modules.
-   Command-line interface (CLI) for file processing.