### **Project Roadmap**

With the v0.5.0 "Observability & Order" release complete, the codebase is now significantly more maintainable and debuggable. The focus shifts back to completing the core semantic transformations for single-file support before tackling multi-file projects.

---

### **Completed Milestones**

* **`[✓]` v0.4.0: The "Intelligence Infrastructure" Release**
    * **Status:** The 5-pass pipeline is live. Overload grouping and basic hoisting are functional, but with known regressions.

* **`[✓]` v0.5.0: The "Observability & Order" Release**
    * **Status:** Shipped. This foundational release focused on project health and developer experience.
    * **Key Achievements:**
        * **Source Code Refactor:** Reorganized the entire `src/` directory into a clean, maintainable pipeline architecture.
        * **Enhanced Observability:** Implemented a production-grade logger and a full **IR (Intermediate Representation) dump** capability (`--emit-logs`) to make every compiler pass transparent.
        * **Critical Bug Fix:** Resolved a major regression from the overload implementation where multiple declaration types with the same name (e.g., `interface AbortSignal` and `var AbortSignal`) were being dropped.

---

### **Next Up**

* **v0.6.0: The "Intelligence, Part II" Release**
    * **Theme:** Fixing the v0.4 regressions and completing the core semantic transformations.
    * **Primary Objectives:**
        * Implement **declaration augmentation** to correctly merge complex TS patterns like `interface` + `var`.
        * Fix nested `TypeLiteral` hoisting from within unions, arrays, and generics by implementing a recursive IR walker.
        * **(Stretch Goal)** Generalize overload resolution to handle constructors, getters, and setters.

---

### **The Road to v1.0**

* **v0.7.0: The "Robustness" Release**
    * **Theme:** Handling the final edge cases required for flawless single-file generation.
    * **Primary Objectives:**
        * Correctly resolve the **`this` type** in method return types to support fluent APIs.
        * Implement **Dart keyword escaping** to safely rename TS identifiers that conflict with Dart's reserved words.

* **v0.8.0: The "Project-Aware" Release**
    * **Theme:** Transitioning from a file transpiler to a project compiler.
    * **Primary Objectives:**
        * Implement **whole-program analysis** by parsing all files in a project first.
        * Build a **global symbol table** to map every declaration to its source file.
        * Generate correct, relative **import statements** between files.

* **v0.9.0: The "Ecosystem" Release**
    * **Theme:** Seamlessly integrating with the official Dart web ecosystem.
    * **Primary Objective:**
        * Integrate with **`package:web`** by pre-populating the global symbol table, allowing the emitter to import existing browser types (`import 'dart:html';`) instead of regenerating them.

* **v1.0.0: The "Stable" Release**
    * **Theme:** Ultimate stability, documentation, and tackling the most complex TypeScript features.
    * **Primary Objectives:**
        * Integrate the `ts.TypeChecker` to evaluate advanced conditional types, mapped types, and other complex patterns.
        * Address all remaining issues through community hardening and bug fixes.
        * Finalize all project documentation.

---

### **Future Vision**

* **v2.0: The "Modern Interop" Release**
    * **Objective:** Implement a new emitter backend targeting Dart's modern, static `dart:js_interop` library for improved performance and type safety.