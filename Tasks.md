# Pending Tasks

This file used to track the abandoned five-pass implementation and is retained
only as a short index. `PLAN.md` is the canonical stage tracker, and
`audit/FINDINGS.md` is the canonical defect inventory. Do not infer status from
historical releases or old architecture names.

## Current

- [x] Implement and audit the Stage 4 semantic layer from `STAGE4_PLAN.md`.
- [x] Add `test:s4` and re-measure all TypeScript, corpus, build, and Dart gates.
- [ ] Begin the Stage 5 `package:js` emitter rebuild from `PLAN.md`.

## Later v1 Work

- [ ] Rebuild the `package:js` emitter after semantic identities stabilize.
- [ ] Emit cross-file imports from linked dependencies.
- [ ] Emit generics, heritage, constructors, callable interfaces, and JSDoc.
- [ ] Complete the extracted `js_facade_gen` conformance suite.
- [ ] Validate h3, Leaflet, and three.js output at their assigned gates.

## Post-v1

- [ ] Add a `dart:js_interop` backend behind a CLI flag.
- [ ] Evaluate advanced utility and mapped types with the TypeScript checker.
- [ ] Integrate browser-type substitutions from modern Dart web packages.
