# Findings — closing audit of `17e8aa9`

Generated from `findings.json` (same content, severity order). IDs use the `CA-NN` scheme so they cannot collide with the project registry; they are cross-registered in `audit/FINDINGS.md`.

| ID | Severity | Confidence | Category | Title |
|---|---|---|---|---|
| CA-01 | high | confirmed | implementation | TypeScript `Date` is bound as Dart `DateTime`, which fails at runtime in both directions under dart2js |
| CA-02 | medium | confirmed | implementation | Watch mode diverges from a cold build when a module file's `declare global` declarations change |
| CA-03 | medium | confirmed | implementation | Barrel re-exports are silently lost or renamed: import-then-export, `export * as ns`, and `export { A as B }` |
| CA-04 | medium | confirmed | implementation | Members named like dart:core `Object` members produce analyzer errors (INVALID_OVERRIDE) |
| CA-06 | medium | confirmed | implementation | Ambient external modules bind `@JS("<module specifier>.<name>")`; non-identifier specifiers crash dart2js |
| CA-07 | medium | confirmed | intent | Cross-file global declaration merging is unsupported: partial duplicate classes and `dynamic` use sites |
| CA-19 | medium | confirmed | security | Lockfile pins dev tooling with critical advisories (Vitest UI arbitrary file read/execute, tinypool RCE gadgets) |
| CA-25 | medium | confirmed | implementation | Distinct inline object types can hoist to the same anonymous FQN and be merged into one wrong shape |
| CA-05 | low | confirmed | implementation | A member that shares its enclosing type's name produces analyzer errors |
| CA-08 | low | confirmed | intent | Default CLI output omits link failures (missing/ambiguous type references) |
| CA-09 | low | confirmed | implementation | A bigint literal type with numeric separators (`1_000n`) aborts the whole run |
| CA-10 | low | confirmed | intent | The CLI/programmatic path does not report TypeScript syntax errors; malformed input yields plausible output and exit 0 |
| CA-11 | low | confirmed | implementation | File names containing `'` or `$` produce invalid Dart import/export directives |
| CA-12 | low | confirmed | security | Private-use characters in source text are interpreted as backend placeholder tokens |
| CA-13 | low | confirmed | implementation | Link report memoisation misreports symbols inside a reference cycle |
| CA-14 | low | confirmed | implementation | `.d.mts` / `.d.cts` inputs are silently dropped |
| CA-15 | low | confirmed | implementation | Watch mode computes its root directory by string prefix, not by path segment |
| CA-16 | low | confirmed | implementation | A class whose constructors are all private/protected gets Dart's implicit public constructor |
| CA-17 | low | confirmed | deployment | CI installs Dart `stable` while the analyzer baseline is an exact census for Dart 3.13 |
| CA-18 | low | confirmed | security | CI hardening: actions pinned to mutable tags and no explicit `permissions:` |
| CA-20 | low | confirmed | security | Production transitive glob libraries carry high ReDoS advisories |
| CA-21 | low | confirmed | intent | Documented gate numbers drifted from measured values |
| CA-22 | low | confirmed | intent | Finding registry integrity: `X-16` is assigned to two different findings; `Where` columns point to deleted files |
| CA-23 | low | confirmed | implementation | Several registered fixes work but have no regression test |
| CA-24 | low | confirmed | deployment | No upgrade or rollback notes for existing 0.5.0 users |
| CA-26 | low | confirmed | intent | `this` in a generic class is emitted as the raw type; the rationale in the code is stale |
| CA-27 | low | probable | intent | Watch-latency claims are only partly reproduced (Leaflet edit and three.js core edit) |
| CA-28 | low | confirmed | implementation | The e2e oracle script is never executed by the suite |
| CA-29 | low | confirmed | deployment | The platform-type registry has no committed generator or SDK validation script |

## CA-01 — TypeScript `Date` is bound as Dart `DateTime`, which fails at runtime in both directions under dart2js

- **Severity:** high
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/engine/emitter/packagejs/types.ts:555-556 (host(), case "Date"); commit 17e8aa9 (introduced 6c75f9d)
- **Violated requirement / intent:** README 'Correct runtime dispatch'; CLAUDE.md 'Analyzer-clean output is not sufficient evidence for JS dispatch'; design principle 1 (never degrade silently)
- **Evidence and traced behaviour:** host() maps the checker-confirmed lib `Date` to `DateTime`. package:js does not convert a JS Date to a Dart DateTime (or back). dart2js probe: `external DateTime now()` returning `new Date(...)` throws on `.year`; passing `DateTime.utc(2030)` to `external num yearOf(DateTime d)` delivers a non-Date to JavaScript and throws. dart analyze reports nothing.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/runtime-date/{datelib.d.ts,datelib.js,main.dart}; observed output in fixtures/runtime-date/observed.txt ('now().year threw: JSObject', 'yearOf threw: JSObject')
- **Falsification attempted:** Checked whether js_facade_gen's reference cases or the repo's runtime/e2e probes cover Date (they do not), and whether package:js converts DateTime (it does not; dart2js run throws). The finding stands.
- **Consequence:** Any binding that returns or accepts a Date compiles and analyzes cleanly but throws when used. Corpus: 13 occurrences in 5 files, including Leaflet `TileEvent.loaded?: Date` (a gated library).
- **Remediation direction:** Lower `Date` to a named, documented interop type (for example a `@JS('Date')` class or a named dynamic typedef) rather than `DateTime`, and add a dart2js runtime probe case for Date in def_files/synthetic/runtime.
- **Related / root cause:** CA-23; RC-1 host-type mapping chosen without a runtime probe

