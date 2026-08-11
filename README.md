# Dart Bindgen

**A modern, robust, and performant TypeScript declaration (`.d.ts`) to Dart JS-interop binding generator.**

[![npm version](https://img.shields.io/npm/v/dart_bindgen.svg)](https://www.npmjs.com/package/dart_bindgen)
[![license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![made with ts-morph](https://img.shields.io/badge/made%20with-ts--morph-563d7c.svg)](https://ts-morph.com/)

---

## ⚠️ Beta Version Notice

**`dart_bindgen` is currently in active development and should be considered beta software.**

`v0.5.0` is the current npm release. The orchestration branch is the active
post-release line and is being completed directly toward v1.0.0. However,
please be aware that:

*   **APIs are not yet stable:** The generated code and CLI usage may change as we approach v1.0.
*   **Bugs are expected:** While core features are well-tested, you may encounter issues with the new transformer logic or esoteric TypeScript types.
*   **Features are incomplete:** Declaration augmentation and multi-file project analysis are still on the roadmap.

Your feedback, bug reports, and contributions are more valuable than ever. Thank you for being part of the journey!

---

## Why `dart_bindgen`?

For Dart developers working with the web, the official `js_facade_gen` was foundational but is now deprecated. It struggles with modern TypeScript, often falling back to `dynamic` and sacrificing Dart's core strength: type safety.

**`dart_bindgen` is a complete, modern successor designed for the future of Dart on the web.**

*   **Intelligent & Type-Safe:** Unsupported TypeScript constructs become named, documented aliases rather than anonymous degradation.
*   **Whole-program linking:** Checker-backed reference targets, persisted dependency edges, honest ambiguity and missing states, and module-resolution reports make multi-file analysis inspectable.
*   **Robust & Hardened:** Unit, smoke, linker, resolution and opt-in real-corpus gates protect the active pipeline.
*   **Modern Architecture:** Uses `symbol generation → linker → emission` around a language-independent IR, built on [`ts-morph`](https://ts-morph.com/).

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
  -p, --tsconfig <path>           Use a tsconfig for authoritative module resolution
  -l, --enable-logs               Enable phase and module-resolution logging
  -v, --verbose                   Print structured linker details; implies -l
      --dry-run                   Show what would be processed without writing files
  -h, --help                      Show help
      --version                   Show version number
```

**Examples**

```bash
# Process all .d.ts files in the current directory and subdirectories
dart_bindgen -d "**/*.d.ts"

# Process files from multiple specific locations and output them to a 'generated' folder
dart_bindgen -d "src/types/**/*.d.ts" -d "vendor/lib.d.ts" -o ./generated

# Show phase and module-resolution logs
dart_bindgen -d "path/to/my-lib.d.ts" -l

# Add every resolved/missing/ambiguous linker edge and failure chain
# (-v implies log mode, and the boolean flags compose as -lv)
dart_bindgen -d "path/to/my-lib.d.ts" -lv

# See which files would be processed without actually generating any code
dart_bindgen -d "**/*.d.ts" --dry-run
```

---

## Motivation

`dart_bindgen` was born out of real-world necessity. While modernizing the Flutter/Dart bindings for H3, it became evident that existing tooling couldn't provide the type-safe, modern bindings that Dart developers expect.

Rather than patching a decade-old system, `dart_bindgen` was created to be the tool we wish we had: one that understands modern TypeScript, respects Dart's powerful type system, and is fast and reliable enough for any project.

---

## Roadmap & Contribution

The project now moves directly from the published v0.5.0 to v1.0.0. Stage 2's
truthful multi-file link layer, Stage 3 declaration IR, and Stage 4 semantic
layer are complete. Stage 5 rebuilds the `package:js` emitter over canonical
bindings and Dart-visible names. See [`ROADMAP.md`](ROADMAP.md) for the public overview,
[`PLAN.md`](PLAN.md) for the stage sequence, and
[`STAGE4_PLAN.md`](STAGE4_PLAN.md) for the implemented S4 contract.

You can help! This is a solo-developer project, and community involvement is vital.

*   [View the Roadmap Issue](https://github.com/codewithsam110g/dartify/issues/1)
*   [Create a Bug Report or Issue](https://github.com/codewithsam110g/dartify/issues/new)
*   [Start a Discussion](https://github.com/codewithsam110g/dartify/discussions)
*   Check out the source and suggest improvements or fixes.

We welcome pull requests!

---

## Author

Made with ❤️, a lot of coffee, and a deep belief in good tooling by [@codewithsam110g](https://github.com/codewithsam110g).
