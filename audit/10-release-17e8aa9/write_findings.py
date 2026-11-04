from pathlib import Path
import json, hashlib
B=Path(__file__).resolve().parent
HEAD='17e8aa932bd42aa9c667f40c2ac8567764799380'
ORIGIN='https://github.com/codewithsam110g/dartify'
manifest={x['path']:x for x in json.loads((B/'coverage.json').read_text())['files']}
records=[]
def add(n,title,severity,category,file,line,symbol,intent,source,input,evidence,repro,falsification,consequence,remediation,related=()):
 f=manifest[file]
 paths=evidence.split('; ')
 for p in paths: assert (B/p).is_file(),p
 records.append(dict(id=f'DAR-{n:03}',title=title,severity=severity,confidence='confirmed',status='Incorrect',category=category,audited_head=HEAD,file=file,line=line,symbol=symbol,source_blob=f['git_blob'],source_sha256=f['sha256'],source_permalink=f'{ORIGIN}/blob/{HEAD}/{file}#L{line}',snapshot_source=str(B/'work'/file),intent_ref=intent,evidence=source,evidence_files=paths,minimal_input=input,reproduction=repro,falsification=falsification,consequence=consequence,remediation=remediation,related=list(related),evidence_level='static source plus local execution on macOS arm64; no live deployment claim'))

add(1,'Filesystem compilation accepts malformed declarations and reports success','high','IVI','src/transpiler.ts',174,'Transpiler.analyzeProgram',
 'README.md:119 declaration-file contract; PLAN.md:54 preservation and truthful failure policy; src/transpiler.ts:331 string API syntax validation',
 'The filesystem path resolves files and generates symbols from TypeScript recovery ASTs without collecting syntactic diagnostics. transpile() blocks generation diagnostics only. The built CLI emits truncated/missing-type declarations with exit 0 and no syntax error, including with -lv. Invalid UTF-8 in an identifier also exits 0.',
 'export declare function broken(x: number: string;\nexport declare const fine:number;',
 'probes/cli/results.json; probes/controls/syntax-api.json; probes/cli-additional/results.json',
 'python3 audit/10-release-17e8aa9/probes/cli-probes.py; inspect bad-syntax/missing-type, then syntax-api.json for the identical truncated input.',
 'Valid declaration control succeeds. The identical malformed string passed to transpileFromString returns TypeScript syntax errors, so the checker can detect it. -lv still does not surface the filesystem syntax errors. This finding does not require every semantic TypeScript diagnostic to be fatal: unresolved named fallbacks are an intentional policy.',
 'A malformed or corrupted declaration file is presented as a successful generation and can silently produce missing or inaccurate bindings.',
 'Validate declaration-file syntax before symbol generation, preserve file/line/column diagnostics and make the CLI failure/write policy explicit and consistent across string, filesystem and watch entry points.')

add(2,'Explicit input failures are silently dropped when another file is readable','medium','IVI','src/cli.ts',134,'main / validFiles filter',
 'CLI -d explicitly selects declaration inputs; README.md:89 CLI input contract',
 'fs.access failures become null and only log under -l. The remaining paths are compiled successfully. A readable directory named folder.d.ts also passes access, exits 0, and produces no Dart. A missing-only control fails later, whereas the mixed case conceals the missing input.',
 '-d valid.d.ts missing.d.ts (valid.d.ts: export declare const answer:number;)',
 'probes/cli/results.json; probes/fs-boundary/results.json',
 'python3 audit/10-release-17e8aa9/probes/cli-probes.py; compare valid, missing, mixed-missing, directory and dry-missing records.',
 'An explicitly missing single input exits 1, and a no-match glob exits 1. The mixed explicit list exits 0 with an empty stderr. The directory is synthetic and readable. An additional real permission test under UID 501 rejects a single unreadable file but silently succeeds for valid + unreadable, confirming the same defect for permission failures.',
 'A typo, deleted file or directory operand omits requested bindings without an ordinary CLI error. Dry-run can also report successful processing of zero readable files.',
 'Validate regular readable declaration files and report every failed explicit operand independent of log verbosity; establish an explicit nonzero/partial-input policy before generation.')

