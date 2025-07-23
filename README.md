# Dart Bindgen

**A modern, robust, and type-safe TypeScript declaration (`.d.ts`) to Dart JS-interop binding generator.**

[![npm version](https://img.shields.io/npm/v/dart_bindgen.svg)](https://www.npmjs.com/package/dart_bindgen)
[![license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![made with ts-morph](https://img.shields.io/badge/made%20with-ts--morph-563d7c.svg)](https://ts-morph.com/)

---

## ⚠️ Beta Version Notice

**dart_bindgen is currently in active development and should be considered beta software.**

This `v0.2.0` release is a "Developer Preview" intended for early adopters and contributors. While it is capable of processing complex libraries, please be aware that:

* **APIs are not stable:** The generated code and CLI usage may change in future `0.x` releases.
* **Bugs are expected:** You will likely encounter issues, especially with complex or esoteric TypeScript types.
* **Features are incomplete:** Many items on our roadmap, such as full generic support and JSDoc comments, are not yet implemented.

Your feedback, bug reports, and contributions during this phase are invaluable. Thank you for being an early part of the journey!

---

## Why dart_bindgen?

For Dart developers working with the web, generating bindings for JavaScript libraries is a common challenge. The official `js_facade_gen` was a foundational tool, but it's a product of its time. Modern TypeScript libraries often cause it to fall back to using `dynamic`, forcing developers to sacrifice the type safety that is a core strength of Dart.

**dart_bindgen is a complete, modern rewrite designed to solve this problem.**

* **Type-Safe by Default:** A primary focus on generating truly type-safe Dart code for `package:js`, avoiding `dynamic` wherever possible.
* **Modern Architecture:** Uses a robust `parser -> IR -> emitter` pipeline for accurate and maintainable code generation.
* **No Compiler Hacks:** Built on the excellent [`ts-morph`](https://ts-morph.com/) library for stable and intuitive AST manipulation.
* **A Tool for Dart Devs, in the JS Ecosystem:** Lives where your JS dependencies live, installing easily into any Node.js-based workflow.

---

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) (which includes npm).

### Installation

Install dart_bindgen globally using npm to make it available as a command-line tool.

```bash
npm install -g dart_bindgen
```

### Usage

```bash
# Process all .d.ts files recursively
dart_bindgen -d "**/*.d.ts"

# Process multiple patterns and output to ./output
dart_bindgen -d "src/*.d.ts" -d "lib/*.d.ts" -o ./output

# Verbose processing of types directory
dart_bindgen --def-files "types/**/*.d.ts" --verbose
```

---

## Motivation

dart_bindgen was born out of real-world necessity. While modernizing the Flutter/Dart bindings for H3, it became evident that existing tooling couldn't provide the type-safe, modern bindings that Dart developers expect.

Rather than patching a decade-old system, dart_bindgen was created to be the tool we wish we had: one that understands modern TypeScript, respects Dart's powerful type system, and integrates cleanly into the modern web development workflow.

---

## Roadmap & Contribution

This project is in its early stages, with a long and exciting roadmap ahead, including:

* A full Type System revamp for rock-solid type resolution.
* (v2.0) A new emitter for Dart's modern `package:js_interop` static JS types.
* Emission of JSDoc comments into Dart docs.
* And much more!

You can help! This is a solo-developer project, and community involvement is vital.

* [View the Roadmap Issue](https://github.com/codewithsam110g/dartify/issues/1)
* [Create a Bug Report or Issue](https://github.com/codewithsam110g/dartify/issues/new)
* [Start a Discussion](https://github.com/codewithsam110g/dartify/discussions)
* Check out the source and suggest improvements or fixes

We welcome pull requests! Be sure to check out the Roadmap to see what we’re working on.

---

## Author

Made with ❤️, a lot of coffee, and a deep belief in good tooling by [@codewithsam110g](https://github.com/codewithsam110g).
