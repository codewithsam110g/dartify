# Output, parser, IR, symbols and backend

**Coverage:** all 73 live source files / 12,606 lines manually read, caller-to-consumer tracing across CLI/transpiler, resolution, symbol generation, every parser, IR visitor, semantic passes, linker, backend and writing. All 54 test/test-asset files / 5,604 lines and 21 synthetic files / 741 lines manually read. All four internal tools / 354 lines read. Read status is separate from correctness.

**Incorrect, confirmed:** DAR-003–DAR-015, DAR-019–DAR-022. Exact individual source lines, full commit/blob identities, trigger bytes, local evidence, falsification and remediation directions are in findings.md/json.

Probe families and independent oracles:

- Export dispatch: TypeScript compiler CommonJS output is loaded into Root; plain JS oracle returns 5 while dart2js calls fail. Ordinary named Root export returns 5.
- Public exports: strict TS inputs pass. A Dart consumer asks for the public B/A and fails; inspecting only the generated barrel would miss the bug.
- Illegal generated Dart: analyzer catches parameter keywords/duplicates, static/alias collisions, multi-level override arity and URI problems. Each has a smaller passing control.
- Generic precision: strict TS consumer and Dart consumer compare the same value/type use. The probes distinguish rejection of valid calls from acceptance of invalid calls. The explicit-default and explicit-child-constructor controls isolate substitution paths.
- Date and quoted keys: generated files analyze and compile; native JS and Dart runtime behavior diverge. This prevents treating analyzer acceptance as runtime proof.
- Assertions/private constructors: generated return/constructability differs from source; private constructor runtime constructs a local object. The corresponding public constructor returns the JS-initialized value.
- CR-only docs: byte-preserved CR input produces Dart syntax errors; CRLF control is clean.
- Link cycles: direct result/edge graph plus acyclic/no-miss controls demonstrate provisional success escaping into a final report.

**Verified correct within the exercised scope:** phase/run isolation tests, transaction rollback/detached table reads, normal lookup and ambiguity tests, source/location preservation assertions, baseline merging/overload/name tests, direct unaliased barrels, normal constructor/rest/overload runtime behavior, callable interface runtime, nullable function runtime, all exact conformance-ledger assertions and real package e2e. This is not a blanket correctness label for the surrounding features.

**Incomplete:** full semantic equivalence across the entire third-party declaration corpus. Stress tests 1,661 files for returned errors/markers/empty classifications, not every generated binding against actual JavaScript. The 90-case ledger records intentional differences; it is not an independent language specification. Browser platform mappings beyond executed Node-compatible cases were not all exercised in a native browser.

**Blocked:** historical cleanup/necessity assertions requiring Git history. The historical exhibit was fully read and is intentionally retained, outside the shipped graph. No deletion recommendation or edit was made.