add(3,'Export identity is ignored when choosing JavaScript dispatch paths','high','IVI','src/engine/emitter/packagejs/declarations.ts',90,'jsPath',
 'README.md:57 correct runtime dispatch; PLAN.md:318 module-export identity; LinkedProgram.moduleExports',
 'jsPath concatenates origin scopes/root with the local declaration name. The backend does not use the resolved default/export-assignment/local-alias identity for dispatch. Default named functions bind Root.named instead of Root.default; export = named binds Root.named instead of the root function; hidden as publicName binds Root.hidden.',
 'export default function named(x:number):number; (jsRoot: Root); also declare function hidden(x:number):number; export {hidden as publicName};',
 'probes/outputs/compiler-oracles.json; probes/outputs/defaults/implementation.ts; probes/outputs/defaults/implementation.cjs; probes/outputs/defaults/dart/probe.dart; probes/controls/extra-results.json',
 'From audit/10-release-17e8aa9/work run pnpm exec tsx ../probes/output-probes.ts, pnpm exec tsx ../probes/controls.ts; from repo root run python3 audit/10-release-17e8aa9/probes/runtime-probes.py and python3 audit/10-release-17e8aa9/probes/final-controls.py.',
 'All three declaration inputs have zero strict TypeScript diagnostics. Generated Dart analyzes and compiles. JavaScript compiled from actual TypeScript implementations returns 5 through the compiler-selected exports; generated Dart catches NoSuchMethodError for named/hidden. Ordinary named-export control with the same root returns 5. Anonymous-default suppression is an intentional separate policy and is excluded.',
 'Valid package declarations generate bindings that compile but call nonexistent JavaScript properties at runtime.',
 'Resolve runtime export identity at the backend boundary, including root-callable assignments, defaults and local aliases; diagnose unsupported export identities rather than inventing dispatch paths.',('P-17 (related preserved IR contract, not a claim that its old parser bug returned)',))

add(4,'Named re-exports lose aliases and cannot traverse barrels','medium','implementation','src/symbol/exports.ts',123,'resolveModuleExports / named records',
 'README.md:66 barrels become libraries; PLAN.md:318 module export identity and PLAN.md:482 barrel projection',
 'Named records look only in the target file own top-level declaration map. An intermediate barrel has no own A, so export {A} from ./b resolves to no targets. The emitter projects target names and discards alias elements: A as B exports A instead of B. Namespace re-exports are also skipped, leaving no probe.dart. No module-export diagnostic reports these losses.',
 'a.d.ts: export interface A{x:number}; b.d.ts: export * from "./a"; probe.d.ts: export {A} from "./b". Separate case: export {A as B} from "./a".',
 'probes/outputs/reexport-alias/report.json; probes/outputs/reexport-chain/report.json; probes/outputs/namespace-export/report.json; probes/outputs/export-consumers.json; probes/controls/export-control/dart/probe.dart',
 'Generate output-probes.ts and run final-controls.py; consumer.dart requests B from the alias barrel and A from the chained barrel.',
 'The source declarations pass strict TypeScript. Direct unaliased re-export emits A correctly. Generated barrel files alone analyze clean, but real consumers fail with UNDEFINED_CLASS. Namespace exports have no consumer file because their library is never emitted; that narrower observation is recorded separately from the two analyzer proofs.',
 'A package public entry point lacks types that its declaration files explicitly export, while generation succeeds.',
 'Resolve exports over the module export graph, preserve public alias identity, and either project namespace exports deliberately or diagnose unsupported namespace projection; test public consumers, not only barrel syntax.',('DAR-003 (same export area, different dispatch versus API projection root causes)',))

add(5,'Parameter lowering introduces keywords and duplicate names after allocation','medium','implementation','src/engine/emitter/packagejs/declarations.ts',123,'parameterName / formatParameters',
 'README.md:53 usable signatures; PLAN.md:292 identifier and helper name safety',
 'parameterName reconstructs destructuring names from raw binding text instead of using the allocated safe dartName. Rest expansion adds numeric suffixes without checking existing parameters. The valid inputs emit switch, duplicate p_d and duplicate args1.',
 'declare function one({switch:s}:{switch:number},p_d:number):number; declare function two({p,d}:{p:number,d:number},p_d:number):number; declare function f(args1:number,...args:number[]):number;',
 'probes/outputs/destructuring/analyze.log; probes/outputs/rest-collision/analyze.log; probes/controls/parameter-control/analyze.log; probes/outputs/typescript-input-diagnostics.json',
 'Generate output-probes.ts and run python3 audit/10-release-17e8aa9/probes/analyze-probes.py.',
 'Strict TypeScript accepts these declarations. Dart analyzer reports EXPECTED_IDENTIFIER_BUT_GOT_KEYWORD and DUPLICATE_DEFINITION; noncolliding destructuring/rest control analyzes clean. The fixed five-slot rest policy itself is intentional and is not challenged.',
 'Valid declarations produce uncompilable Dart signatures.',
 'Allocate parameter names after destructuring/rest expansion in one signature-local namespace, preserving TypeScript binding/JS argument identity independently.')

