# Findings at the audited v1 source

Audited commit: `17e8aa932bd42aa9c667f40c2ac8567764799380`. Each finding is independently confirmed against the captured source and retained local evidence. All source permalinks pin that SHA; no moving-branch links. The current ref was not reread after the user prohibited Git. See MASTER.md for final content-integrity checks and limits.

Severity reflects concrete user impact: high = common compiling bindings fail at runtime or malformed inputs are falsely certified; medium = bounded valid-input failures, typing, watch or reporting defects. No security severity is inferred from a registry label.

All records are **Incorrect**, confidence **confirmed**. This labels the implementation behavior under each stated trigger; it does not mean every input or surrounding component is incorrect. Tests run locally; no live-deployment claims.

Reproduction commands are repository-root relative unless a work directory is explicitly named. They write only inside this audit directory. See REPRODUCE.md for toolchain, order and retained byte inputs.

<a id="dar-001"></a>

## DAR-001: Filesystem compilation accepts malformed declarations and reports success

Severity: **high** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: IVI

Where: [src/transpiler.ts:174](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/transpiler.ts#L174) (`Transpiler.analyzeProgram`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `7790cc669533c2afba407350a3e0573b462b8d77`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/transpiler.ts:174`, not imported).

Intent: README.md:119 declaration-file contract; PLAN.md:54 preservation and truthful failure policy; src/transpiler.ts:331 string API syntax validation

Evidence: The filesystem path resolves files and generates symbols from TypeScript recovery ASTs without collecting syntactic diagnostics. transpile() blocks generation diagnostics only. The built CLI emits truncated/missing-type declarations with exit 0 and no syntax error, including with -lv. Invalid UTF-8 in an identifier also exits 0.

Minimal trigger: `export declare function broken(x: number: string; / export declare const fine:number;`

Retained evidence: probes/cli/results.json (`<repo>/audit/10-release-17e8aa9/probes/cli/results.json`, not imported), probes/controls/syntax-api.json (`<repo>/audit/10-release-17e8aa9/probes/controls/syntax-api.json`, not imported), probes/cli-additional/results.json (`<repo>/audit/10-release-17e8aa9/probes/cli-additional/results.json`, not imported).

Reproduction: python3 audit/10-release-17e8aa9/probes/cli-probes.py; inspect bad-syntax/missing-type, then syntax-api.json for the identical truncated input.

Falsification: Valid declaration control succeeds. The identical malformed string passed to transpileFromString returns TypeScript syntax errors, so the checker can detect it. -lv still does not surface the filesystem syntax errors. This finding does not require every semantic TypeScript diagnostic to be fatal: unresolved named fallbacks are an intentional policy.

Consequence: A malformed or corrupted declaration file is presented as a successful generation and can silently produce missing or inaccurate bindings.

Remediation direction: Validate declaration-file syntax before symbol generation, preserve file/line/column diagnostics and make the CLI failure/write policy explicit and consistent across string, filesystem and watch entry points.

Related: No duplicate root cause retained..

<a id="dar-002"></a>

## DAR-002: Explicit input failures are silently dropped when another file is readable

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: IVI

Where: [src/cli.ts:134](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/cli.ts#L134) (`main / validFiles filter`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `da58070f6ba363c253d22054dd376983f96f805b`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/cli.ts:134`, not imported).

Intent: CLI -d explicitly selects declaration inputs; README.md:89 CLI input contract

Evidence: fs.access failures become null and only log under -l. The remaining paths are compiled successfully. A readable directory named folder.d.ts also passes access, exits 0, and produces no Dart. A missing-only control fails later, whereas the mixed case conceals the missing input.

Minimal trigger: `-d valid.d.ts missing.d.ts (valid.d.ts: export declare const answer:number;)`

Retained evidence: probes/cli/results.json (`<repo>/audit/10-release-17e8aa9/probes/cli/results.json`, not imported), probes/fs-boundary/results.json (`<repo>/audit/10-release-17e8aa9/probes/fs-boundary/results.json`, not imported).

Reproduction: python3 audit/10-release-17e8aa9/probes/cli-probes.py; compare valid, missing, mixed-missing, directory and dry-missing records.

Falsification: An explicitly missing single input exits 1, and a no-match glob exits 1. The mixed explicit list exits 0 with an empty stderr. The directory is synthetic and readable. An additional real permission test under UID 501 rejects a single unreadable file but silently succeeds for valid + unreadable, confirming the same defect for permission failures.

Consequence: A typo, deleted file or directory operand omits requested bindings without an ordinary CLI error. Dry-run can also report successful processing of zero readable files.

Remediation direction: Validate regular readable declaration files and report every failed explicit operand independent of log verbosity; establish an explicit nonzero/partial-input policy before generation.

Related: No duplicate root cause retained..

<a id="dar-003"></a>

## DAR-003: Export identity is ignored when choosing JavaScript dispatch paths

Severity: **high** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: IVI

Where: [src/engine/emitter/packagejs/declarations.ts:90](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/declarations.ts#L90) (`jsPath`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `e88709a43bd8e0386faf485c56c09e8fffbcbf26`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/declarations.ts:90`, not imported).

Intent: README.md:57 correct runtime dispatch; PLAN.md:318 module-export identity; LinkedProgram.moduleExports

Evidence: jsPath concatenates origin scopes/root with the local declaration name. The backend does not use the resolved default/export-assignment/local-alias identity for dispatch. Default named functions bind Root.named instead of Root.default; export = named binds Root.named instead of the root function; hidden as publicName binds Root.hidden.

Minimal trigger: `export default function named(x:number):number; (jsRoot: Root); also declare function hidden(x:number):number; export {hidden as publicName};`

Retained evidence: probes/outputs/compiler-oracles.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/compiler-oracles.json`, not imported), probes/outputs/defaults/implementation.ts (`<repo>/audit/10-release-17e8aa9/probes/outputs/defaults/implementation.ts`, not imported), probes/outputs/defaults/implementation.cjs (`<repo>/audit/10-release-17e8aa9/probes/outputs/defaults/implementation.cjs`, not imported), probes/outputs/defaults/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/outputs/defaults/dart/probe.dart`, not imported), probes/controls/extra-results.json (`<repo>/audit/10-release-17e8aa9/probes/controls/extra-results.json`, not imported).

Reproduction: From audit/10-release-17e8aa9/work run pnpm exec tsx ../probes/output-probes.ts, pnpm exec tsx ../probes/controls.ts; from repo root run python3 audit/10-release-17e8aa9/probes/runtime-probes.py and python3 audit/10-release-17e8aa9/probes/final-controls.py.

Falsification: All three declaration inputs have zero strict TypeScript diagnostics. Generated Dart analyzes and compiles. JavaScript compiled from actual TypeScript implementations returns 5 through the compiler-selected exports; generated Dart catches NoSuchMethodError for named/hidden. Ordinary named-export control with the same root returns 5. Anonymous-default suppression is an intentional separate policy and is excluded.

Consequence: Valid package declarations generate bindings that compile but call nonexistent JavaScript properties at runtime.

Remediation direction: Resolve runtime export identity at the backend boundary, including root-callable assignments, defaults and local aliases; diagnose unsupported export identities rather than inventing dispatch paths.

Related: P-17 (related preserved IR contract, not a claim that its old parser bug returned).

<a id="dar-012"></a>

## DAR-012: JavaScript Date is exposed as Dart DateTime without conversion

Severity: **high** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: IVI

Where: [src/engine/emitter/packagejs/types.ts:555](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/types.ts#L555) (`host / TypeScript Date`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `4a2995b1420b3177a1622b2378e1113af6c3da18`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/types.ts:555`, not imported).

Intent: README.md:57 runtime correctness and README.md:61 platform mappings; package:js external runtime representation

Evidence: The host mapping returns Dart core DateTime for TypeScript Date. External functions return native JavaScript Date objects, without a conversion adapter. Dart DateTime access compiles to Dart runtime method dispatch, not native Date access.

Minimal trigger: `export declare function date():Date; // JavaScript implementation returns new Date("2020-01-01T00:00:00Z")`

Retained evidence: probes/outputs/date/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/outputs/date/dart/probe.dart`, not imported), probes/outputs/date/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/date/analyze.log`, not imported), probes/outputs/date/compile.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/date/compile.log`, not imported), probes/outputs/date/runtime.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/date/runtime.log`, not imported).

Reproduction: python3 audit/10-release-17e8aa9/probes/runtime-probes.py; date main.dart reads bind.date().year.

Falsification: The declaration has zero strict TypeScript errors. Generated Dart analyzes and dart2js compiles. Plain JS getUTCFullYear returns 2020; Dart throws NoSuchMethodError for get$year. Successful analyzer/reference parity therefore does not prove runtime interchangeability. Ordinary numeric runtime bindings pass the control.

Consequence: Date-valued APIs advertise a usable DateTime but ordinary property access fails at runtime.

Remediation direction: Use an actual native JS Date interop representation with deliberate conversion helpers, or implement conversion adapters on both parameter and return boundaries; do not equate the two runtime classes.

Related: No duplicate root cause retained..

<a id="dar-023"></a>

## DAR-023: Watch CLI suppresses diagnostic warnings that one-shot mode reports

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: IVI

Where: [src/cli.ts:244](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/cli.ts#L244) (`watchFiles / report`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `da58070f6ba363c253d22054dd376983f96f805b`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/cli.ts:244`, not imported).

Intent: README.md:99 full diagnostics; PLAN.md:54 never degrade silently; CLI -v says structured diagnostics

Evidence: Watch report only counts generation errors and written files. It never prints semantic/module-export/emission diagnostics or the verbose linker report, although watch builds return those analyses. A computed-member omission warns in ordinary mode but appears only as a successful write in watch; -lv is also not consumed by watch report.

Minimal trigger: `export interface A{[Symbol.iterator]():Iterator<number>} export declare const a:Missing;`

Retained evidence: probes/watch-reporting/results.json (`<repo>/audit/10-release-17e8aa9/probes/watch-reporting/results.json`, not imported), probes/watch-reporting/probe.d.ts (`<repo>/audit/10-release-17e8aa9/probes/watch-reporting/probe.d.ts`, not imported).

Reproduction: Run the retained commands in the watch-reporting area report: one-shot and the same built CLI with -w. The captured watch is terminated by the harness after initial build, not interpreted as a normal process exit.

Falsification: One-shot stderr reports one semantic diagnostic. Watch stderr is empty and stdout reports wrote 1. Unsupported computed dispatch is intentionally omitted, so omission itself is not this finding; hiding its warning is. The retained watch run also supplies -lv and still prints no diagnostic records; both the warning difference and verbose suppression are locally executed.

Consequence: A watch user is not told that a binding was omitted or analysis degraded, and cannot obtain promised verbose details through that execution branch.

Remediation direction: Use a shared report formatter/policy for ordinary and watch builds, preserving normal warning summaries and requested verbose records on initial and subsequent builds.

Related: No duplicate root cause retained..

<a id="dar-004"></a>

## DAR-004: Named re-exports lose aliases and cannot traverse barrels

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/symbol/exports.ts:123](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/symbol/exports.ts#L123) (`resolveModuleExports / named records`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `5708d527b3f8b354a7d771648d92f5c2b7e15dea`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/symbol/exports.ts:123`, not imported).

Intent: README.md:66 barrels become libraries; PLAN.md:318 module export identity and PLAN.md:482 barrel projection

Evidence: Named records look only in the target file own top-level declaration map. An intermediate barrel has no own A, so export {A} from ./b resolves to no targets. The emitter projects target names and discards alias elements: A as B exports A instead of B. Namespace re-exports are also skipped, leaving no probe.dart. No module-export diagnostic reports these losses.

Minimal trigger: `a.d.ts: export interface A{x:number}; b.d.ts: export * from "./a"; probe.d.ts: export {A} from "./b". Separate case: export {A as B} from "./a".`

Retained evidence: probes/outputs/reexport-alias/report.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/reexport-alias/report.json`, not imported), probes/outputs/reexport-chain/report.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/reexport-chain/report.json`, not imported), probes/outputs/namespace-export/report.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/namespace-export/report.json`, not imported), probes/outputs/export-consumers.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/export-consumers.json`, not imported), probes/controls/export-control/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/controls/export-control/dart/probe.dart`, not imported).

Reproduction: Generate output-probes.ts and run final-controls.py; consumer.dart requests B from the alias barrel and A from the chained barrel.

Falsification: The source declarations pass strict TypeScript. Direct unaliased re-export emits A correctly. Generated barrel files alone analyze clean, but real consumers fail with UNDEFINED_CLASS. Namespace exports have no consumer file because their library is never emitted; that narrower observation is recorded separately from the two analyzer proofs.

Consequence: A package public entry point lacks types that its declaration files explicitly export, while generation succeeds.

Remediation direction: Resolve exports over the module export graph, preserve public alias identity, and either project namespace exports deliberately or diagnose unsupported namespace projection; test public consumers, not only barrel syntax.

Related: DAR-003 (same export area, different dispatch versus API projection root causes).

<a id="dar-005"></a>

## DAR-005: Parameter lowering introduces keywords and duplicate names after allocation

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/emitter/packagejs/declarations.ts:123](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/declarations.ts#L123) (`parameterName / formatParameters`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `e88709a43bd8e0386faf485c56c09e8fffbcbf26`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/declarations.ts:123`, not imported).

