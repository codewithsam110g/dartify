# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-07-23
### Added
- New Modular System for Types with parser + ir + emitter
- Moved type.ts legacy typeParser to legacy/

### Improvements
- Better recursion and depth support
- Better Identification of Userdef Typeref inside Typerefs => old: List<List<dart_native>> now: List<List<Typeref Name>>
- Improved Performance by using modular structure
- Fixed Issues with optional, rest and nullable types

### Breaking Changes
- Only major types are supported in this Type System Revamp
  - Literals: "1", 2, true
  - Primitives: String, number etc
  - Typeref: Array, Promise, Map etc
  - Unions: basic with T | null | undef => T?, T1 | T2 => dynamic
  - Tuples: basic with [str, str, str] => List<Str> else List<dynamic>
  - Functions
- rest will be dynamic or Map<String, dynamic> in case of typeLiterals
- They will be added progressively

Note: nothing is changed in Emit Structures for decls as this version is type system revamp

## [0.1.0] - 2025-07-17

### Added
- Initial public beta release of `dart_bindgen`.
- Core functionality to transpile TypeScript `.d.ts` files to Dart `package:js` bindings.
- Support for interfaces, classes, enums, functions, type aliases, and modules.
- Command-line interface (CLI) for file processing.