add(6,'Override arity correction fails through a second inheritance level','medium','implementation','src/engine/emitter/packagejs/declarations.ts',323,'overrideParameters',
 'PLAN.md:469 overrides must satisfy every overridden declaration; README.md:53 real heritage',
 'The nearest ancestor source IR determines padding. Mid.f is emitted with the extra Base parameter, but Child.f is padded from the original one-parameter Mid IR, leaving its emitted override shorter than the emitted parent.',
 'declare class Base{f(x:number,y:string):number} declare class Mid extends Base{f(x:number):number} declare class Child extends Mid{f():number}',
 'probes/outputs/generic-override/analyze.log; probes/controls/override-control/analyze.log; probes/outputs/typescript-input-diagnostics.json',
 'Generate output-probes.ts and run analyze-probes.py; inspect generic-override.',
 'Strict TypeScript reports no errors. Base plus Mid control analyzes clean. Adding Child causes INVALID_OVERRIDE: Child accepts one optional positional, while emitted Mid accepts two.',
 'A valid multi-level class hierarchy cannot compile in Dart.',
 'Compute effective inherited signatures consistently across the complete ancestor chain and use the same effective signature for descendants.')

add(7,'Inherited static-member hoisting creates unreserved top-level names','medium','implementation','src/engine/semantic/names.ts',192,'generatedCompanionNames; declarations.isTopLevelStatic',
 'PLAN.md:292 helper-name reservation; README.md:53 collision safety',
 'Semantic reservation covers renamed statics. The backend additionally hoists unchanged statics that collide with an inherited instance member. That later path emits Child_foo without reserving it against an author declaration of the same name.',
 'declare class Base{foo():void} declare class Child extends Base{static foo():void} declare function Child_foo():void;',
 'probes/outputs/heritage-static-collision/analyze.log; probes/controls/static-control/analyze.log; probes/outputs/typescript-input-diagnostics.json',
 'Generate output-probes.ts and run analyze-probes.py; inspect heritage-static-collision.',
 'Strict TypeScript accepts a static member matching an inherited instance name. Removing the independent Child_foo declaration makes Dart analysis clean. Keeping it yields DUPLICATE_DEFINITION at the generated top-level binding.',
 'Valid inheritance plus an unrelated free function produces a duplicate Dart definition.',
 'Expose all backend-generated names to the allocator, including heritage-dependent static hoisting, and propagate allocated names to emission.',('E-27 (related earlier reservation guarantee)',))

add(8,'Minted alias references retain a name that semantic allocation renames','medium','implementation','src/engine/alias/register.ts',120,'registerAliases use-site aliasName',
 'PLAN.md:54 named degradation; semantic name-allocation invariant',
 'registerAliases writes a string aliasName onto each type before allocateDartNames. A companion collision renames the minted alias declaration to KeyOfFooExtension_2, but emitType returns the stale KeyOfFooExtension string at use sites.',
 'export interface KeyOfFoo{} export interface FooExtension{x:number} export declare const x:keyof FooExtension;',
 'probes/outputs/alias-companion-collision/dart/probe.dart; probes/outputs/alias-companion-collision/analyze.log; probes/controls/alias-control/analyze.log',
 'Generate output-probes.ts and run analyze-probes.py; compare alias-control after removing KeyOfFoo.',
 'This is not an unsupported keyof lowering complaint: a documented named typedef is intended. The control emits a valid typedef and use. The collision case emits a declaration with suffix _2 but no matching use, causing UNDEFINED_CLASS.',
 'An otherwise supported named fallback becomes an undefined Dart type when a generated companion reserves its initial name.',
 'Carry alias symbol identity through allocation and resolve final Dart names at use sites, or rewrite every use after allocation.',('E-29 (different collision stage; earlier source-order determinism fix is not adjudicated here)',))

add(9,'Dependent generic defaults resolve against the caller binder','medium','implementation','src/engine/emitter/packagejs/types.ts',493,'padTypeArguments',
 'PLAN.md:473 default type arguments applied at use sites; README.md:53 real generics',
 'Missing arguments are emitted in the caller context without substituting earlier arguments from the target declaration. Pair<string> inside f<T> becomes Pair<String,T>, although U=T refers to Pair T, which was supplied as string.',
 'export interface Pair<T,U=T>{a:T;b:U} export declare function f<T>(x:Pair<string>):T;',
 'probes/outputs/generic-default-outer/dart/probe.dart; probes/outputs/generic-consumer-typescript.json; probes/outputs/generic-consumer-dart.json; probes/controls/extra-results.json',
 'Run generic-proofs.ts from work, then python3 audit/10-release-17e8aa9/probes/final-analyzers.py. consumer.ts calls f<number>({a:"a",b:"b"}); Dart consumer calls f<num>(Pair<String,String>(...)).',
 'TypeScript accepts the consumer. Dart rejects Pair<String,String> because generated f<num> demands Pair<String,num>. An explicit Pair<string,string> declaration control accepts the same Dart consumer. A zero-argument raw generic is intentional and excluded.',
 'A valid typed call is rejected, and some wrongly typed calls can be accepted; an unrelated caller type parameter changes a target default.',
 'Instantiate target defaults in the target type-parameter environment, substituting preceding supplied/defaulted arguments before rendering in the caller.')