Intent: README.md:53 usable signatures; PLAN.md:292 identifier and helper name safety

Evidence: parameterName reconstructs destructuring names from raw binding text instead of using the allocated safe dartName. Rest expansion adds numeric suffixes without checking existing parameters. The valid inputs emit switch, duplicate p_d and duplicate args1.

Minimal trigger: `declare function one({switch:s}:{switch:number},p_d:number):number; declare function two({p,d}:{p:number,d:number},p_d:number):number; declare function f(args1:number,...args:number[]):number;`

Retained evidence: probes/outputs/destructuring/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/destructuring/analyze.log`, not imported), probes/outputs/rest-collision/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/rest-collision/analyze.log`, not imported), probes/controls/parameter-control/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/controls/parameter-control/analyze.log`, not imported), probes/outputs/typescript-input-diagnostics.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/typescript-input-diagnostics.json`, not imported).

Reproduction: Generate output-probes.ts and run python3 audit/10-release-17e8aa9/probes/analyze-probes.py.

Falsification: Strict TypeScript accepts these declarations. Dart analyzer reports EXPECTED_IDENTIFIER_BUT_GOT_KEYWORD and DUPLICATE_DEFINITION; noncolliding destructuring/rest control analyzes clean. The fixed five-slot rest policy itself is intentional and is not challenged.

