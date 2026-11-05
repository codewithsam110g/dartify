# Roadmap

**The next release is `1.0.0`.** Its features are complete on
`refactor/orchestration`. Before it is published, a hardening pass fixes the
defects that two independent v1 release audits found (48 verified: 3 high,
26 medium, 19 low) outside the gated corpora.

The engineering detail lives in [`docs/`](docs/README.md): milestone status in
[`docs/roadmap.md`](docs/roadmap.md), decisions in
[`docs/decisions.md`](docs/decisions.md), and the defect register in
[`docs/hardening/`](docs/hardening/README.md). This file is the short version.

---

## Where things stand

`0.5.0` is what npm serves today. Since then the project has been rebuilt as a
three-phase compiler, **symbol generation → linker → emission**, around a
target-agnostic IR:

- **S0–S4** made the IR lossless, the link graph truthful, and the semantic
  layer own merging, overloads and naming.
- **The pre-S5 barrier** removed all process-global state (every compiler run
  owns its project, symbol table and diagnostics), preserved module exports,
  const enums and TypeScript host-type identity, normalized impossible
  intersections to `Never`, stopped bare-name links across unrelated modules,
  and made generated names order-independent.
- **S5** rebuilt the `package:js` emitter once, behind a backend seam.
- **S6** made the `js_facade_gen` reference cases and the shipped h3 bindings
  executable gates, added a Dart analyzer + dart2js runtime gate and CI.
- **After S6**, an end-to-end suite runs generated bindings against the real
  h3-js, three and leaflet packages, and `--watch` rebuilds incrementally in
  well under 100 ms, verified byte for byte against cold builds.

Measured results:

| | |
|---|---|
| h3 | 0 analyzer errors/warnings; reproduces all 63 declarations of the js_facade_gen bindings h3 ships today |
| Leaflet (2 libraries) | 0 errors/warnings |
| three.js (420 libraries) | 0 errors/warnings |
| js_facade_gen reference cases | 67/90 parity, 16 improved, 2 differ, 5 out of scope |
| runtime | dart2js probe passes: overloads, rest args, constructors, renames, index operators, factories, promises |
| end-to-end | Dart programs using the h3, three.js and Leaflet bindings produce the same results as the JavaScript libraries |
| watch | rebuild after an edit: h3 ~35 ms, Leaflet ≤ 94 ms, three.js ~53 ms |

---

## Before v1.0.0 — hardening

The gated corpora (h3, Leaflet, all 420 three.js libraries) are analyzer-clean
and pass the end-to-end suite, but targeted probing found defects elsewhere:
`Date` bound as `DateTime`, default and `export =` exports dispatching to the
wrong JavaScript property, malformed input producing "successful" output, lost
re-exports, watch-mode divergence, and name-legality and generic-fidelity
errors. Every one is fixed, or explicitly accepted as a known issue, before the
publish.

## v1.0.0 — the drop-in replacement

`js_facade_gen` users swap the tool, rerun the command, and get strictly
better output. v1 targets **`package:js`** deliberately: those codebases depend
on `package:js` and `dart:html` beyond the generated files, and swapping a
generator is an afternoon where a `dart:js_interop` migration is a project.

What v1 does:

- **Every degradation is named.** `keyof`, conditional and mapped types,
  unions, unresolved references and unmapped host types become documented
  typedefs stated once, not `dynamic` comments at every use site.
- **Correct cross-file imports** from the linker's graph, with collision-safe
  prefixes; barrels become `export` libraries.
- **Overloads, augmentation, generics, inheritance and `implements`**, lowered so
  dart2js dispatches correctly.
- **Platform types by checker identity**: the reference tool's `dart:html`,
  `dart:svg`, `dart:web_gl`, `dart:web_audio`, `dart:indexed_db`,
  `dart:web_sql` and `dart:typed_data` registry, re-validated against the
  current Dart SDK.
- **Standard utilities stay valid Dart**: `Partial`/`Readonly`/`Required` lower
  to their argument; others (`Record`, `Omit`, …) are named fallbacks.

## v2.0.0 — modern interop

A **`dart:js_interop` backend behind a CLI flag.** The backend seam
(`src/engine/emitter/backend.ts`) consumes the same owned `LinkedProgram`; v2
is a second backend, not a second compiler. Platform types will map to
`package:web` instead of `dart:html`.

## Later

- Checker evaluation of utility and mapped types (`Record`, `Omit`, `Pick`),
  so v1's named fallbacks can resolve to precise shapes where provable.
- Emitting external-module augmentations (modeled and visibly suppressed
  today).