add(10,'Nullable generic aliases discard their explicit type arguments','medium','implementation','src/engine/emitter/packagejs/types.ts',405,'reference / aliasNullable',
 'README.md:53 real generics; PLAN.md:54 explicit degradation',
 'irAdmitsNull triggers a bare alias name for any nullable alias. This safeguard was intended for dynamic aliases but also catches representable typedef Maybe<T> = T?. Consequently accept(Maybe<string>) becomes accept(Maybe), erasing the string constraint.',
 'export type Maybe<T>=T|null; export declare function accept(x:Maybe<string>):Maybe<number>;',
 'probes/outputs/generics/dart/probe.dart; probes/outputs/generic-consumer-typescript.json; probes/outputs/generic-consumer-dart.json',
 'Run generic-proofs.ts and final-analyzers.py; compare accept(42) in consumer.ts and generic-consumer.dart.',
 'The emitted alias itself remains precisely T?, demonstrating that dynamic is not required for this alias. TypeScript rejects 42 with 2345; Dart accepts it with no analyzer diagnostics. The analyzer-crash workaround for aliases actually equal to dynamic is not being rejected.',
 'The generated API accepts values the source declaration excludes and erases the declared return specialization.',
 'Distinguish dynamic/unrepresentable aliases from representable nullable aliases; preserve explicit arguments for the latter and test both crash-workaround and nullable-generic cases.')

add(11,'Hoisted object literals lose enclosing generic parameters','medium','implementation','src/engine/parser/type/typeLiterals.ts',164,'handleTypeLiteral / anonymousInterface.typeParams',
 'README.md:53 real generics; PLAN.md:249 scoped type parameters and generic ownership',
 'Every hoisted literal is declared with typeParams:[] despite free uses of enclosing type parameters. The backend emits its T as an unresolved dynamic typedef, and equivalent shapes from different generic owners can canonicalize without binder identity. Box<T> becomes a generic alias of a nongeneric dynamic-valued shape.',
 'export declare function f<T>(x:{value:T}):T; export type Box<T>={value:T};',
 'probes/outputs/generic-literal/dart/probe.dart; probes/outputs/generic-consumer-typescript.json; probes/outputs/generic-consumer-dart.json; probes/controls/generic-named-control/dart/probe.dart',
 'Run generic-proofs.ts and final-analyzers.py; compare Box<string>={value:42} with Box<String>(value:42).',
 'TypeScript rejects number in Box<string>, but the Dart consumer analyzes clean. A named interface Box<T>{value:T} preserves the generic correctly, locating the loss at literal hoisting rather than all generic support. A named unresolved-T comment does not accurately explain a lexical parameter that exists in this build.',
 'Generic inline object contracts widen to dynamic and their connection to enclosing signatures disappears.',
 'Capture free type parameters during hoisting, parameterize every hoisted declaration/use, and make canonical shape identity sensitive to binders.')

add(12,'JavaScript Date is exposed as Dart DateTime without conversion','high','IVI','src/engine/emitter/packagejs/types.ts',555,'host / TypeScript Date',
 'README.md:57 runtime correctness and README.md:61 platform mappings; package:js external runtime representation',
 'The host mapping returns Dart core DateTime for TypeScript Date. External functions return native JavaScript Date objects, without a conversion adapter. Dart DateTime access compiles to Dart runtime method dispatch, not native Date access.',
 'export declare function date():Date; // JavaScript implementation returns new Date("2020-01-01T00:00:00Z")',
 'probes/outputs/date/dart/probe.dart; probes/outputs/date/analyze.log; probes/outputs/date/compile.log; probes/outputs/date/runtime.log',
 'python3 audit/10-release-17e8aa9/probes/runtime-probes.py; date main.dart reads bind.date().year.',
 'The declaration has zero strict TypeScript errors. Generated Dart analyzes and dart2js compiles. Plain JS getUTCFullYear returns 2020; Dart throws NoSuchMethodError for get$year. Successful analyzer/reference parity therefore does not prove runtime interchangeability. Ordinary numeric runtime bindings pass the control.',
 'Date-valued APIs advertise a usable DateTime but ordinary property access fails at runtime.',
 'Use an actual native JS Date interop representation with deliberate conversion helpers, or implement conversion adapters on both parameter and return boundaries; do not equate the two runtime classes.')

