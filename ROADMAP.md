# Roadmap

**The next release is `1.0.0`.**

The engineering detail lives in [`PLAN.md`](PLAN.md); the defect inventory it is
sequenced from lives in [`audit/`](audit/README.md). This file is the short
version.

---

## Where things stand

`0.5.0` is what npm serves today. Since then the project has been rebuilt on
`refactor/orchestration`: the 5-pass pipeline was replaced by a three-phase
architecture — **symbol generation → linker → emission** — around a global
symbol table.

That change exists to solve the problems the previous two architectures could
not: overload resolution, declaration augmentation, and cross-file imports are
whole-program questions, and there was previously no phase that saw the whole
program. Now there is.

Stages S0–S2 are complete. The link layer now carries checker-backed targets on
IR reference sites, persists resolved graph edges, distinguishes missing from
ambiguous and direct from indirect failure, resolves extensionless declaration
imports conservatively, and exposes resolution/link reports to the CLI and
graph tooling. Leaflet closes at 1,050/1,050 edges; three.js resolves 8,184
edges with zero ambiguity while retaining 31 honest misses from two absent
external type packages. S3—the declaration IR—is next.

The current Dart backend is still the transitional `emitter/old/*`
string-template implementation: some paths work, some deliberately preserve
legacy degradation, and several declaration features are not emitted at all.
The internal `render()` API only means "produce strings without writing them";
it is not the emitter overhaul. S3 makes the IR lossless, S4 performs
whole-program semantic rewrites, and **S5 rebuilds the emitter once** on top of
those completed layers.

---

## Why there is no 0.6

The earlier `v0.6 → v0.9 → v1.0` ladder was drawn against the 5-pass
architecture and a single-file world view. Both are gone, and most of what those
releases promised is now either already built or restructured beyond
recognition. Shipping four more point releases against a plan that no longer
describes the program would be four more announcements that it still isn't
ready.

So the version numbers collapse. `main` keeps `0.5.0` until v1 replaces it
wholesale.

---

## v1.0.0 — the drop-in replacement

**Goal: `js_facade_gen` users swap the tool, rerun the command, and get strictly
better output.**

`js_facade_gen` is archived, and its users have codebases where `package:js` and
`dart:html` dependencies extend well past the generated bindings. Swapping a
generator is an afternoon; migrating an application to `dart:js_interop` is a
project. v1 therefore targets **`package:js`** — deliberately, not by inertia —
including the `dart:html` and `dart:typed_data` substitution imports the
original tool produced.

What lands:

- **Every type is named.** No bare `dynamic`. Constructs Dart cannot represent —
  `keyof`, conditional types, mapped types, template literals, `infer` — become
  real typedefs carrying their TypeScript source in a doc comment, so the origin
  shows up on IDE hover:
  ```dart
  /// Unrepresentable in Dart: `keyof Box<string>`
  typedef KeyOfBoxString = dynamic;
  ```
- **Correct cross-file imports**, generated from the linker's dependency graph.
- **Overload resolution and declaration augmentation** — including the
  `interface` + `var` merging that TypeScript definitions lean on constantly.
- **Generics, inheritance and `implements`** carried through to the output.
- **Dart keyword escaping** and namespace collision renaming.
- **Acceptance gate:** generated bindings for real libraries pass
  `dart analyze` with zero errors, and the ~120-case `js_facade_gen`
  conformance suite runs in CI with a published pass count.

---

## v2.0.0 — modern interop

A **`dart:js_interop` backend behind a CLI flag.**

The IR is output-language agnostic, so a backend is a pair of string tables —
one type emitter, one statement emitter. v2 is a second pair, not a second
compiler. The same seam admits other target languages entirely.

---

## Later

- `ts.TypeChecker` evaluation of utility types (`Partial`, `Readonly`,
  `Record`, `Omit`, `Pick`) so they resolve to real shapes rather than named
  aliases.
- Pre-populating the symbol table from `package:web` so browser types are
  imported rather than regenerated.