Consequence: Valid declarations produce uncompilable Dart signatures.

Remediation direction: Allocate parameter names after destructuring/rest expansion in one signature-local namespace, preserving TypeScript binding/JS argument identity independently.

Related: No duplicate root cause retained..

<a id="dar-006"></a>

## DAR-006: Override arity correction fails through a second inheritance level

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/emitter/packagejs/declarations.ts:323](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/declarations.ts#L323) (`overrideParameters`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `e88709a43bd8e0386faf485c56c09e8fffbcbf26`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/declarations.ts:323`, not imported).

Intent: PLAN.md:469 overrides must satisfy every overridden declaration; README.md:53 real heritage

Evidence: The nearest ancestor source IR determines padding. Mid.f is emitted with the extra Base parameter, but Child.f is padded from the original one-parameter Mid IR, leaving its emitted override shorter than the emitted parent.

Minimal trigger: `declare class Base{f(x:number,y:string):number} declare class Mid extends Base{f(x:number):number} declare class Child extends Mid{f():number}`

Retained evidence: probes/outputs/generic-override/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-override/analyze.log`, not imported), probes/controls/override-control/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/controls/override-control/analyze.log`, not imported), probes/outputs/typescript-input-diagnostics.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/typescript-input-diagnostics.json`, not imported).

Reproduction: Generate output-probes.ts and run analyze-probes.py; inspect generic-override.

Falsification: Strict TypeScript reports no errors. Base plus Mid control analyzes clean. Adding Child causes INVALID_OVERRIDE: Child accepts one optional positional, while emitted Mid accepts two.

Consequence: A valid multi-level class hierarchy cannot compile in Dart.

Remediation direction: Compute effective inherited signatures consistently across the complete ancestor chain and use the same effective signature for descendants.

Related: No duplicate root cause retained..

<a id="dar-007"></a>

## DAR-007: Inherited static-member hoisting creates unreserved top-level names

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/semantic/names.ts:192](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/semantic/names.ts#L192) (`generatedCompanionNames; declarations.isTopLevelStatic`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `f30c9309eaf2a7e4132441c30dab83543d5e2080`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/semantic/names.ts:192`, not imported).