add(13,'Quoted member names keep TypeScript escape text instead of the decoded key','medium','implementation','src/engine/emitter/packagejs/declarations.ts',84,'unquote / memberAnnotation',
 'README.md:57 correct runtime dispatch; exact JS identity distinct from Dart identifiers',
 'unquote strips delimiters but leaves escape sequences unchanged. dartString then correctly escapes that raw backslash for Dart, producing a JavaScript property lookup for literal a\\u0062 rather than ab.',
 'export interface Weird {"a\\u0062":number} export declare const weird:Weird; // JS object {ab:11}',
 'probes/outputs/escaped-member/probe.d.ts; probes/outputs/escaped-member/dart/probe.dart; probes/outputs/escaped-member/runtime.log; probes/controls/extra-results.json',
 'Run runtime-probes.py. The failing case accesses the generated JS$a_u0062 getter. Run extra-runtime.py for the decoded "ab" control using its generated JS$ab getter.',
 'Strict TypeScript accepts the escaped spelling and the JS oracle reads 11 at ab. Dart compiles but its first getter returns undefined and throws a num TypeError. The otherwise identical "ab" control returns 11. The failing probe stops at that first access; no independent runtime claim is made about its later dotted/hyphenated getters.',
 'A legal quoted escape in a property name creates a compiling binding to the wrong JavaScript key.',
 'Obtain decoded property names from the TypeScript AST, preserving raw source separately for documentation; then apply Dart literal escaping to the decoded JS key.',('T-11 (related raw literal unescaping observation, not the same type-literal path)',))

add(14,'Sibling Dart imports embed raw filenames as unescaped URIs','medium','implementation','src/engine/emitter/packagejs/library.ts',294,'siblingUri and import/export rendering',
 'README.md:53 collision-safe cross-file imports; valid source filesystem names must yield valid Dart directives',
 'siblingUri returns an unencoded relative filesystem string, and renderers interpolate it into single-quoted directives. A # becomes a URI fragment; an apostrophe terminates the string.',
 'a#b.d.ts exports interface A; probe.d.ts imports A from "./a#b". Separate case uses filename a\'b.d.ts.',
 'probes/outputs/hash-uri/analyze.log; probes/outputs/quote-uri/analyze.log; probes/controls/uri-control/analyze.log; probes/outputs/typescript-input-diagnostics.json',
 'Generate output-probes.ts and run analyze-probes.py; inspect hash-uri and quote-uri generated imports.',
 'Both file graphs have zero strict TypeScript errors and the files exist. The ordinary ab.d.ts control analyzes clean. Hash input reports URI_DOES_NOT_EXIST for a#b.dart; the apostrophe produces UNTERMINATED_STRING_LITERAL and syntax cascades. No code-execution/security exploit is asserted.',
 'Legal cross-file input names produce missing imports or uncompilable Dart.',
 'Construct URI paths with appropriate segment encoding and render them with a Dart string-literal encoder; apply the same rule to imports and exports.')

add(15,'Assertion signatures are emitted as boolean-returning functions','medium','implementation','src/engine/parser/type/typeOperator.ts',46,'handleTypePredicate',
 'README.md:57 exact runtime signatures; TypeScript asserts signatures describe successful void returns',
 'Every TypePredicate node becomes Boolean without inspecting assertsModifier. The predicate-handler comment assumes a runtime boolean, which holds for x is T and not asserts x is T.',
 'export declare function assert(x:unknown):asserts x is string;',
 'probes/outputs/asserts/dart/probe.dart; probes/outputs/asserts/runtime.log; probes/controls/predicate-control/dart/probe.dart; probes/outputs/typescript-input-diagnostics.json',
 'Run runtime-probes.py; asserts main prints the advertised bool from a JS assertion that throws on nonstrings and returns undefined on success.',
 'The source is valid TypeScript. An ordinary x is string control appropriately emits bool. The assertion binding also emits bool, yet JS oracle returns undefined and Dart prints null through that nonnullable bool API. This is an observed signature mismatch, not a claim that this print statement itself crashes.',
 'Callers receive a nonboolean value through a declared nonnullable boolean return and can write invalid logic based on that return.',
 'Distinguish assertion predicates from boolean type guards; lower successful assertion returns as void and preserve the narrowing contract in documentation.')

