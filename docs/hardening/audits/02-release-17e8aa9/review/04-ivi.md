# Intent versus implementation

Source: `17e8aa932bd42aa9c667f40c2ac8567764799380`. **Incorrect:** DAR-001, DAR-002, DAR-003, DAR-012 and DAR-023 are the direct contract mismatches. Implementation findings in findings.md provide further counterexamples to real generics, safe names, imports and incremental equivalence. No source fixes were made.

| Intent boundary | Conclusion | Static evidence | Local execution evidence |
|---|---|---|---|
| Declaration files, ambient/exported declarations | Incorrect on malformed filesystem input | Transpiler.analyzeProgram omits syntax collection; string API collects it | CLI malformed files exit 0; identical string reports syntax errors |
| Exact runtime dispatch | Incorrect for export identity, Date and escaped keys | declaration jsPath/unquote, host Date mapping | dart2js+Node differs from actual TS compiler exports/native JS oracles |
| Real generics and heritage | Incorrect for scoped defaults, nullable aliases, literal captures and inherited constructors/arity | types padTypeArguments/aliasNullable, literal hoist, inheritedConstructors/overrideParameters | strict TS input acceptance plus opposing TS/Dart consumer results and Dart invalid-override proof |
| Named, traceable degradation | Verified correct for baseline supported fallback tests; Incorrect for stale allocated alias and lexical T loss | alias registry/register, semantic names, type emitter | alias baseline controls pass; collision/lexical cases fail |
| Barrels and cross-file imports | Verified correct for direct unaliased baseline; Incorrect for public aliases/chains and URI edge cases | symbol exports, packagejs reExports/library | consumer compilation fails although generated barrels themselves analyze |
| Every incremental edit equals cold build | Verified correct for checked-in scripted edits; Incorrect for newly missing dependency/support transitions | watch caches, emitter membership | retained differential cases and real Promise consumer analyzer results |
| Observable warnings/error policy | Verified correct for forced generation failure baseline and ordinary one-shot warning; Incorrect for watch warning suppression | transpiler generation guard; cli watch report | tests pass; paired CLI reporting outputs differ |
| v1 package:js rather than primary dart:js_interop | Verified correct | backend seam and packagejs implementation | packed artifact and all local backend gates |

Intent sources are README.md, CLAUDE.md, PLAN.md, STAGE4_PLAN.md and PRE_STAGE5_PLAN.md at this SHA, not a future roadmap. Stage completion records are historical evidence, not a correctness oracle. A baseline assertion being green proves its measured case; a new counterexample does not retroactively make that measurement false.

Accepted policies challenged and retained: five optional rest slots; raw generic uses with no arguments; named dynamic fallbacks for genuinely unrepresentable constructs; external augmentation suppression with diagnostics; anonymous-default suppression; accepted conformance-ledger differences; legacy package:js as the v1 target. No finding demands a primary new backend or arbitrary executable TypeScript support.

Prior reports were consulted only after the fresh source pass. Related historical IDs are cross-references, never inherited verdicts. P-17's preserved export identity is present; DAR-003 concerns downstream use. E-40's cold shared support works; DAR-017 concerns watch invalidation. L-12's acyclic reporting works; DAR-019 is its cycle counterexample. The old 299-test and e2e claims were remeasured locally. Full independent closure of every historical register row is **Incomplete**; exact reviewed ranges are in coverage.json.

Coverage: all 16 root intent/config files (2,434 lines) manually read; relevant old-report slices and all live implementation read. Full per-area denominator follows.

| Area | Files | Total lines | Manually read lines | Fully read files |
| --- | ---: | ---: | ---: | ---: |
| CI | 1 | 49 | 49 | 1 |
| dependency lock | 1 | 2504 | 0 | 0 |
| historical exhibit | 4 | 2457 | 2457 | 4 |
| internal tools | 4 | 354 | 354 | 4 |
| live source | 73 | 12606 | 12606 | 73 |
| prior reports | 13 | 4807 | 1124 | 4 |
| reference corpus | 1657 | 143742 | 125 | 7 |
| root docs and configuration | 16 | 2434 | 2434 | 16 |
| snapshots | 4 | 5501 | 420 | 0 |
| synthetic fixtures | 21 | 741 | 741 | 21 |
| tests and test assets | 54 | 5604 | 5604 | 54 |