Intent: PLAN.md:292 helper-name reservation; README.md:53 collision safety

Evidence: Semantic reservation covers renamed statics. The backend additionally hoists unchanged statics that collide with an inherited instance member. That later path emits Child_foo without reserving it against an author declaration of the same name.

Minimal trigger: `declare class Base{foo():void} declare class Child extends Base{static foo():void} declare function Child_foo():void;`

Retained evidence: probes/outputs/heritage-static-collision/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/heritage-static-collision/analyze.log`, not imported), probes/controls/static-control/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/controls/static-control/analyze.log`, not imported), probes/outputs/typescript-input-diagnostics.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/typescript-input-diagnostics.json`, not imported).

Reproduction: Generate output-probes.ts and run analyze-probes.py; inspect heritage-static-collision.

Falsification: Strict TypeScript accepts a static member matching an inherited instance name. Removing the independent Child_foo declaration makes Dart analysis clean. Keeping it yields DUPLICATE_DEFINITION at the generated top-level binding.

Consequence: Valid inheritance plus an unrelated free function produces a duplicate Dart definition.

Remediation direction: Expose all backend-generated names to the allocator, including heritage-dependent static hoisting, and propagate allocated names to emission.

Related: E-27 (related earlier reservation guarantee).

<a id="dar-008"></a>

## DAR-008: Minted alias references retain a name that semantic allocation renames

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/alias/register.ts:120](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/alias/register.ts#L120) (`registerAliases use-site aliasName`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `fa17a1a6c5241d85cce1a0285c865394011ffef3`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/alias/register.ts:120`, not imported).

Intent: PLAN.md:54 named degradation; semantic name-allocation invariant

Evidence: registerAliases writes a string aliasName onto each type before allocateDartNames. A companion collision renames the minted alias declaration to KeyOfFooExtension_2, but emitType returns the stale KeyOfFooExtension string at use sites.

Minimal trigger: `export interface KeyOfFoo{} export interface FooExtension{x:number} export declare const x:keyof FooExtension;`

Retained evidence: probes/outputs/alias-companion-collision/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/outputs/alias-companion-collision/dart/probe.dart`, not imported), probes/outputs/alias-companion-collision/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/alias-companion-collision/analyze.log`, not imported), probes/controls/alias-control/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/controls/alias-control/analyze.log`, not imported).

Reproduction: Generate output-probes.ts and run analyze-probes.py; compare alias-control after removing KeyOfFoo.

Falsification: This is not an unsupported keyof lowering complaint: a documented named typedef is intended. The control emits a valid typedef and use. The collision case emits a declaration with suffix _2 but no matching use, causing UNDEFINED_CLASS.

Consequence: An otherwise supported named fallback becomes an undefined Dart type when a generated companion reserves its initial name.

Remediation direction: Carry alias symbol identity through allocation and resolve final Dart names at use sites, or rewrite every use after allocation.

Related: E-29 (different collision stage; earlier source-order determinism fix is not adjudicated here).

<a id="dar-009"></a>

## DAR-009: Dependent generic defaults resolve against the caller binder

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/emitter/packagejs/types.ts:493](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/types.ts#L493) (`padTypeArguments`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `4a2995b1420b3177a1622b2378e1113af6c3da18`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/types.ts:493`, not imported).

Intent: PLAN.md:473 default type arguments applied at use sites; README.md:53 real generics

Evidence: Missing arguments are emitted in the caller context without substituting earlier arguments from the target declaration. Pair<string> inside f<T> becomes Pair<String,T>, although U=T refers to Pair T, which was supplied as string.

Minimal trigger: `export interface Pair<T,U=T>{a:T;b:U} export declare function f<T>(x:Pair<string>):T;`

Retained evidence: probes/outputs/generic-default-outer/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-default-outer/dart/probe.dart`, not imported), probes/outputs/generic-consumer-typescript.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-consumer-typescript.json`, not imported), probes/outputs/generic-consumer-dart.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-consumer-dart.json`, not imported), probes/controls/extra-results.json (`<repo>/audit/10-release-17e8aa9/probes/controls/extra-results.json`, not imported).

Reproduction: Run generic-proofs.ts from work, then python3 audit/10-release-17e8aa9/probes/final-analyzers.py. consumer.ts calls f<number>({a:"a",b:"b"}); Dart consumer calls f<num>(Pair<String,String>(...)).

Falsification: TypeScript accepts the consumer. Dart rejects Pair<String,String> because generated f<num> demands Pair<String,num>. An explicit Pair<string,string> declaration control accepts the same Dart consumer. A zero-argument raw generic is intentional and excluded.

Consequence: A valid typed call is rejected, and some wrongly typed calls can be accepted; an unrelated caller type parameter changes a target default.

Remediation direction: Instantiate target defaults in the target type-parameter environment, substituting preceding supplied/defaulted arguments before rendering in the caller.

Related: No duplicate root cause retained..

<a id="dar-010"></a>

## DAR-010: Nullable generic aliases discard their explicit type arguments

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/emitter/packagejs/types.ts:405](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/types.ts#L405) (`reference / aliasNullable`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `4a2995b1420b3177a1622b2378e1113af6c3da18`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/types.ts:405`, not imported).

Intent: README.md:53 real generics; PLAN.md:54 explicit degradation

Evidence: irAdmitsNull triggers a bare alias name for any nullable alias. This safeguard was intended for dynamic aliases but also catches representable typedef Maybe<T> = T?. Consequently accept(Maybe<string>) becomes accept(Maybe), erasing the string constraint.

Minimal trigger: `export type Maybe<T>=T|null; export declare function accept(x:Maybe<string>):Maybe<number>;`