add(16,'Watch cannot recover when a previously missing imported file is created','medium','implementation','src/watch.ts',158,'WatchSession.build / resolution refresh',
 'PLAN.md:513 incremental output must equal cold output; CLAUDE.md:189 watch lifetime and invalidation',
 'The long-lived project refreshes only existing SourceFiles. After initial a imports missing b, creating b and building for that path leaves a with dynamic fallback B and emits no b; a cold build immediately imports/emits the real B. Editing a afterward throws a removed/forgotten-node error from ts-morph.',
 'a.d.ts: import {B} from "./b"; export declare const b:B; start watch session before b exists; then create b.d.ts: export interface B{x:number}.',
 'probes/watch/results.json; evidence/watch-clean.log; probes/watch-probes.ts; probes/watch-recovery-isolated/results.json',
 'From audit/10-release-17e8aa9/work run pnpm exec tsx ../probes/watch-probes.ts; inspect import-becomes-resolvable records. The harness now removes each scenario directory before initialization and persists results before later errors.',
 'A contaminated earlier control had retained b from a prior run and misleadingly passed; its results are quarantined in evidence/watch-contaminated-control.json and are not used as proof. Clean reproduction has incremental/cold byte inequality. Existing-file changes, new-global, remove-global and ordinary barrel controls equal cold output. The importer-edit error is captured separately after the initial stale result.',
 'Fixing a missing local dependency during watch leaves stale degraded bindings, and a follow-up importer edit can fail the rebuild until the session restarts.',
 'Handle file creation and failed-resolution cache invalidation explicitly, maintaining coherent ts-morph ownership when refreshing importers and adding newly available dependencies.',('W-01 (documented differential invariant)',))

add(17,'Watch misses the transition from one emitted library to shared support','medium','implementation','src/watch.ts',305,'WatchSession.build / multiLibrary render invalidation',
 'PLAN.md:513 incremental/cold equivalence; E-40 shared Promise identity',
 'Watch uses states.size, the number of loaded source files, to detect one/many library transitions. The emitter counts actually emitted libraries. An empty loaded barrel already makes states.size=2 while only a emits. Giving b its first declaration switches the emitter to shared support without invalidating cached a.',
 'Initial a.d.ts: export declare const a:Promise<number>; b.d.ts: export {}; edit b to export declare function save(p:Promise<number>):void;',
 'probes/watch/results.json; probes/watch-impact/result.json; probes/watch-impact/incremental/main.dart; probes/watch-impact/cold/main.dart',
 'Run watch-probes.ts, then python3 audit/10-release-17e8aa9/probes/prove-watch-impact.py. Both consumers call b.save(a.a).',
 'The incremental consumer fails ARGUMENT_TYPE_NOT_ASSIGNABLE because a.Promise and dartify_support.Promise are distinct classes. The identical cold consumer analyzes clean. Reverting b to empty returns to byte equality; ordinary edit controls also pass. This establishes user impact beyond a text diff.',
 'Valid edited output no longer compiles when a value moves between two generated libraries, although restarting/cold generation works.',
 'Base support placement and invalidation on emitted-library membership and effective backend configuration, rerendering all consumers when the support origin changes.',('E-40 (same support-identity guarantee; watch-specific invalidation defect)',))

add(18,'CLI watch chooses a common root by textual prefix','medium','implementation','src/cli.ts',257,'watchFiles / roots.reduce',
 'CLI --watch help and README.md:103 rebuild on input changes',
 'directory.startsWith(common) treats sibling types2 as a descendant of types. The native watcher is installed only on types, so edits to the explicitly supplied types2/b.d.ts never trigger a rebuild.',
 '-d types/a.d.ts types2/b.d.ts -o out -w; both inputs initially export a numeric value; change b to string.',
 'probes/cli-watch/result.json; probes/cli-watch.py',
 'python3 audit/10-release-17e8aa9/probes/cli-watch.py. It starts the built CLI, edits the sibling input, then edits the watched input as a control, and terminates its own child PID.',
 'The initial build emits both libraries. Log says Watching types. b retains num after its string edit and after a subsequent a rebuild; a updates successfully. This is a real native fs.watch run on macOS, not a path-only unit simulation.',
 'The CLI advertises watch over both inputs but silently keeps one explicit input stale.',
 'Compute a path-component common ancestor (including volume/root handling), or watch each required root separately; cover sibling-prefix directories.')

