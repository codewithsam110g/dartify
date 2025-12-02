# Contributing to dart_bindgen

First off, thanks for considering contributing! You are helping build the infrastructure that will power the next generation of Dart web apps.

`dart_bindgen` is not just a regex script; it is a full-blown compiler that transforms TypeScript ASTs into Dart. It was born out of necessity to support the [official H3 Dart SDK](https://github.com/uber/h3-js) and is designed to handle the "horror" of TypeScript types that other tools ignore.

## ⚡ The "Too Long; Didn't Read"

1.  **Stack:** TypeScript, `ts-morph` (AST parsing), Vitest (Testing).
2.  **Architecture:** A 5-Pass Compiler Pipeline (Parser -> IR -> Transformer -> Emitter).
3.  **Current Focus:** v0.6 Refactor (Symbol Tables & Recursive Visitors).
4.  **Setup:** `npm install` then `npm test`.

---

## 🏗️ The Architecture (Hacker's Guide)

To contribute effectively, you need to understand how data flows through the compiler. We don't modify strings until the very end; we manipulate an **Intermediate Representation (IR)**.

### The 5-Pass Pipeline

1.  **Pass 1: Type Collection** (`src/passes/typePass`)
    * Scans the `.d.ts` AST.
    * Collects all Type definitions (Interfaces, Type Aliases, Enums).
    * Converts them into our custom **IR**.

2.  **Pass 2: Type Transformation** (`src/transformers/typeTransformers.ts`)
    * *The "Cleaner".* This is where we handle TypeScript's nesting.
    * **Goal:** Convert anonymous object literals (`{ x: int }`) into named IR references (`AnonInterface$1`).
    * **Current Mission:** We are refactoring this to use a **Recursive Visitor** pattern to handle deep nesting (`Promise<Map<string, { x: int }>>`).

3.  **Pass 3: Declaration Collection** (`src/passes/declarationPass`)
    * Scans for actual code: `var`, `function`, `class`, `const`.
    * Uses the Type Cache from Pass 1 to resolve types.

4.  **Pass 4: Declaration Transformation** (`src/transformers/declarationTransformers.ts`)
    * *The "Fixer".* This resolves conflicts between Dart and JS semantics.
    * **Function Overloading:** Groups `func(x: int)` and `func(x: string)` into specific Dart methods.
    * **Current Mission:** We are implementing a **Symbol Table** here to handle Declaration Augmentation (merging `interface` + `var`).

5.  **Pass 5: Emission** (`src/passes/emissionPass`)
    * *The "Printer".* Takes the final, clean IR and outputs Dart code strings.
    * Currently targets `package:js` (Legacy).
    * **Future Goal:** A v2 Emitter for `package:web` (Wasm support).

---

## 🛠️ Development Setup

This project uses **Node.js** and **npm**.

1.  **Clone & Install:**
    ```bash
    git clone [https://github.com/codewithsam110g/dart_bindgen.git](https://github.com/codewithsam110g/dart_bindgen.git)
    cd dart_bindgen
    npm install
    ```

2.  **Run Tests (The Safety Net):**
    We rely heavily on Snapshot Testing.
    ```bash
    npm test
    ```
    * If you change compiler logic, the snapshots *will* fail. This is good!
    * Check the diff. Does the generated Dart code look better?
    * If yes, update snapshots: `npm test -- -u`.

3.  **Build & Link:**
    To test the CLI locally against a real project:
    ```bash
    npm run build
    npm link
    ```

---

## 🗺️ How You Can Help (Current Roadmap)

We are currently working towards **v0.6.0** and **v1.0.0**.

### 🟢 Good First Issues
* **Test Coverage:** Add a new `.d.ts` file to `test/snapshots/` that covers a weird edge case (e.g., complex Generics) and verify the output.
* **Documentation:** Improve JSDoc comments on the `IR` interfaces.

### 🟡 Intermediate (Compiler Logic)
* **Symbol Table:** We need a robust `SymbolTable` class to track variable scopes.
* **Recursive Visitor:** Help rewrite Pass 2 to support deep traversal of types.

### 🔴 Advanced (The Fun Stuff)
* **Wasm Emitter:** Design the `Emitterv2` class that outputs `package:web` compatible code.

---

## 📝 Coding Standards

* **No `any`:** We use strict TypeScript. If you need dynamic behavior, use our specific IR types.
* **Comment "Why", not "What":** The AST traversal code can be dense. Explain *why* you are skipping a node, not just that you are skipping it.
* **Keep it Pure:** Transformations should optimally be pure functions where possible. Avoid global mutable state outside the `TranspilerContext`.

---

## License

By contributing, you agree that your contributions will be licensed under its Apache-2.0 License.