Retained evidence: probes/outputs/generics/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/outputs/generics/dart/probe.dart`, not imported), probes/outputs/generic-consumer-typescript.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-consumer-typescript.json`, not imported), probes/outputs/generic-consumer-dart.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-consumer-dart.json`, not imported).

Reproduction: Run generic-proofs.ts and final-analyzers.py; compare accept(42) in consumer.ts and generic-consumer.dart.

Falsification: The emitted alias itself remains precisely T?, demonstrating that dynamic is not required for this alias. TypeScript rejects 42 with 2345; Dart accepts it with no analyzer diagnostics. The analyzer-crash workaround for aliases actually equal to dynamic is not being rejected.

Consequence: The generated API accepts values the source declaration excludes and erases the declared return specialization.

Remediation direction: Distinguish dynamic/unrepresentable aliases from representable nullable aliases; preserve explicit arguments for the latter and test both crash-workaround and nullable-generic cases.

Related: No duplicate root cause retained..

<a id="dar-011"></a>

## DAR-011: Hoisted object literals lose enclosing generic parameters

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/parser/type/typeLiterals.ts:164](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/parser/type/typeLiterals.ts#L164) (`handleTypeLiteral / anonymousInterface.typeParams`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `72d69a8db3d70c9a8169d09f9a9535c94b94b73f`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/parser/type/typeLiterals.ts:164`, not imported).

Intent: README.md:53 real generics; PLAN.md:249 scoped type parameters and generic ownership

Evidence: Every hoisted literal is declared with typeParams:[] despite free uses of enclosing type parameters. The backend emits its T as an unresolved dynamic typedef, and equivalent shapes from different generic owners can canonicalize without binder identity. Box<T> becomes a generic alias of a nongeneric dynamic-valued shape.

Minimal trigger: `export declare function f<T>(x:{value:T}):T; export type Box<T>={value:T};`

Retained evidence: probes/outputs/generic-literal/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-literal/dart/probe.dart`, not imported), probes/outputs/generic-consumer-typescript.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-consumer-typescript.json`, not imported), probes/outputs/generic-consumer-dart.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-consumer-dart.json`, not imported), probes/controls/generic-named-control/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/controls/generic-named-control/dart/probe.dart`, not imported).

Reproduction: Run generic-proofs.ts and final-analyzers.py; compare Box<string>={value:42} with Box<String>(value:42).

Falsification: TypeScript rejects number in Box<string>, but the Dart consumer analyzes clean. A named interface Box<T>{value:T} preserves the generic correctly, locating the loss at literal hoisting rather than all generic support. A named unresolved-T comment does not accurately explain a lexical parameter that exists in this build.

Consequence: Generic inline object contracts widen to dynamic and their connection to enclosing signatures disappears.

Remediation direction: Capture free type parameters during hoisting, parameterize every hoisted declaration/use, and make canonical shape identity sensitive to binders.

Related: No duplicate root cause retained..

<a id="dar-013"></a>

## DAR-013: Quoted member names keep TypeScript escape text instead of the decoded key

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/emitter/packagejs/declarations.ts:84](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/declarations.ts#L84) (`unquote / memberAnnotation`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `e88709a43bd8e0386faf485c56c09e8fffbcbf26`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/declarations.ts:84`, not imported).

Intent: README.md:57 correct runtime dispatch; exact JS identity distinct from Dart identifiers

Evidence: unquote strips delimiters but leaves escape sequences unchanged. dartString then correctly escapes that raw backslash for Dart, producing a JavaScript property lookup for literal a\u0062 rather than ab.

Minimal trigger: `export interface Weird {"a\u0062":number} export declare const weird:Weird; // JS object {ab:11}`

Retained evidence: probes/outputs/escaped-member/probe.d.ts (`<repo>/audit/10-release-17e8aa9/probes/outputs/escaped-member/probe.d.ts`, not imported), probes/outputs/escaped-member/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/outputs/escaped-member/dart/probe.dart`, not imported), probes/outputs/escaped-member/runtime.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/escaped-member/runtime.log`, not imported), probes/controls/extra-results.json (`<repo>/audit/10-release-17e8aa9/probes/controls/extra-results.json`, not imported).

Reproduction: Run runtime-probes.py. The failing case accesses the generated JS$a_u0062 getter. Run extra-runtime.py for the decoded "ab" control using its generated JS$ab getter.

Falsification: Strict TypeScript accepts the escaped spelling and the JS oracle reads 11 at ab. Dart compiles but its first getter returns undefined and throws a num TypeError. The otherwise identical "ab" control returns 11. The failing probe stops at that first access; no independent runtime claim is made about its later dotted/hyphenated getters.

Consequence: A legal quoted escape in a property name creates a compiling binding to the wrong JavaScript key.

Remediation direction: Obtain decoded property names from the TypeScript AST, preserving raw source separately for documentation; then apply Dart literal escaping to the decoded JS key.

Related: T-11 (related raw literal unescaping observation, not the same type-literal path).

<a id="dar-014"></a>

## DAR-014: Sibling Dart imports embed raw filenames as unescaped URIs

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/emitter/packagejs/library.ts:294](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/library.ts#L294) (`siblingUri and import/export rendering`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `d6c3a3f3197901e3bab347ca9c251685f0b2c6f6`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/library.ts:294`, not imported).

Intent: README.md:53 collision-safe cross-file imports; valid source filesystem names must yield valid Dart directives

Evidence: siblingUri returns an unencoded relative filesystem string, and renderers interpolate it into single-quoted directives. A # becomes a URI fragment; an apostrophe terminates the string.

Minimal trigger: `a#b.d.ts exports interface A; probe.d.ts imports A from "./a#b". Separate case uses filename a'b.d.ts.`

Retained evidence: probes/outputs/hash-uri/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/hash-uri/analyze.log`, not imported), probes/outputs/quote-uri/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/quote-uri/analyze.log`, not imported), probes/controls/uri-control/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/controls/uri-control/analyze.log`, not imported), probes/outputs/typescript-input-diagnostics.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/typescript-input-diagnostics.json`, not imported).