add(19,'Linker caches successful members of cycles before discovering a missing dependency','medium','implementation','src/engine/phase/linkerPhase.ts',241,'checkDeps recursion/cache',
 'PLAN.md:222 direct and indirect failures are distinct; reporting truthfulness invariant',
 'A recursion back-edge returns LinkedResolved provisionally. B is cached as resolved while A is still being explored. A later discovers Missing, but the cache never propagates that failure back to B.',
 'export interface A{b:B;z:Missing} export interface B{a:A}',
 'probes/watch/cycle.json; probes/controls/cycle-controls.json',
 'Run controls.ts or watch-probes.ts; inspect LinkReport.results and edges for A and B.',
 'The acyclic missing-dependency control marks B NotLinkedIndirect. The no-missing cycle is linked correctly. With the missing edge inside the cycle, A is NotLinkedDirect and B incorrectly remains LinkedResolved despite reaching Missing through A. Missing is deliberate malformed/absent type input; the finding concerns report truthfulness, not TypeScript validity.',
 'The public report/graph and CLI valid-symbol counts falsely classify a transitively broken declaration as valid.',
 'Propagate outcomes over strongly connected components or use a fixed-point traversal so provisional cycle success cannot become a final cached result before all reachable failures are known.',('L-12 (transitive-state guarantee, cycle case)',))

add(20,'Private-only constructors leave a public implicit Dart constructor','medium','implementation','src/engine/emitter/packagejs/declarations.ts',1032,'emitClass / inheritedConstructors',
 'README.md:57 construction/runtime correctness; PLAN.md:464 constructor policy and preserved visibility',
 'Private constructors are filtered out, and the explicit-default path is skipped because source constructors existed. emitClass still emits a concrete class with no constructor. Dart supplies a public implicit constructor, which constructs a local object instead of the JavaScript class.',
 'export declare class Private {private constructor();x:number}',
 'probes/outputs/private-constructor/dart/probe.dart; probes/outputs/private-constructor/runtime.log; probes/outputs/generic-consumer-typescript.json; probes/outputs/generic-consumer-dart.json; probes/controls/extra-results.json',
 'Run generic-proofs.ts, final-analyzers.py and runtime-probes.py. consumer.ts uses new Private(); Dart uses Private(). Runtime reads x.',
 'TypeScript rejects construction with 2673; Dart accepts it. JS oracle class initializes x=7, whereas generated implicit construction prints null. Giving the source a public constructor makes generated external construction return 7 in the control. This is a class with an explicit private constructor, not the already-fixed nonconstructable interface case.',
 'An API that forbids public construction exposes a callable Dart constructor that creates an invalid object and bypasses JS initialization.',
 'Suppress implicit public construction when no source-accessible constructor exists while preserving bindings to instances obtained through other APIs.',('E-35 (related earlier implicit-construction class of error)',))

add(21,'Inherited constructors do not substitute superclass generic arguments','medium','implementation','src/engine/emitter/packagejs/declarations.ts',1006,'inheritedConstructors',
 'PLAN.md:465 subclass inherits superclass signatures; README.md:53 real generic heritage',
 'The helper returns raw superclass constructor IR, then renders it in the subclass context. Base T is not substituted with Child extends Base<string>, so Child(T value) is emitted with a fabricated unresolved T=dynamic typedef.',
 'export declare class Base<T>{constructor(value:T);value:T} export declare class Child extends Base<string>{}',
 'probes/outputs/generic-constructor/dart/probe.dart; probes/outputs/generic-consumer-typescript.json; probes/outputs/generic-consumer-dart.json; probes/controls/extra-results.json',
 'Run generic-proofs.ts and final-analyzers.py; compare new Child(42) with Child(42).',
 'The declarations pass strict TypeScript. TypeScript rejects Child(42), while generated Dart accepts it. Adding an explicit constructor(value:string) to Child makes Dart reject 42 in the control. Nongeneric inherited constructors are already covered by a passing baseline.',
 'A subclass API accepts the wrong argument type and reports a lexical superclass parameter as an unresolved global.',
 'Carry the instantiated heritage type environment through recursive constructor inheritance and substitute parameters/defaults/constraints before emission.',('DAR-009 (generic substitution area, distinct constructor path)',))

add(22,'Carriage-return-only JSDoc escapes the generated Dart comment','medium','implementation','src/engine/emitter/packagejs/text.ts',85,'dartDocLines',
 'PLAN.md:254 retained JSDoc; valid declaration inputs must produce valid Dart',
 'The line splitter handles LF and CRLF only. Lone CR remains embedded after one /// prefix, so subsequent text is parsed as Dart code rather than a comment.',
 '/**\\r * Description\\r * Text\\r */\\rexport declare const a:number; (the file contains real CR bytes)',
 'probes/controls/cr-doc/probe.d.ts; probes/controls/cr-doc/dart/probe.dart; probes/controls/cr-doc/analyze.log; probes/controls/crlf-doc-control/analyze.log',
 'Generate controls.ts, then run final-controls.py; cr-doc contains actual CR-only line separators and crlf-doc-control differs only in separators.',
 'The CRLF control analyzes clean; CR-only generated output reports EXPECTED_EXECUTABLE, EXPECTED_TOKEN and MISSING_CONST_FINAL_VAR_OR_TYPE. The raw probe bytes are retained, avoiding a display-normalization explanation. This is a syntax-output defect, not a claim of arbitrary code execution.',
 'A valid declaration with older/unusual but legal source line endings generates uncompilable Dart.',
 'Normalize all TypeScript line terminators before producing individually prefixed Dart comment lines; cover CR, LF, CRLF and Unicode line separators.')

