# Dart Bindgen

**A modern, robust, and performant TypeScript declaration (`.d.ts`) to Dart JS-interop binding generator.**

[![npm version](https://img.shields.io/npm/v/dart_bindgen.svg)](https://www.npmjs.com/package/dart_bindgen)
[![license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![made with ts-morph](https://img.shields.io/badge/made%20with-ts--morph-563d7c.svg)](https://ts-morph.com/)

---

## ⚠️ Beta Version Notice

**`dart_bindgen` is currently in active development and should be considered beta software.**

This `v0.4.0` "Intelligence" release is a massive step forward, introducing a true compiler pipeline capable of understanding complex TypeScript patterns. However, please be aware that:

*   **APIs are not yet stable:** The generated code and CLI usage may change as we approach v1.0.
*   **Bugs are expected:** While core features are well-tested, you may encounter issues with the new transformer logic or esoteric TypeScript types.
*   **Features are incomplete:** Declaration augmentation and multi-file project analysis are still on the roadmap.

Your feedback, bug reports, and contributions are more valuable than ever. Thank you for being part of the journey!

---

## Why `dart_bindgen`?

For Dart developers working with the web, the official `js_facade_gen` was foundational but is now deprecated. It struggles with modern TypeScript, often falling back to `dynamic` and sacrificing Dart's core strength: type safety.

**`dart_bindgen` is a complete, modern successor designed for the future of Dart on the web.**

*   **Intelligent & Type-Safe:** Goes beyond simple translation. It understands complex patterns like **anonymous object types** and **function overloads**, generating strong, idiomatic Dart code where other tools produce `dynamic`.
*   **Blazingly Fast:** A new 5-pass compiler architecture with intelligent caching processes massive libraries like `lib.dom.d.ts` in under 3 seconds.
*   **Robust & Hardened:** The entire pipeline is covered by a comprehensive suite of unit and snapshot tests, ensuring reliability and preventing regressions.
*   **Modern Architecture:** Uses a `Parser -> IR -> Transformer -> Emitter` pipeline for accurate and maintainable code generation, built on the excellent [`ts-morph`](https://ts-morph.com/) library.

---

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) (which includes npm).

### Installation

Install `dart_bindgen` globally using npm to make it available as a command-line tool.

```bash
npm install -g dart_bindgen
```

### Usage

The CLI is designed to be simple and flexible, accepting one or more glob patterns to find your `.d.ts` files.

**CLI Options**
```bash
Usage: dart_bindgen [options]

Options:
  -d, --def-files <patterns...>   TypeScript definition files or glob patterns (required)
  -o, --output <directory>        Output directory for generated .dart files
  -l, --enable-logs               Enable verbose logging during transpilation
      --dry-run                   Show what would be processed without writing files
  -h, --help                      Show help
  -v, --version                   Show version number
```

**Examples**

```bash
# Process all .d.ts files in the current directory and subdirectories
dart_bindgen -d "**/*.d.ts"

# Process files from multiple specific locations and output them to a 'generated' folder
dart_bindgen -d "src/types/**/*.d.ts" -d "vendor/lib.d.ts" -o ./generated

# Run with verbose logging to see the new 5-pass pipeline in action
dart_bindgen -d "path/to/my-lib.d.ts" --enable-logs

# See which files would be processed without actually generating any code
dart_bindgen -d "**/*.d.ts" --dry-run
```

---

## Motivation

`dart_bindgen` was born out of real-world necessity. While modernizing the Flutter/Dart bindings for H3, it became evident that existing tooling couldn't provide the type-safe, modern bindings that Dart developers expect.

Rather than patching a decade-old system, `dart_bindgen` was created to be the tool we wish we had: one that understands modern TypeScript, respects Dart's powerful type system, and is fast and reliable enough for any project.

---

## Roadmap & Contribution

With the v0.4.0 "Intelligence" release complete, the focus is now on polishing the single-file experience and preparing for multi-file project support.

**Next Up (v0.5.0 - The "Final Polish" Release):**
*   **Declaration Augmentation:** Handling complex TS patterns like merging `interface` and `var` declarations.
*   **`this` Type Resolution:** Correctly handling fluent APIs that return `this`.
*   **Dart Keyword Escaping:** Safely renaming TS identifiers that conflict with Dart's reserved words.

**Long Term:**
*   (v0.6) Full support for multi-file projects with automatic imports.
*   (v0.7) Integration with `package:web` to use existing browser types.
*   (v1.0) A stable, feature-complete generator for `package:js`.
*   (v2.0) A new emitter for Dart's modern `dart:js_interop` static types.

You can help! This is a solo-developer project, and community involvement is vital.

*   [View the Roadmap Issue](https://github.com/codewithsam110g/dartify/issues/1)
*   [Create a Bug Report or Issue](https://github.com/codewithsam110g/dartify/issues/new)
*   [Start a Discussion](https://github.com/codewithsam110g/dartify/discussions)
*   Check out the source and suggest improvements or fixes.

We welcome pull requests!

---

## Author

Made with ❤️, a lot of coffee, and a deep belief in good tooling by [@codewithsam110g](https://github.com/codewithsam110g).