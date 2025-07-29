# Dart Bindgen

**A modern, robust, and performant TypeScript declaration (`.d.ts`) to Dart JS-interop binding generator.**

[![npm version](https://img.shields.io/npm/v/dart_bindgen.svg)](https://www.npmjs.com/package/dart_bindgen)
[![license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![made with ts-morph](https://img.shields.io/badge/made%20with-ts--morph-563d7c.svg)](https://ts-morph.com/)

---

## ⚠️ Beta Version Notice

**`dart_bindgen` is currently in active development and should be considered beta software.**

This `v0.3.0` release represents a major step forward in stability and performance, with a full testing framework now in place. However, please be aware that:

*   **APIs are not yet stable:** The generated code and CLI usage may change in future `0.x` releases as we move towards a stable v1.0.
*   **Bugs are expected:** While core functionality is well-tested, you may encounter issues with complex or esoteric TypeScript types.
*   **Features are incomplete:** Many items on our roadmap, such as a transformer pipeline for function overloads, are not yet implemented.

Your feedback, bug reports, and contributions during this phase are invaluable. Thank you for being an early part of the journey!

---

## Why dart_bindgen?

For Dart developers working with the web, generating bindings for JavaScript libraries is a common challenge. The official `js_facade_gen` was a foundational tool, but it's a product of its time. Modern TypeScript libraries often cause it to fall back to using `dynamic`, forcing developers to sacrifice the type safety that is a core strength of Dart.

**`dart_bindgen` is a complete, modern rewrite designed to solve this problem.**

*   **Type-Safe by Default:** A primary focus on generating truly type-safe Dart code for `package:js`, avoiding `dynamic` wherever possible.
*   **Blazingly Fast:** A multi-stage compiler architecture, refined for performance, can process massive libraries like `lib.dom.d.ts` in about a second.
*   **Robust & Hardened:** The entire pipeline is now covered by a comprehensive suite of unit and snapshot tests, ensuring reliability and preventing regressions.
*   **Modern Architecture:** Uses a `parser -> IR -> emitter` pipeline for accurate and maintainable code generation, built on the excellent [`ts-morph`](https://ts-morph.com/) library.

---

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
```
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

# Run with verbose logging to see detailed processing steps
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

This project is in its early stages, with a long and exciting roadmap ahead. With the v0.3.0 "Hardening Release" complete, the focus now shifts to semantic intelligence.

**Next Up (v0.4.0 - The "Semantic" Release):**
*   **Transformer Pipeline:** Introducing a new stage to intelligently modify the IR before emission.
*   **Function Overload Resolution:** Merging multiple function declarations into uniquely named Dart functions.
*   **Declaration Augmentation:** Handling complex TS patterns like merging interfaces and namespaces.
*   **`TypeLiteral` Hoisting:** Automatically converting inline object types into reusable `@anonymous` classes.

**Long Term:**
*   (v1.0) A stable, feature-complete generator for `package:js`.
*   (v2.0) A new emitter for Dart's modern `package:js_interop` static JS types.
*   And much more!

You can help! This is a solo-developer project, and community involvement is vital.

*   [View the Roadmap Issue](https://github.com/codewithsam110g/dartify/issues/1)
*   [Create a Bug Report or Issue](https://github.com/codewithsam110g/dartify/issues/new)
*   [Start a Discussion](https://github.com/codewithsam110g/dartify/discussions)
*   Check out the source and suggest improvements or fixes.

We welcome pull requests!

---

## Author

Made with ❤️, a lot of coffee, and a deep belief in good tooling by [@codewithsam110g](https://github.com/codewithsam110g).