add(23,'Watch CLI suppresses diagnostic warnings that one-shot mode reports','medium','IVI','src/cli.ts',244,'watchFiles / report',
 'README.md:99 full diagnostics; PLAN.md:54 never degrade silently; CLI -v says structured diagnostics',
 'Watch report only counts generation errors and written files. It never prints semantic/module-export/emission diagnostics or the verbose linker report, although watch builds return those analyses. A computed-member omission warns in ordinary mode but appears only as a successful write in watch; -lv is also not consumed by watch report.',
 'export interface A{[Symbol.iterator]():Iterator<number>} export declare const a:Missing;',
 'probes/watch-reporting/results.json; probes/watch-reporting/probe.d.ts',
 'Run the retained commands in the watch-reporting area report: one-shot and the same built CLI with -w. The captured watch is terminated by the harness after initial build, not interpreted as a normal process exit.',
 'One-shot stderr reports one semantic diagnostic. Watch stderr is empty and stdout reports wrote 1. Unsupported computed dispatch is intentionally omitted, so omission itself is not this finding; hiding its warning is. The retained watch run also supplies -lv and still prints no diagnostic records; both the warning difference and verbose suppression are locally executed.',
 'A watch user is not told that a binding was omitted or analysis degraded, and cannot obtain promised verbose details through that execution branch.',
 'Use a shared report formatter/policy for ordinary and watch builds, preserving normal warning summaries and requested verbose records on initial and subsequent builds.')

(B/'findings.json').write_text(json.dumps(records,indent=2)+'\n')
lines=['# Findings at the audited v1 source','',f'Audited commit: `{HEAD}`. Each finding is independently confirmed against the captured source and retained local evidence. All source permalinks pin that SHA; no moving-branch links. The current ref was not reread after the user prohibited Git. See MASTER.md for final content-integrity checks and limits.','',
 'Severity reflects concrete user impact: high = common compiling bindings fail at runtime or malformed inputs are falsely certified; medium = bounded valid-input failures, typing, watch or reporting defects. No security severity is inferred from a registry label.','',
 'All records are **Incorrect**, confidence **confirmed**. This labels the implementation behavior under each stated trigger; it does not mean every input or surrounding component is incorrect. Tests run locally; no live-deployment claims.','',
 'Reproduction commands are repository-root relative unless a work directory is explicitly named. They write only inside this audit directory. See REPRODUCE.md for toolchain, order and retained byte inputs.','']
# Report pass order: IVI, implementation, deployment, security. Master is severity sorted.
for r in sorted(records,key=lambda x:({'IVI':0,'implementation':1,'deployment':2,'security':3}.get(x['category'],4),x['id'])):
 lines += [f"<a id=\"{r['id'].lower()}\"></a>",'',f"## {r['id']}: {r['title']}",'',f"Severity: **{r['severity']}** · Confidence: **{r['confidence']}** · Conclusion: **{r['status']}** · Category: {r['category']}",'',
 f"Where: [{r['file']}:{r['line']}]({r['source_permalink']}) (`{r['symbol']}`), commit `{HEAD}`, blob `{r['source_blob']}`. [Captured source]({r['snapshot_source']}:{r['line']}).",'',
 f"Intent: {r['intent_ref']}",'',f"Evidence: {r['evidence']}",'',f"Minimal trigger: `{r['minimal_input'].replace(chr(10),' / ')}`",'',
 'Retained evidence: '+', '.join(f'[{p}]({B/p})'for p in r['evidence_files'])+'.','',f"Reproduction: {r['reproduction']}",'',f"Falsification: {r['falsification']}",'',f"Consequence: {r['consequence']}",'',f"Remediation direction: {r['remediation']}",'',
 'Related: '+('; '.join(r['related']) if r['related'] else 'No duplicate root cause retained.')+'.','']
(B/'findings.md').write_text('\n'.join(lines))
print(f'Wrote {len(records)} findings; {sum(r["severity"]=="high"for r in records)} high.')