Reproduction: Generate output-probes.ts and run analyze-probes.py; inspect hash-uri and quote-uri generated imports.

Falsification: Both file graphs have zero strict TypeScript errors and the files exist. The ordinary ab.d.ts control analyzes clean. Hash input reports URI_DOES_NOT_EXIST for a#b.dart; the apostrophe produces UNTERMINATED_STRING_LITERAL and syntax cascades. No code-execution/security exploit is asserted.

Consequence: Legal cross-file input names produce missing imports or uncompilable Dart.

Remediation direction: Construct URI paths with appropriate segment encoding and render them with a Dart string-literal encoder; apply the same rule to imports and exports.

Related: No duplicate root cause retained..

<a id="dar-015"></a>

## DAR-015: Assertion signatures are emitted as boolean-returning functions

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/parser/type/typeOperator.ts:46](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/parser/type/typeOperator.ts#L46) (`handleTypePredicate`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `fb0bff48004ffeca6a78fb673091954e2acd5618`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/parser/type/typeOperator.ts:46`, not imported).

Intent: README.md:57 exact runtime signatures; TypeScript asserts signatures describe successful void returns

Evidence: Every TypePredicate node becomes Boolean without inspecting assertsModifier. The predicate-handler comment assumes a runtime boolean, which holds for x is T and not asserts x is T.

Minimal trigger: `export declare function assert(x:unknown):asserts x is string;`

Retained evidence: probes/outputs/asserts/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/outputs/asserts/dart/probe.dart`, not imported), probes/outputs/asserts/runtime.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/asserts/runtime.log`, not imported), probes/controls/predicate-control/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/controls/predicate-control/dart/probe.dart`, not imported), probes/outputs/typescript-input-diagnostics.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/typescript-input-diagnostics.json`, not imported).

Reproduction: Run runtime-probes.py; asserts main prints the advertised bool from a JS assertion that throws on nonstrings and returns undefined on success.

Falsification: The source is valid TypeScript. An ordinary x is string control appropriately emits bool. The assertion binding also emits bool, yet JS oracle returns undefined and Dart prints null through that nonnullable bool API. This is an observed signature mismatch, not a claim that this print statement itself crashes.

Consequence: Callers receive a nonboolean value through a declared nonnullable boolean return and can write invalid logic based on that return.

Remediation direction: Distinguish assertion predicates from boolean type guards; lower successful assertion returns as void and preserve the narrowing contract in documentation.

Related: No duplicate root cause retained..

<a id="dar-016"></a>

