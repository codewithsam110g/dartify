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

## Before Stage 5

- [ ] Remove process-global run state and complete snapshot isolation (`R-14`,
  `L-10`).
- [ ] Preserve module-export/anonymity/const-enum facts and correct impossible
  intersections (`P-15`–`P-17`, `T-18`).
- [ ] Enforce external-module visibility and deterministic/legal semantic names
  (`L-19`, `E-29`, `E-30`).
- [ ] Replace the false expectations identified by `X-14` and establish a
  categorized Dart analyzer/compiler/runtime fixture gate.
- [ ] Declare the dependency-compatible Node range and repair or remove the
  nonfunctional coverage command (`X-15`, `X-16`).
- [ ] Begin the Stage 5 `package:js` emitter rebuild only after this barrier.

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