## CA-02 — Watch mode diverges from a cold build when a module file's `declare global` declarations change

- **Severity:** medium
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/watch.ts:193-243 (dirty propagation: dependents by import, isScript), src/watch.ts:357-369 (seedFiles); commit 17e8aa9 (cf3de40)
- **Violated requirement / intent:** W-01 / CLAUDE.md 'Watch caches must never change output'; watch.ts header 'Its output is identical to a fresh Transpiler.render()'
- **Evidence and traced behaviour:** Only importers of a changed module file, or every file when a *script* file changes, are regenerated and re-linked. A module file's `declare global { interface X }` is visible to files that never import it, so those files keep stale `resolvedFQN`s and stale render-cache entries.
- **Reproduction:** pnpm exec tsx audit/10-closing-17e8aa9/fixtures/watch-global-move.ts (b.dart differs: cold `import 'c.dart' show Gfoo;` vs watch `typedef Gfoo = dynamic;`; single-file add also differs). fixtures/watch-global-augmentation.ts shows link report valid=1 (cold) vs 2 (watch). Logs: logs/watch-global-*.log
- **Falsification attempted:** Re-ran the documented differential suite (pnpm test:incremental: 5/5 pass) and two neighbouring scenarios (typeof const and alias change across an import), which do match. Only the non-import global-visibility path diverges.
- **Consequence:** During a watch session, consumers of globals declared in module files keep degraded or stale bindings (dynamic instead of the real class, or missing imports) until they are edited or the session restarts; -lv link reports are wrong.
- **Remediation direction:** Treat files containing `declare global` (or any globally visible declaration) like script files for invalidation, or track dependents through resolved checker targets as well as imports. Add the two scenarios to test/watch-differential.test.ts.
- **Related / root cause:** CA-07; RC-2 global visibility not modelled across files

## CA-03 — Barrel re-exports are silently lost or renamed: import-then-export, `export * as ns`, and `export { A as B }`

