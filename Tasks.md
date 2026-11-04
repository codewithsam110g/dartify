# Pending Tasks

This file used to track the abandoned five-pass implementation and is retained
only as a short index. `PLAN.md` is the canonical stage tracker, and
`audit/FINDINGS.md` is the canonical defect inventory. Do not infer status from
historical releases or old architecture names.

## Current

- [x] Implement and audit the Stage 4 semantic layer from `STAGE4_PLAN.md`.
- [x] Add `test:s4` and re-measure all TypeScript, corpus, build, and Dart gates.
- [x] Add the multi-file pre-S5 Dart and verbose CLI acceptance fixture.
- [x] Complete the post-S4 review remediation before starting S5:
  - [x] Preserve callable/constructable constructor targets and value-side index signatures.
  - [x] Mark parser-hoisted anonymous declarations explicitly; never infer provenance from `Anon_`.
  - [x] Reserve backend core names and all generated binding/helper names.
  - [x] Sanitize digit-leading Dart library names.
  - [x] Move renamed class instance overloads to valid extension interop members and lower renamed statics to qualified top-level bindings.
  - [x] Diagnose and suppress unsupported symbol-keyed members instead of stringifying their keys.
  - [x] Re-run three.js analyzer/compiler probes and all repository gates.
- [x] Perform the line-by-line post-S4 audit from `audit/POST-S4-AUDIT.md` and reconcile every finding/evidence claim before starting S5.
  - [x] Audit entry, resolution, parsers, IR, symbol table, FQN, and linker.
  - [x] Audit semantic merging, naming, and aliases.
  - [x] Audit every emitter path and output report adapter.
  - [x] Audit tests, tools, configuration, historical code, and all records.
  - [x] Assign every new/reopened finding to the pre-S5 barrier, S5, or S6 in
    `PLAN.md`; do not treat green snapshots as closure evidence.

## Before Stage 5 — done

`PRE_STAGE5_PLAN.md` tasks 4.11–4.17 are complete: run-owned compiler state,
module-export/const-enum/anonymous-default identity, `never` intersections,
external-module visibility, deterministic legal names, TypeScript host
identity, the executable Dart gate, and the Node/coverage/CI contracts.

## v1 work — done

- [x] Rebuild the `package:js` emitter behind a backend seam (S5).
- [x] Emit cross-file imports and barrel re-exports from linked identity.
- [x] Port and SDK-validate the browser/IndexedDB/WebGL/SVG/audio/typed-data
  registry; apply it by host identity.
- [x] Emit generics, heritage, constructors, callable interfaces and JSDoc.
- [x] Give every standard utility type a verified lowering or named fallback (`E-36`).
- [x] Make the `js_facade_gen` reference cases executable (67/90 parity, 16 improved).
- [x] Reproduce the js_facade_gen bindings shipped in h3 (63/63).
- [x] Validate h3, Leaflet and three.js with `dart analyze` (0 errors/warnings) in CI.

## Release

- [ ] Optional `1.0.0-beta.0` under the npm `next` tag (S6.9).
- [ ] Merge `refactor/orchestration` to `main` and publish `1.0.0` (S6.10).

## Post-v1

- [ ] Add a `dart:js_interop` backend behind a CLI flag (v2).
- [ ] Evaluate advanced utility and mapped types with the TypeScript checker.
- [ ] Emit external-module augmentations (currently modeled and suppressed).
