# Dartify

**Dartify** is a modern TypeScript-to-Dart transpiler built from the ground up using [`ts-morph`](https://ts-morph.com/). It converts `.d.ts` TypeScript declaration files into clean, idiomatic Dart code.

This project is inspired by the now-archived [`js_facade_gen`](https://github.com/dart-lang/js_facade_gen) tool created by the Dart team. Unlike its predecessor, Dartify leverages the `ts-morph` library instead of the raw and brittle TypeScript compiler APIs — eliminating the need for hacks, monkey patches, or compiler host overrides.

---

## 🚀 Why Dartify?

- 🧠 **AST-based & ergonomic**: Uses `ts-morph` for intuitive, modern AST manipulation
- 🔄 **Transforms declaration files** (`.d.ts`) into Dart typedefs, classes, and functions
- ⚙️ **No compiler hacks**: Avoids the legacy `ts.factory`, `updateX()`, and `readonly` headaches
- 🧹 **Clean architecture**: Designed from scratch to be modular, testable, and future-proof
- 🤝 **Contributor-friendly**: Easier to understand and extend than compiler-internals-based tools

---

## 🔧 Getting Started

```bash
npm install
npm run dev  # tsx src/main.ts
```

Place your `.d.ts` file inside `src/test-data/` and watch Dartify convert your declarations into Dart.

## 💡 Motivation

Dartify was born out of real-world necessity. While working on modernizing Flutter bindings for [H3 (Hexagonal Hierarchical Geospatial Indexing)](https://github.com/uber/h3), it became evident that the existing `js_facade_gen` tool couldn't handle modern TypeScript APIs or declaration structures. Rather than fight brittle internals, this project rebuilds the pipeline using today's best TypeScript tooling.

---

## 👨‍💻 Author

Made with ❤️ and necessity by [@codewithsam110g](https://github.com/codewithsam110g), one of the maintainer of H3 bindings for Flutter/Dart.