- **Severity:** medium
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/symbol/exports.ts:110-135; src/engine/emitter/packagejs/index.ts:368-396 (reExports); src/engine/phase/emitterPhase.ts:63-81; commit 17e8aa9
- **Violated requirement / intent:** README 'Barrels become libraries'; design principle 1 (never degrade silently)
- **Evidence and traced behaviour:** (a) `import { A } from './a'; export { A };` records a named export with no specifier; linkModuleExports looks for `A` in the barrel file itself, finds nothing, emits no diagnostic, and the barrel library is not emitted. (b) `export * as ns from './a'` is skipped by reExports() and produces no library. (c) `export { A as Renamed } from './a'` emits `export 'a.dart' show A;`, so the public name `Renamed` does not exist in Dart. The CLI prints no emission diagnostic for any of them.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/backend/barrels/*.d.ts; see logs/backend-probes.txt (no reexport-import.dart or nsexport.dart emitted; rename.dart contains `export 'a.dart' show A;`)
- **Falsification attempted:** Confirmed that `export * from` and `export { A } from` (same name) work, as the docs claim; only the three listed forms fail.
- **Consequence:** Consumers importing a barrel get missing libraries or different names than the TypeScript API, with exit code 0 and no warning.
- **Remediation direction:** Resolve specifier-less named exports through the checker's alias target; emit a typedef or diagnostic for renamed exports (Dart cannot rename on export); emit a MODULE_EXPORT_UNSUPPORTED diagnostic for namespace re-exports.
- **Related / root cause:** CA-08; RC-3 module-export linking keyed by file-local terminal names

## CA-04 — Members named like dart:core `Object` members produce analyzer errors (INVALID_OVERRIDE)

- **Severity:** medium
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/engine/semantic/names.ts:294-321 (allocateMemberGroups), src/engine/semantic/keywords.ts:106-128 (legalDartName); commit 17e8aa9
- **Violated requirement / intent:** PLAN.md 'The v1 acceptance test': output passes dart analyze with zero errors
- **Evidence and traced behaviour:** Member allocation escapes reserved words only; `toString(base: number)`, `hashCode: string`, `runtimeType: number`, `noSuchMethod(x: number)` are emitted verbatim and conflict with Object's signatures.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/backend/objmembers/objmembers.d.ts -> 5x ERROR INVALID_OVERRIDE (logs/backend-probes.txt)
- **Falsification attempted:** A compatible override (`toString(precision?: number)`, as in Leaflet's LatLng) is valid Dart and analyzes cleanly; the defect needs a non-optional parameter or an incompatible property type, which valid TypeScript permits (e.g. bignum `toString(base)`).
- **Consequence:** Libraries declaring such members fail the v1 acceptance criterion with hard analyzer errors.
- **Remediation direction:** Treat Object members as reserved in member allocation unless the emitted signature is a valid override: rename to `JS$toString` etc. with `@JS('toString')` through the extension path already used for renamed members.
- **Related / root cause:** CA-05; RC-4 member identifier legality ignores Dart class-member constraints

## CA-06 — Ambient external modules bind `@JS("<module specifier>.<name>")`; non-identifier specifiers crash dart2js

- **Severity:** medium
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/engine/emitter/packagejs/declarations.ts:90-102 (jsPath, externalModule scope -> scope.specifier); commit 17e8aa9
- **Violated requirement / intent:** Design principle 1; README 'Correct runtime dispatch'
- **Evidence and traced behaviour:** `declare module "@scope/pkg" { export class Widget ... export function make() }` in a script file emits `@JS("@scope/pkg.make")`. `dart analyze` reports 'No issues found!', but `dart compile js` of a program calling `make()` crashes the compiler ('Internal Error: The compiler crashed ... Error in MiniJsParser'). `--js-root` does not apply (fileIsModule is false) and there is no diagnostic. h3 works only because its specifier `h3` is also its browser global.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/runtime-ambient/{amb_only.dart,observed.txt} (bindings generated from fixtures/backend/ambient/ambient.d.ts)
- **Falsification attempted:** Checked h3 (specifier equals the global; e2e passes) and module augmentations (suppressed with a diagnostic). Executed dart2js 3.13.7: the compiler crashes on the generated binding, so the failure is confirmed, and it is a build-time crash rather than the runtime failure first predicted.
- **Consequence:** Analyzer-clean bindings that make dart2js crash for any program using them, for ambient modules named like scoped or slashed npm packages. The v1 acceptance test (dart analyze) passes while the code cannot be compiled.
- **Remediation direction:** Emit a diagnostic when a specifier is not a JS identifier path, and allow `--js-root` (or a per-module root option) to supply the global for ambient modules.
- **Related / root cause:** CA-01; RC-1 runtime binding decisions without a runtime probe

## CA-07 — Cross-file global declaration merging is unsupported: partial duplicate classes and `dynamic` use sites

- **Severity:** medium
- **Confidence:** confirmed
- **Category:** intent
- **Location:** src/symbol/fqn.ts:110-117 (FQN includes file), src/symbol/resolve.ts:215-233 (checker candidates -> ambiguous), src/engine/semantic/merge.ts (per-FQN merge); commit 17e8aa9
- **Violated requirement / intent:** CLAUDE.md input contract 'Support ... declaration merging, module/global augmentation'; design principle 1
- **Evidence and traced behaviour:** Two script files each declaring `interface Settings` (TypeScript merges them globally) produce two partial `Settings` classes in two libraries; `configure(settings: Settings)` becomes `configure(Settings_cdbad5 settings)` with `typedef Settings_cdbad5 = dynamic`. The link is ambiguous; the default CLI prints '0 unresolved references' and exits 0.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/backend/globalmerge/part{1,2}.d.ts (logs/backend-probes.txt; -lv shows the ambiguous edge)
- **Falsification attempted:** Checked STAGE4_PLAN's merge matrix: it is per-FQN and never states that cross-file global merging is unsupported. Same-file merging works.
- **Consequence:** Common DefinitelyTyped patterns (global interfaces augmented in several files, e.g. Window/JQuery plugins) lose typing and members are split across libraries.
- **Remediation direction:** Merge globally visible declarations across files into one canonical symbol (or document the limitation and emit a diagnostic at default verbosity).
- **Related / root cause:** CA-02, CA-08; RC-2 global visibility not modelled across files

## CA-19 — Lockfile pins dev tooling with critical advisories (Vitest UI arbitrary file read/execute, tinypool RCE gadgets)

- **Severity:** medium
- **Confidence:** confirmed
- **Category:** security
- **Location:** pnpm-lock.yaml (vitest 3.2.4, tinypool); package.json devDependencies; CLAUDE.md documents `pnpm test:ui`
- **Violated requirement / intent:** Dependency risk management
- **Evidence and traced behaviour:** pnpm audit: 53 advisories in the full tree (3 critical, 26 high). Critical: vitest <3.2.6 GHSA-5xrq-8626-4rwp (Vitest UI server, which `pnpm test:ui` starts), tinypool GHSA-5gmw-xhrv-c9v3 / GHSA-85c8-ppgw-ccpr.
- **Reproduction:** pnpm audit
- **Falsification attempted:** None ship in the npm package (dev-only); exposure needs the UI server listening or attacker-controlled worker options.
- **Consequence:** Contributors running the documented UI command expose local files to a malicious web page or network peer while it runs.
- **Remediation direction:** Upgrade vitest/@vitest/* to >=3.2.6 (and tinypool) and re-run the gates.
- **Related / root cause:** CA-20; RC-10 dependency currency

## CA-25 — Distinct inline object types can hoist to the same anonymous FQN and be merged into one wrong shape

- **Severity:** medium
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/engine/parser/type/typeLiterals.ts (anonymous name from scopeFQN with non-[A-Za-z0-9_] characters stripped and `|` mapped to `_`); src/engine/semantic/merge.ts (same-FQN interface merge); commit 17e8aa9
- **Violated requirement / intent:** P-13 / P-14 (anonymous identities must not collide); design principle 1 (never degrade silently)
- **Evidence and traced behaviour:** `interface A { x: { p: string } }` and `interface A$ { x: { q: number } }` both hoist to `Anon_A_property_0_x`, because `$` is stripped. The two facets share one FQN, the semantic pass merges them (merges=1), and both `A.x` and `A$.x` are typed as `{p: String, q: num}` with a factory requiring both. No diagnostic; analyzer-clean.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/backend/anoncollide/anoncollide.d.ts (pnpm dev -d ... -lv shows merges=1 and both references resolving to the same Anon_ FQN)
- **Falsification attempted:** Equal shapes would be canonicalised legitimately; the probe uses deliberately different shapes. Collisions need owner/scope names differing only in stripped characters (`$`, non-ASCII letters), which valid JavaScript identifiers allow.
- **Consequence:** Silently wrong member sets and required factory parameters on both types.
- **Remediation direction:** Derive the hoisted FQN from an injective encoding of the scope path (escape rather than strip), or append a hash of the raw scope; keep the readable Dart name separate from the FQN key.
- **Related / root cause:** CA-12; RC-14 lossy name sanitisation used as identity

## CA-05 — A member that shares its enclosing type's name produces analyzer errors

- **Severity:** low
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/engine/semantic/names.ts:294-321; src/engine/emitter/packagejs/declarations.ts (emitProperty/emitMethod); commit 17e8aa9
- **Violated requirement / intent:** PLAN.md v1 acceptance test (zero analyzer errors)
- **Evidence and traced behaviour:** `interface Item { Item: number }` and `class Node2 { Node2(): void }` emit members named like the class; Dart reports MEMBER_WITH_CLASS_NAME, INVALID_FACTORY_NAME_NOT_A_CLASS, CONSTRUCTOR_WITH_RETURN_TYPE, DUPLICATE_CONSTRUCTOR.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/backend/selfname/selfname.d.ts (logs/backend-probes.txt)
- **Falsification attempted:** None of the gated corpora contain this shape (they analyze clean); the defect is real for valid TypeScript input.
- **Consequence:** Uncompilable library for inputs that use this (rare) pattern.
- **Remediation direction:** Reserve the owner's Dart name during member allocation and route the renamed member through the extension with `@JS('<name>')`.
- **Related / root cause:** CA-04; RC-4 member identifier legality ignores Dart class-member constraints

## CA-08 — Default CLI output omits link failures (missing/ambiguous type references)

- **Severity:** low
- **Confidence:** confirmed
- **Category:** intent
- **Location:** src/cli.ts:196-227; src/reporting/linker.ts:42-46; commit 17e8aa9
- **Violated requirement / intent:** Design principle 1 (never degrade silently); R-02 intent (CLI always prints the unresolved count)
- **Evidence and traced behaviour:** processFiles prints semantic warnings, emission diagnostics and *module* resolution counts. LinkReport.broken is printed only with -l. A run with a broken link prints 'Module resolution: 0 unresolved references' and exits 0.
- **Reproduction:** pnpm dev -d "audit/10-closing-17e8aa9/fixtures/backend/globalmerge/*.d.ts" -o /tmp/x
- **Falsification attempted:** Degradations are still named and documented inside the generated file, so the output itself is not silent; only the console summary is.
- **Consequence:** Users and CI scripts see a clean run while some types degraded to dynamic.
- **Remediation direction:** Always print the broken-symbol count (and ambiguous edge count) with a pointer to -lv.
- **Related / root cause:** CA-03, CA-07; RC-5 console summary covers module resolution only

## CA-09 — A bigint literal type with numeric separators (`1_000n`) aborts the whole run

- **Severity:** low
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/engine/parser/type/literals.ts:259-261 and :313-315 (BigInt(raw text)); commit 17e8aa9
- **Violated requirement / intent:** Input contract (valid declaration syntax); proportionate failure
- **Evidence and traced behaviour:** BigInt('1_000') throws SyntaxError; the statement fails with STATEMENT_DECLARATION_ERROR and transpile() blocks every write (GENERATION_FAILED). Number('1_000') returns NaN silently for the number case.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/backend/bigintsep/bigintsep.d.ts -> 'Cannot convert 1_000 to a BigInt', exit 1, no files
- **Falsification attempted:** Not present in the 1,661-file corpus (stress passes), so prevalence is low.
- **Consequence:** One valid literal prevents output for the whole program.
- **Remediation direction:** Strip `_` separators before BigInt()/Number(), or use the checker's literal value.
- **Related / root cause:** none; RC-6 literal values parsed from raw source text (see open T-11)

## CA-10 — The CLI/programmatic path does not report TypeScript syntax errors; malformed input yields plausible output and exit 0

- **Severity:** low
- **Confidence:** confirmed
- **Category:** intent
- **Location:** src/transpiler.ts:171-222 (analyzeProgram) vs :331-350 (transpileFromString); commit 17e8aa9
- **Violated requirement / intent:** transpileFromString comment 'Surface syntax errors rather than silently producing empty output'; design principle 1
- **Evidence and traced behaviour:** Only transpileFromString collects pre-emit diagnostics. `interface Broken { a: string` (missing brace) via the CLI writes broken.dart and exits 0 with no warning.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/cli/broken.d.ts
- **Falsification attempted:** The TypeScript parser's recovery happened to keep the member here; other malformed inputs can lose declarations without notice.
- **Consequence:** Typos in hand-written declaration files go unnoticed.
- **Remediation direction:** Report syntactic diagnostics of input files in AnalysisReport and print them in the CLI.
- **Related / root cause:** CA-08; RC-5 console summary coverage

## CA-11 — File names containing `'` or `$` produce invalid Dart import/export directives

- **Severity:** low
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/engine/emitter/packagejs/library.ts:211,217 (import '${uri}'); src/engine/emitter/packagejs/index.ts:123-127 (export '${uri}'); commit 17e8aa9
- **Violated requirement / intent:** E-32 intent (central Dart-string escaping for every emitted string)
- **Evidence and traced behaviour:** URIs are interpolated raw into single-quoted Dart strings. `my lib.d.ts` importing `./it's` and `./cost$x` yields UNTERMINATED_STRING_LITERAL, URI_WITH_INTERPOLATION and cascade errors.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/backend/filenames/ (logs/backend-probes.txt)
- **Falsification attempted:** A space in a file name analyzes cleanly; only quote and `$` fail.
- **Consequence:** Uncompilable output for unusual but legal file names.
- **Remediation direction:** Escape or percent-encode URIs (dartString or Uri-encode path segments) for import/export directives.
- **Related / root cause:** none; RC-7 emitted strings outside the central escaper

## CA-12 — Private-use characters in source text are interpreted as backend placeholder tokens

- **Severity:** low
- **Confidence:** confirmed
- **Category:** security
- **Location:** src/engine/emitter/packagejs/library.ts:18-22,270-272; src/engine/emitter/packagejs/index.ts:106; commit 17e8aa9
- **Violated requirement / intent:** Generated output faithfully reflects input; trust boundary between input text and emitter control tokens
- **Evidence and traced behaviour:** Import/support/exports placeholders are U+E000-E004 and U+E010-E011 and are replaced with regexes over the whole library text, including docs and names copied from input. A doc comment containing `\uE0000\uE001Foo\uE002` is rewritten to `Foo`.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/backend/pua/pua.d.ts (logs/backend-probes.txt doc line)
- **Falsification attempted:** Input needs deliberate private-use characters; in a library with imports the same sequence can add a name to an import's `show` list.
- **Consequence:** Crafted or corrupted input can alter generated code or documentation; integrity issue, not code execution.
- **Remediation direction:** Escape or strip these code points from copied text before emission, or use placeholder tokens that cannot occur in input.
- **Related / root cause:** CA-11; RC-7 emitted strings outside the central escaper

## CA-13 — Link report memoisation misreports symbols inside a reference cycle

- **Severity:** low
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/engine/phase/linkerPhase.ts:238-293 (checkDeps); commit 17e8aa9
- **Violated requirement / intent:** LinkReport as the honest link measure (S2, L-08)
- **Evidence and traced behaviour:** When checkDeps re-enters an in-progress node it returns LinkedResolved, and the caller caches that provisional answer. With A -> B, B -> A, A -> Missing, B is reported LinkedResolved although it depends on broken A (order-dependent).
- **Reproduction:** pnpm exec tsx audit/10-closing-17e8aa9/fixtures/link-cycle-report.ts (logs/link-cycle-report.log)
- **Falsification attempted:** Emission does not read LinkResult, so generated Dart is unaffected.
- **Consequence:** -lv reports and the dependency graph (red nodes) under-count broken symbols.
- **Remediation direction:** Compute states over strongly connected components, or do not cache provisional results produced while a cycle member is in progress.
- **Related / root cause:** CA-08; RC-5 reporting accuracy

## CA-14 — `.d.mts` / `.d.cts` inputs are silently dropped

- **Severity:** low
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/cli.ts:122 (endsWith('.d.ts')); commit 17e8aa9
- **Violated requirement / intent:** Input contract: declaration files
- **Evidence and traced behaviour:** Explicit `-d mod.d.mts` alone exits 1 with 'No .d.ts files found'. Mixed with .d.ts inputs, .d.mts/.d.cts files are filtered without a message.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/cli/mts/
- **Falsification attempted:** Files reached through imports are still resolved by TypeScript; only explicit inputs are filtered.
- **Consequence:** Packages that ship only .d.mts/.d.cts entry points cannot be bound directly.
- **Remediation direction:** Accept .d.mts/.d.cts (mapping output to .dart) or warn when explicit inputs are skipped.
- **Related / root cause:** none; RC-8 CLI input handling

## CA-15 — Watch mode computes its root directory by string prefix, not by path segment

- **Severity:** low
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/cli.ts:256-260; commit 17e8aa9
- **Violated requirement / intent:** Watch mode rebuilds whenever an input changes
- **Evidence and traced behaviour:** reduce() keeps `common` while `directory.startsWith(common)`. With inputs in <tmp>/types and <tmp>/types2 the CLI printed 'Watching .../types'; editing types2/b.d.ts caused 0 rebuilds, editing types/a.d.ts caused 1.
- **Reproduction:** node audit/10-closing-17e8aa9/fixtures/watch-root-prefix.cjs (logs/watch-root-prefix.log)
- **Falsification attempted:** Executed with a real `dartify -w` process; inputs under a single directory are unaffected.
- **Consequence:** Some inputs are silently not watched.
- **Remediation direction:** Reuse resolvedInputRoot() (segment-wise) from transpiler.ts.
- **Related / root cause:** CA-02; RC-8 CLI input handling

## CA-16 — A class whose constructors are all private/protected gets Dart's implicit public constructor

- **Severity:** low
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** src/engine/emitter/packagejs/declarations.ts:1031-1036 (emitClass constructor selection); commit 17e8aa9
- **Violated requirement / intent:** E-35 intent (no implicit construction of non-constructable runtime types)
- **Evidence and traced behaviour:** inheritedConstructors() filters private constructors; because declaration.constructors is non-empty, no external constructor is written either, so Dart supplies an implicit `Singleton()`. dart2js program calling `Singleton()` compiles and prints 'Singleton() constructed from Dart: JSObject'.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/runtime-ambient/{priv_only.dart,probe.js,observed.txt}; input fixtures/backend/privatector/privatector.d.ts
- **Falsification attempted:** Analyzer is clean; dart2js executed and the construction succeeded, which TypeScript forbids.
- **Consequence:** Dart code can call a constructor TypeScript forbids.
- **Remediation direction:** Emit an unreachable private Dart constructor (`external Name._();`) or make the class abstract when no public constructor exists.
- **Related / root cause:** none; RC-4 Dart class-member rules

## CA-17 — CI installs Dart `stable` while the analyzer baseline is an exact census for Dart 3.13

- **Severity:** low
- **Confidence:** confirmed
- **Category:** deployment
- **Location:** .github/workflows/ci.yml:41-43; test/dart/baseline.json:2; commit 17e8aa9
- **Violated requirement / intent:** Reproducible acceptance gate (X-09, S6.2)
- **Evidence and traced behaviour:** baseline.json says 'Dart SDK 3.13'; the gate fails on any changed count or category. setup-dart `sdk: stable` follows new releases. The configuration mismatch is a fact; its impact was not reproduced: `pnpm test:dart` also passes unchanged under Dart 3.14.0-315.3.beta and 3.15.0-106.0.dev.
- **Reproduction:** PATH=<dart-3.14-beta>/bin:$PATH pnpm test:dart (2/2 pass); same for 3.15 dev
- **Falsification attempted:** Attempted: the next two SDK lines do not change the census. The risk remains for future lints/deprecations, but nothing is broken today.
- **Consequence:** A new Dart release (new deprecations or lints) turns CI red without a code change, or changes what the gate certifies.
- **Remediation direction:** Pin the SDK in CI to the baseline's version and bump both together.
- **Related / root cause:** CA-18; RC-9 CI pinning

## CA-18 — CI hardening: actions pinned to mutable tags and no explicit `permissions:`

- **Severity:** low
- **Confidence:** confirmed
- **Category:** security
- **Location:** .github/workflows/ci.yml (actions/checkout@v4, pnpm/action-setup@v4, actions/setup-node@v4, dart-lang/setup-dart@v1; no permissions block)
- **Violated requirement / intent:** Supply-chain best practice
- **Evidence and traced behaviour:** Static read of the workflow.
- **Reproduction:** Read .github/workflows/ci.yml
- **Falsification attempted:** The workflow publishes nothing and has no secrets, which limits impact; the token's default scope depends on repository settings (not verifiable from the tree).
- **Consequence:** A compromised action tag would run with the job's token.
- **Remediation direction:** Pin actions by commit SHA and set `permissions: contents: read`.
- **Related / root cause:** CA-17; RC-9 CI pinning

## CA-20 — Production transitive glob libraries carry high ReDoS advisories

- **Severity:** low
- **Confidence:** confirmed
- **Category:** security
- **Location:** pnpm-lock.yaml: ts-morph > @ts-morph/common > minimatch/@isaacs/brace-expansion, tinyglobby > picomatch; fast-glob > micromatch > picomatch
- **Violated requirement / intent:** Dependency risk management
- **Evidence and traced behaviour:** pnpm audit --prod: 9 advisories (6 high, 3 moderate), all ReDoS/DoS or matching errors in glob matching (logs/pnpm-audit-prod.txt).
- **Reproduction:** pnpm audit --prod
- **Falsification attempted:** Glob patterns come from the user running the CLI, so the DoS is self-inflicted; the published package ships no lockfile, so npm installs resolve patched versions where ranges allow.
- **Consequence:** Low for end users; the repository's own CI and dev environment run the pinned vulnerable versions.
- **Remediation direction:** Refresh the lockfile (`pnpm update`) and re-run the gates.
- **Related / root cause:** CA-19; RC-10 dependency currency

## CA-21 — Documented gate numbers drifted from measured values

- **Severity:** low
- **Confidence:** confirmed
- **Category:** intent
- **Location:** CLAUDE.md (gates paragraph, corpus table), README.md ('1,655-file stress corpus'), PLAN.md S6 row ('bundle 252 KB'), audit/FINDINGS.md post-S5/S6 baseline, test/stress.test.ts:6 ('1,654-file')
- **Violated requirement / intent:** CLAUDE.md maintenance contract (re-measure baselines)
- **Evidence and traced behaviour:** Measured at 17e8aa9: def_files has 1,661 tracked .d.ts (1,654 + runtime probe + 6 watch fixtures), stress reports 720/1661 empty (docs: 1,655 and 719); test:s4 54/54 (docs: 53/53); bundle chunk 262.7 KB + cli 15.3 KB + watch 16.1 KB (docs: 252 KB); coverage 90.43% lines (docs: 90.1%).
- **Reproduction:** logs/gates.txt
- **Falsification attempted:** All gates pass; only the recorded numbers are stale.
- **Consequence:** Readers cannot tell a regression from drift; the 'exact' numbers in CLAUDE.md are not exact.
- **Remediation direction:** Re-measure and update the numbers in one commit; consider generating them from gate output.
- **Related / root cause:** CA-22; RC-11 manually maintained metrics

## CA-22 — Finding registry integrity: `X-16` is assigned to two different findings; `Where` columns point to deleted files

- **Severity:** low
- **Confidence:** confirmed
- **Category:** intent
- **Location:** audit/FINDINGS.md:107 and :183 (two X-16 rows); rows such as E-14, E-19, E-31 citing `emitter/old/*`
- **Violated requirement / intent:** CLAUDE.md 'never renumber or delete an ID'; stable IDs referenced by commits
- **Evidence and traced behaviour:** X-16 is the coverage-provider finding (4.16) and also the `.gitignore` Dart-fixture finding. Several FIXED rows still cite `src/engine/emitter/old/...` paths that S5 deleted.
- **Reproduction:** grep -n 'X-16' audit/FINDINGS.md
- **Falsification attempted:** Not applicable (documentation fact).
- **Consequence:** Commit messages and CHANGELOG references to X-16 are ambiguous.
- **Remediation direction:** Give the .gitignore finding a new ID (keep X-16 for coverage) and refresh stale locations.
- **Related / root cause:** CA-21; RC-11 manually maintained registry

## CA-23 — Several registered fixes work but have no regression test

- **Severity:** low
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** test/** (no case for P-18, E-44's NATIVE_NAME_CONFLICT diagnostic, or a TypeScript `abstract class` for E-20)
- **Violated requirement / intent:** Closing-audit requirement: registered fixes are real, tested and complete
- **Evidence and traced behaviour:** Runtime check at 17e8aa9: P-18 drops `this:` from function types, E-20 emits `abstract class Shape`, and E-44 reports NATIVE_NAME_CONFLICT. A search of test/ finds no assertion covering these paths.
- **Reproduction:** pnpm exec tsx audit/10-closing-17e8aa9/fixtures/untested-fixes.ts
- **Falsification attempted:** Snapshots might cover them indirectly: the P-18 and E-44 shapes do not occur in the snapshot inputs; the E-20 TS abstract class does not either.
- **Consequence:** Regressions in these paths would pass the suite.
- **Remediation direction:** Add focused cases to test/decl/decl-emitter.test.ts.
- **Related / root cause:** CA-01; RC-12 coverage of registered fixes

## CA-24 — No upgrade or rollback notes for existing 0.5.0 users

- **Severity:** low
- **Confidence:** confirmed
- **Category:** deployment
- **Location:** CHANGELOG.md [1.0.0] section; README.md
- **Violated requirement / intent:** Release readiness (S6.10); 'drop-in replacement' positioning
- **Evidence and traced behaviour:** 1.0.0 changes the generated API relative to 0.5.0 (for example h3 `Anon_h3_CoordIJ` -> `CoordIJ`, fields -> getter/setter pairs, overload names `f_1`/`f_2`, constructors), but CHANGELOG has no breaking-changes or migration section, and no rollback (dist-tag) note exists.
- **Reproduction:** Read CHANGELOG.md
- **Falsification attempted:** CLI flags are backward compatible with 0.5.0 (all old flags still exist).
- **Consequence:** Users regenerating with 1.0.0 meet unannounced source-level breaks in their Dart code.
- **Remediation direction:** Add a 'Breaking changes since 0.5.0' section and a release/rollback checklist (npm dist-tag `next`, deprecate).
- **Related / root cause:** none; RC-13 release documentation

## CA-26 — `this` in a generic class is emitted as the raw type; the rationale in the code is stale

- **Severity:** low
- **Confidence:** confirmed
- **Category:** intent
- **Location:** src/engine/parser/type/thisType.ts (docblock: 'type parameters are not emitted yet (E-03) ... Revisit when E-03 lands'); test/type/tier-a.test.ts 'drops type arguments on a generic owner'
- **Violated requirement / intent:** E-03 (type parameters emitted, fixed in S5); CLAUDE.md maintenance contract (stale comments)
- **Evidence and traced behaviour:** `class Box<T> { clone(): this }` emits `external Box clone();` (raw `Box`, i.e. `Box<dynamic>`) while the class itself is `class Box<T>`. The comment justifying this refers to E-03 as unfixed, and a unit test locks the behaviour.
- **Reproduction:** audit/10-closing-17e8aa9/fixtures/backend/thisgeneric/thisgeneric.d.ts
- **Falsification attempted:** Raw types are analyzer-valid; the cost is lost type arguments, not an error.
- **Consequence:** Fluent APIs on generic classes lose their element type in Dart.
- **Remediation direction:** Emit `Box<T>` using the owner's type parameters, update the docblock and the tier-a expectation.
- **Related / root cause:** CA-21; RC-11 manually maintained rationale

## CA-27 — Watch-latency claims are only partly reproduced (Leaflet edit and three.js core edit)

- **Severity:** low
- **Confidence:** probable
- **Category:** intent
- **Location:** README.md ('rebuilds take tens of milliseconds'), ROADMAP.md (h3 ~35 ms, Leaflet ≤ 94 ms, three.js ~53 ms), CHANGELOG/PLAN 6.12 ('rebuilds under 100 ms on h3, Leaflet and three.js')
- **Violated requirement / intent:** Documented performance claims
- **Evidence and traced behaviour:** `pnpm bench` at 17e8aa9 (Node 22.23.4): h3 leaf edit 37.3 ms; Leaflet leaf edit 132.3 ms, core edit 57.4 ms; three.js leaf edit 57.4 ms but core edit (Vector3) 730.9 ms. All 40 incremental builds were verified byte-for-byte by the tool.
- **Reproduction:** pnpm bench (output saved in logs/bench.txt)
- **Falsification attempted:** Single run on a shared container with other jobs finishing; the three.js core edit is slow by design (shape and heritage changes re-render everything), which the docs do not mention.
- **Consequence:** Users editing widely inherited types see ~0.7 s rebuilds, not 'under 100 ms'.
- **Remediation direction:** State per-edit-kind numbers (leaf vs core) and the full re-render policy in README/ROADMAP; re-measure on a quiet machine.
- **Related / root cause:** CA-21; RC-11 manually maintained metrics

## CA-28 — The e2e oracle script is never executed by the suite

- **Severity:** low
- **Confidence:** confirmed
- **Category:** implementation
- **Location:** test/e2e/e2e.test.ts:1-12,73 (compares with committed main.expected); test/e2e/*/expected.cjs (not referenced by any code)
- **Violated requirement / intent:** e2e.test.ts header: main.expected is computed by expected.cjs 'so the oracle never depends on dartify'
- **Evidence and traced behaviour:** No code runs expected.cjs; the test compares dart2js output with the committed main.expected. Running each expected.cjs by hand today reproduces main.expected exactly for h3, three and leaflet.
- **Reproduction:** cd test/e2e/<lib> && node -e 'globalThis.self=globalThis;require("./setup.cjs");require("./expected.cjs")' | diff - main.expected
- **Falsification attempted:** Consistent today; the risk is future drift (for example a library upgrade) going unnoticed.
- **Consequence:** A stale main.expected would make e2e certify outputs the JavaScript library no longer produces.
- **Remediation direction:** Have the e2e test run expected.cjs and compare against both main.expected and the Dart output.
- **Related / root cause:** CA-23; RC-12 test integrity

## CA-29 — The platform-type registry has no committed generator or SDK validation script

- **Severity:** low
- **Confidence:** confirmed
- **Category:** deployment
- **Location:** src/engine/emitter/packagejs/browserTypes.ts header ('Regenerate rather than hand-edit'); CLAUDE.md:54
- **Violated requirement / intent:** CLAUDE.md 'It is generated: regenerate and re-validate rather than hand-edit'
- **Evidence and traced behaviour:** A NUL-safe search of every tracked file finds BROWSER_TYPES only in the table itself, its two consumers, CLAUDE.md, PLAN.md and audit/07-emitter.md. No script produces or validates it against a Dart SDK.
- **Reproduction:** git ls-files -z | xargs -0 grep -ln 'BROWSER_TYPES\|dart_libraries_for_browser_types'
- **Falsification attempted:** The table itself is consistent: 500 entries, no key mapped to two libraries, matching the documented count.
- **Consequence:** The documented maintenance procedure cannot be followed; SDK upgrades (dart:html deprecations) cannot re-validate the 500 entries reproducibly.
- **Remediation direction:** Commit the generator/validator under tools/ and reference it from CLAUDE.md.
- **Related / root cause:** CA-17; RC-9 reproducible toolchain