## DAR-016: Watch cannot recover when a previously missing imported file is created

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/watch.ts:158](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/watch.ts#L158) (`WatchSession.build / resolution refresh`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `56c1be4b54d3aa6d280258ae5c1595b424f35f70`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/watch.ts:158`, not imported).

Intent: PLAN.md:513 incremental output must equal cold output; CLAUDE.md:189 watch lifetime and invalidation

Evidence: The long-lived project refreshes only existing SourceFiles. After initial a imports missing b, creating b and building for that path leaves a with dynamic fallback B and emits no b; a cold build immediately imports/emits the real B. Editing a afterward throws a removed/forgotten-node error from ts-morph.

Minimal trigger: `a.d.ts: import {B} from "./b"; export declare const b:B; start watch session before b exists; then create b.d.ts: export interface B{x:number}.`

Retained evidence: probes/watch/results.json (`<repo>/audit/10-release-17e8aa9/probes/watch/results.json`, not imported), evidence/watch-clean.log (`<repo>/audit/10-release-17e8aa9/evidence/watch-clean.log`, not imported), probes/watch-probes.ts (`<repo>/audit/10-release-17e8aa9/probes/watch-probes.ts`, not imported), probes/watch-recovery-isolated/results.json (`<repo>/audit/10-release-17e8aa9/probes/watch-recovery-isolated/results.json`, not imported).

Reproduction: From audit/10-release-17e8aa9/work run pnpm exec tsx ../probes/watch-probes.ts; inspect import-becomes-resolvable records. The harness now removes each scenario directory before initialization and persists results before later errors.

Falsification: A contaminated earlier control had retained b from a prior run and misleadingly passed; its results are quarantined in evidence/watch-contaminated-control.json and are not used as proof. Clean reproduction has incremental/cold byte inequality. Existing-file changes, new-global, remove-global and ordinary barrel controls equal cold output. The importer-edit error is captured separately after the initial stale result.

Consequence: Fixing a missing local dependency during watch leaves stale degraded bindings, and a follow-up importer edit can fail the rebuild until the session restarts.

Remediation direction: Handle file creation and failed-resolution cache invalidation explicitly, maintaining coherent ts-morph ownership when refreshing importers and adding newly available dependencies.

Related: W-01 (documented differential invariant).

<a id="dar-017"></a>

## DAR-017: Watch misses the transition from one emitted library to shared support

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/watch.ts:305](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/watch.ts#L305) (`WatchSession.build / multiLibrary render invalidation`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `56c1be4b54d3aa6d280258ae5c1595b424f35f70`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/watch.ts:305`, not imported).

Intent: PLAN.md:513 incremental/cold equivalence; E-40 shared Promise identity

Evidence: Watch uses states.size, the number of loaded source files, to detect one/many library transitions. The emitter counts actually emitted libraries. An empty loaded barrel already makes states.size=2 while only a emits. Giving b its first declaration switches the emitter to shared support without invalidating cached a.

Minimal trigger: `Initial a.d.ts: export declare const a:Promise<number>; b.d.ts: export {}; edit b to export declare function save(p:Promise<number>):void;`

Retained evidence: probes/watch/results.json (`<repo>/audit/10-release-17e8aa9/probes/watch/results.json`, not imported), probes/watch-impact/result.json (`<repo>/audit/10-release-17e8aa9/probes/watch-impact/result.json`, not imported), probes/watch-impact/incremental/main.dart (`<repo>/audit/10-release-17e8aa9/probes/watch-impact/incremental/main.dart`, not imported), probes/watch-impact/cold/main.dart (`<repo>/audit/10-release-17e8aa9/probes/watch-impact/cold/main.dart`, not imported).

Reproduction: Run watch-probes.ts, then python3 audit/10-release-17e8aa9/probes/prove-watch-impact.py. Both consumers call b.save(a.a).

Falsification: The incremental consumer fails ARGUMENT_TYPE_NOT_ASSIGNABLE because a.Promise and dartify_support.Promise are distinct classes. The identical cold consumer analyzes clean. Reverting b to empty returns to byte equality; ordinary edit controls also pass. This establishes user impact beyond a text diff.

Consequence: Valid edited output no longer compiles when a value moves between two generated libraries, although restarting/cold generation works.

Remediation direction: Base support placement and invalidation on emitted-library membership and effective backend configuration, rerendering all consumers when the support origin changes.

Related: E-40 (same support-identity guarantee; watch-specific invalidation defect).

<a id="dar-018"></a>

## DAR-018: CLI watch chooses a common root by textual prefix

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/cli.ts:257](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/cli.ts#L257) (`watchFiles / roots.reduce`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `da58070f6ba363c253d22054dd376983f96f805b`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/cli.ts:257`, not imported).

Intent: CLI --watch help and README.md:103 rebuild on input changes

Evidence: directory.startsWith(common) treats sibling types2 as a descendant of types. The native watcher is installed only on types, so edits to the explicitly supplied types2/b.d.ts never trigger a rebuild.

Minimal trigger: `-d types/a.d.ts types2/b.d.ts -o out -w; both inputs initially export a numeric value; change b to string.`

Retained evidence: probes/cli-watch/result.json (`<repo>/audit/10-release-17e8aa9/probes/cli-watch/result.json`, not imported), probes/cli-watch.py (`<repo>/audit/10-release-17e8aa9/probes/cli-watch.py`, not imported).

Reproduction: python3 audit/10-release-17e8aa9/probes/cli-watch.py. It starts the built CLI, edits the sibling input, then edits the watched input as a control, and terminates its own child PID.

Falsification: The initial build emits both libraries. Log says Watching types. b retains num after its string edit and after a subsequent a rebuild; a updates successfully. This is a real native fs.watch run on macOS, not a path-only unit simulation.

Consequence: The CLI advertises watch over both inputs but silently keeps one explicit input stale.

Remediation direction: Compute a path-component common ancestor (including volume/root handling), or watch each required root separately; cover sibling-prefix directories.

Related: No duplicate root cause retained..

<a id="dar-019"></a>

## DAR-019: Linker caches successful members of cycles before discovering a missing dependency

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/phase/linkerPhase.ts:241](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/phase/linkerPhase.ts#L241) (`checkDeps recursion/cache`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `8530189b1d18d66c54d576ae86636df572a61649`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/phase/linkerPhase.ts:241`, not imported).

Intent: PLAN.md:222 direct and indirect failures are distinct; reporting truthfulness invariant

Evidence: A recursion back-edge returns LinkedResolved provisionally. B is cached as resolved while A is still being explored. A later discovers Missing, but the cache never propagates that failure back to B.

Minimal trigger: `export interface A{b:B;z:Missing} export interface B{a:A}`

Retained evidence: probes/watch/cycle.json (`<repo>/audit/10-release-17e8aa9/probes/watch/cycle.json`, not imported), probes/controls/cycle-controls.json (`<repo>/audit/10-release-17e8aa9/probes/controls/cycle-controls.json`, not imported).

Reproduction: Run controls.ts or watch-probes.ts; inspect LinkReport.results and edges for A and B.

Falsification: The acyclic missing-dependency control marks B NotLinkedIndirect. The no-missing cycle is linked correctly. With the missing edge inside the cycle, A is NotLinkedDirect and B incorrectly remains LinkedResolved despite reaching Missing through A. Missing is deliberate malformed/absent type input; the finding concerns report truthfulness, not TypeScript validity.

Consequence: The public report/graph and CLI valid-symbol counts falsely classify a transitively broken declaration as valid.

Remediation direction: Propagate outcomes over strongly connected components or use a fixed-point traversal so provisional cycle success cannot become a final cached result before all reachable failures are known.

Related: L-12 (transitive-state guarantee, cycle case).

<a id="dar-020"></a>

## DAR-020: Private-only constructors leave a public implicit Dart constructor

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/emitter/packagejs/declarations.ts:1032](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/declarations.ts#L1032) (`emitClass / inheritedConstructors`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `e88709a43bd8e0386faf485c56c09e8fffbcbf26`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/declarations.ts:1032`, not imported).

Intent: README.md:57 construction/runtime correctness; PLAN.md:464 constructor policy and preserved visibility

Evidence: Private constructors are filtered out, and the explicit-default path is skipped because source constructors existed. emitClass still emits a concrete class with no constructor. Dart supplies a public implicit constructor, which constructs a local object instead of the JavaScript class.

Minimal trigger: `export declare class Private {private constructor();x:number}`

Retained evidence: probes/outputs/private-constructor/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/outputs/private-constructor/dart/probe.dart`, not imported), probes/outputs/private-constructor/runtime.log (`<repo>/audit/10-release-17e8aa9/probes/outputs/private-constructor/runtime.log`, not imported), probes/outputs/generic-consumer-typescript.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-consumer-typescript.json`, not imported), probes/outputs/generic-consumer-dart.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-consumer-dart.json`, not imported), probes/controls/extra-results.json (`<repo>/audit/10-release-17e8aa9/probes/controls/extra-results.json`, not imported).

Reproduction: Run generic-proofs.ts, final-analyzers.py and runtime-probes.py. consumer.ts uses new Private(); Dart uses Private(). Runtime reads x.

Falsification: TypeScript rejects construction with 2673; Dart accepts it. JS oracle class initializes x=7, whereas generated implicit construction prints null. Giving the source a public constructor makes generated external construction return 7 in the control. This is a class with an explicit private constructor, not the already-fixed nonconstructable interface case.

Consequence: An API that forbids public construction exposes a callable Dart constructor that creates an invalid object and bypasses JS initialization.

Remediation direction: Suppress implicit public construction when no source-accessible constructor exists while preserving bindings to instances obtained through other APIs.

Related: E-35 (related earlier implicit-construction class of error).

<a id="dar-021"></a>

## DAR-021: Inherited constructors do not substitute superclass generic arguments

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/emitter/packagejs/declarations.ts:1006](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/declarations.ts#L1006) (`inheritedConstructors`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `e88709a43bd8e0386faf485c56c09e8fffbcbf26`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/declarations.ts:1006`, not imported).

Intent: PLAN.md:465 subclass inherits superclass signatures; README.md:53 real generic heritage

Evidence: The helper returns raw superclass constructor IR, then renders it in the subclass context. Base T is not substituted with Child extends Base<string>, so Child(T value) is emitted with a fabricated unresolved T=dynamic typedef.

Minimal trigger: `export declare class Base<T>{constructor(value:T);value:T} export declare class Child extends Base<string>{}`

Retained evidence: probes/outputs/generic-constructor/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-constructor/dart/probe.dart`, not imported), probes/outputs/generic-consumer-typescript.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-consumer-typescript.json`, not imported), probes/outputs/generic-consumer-dart.json (`<repo>/audit/10-release-17e8aa9/probes/outputs/generic-consumer-dart.json`, not imported), probes/controls/extra-results.json (`<repo>/audit/10-release-17e8aa9/probes/controls/extra-results.json`, not imported).

Reproduction: Run generic-proofs.ts and final-analyzers.py; compare new Child(42) with Child(42).

Falsification: The declarations pass strict TypeScript. TypeScript rejects Child(42), while generated Dart accepts it. Adding an explicit constructor(value:string) to Child makes Dart reject 42 in the control. Nongeneric inherited constructors are already covered by a passing baseline.

Consequence: A subclass API accepts the wrong argument type and reports a lexical superclass parameter as an unresolved global.

Remediation direction: Carry the instantiated heritage type environment through recursive constructor inheritance and substitute parameters/defaults/constraints before emission.

Related: DAR-009 (generic substitution area, distinct constructor path).

<a id="dar-022"></a>

## DAR-022: Carriage-return-only JSDoc escapes the generated Dart comment

Severity: **medium** · Confidence: **confirmed** · Conclusion: **Incorrect** · Category: implementation

Where: [src/engine/emitter/packagejs/text.ts:85](https://github.com/codewithsam110g/dartify/blob/17e8aa932bd42aa9c667f40c2ac8567764799380/src/engine/emitter/packagejs/text.ts#L85) (`dartDocLines`), commit `17e8aa932bd42aa9c667f40c2ac8567764799380`, blob `d57f6d2306ea42f7a6ce3d6cebaa04344be452a1`. Captured source (`<repo>/audit/10-release-17e8aa9/work/src/engine/emitter/packagejs/text.ts:85`, not imported).

Intent: PLAN.md:254 retained JSDoc; valid declaration inputs must produce valid Dart

Evidence: The line splitter handles LF and CRLF only. Lone CR remains embedded after one /// prefix, so subsequent text is parsed as Dart code rather than a comment.

Minimal trigger: `/**\r * Description\r * Text\r */\rexport declare const a:number; (the file contains real CR bytes)`

Retained evidence: probes/controls/cr-doc/probe.d.ts (`<repo>/audit/10-release-17e8aa9/probes/controls/cr-doc/probe.d.ts`, not imported), probes/controls/cr-doc/dart/probe.dart (`<repo>/audit/10-release-17e8aa9/probes/controls/cr-doc/dart/probe.dart`, not imported), probes/controls/cr-doc/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/controls/cr-doc/analyze.log`, not imported), probes/controls/crlf-doc-control/analyze.log (`<repo>/audit/10-release-17e8aa9/probes/controls/crlf-doc-control/analyze.log`, not imported).

Reproduction: Generate controls.ts, then run final-controls.py; cr-doc contains actual CR-only line separators and crlf-doc-control differs only in separators.

Falsification: The CRLF control analyzes clean; CR-only generated output reports EXPECTED_EXECUTABLE, EXPECTED_TOKEN and MISSING_CONST_FINAL_VAR_OR_TYPE. The raw probe bytes are retained, avoiding a display-normalization explanation. This is a syntax-output defect, not a claim of arbitrary code execution.

Consequence: A valid declaration with older/unusual but legal source line endings generates uncompilable Dart.

Remediation direction: Normalize all TypeScript line terminators before producing individually prefixed Dart comment lines; cover CR, LF, CRLF and Unicode line separators.

Related: No duplicate root cause retained..
