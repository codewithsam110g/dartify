from pathlib import Path
import json, collections, re, textwrap
B=Path(__file__).resolve().parent
H='17e8aa932bd42aa9c667f40c2ac8567764799380'
findings=json.loads((B/'findings.json').read_text())
coverage=json.loads((B/'evidence/coverage-summary.json').read_text())
def write(name,text): (B/name).write_text(textwrap.dedent(text).strip()+'\n')
def table(rows):return '\n'.join('| '+ ' | '.join(map(str,r))+' |'for r in rows)
coverage_table=table([['Area','Files','Total lines','Manually read lines','Fully read files'],['---','---:','---:','---:','---:']]+[[r['area'],r['files'],r['lines'],r['manual_lines'],r['fully_read_files']]for r in coverage])

write('04_IVI.md',f'''
# Intent versus implementation

Source: `{H}`. **Incorrect:** DAR-001, DAR-002, DAR-003, DAR-012 and DAR-023 are the direct contract mismatches. Implementation findings in findings.md provide further counterexamples to real generics, safe names, imports and incremental equivalence. No source fixes were made.

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

{coverage_table}
''')

write('05_OUTPUT_IMPLEMENTATION.md','''
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
''')

write('06_CLI_WATCH_ERRORS.md','''
# CLI, mangled inputs, watch and error reporting

**Coverage:** cli.ts, transpiler.ts, watch.ts, resolution and report formatters read completely as part of the 73-file source pass. Checked-in CLI/reporting/generation/watch tests read completely; default, incremental and e2e gates executed. Built CLI used for adverse cases; WatchSession used for controlled differential cases.

**Incorrect:** DAR-001/002 (input validation), DAR-016/017/018 (watch freshness), DAR-019 (truthful link states), DAR-023 (watch reporting). The output defects in findings.md also have error-reporting implications, but their roots are not duplicated as extra findings.

| Case | Local result | Conclusion |
|---|---|---|
| Valid declaration / BOM / CRLF / unicode identifier | CLI exits 0 | Verified correct for these examples |
| Missing single file / no-match glob | CLI exits 1 | Verified correct |
| Valid + explicit missing file | Exit 0, missing file hidden without -l | Incorrect, DAR-002 |
| Directory operand named .d.ts | Exit 0, no Dart | Incorrect, DAR-002 |
| Truncated signature / missing type / invalid UTF-8 identifier | Exit 0, recovery AST emitted | Incorrect, DAR-001 |
| Invalid byte in a comment | Exit 0 | Observed; separate encoding strictness policy Unverified, not a separate finding |
| Declaration file with executable body/statement | Exit 0 | Incomplete declaration-only validation; retained in CLI matrix, not treated as arbitrary TS support requirement |
| Missing tsconfig | Exit 1 with diagnostic | Verified correct |
| Output directory already a regular file | Exit 1 with EEXIST context | Verified correct failure signaling; partial multi-file atomicity not proven |
| Numeric/repeated malformed options | Exit 1 with raw path/option error | Observed poor polish; no extra severity finding without a stronger contract |
| Unknown --ouput flag | Accepted | Optional strict-option improvement; no separate blocker claimed |
| Dry-run on missing input | Exit 0, would process 0 | Included in DAR-002 input policy |
| Forced generation failure in existing tests | Errors returned, writes blocked | Verified correct in targeted suite |
| Watch normal edited declarations/global/barrel/export-root cases | Equals cold | Verified correct for the retained controls |
| Create missing dependency during session | Stale output; importer edit throws | Incorrect, DAR-016 |
| Empty loaded file gains Promise API | Cached library keeps local Promise | Incorrect, DAR-017; consumer analyzer fails |
| Explicit sibling-prefix input directories | Native watcher misses one input | Incorrect, DAR-018 |
| Unsupported computed member warning | One-shot warns, watch says wrote 1 | Incorrect reporting, DAR-023 |

Evidence: probes/cli/results.json, probes/cli-additional/results.json, probes/watch/results.json, probes/watch-impact/result.json, probes/cli-watch/result.json and probes/watch-reporting/results.json. These retain command arguments, exits or explicit harness termination, stdout/stderr and emitted content. Paths, spaces and URI metacharacters were exercised in synthetic inputs; no claim of Windows-native filesystem verification.

For watch-reporting rerun `python3 audit/10-release-17e8aa9/probes/watch-reporting.py`. The two CLI watch reproducers terminate only their own child PID. watch-probes.ts removes only its own audit scenario folders before each case; the earlier contaminated control is quarantined and excluded from final proof.

**Unverified:** real OS permission-denial paths beyond the regular-file write failure; power loss or transactional multi-output durability; infinite/very large declaration denial-of-service budgets; OS signal handling beyond stopping our own synthetic watch runs. Existing depth/recursive tests and stress are bounded local evidence, not resource-exhaustion proof.
''')

write('07_RELEASE.md','''
# Build, packaging and deployment boundary

**Coverage:** package.json, pnpm-workspace.yaml, lock metadata, tsconfig, Vitest config and 49-line CI fully inspected as appropriate (lock dependency graph automated plus targeted package entries). All four tools read, historical exhibit read. All builds/test/install/pack outputs are contained in this audit folder.

**Verified correct, local:** locked pnpm 10.9.0 install; TypeScript noEmit; ESM bundle; default/S2/S3/S4/S5/Dart/e2e/incremental/stress gates; coverage command. Default is 299 passed / 10 opt-in skipped, with opt-in tiers separately run. Coverage reports 90.43% statements/lines, 86.72% branches, 96.41% functions. Coverage is execution reach, not semantic correctness.

The packed artifact has six entries: README, LICENSE, package.json, dist/cli.js, its shared chunk and its lazily loaded watch chunk. In a separate extraction, production-only frozen/offline install succeeded; --version returns 1.0.0; --help succeeds; real h3 input generates successfully. Only 41 production packages install. The initial smoke harness used an unpinned global pnpm and failed offline metadata lookup; initial-results.json is preserved, and the successful rerun explicitly uses corepack pnpm@10.9.0. It is a harness correction, not a project defect.

The tarball does not include the declaration corpus, tests, historical exhibit, graph/IR/bench tools or development dependencies. ts-morph, yargs and fast-glob remain external production dependencies and are reachable from the CLI graph. The packed CLI's successful generation is local package completeness evidence; its existence is not a publication/deployment claim.

**Verified correct as configuration only:** engines.node is ^20.19.0 || ^22.12.0 || >=23, and CI names 20.19.0, 22.12.0 and 24.x. CI includes TypeScript/default/build, coverage/incremental on 24.x, and separate Dart/e2e gates. The prepublishOnly hook builds; it does not itself run the full correctness gates. These observations are not inherently a deployment finding.

**Unverified:** Node 20.19.0 and 22.12.0 runtime on this machine; Windows/Linux-native execution; hosted CI results for this commit; a fresh registry consumer installation without the retained lock harness; npm publication and live installation. No remote write, publication, CI change, release or deployment was performed. No current CI failure is inferred from these limits.

Evidence: evidence/gates.json and gate-*.log, evidence/gate-coverage.log, evidence/dart_bindgen-1.0.0.tgz and package-smoke/results.json. Local toolchain: Node 24.22.1, pnpm 10.9.0, Dart 3.13.5 stable, macOS arm64.
''')

write('08_SECURITY.md','''
# Security and dependency evidence

**Coverage:** all live source read at the declaration-input, module-resolution, output rendering, filesystem writing and CLI boundaries. Every captured tracked path received a location-only credential-pattern scan. The root lock received dependency-graph/advisory analysis. No Git metadata/history read after the prohibition, no live service probing and no browser/UI attack execution.

**Verified correct within narrow checks:** Dart annotation strings escape interpolation, quote/backslash/control characters; unsafe computed keys are intentionally diagnosed/omitted in the ordinary path; unsupported source comments generally receive safe line treatment. The quoted-key/URI/CR defects are reported by their proven output impacts (DAR-013/014/022), without invented code-execution severity. The test corpus and tools do not ship in the packed artifact.

**Verified observation:** the location-only scan found zero matches for private-key blocks, GitHub-token patterns, AWS access-key IDs or npm tokens among the 1,848 captured files. This is not proof that the tree contains no secret. No values were printed. Broader secret formats and historical exposure remain Unverified/Blocked; see evidence/current-tree-secret-scan.json.

`pnpm audit --json` reports 53 advisory records across the locked graph (3 low, 21 moderate, 26 high, 3 critical). These are registry labels, not 53 independently established exploitable project defects. The tool metadata lists devDependencies as zero even though paths clearly include dev packages; use its concrete dependency paths rather than that aggregate classification. Full results are retained in evidence/dependency-audit.json.

Production path ts-morph → @ts-morph/common contains minimatch 10.0.3. This version matches the upstream repeated-wildcard ReDoS range. The upstream attack requires attacker-controlled glob patterns. The CLI expands patterns with fast-glob before passing explicit paths to ts-morph, so direct exploit reachability through this application's -d flag has not been established. This is a confirmed dependency/version match with **Unverified application exploitability**, not a confirmed high application finding. [Primary minimatch advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-3ppc-4f35-3m26).

Development dependencies include Vitest/UI 3.2.4. The primary upstream advisory describes file access/execution under an exposed API server or specific Windows UI/browser conditions. This local macOS audit did not launch the UI server or satisfy those attack conditions. Treat the installed vulnerable-version match as confirmed and the project's exploit exposure as **Unverified**. Registry and upstream patched-version wording differs; no single patch version is recommended without reconciling all advisory records. [Primary Vitest advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp).

Primary advisory checks were retrieved during this audit on 2026-11-04 UTC. Multiple newer advisory records exist in the retained registry output; not all have been independently adjudicated. Review production paths first, then developer tools, update the lock deliberately and rerun the correctness/release gates. No dependency update or audit fix command was run.

**Blocked:** Git-history secret exposure, blame/history-based necessity analysis and final ref-pointer validation, because the user explicitly prohibited Git access. **Unverified:** unbounded resource exhaustion, native browser host interop beyond executed cases, Windows security conditions and deployment credentials/configuration. No absence-of-vulnerability verdict is claimed.
''')

write('09_CHALLENGED_AND_LIMITS.md','''
# Challenged candidates, rejected claims and limits

Every retained finding has a dedicated falsification field. These additional observations were deliberately not promoted:

| Candidate or tempting inference | Conclusion | Reason/evidence |
|---|---|---|
| Callable interface with members must fail legacy JS calls | Verified correct for probe | dart2js/Node calls the callable and returns 5 |
| Nullable function reference/call must be broken | Verified correct for probe | Native and Dart return n4 and null as expected |
| Multiline unsupported type must inject source into Dart comments | Verified correct for probe | Preserved normalized comment output analyzes clean |
| Fixed five-slot rest expansion is a defect | Rejected as finding | Explicit reference/backend policy; only collision behavior is reported |
| No-argument generic should always expand TS defaults | Rejected as finding | PLAN explicitly keeps raw zero-argument uses to Dart instantiate-to-bounds |
| Anonymous defaults/augmentations are silently lost by definition | Rejected as blanket finding | Suppression is documented/diagnosed; named export dispatch and watch warning loss have separate concrete proofs |
| Every TypeScript semantic error must abort | Unverified requirement | Tool intentionally supports named unresolved/degraded references; syntax acceptance has a narrower demonstrated inconsistency |
| Every dependency registry critical is a critical CLI exploit | Rejected | Version matching, developer-tool exposure and application reachability differ |
| Nonatomic multi-file writes are automatically a proven durability violation | Unverified | Failure exit signaling observed; no transactional/power-loss guarantee established |
| SymbolTable transaction draft/live accessor is definitely externally exploitable | Unverified | No real shipped external consumer path demonstrated; normal isolation gates pass |
| Old logger/legacy code should be deleted | Blocked | Historical exhibit is intentional; no Git-history necessity check authorized |
| Offline package-smoke failure proves missing production dependencies | Refuted | Pinned pnpm production-only rerun succeeds |
| Watch created-dependency case passes | Refuted contaminated control | Old b file contaminated one rerun; clean case fails and is retained |
| All quoted members in escaped-key probe fail | Unverified beyond first access | Runtime stops on first escaped getter; decoded-key control succeeds |

Coverage limits are explicit in MASTER.md and coverage.json: all live implementation/tests/local fixtures were manually read, but neither all 180,799 repository lines nor every prior historical finding was manually adjudicated. The full third-party .d.ts corpus is stress-executed; it is not a runtime correctness oracle. Existing snapshots are exactly rechecked plus sampled manual review. Historical audit status text is not accepted as current evidence.

The audit did not modify tracked sources, third-party fixtures or prior registers. All generated artifacts and installed dependencies are under this ignored folder. The only Git metadata write was the earlier explicitly authorized local exclude entry; after the user prohibited Git, none was accessed. Both original captured paths and the isolated tracked snapshot were finally rehashed: all 1,848 match the initial manifest. A changed ref with identical contents cannot be detected by that check.

Next independent step: $audit-verify in a fresh session. It should attempt to disprove each DAR finding against the intended fixed/current SHA, starting from the retained bytes and real consumer checks. No finding should be carried to a newer commit without revalidation.
''')

write('REPRODUCE.md','''
# Reproduction and evidence index

All commands below operate under audit/10-release-17e8aa9. No Git command is needed or authorized. The source snapshot has the captured HEAD's 1,848 tracked files; dependencies/build/outputs are separate audit artifacts. The snapshot's files match their recorded SHA256 values.

Local versions: Node 24.22.1, pnpm 10.9.0, Dart 3.13.5 macOS arm64. Python is used only as a standard-library subprocess/file harness, with no installed Python dependencies. Dart scripts invoke /Users/ssrk/flutter/bin/cache/dart-sdk/bin/dart directly, avoiding the Flutter shim. PUB_CACHE/TMPDIR/XDG caches point into this audit. For another machine, change that explicit Dart path and preserve containment.

## Existing project gates

`python3 audit/10-release-17e8aa9/run_gates.py` reproduces typecheck, build, default, S2, S3, S4, S5 fixture, Dart, actual-library e2e, incremental and stress gates from work/. Inspect the script's environment and command list first. The original logs and exits are retained. Coverage was separately run as `pnpm test:coverage` from work/ with the same environment; it passed.

Dependencies were installed with pinned pnpm 10.9.0, frozen lock, --ignore-scripts and --store-dir pointing at cache/pnpm-store. Native optional esbuild worked in the observed install. The unsuccessful unsupported --state-dir attempt is preserved in install.log; install-retry.log contains the successful installation. No source/lockfile mutation was needed.

## Output and type proofs

From audit/10-release-17e8aa9/work, run in order:

```sh
pnpm exec tsx ../probes/output-probes.ts
pnpm exec tsx ../probes/controls.ts
pnpm exec tsx ../probes/extra-controls.ts
pnpm exec tsx ../probes/validate-inputs.ts
pnpm exec tsx ../probes/validate-controls.ts
pnpm exec tsx ../probes/generic-proofs.ts
```

From the repository root:

```sh
python3 audit/10-release-17e8aa9/probes/analyze-probes.py
python3 audit/10-release-17e8aa9/probes/runtime-probes.py
python3 audit/10-release-17e8aa9/probes/final-controls.py
python3 audit/10-release-17e8aa9/probes/final-analyzers.py
python3 audit/10-release-17e8aa9/probes/extra-runtime.py
```

analyze-results.json contains expected failures, not an audit harness failure. runtime-results.json records compile exit and observed output separately. Runtime bodies catch JS errors to retain readable evidence; a Node exit 0 is therefore not a passing binding. compiler-oracles.json uses actual TS-compiled CommonJS implementations for the export cases. generic-consumer-typescript.json and generic-consumer-dart.json compare consumer typing in both languages. Strict input validity is separate from consumer misuse intentionally introduced by those probes.

## CLI and watch proofs

```sh
python3 audit/10-release-17e8aa9/probes/cli-probes.py
python3 audit/10-release-17e8aa9/probes/cli-additional.py
python3 audit/10-release-17e8aa9/probes/cli-watch.py
python3 audit/10-release-17e8aa9/probes/watch-reporting.py
```

From work/: `pnpm exec tsx ../probes/watch-probes.ts`. Then from the root: `python3 audit/10-release-17e8aa9/probes/prove-watch-impact.py`. The watch script resets only its own synthetic scenario directories, captures build errors rather than aborting all scenarios, and records every completed comparison. The initial contaminated result is excluded and kept only to explain falsification. CLI watchers are terminated by their harness after bounded observations.

## Package and security

`python3 audit/10-release-17e8aa9/probes/package-smoke.py` extracts the retained tarball and uses pinned corepack pnpm@10.9.0 for a production-only installation and CLI version/help/h3 checks. It uses the audit cache and locked dependency harness; it does not publish or install globally. Review its replacement/reset paths before reuse.

Security evidence/dependency-audit.json is a registry response from `pnpm audit --json` in work/. Advisory results are time-sensitive and separate from source defect proofs. The location-only secret scan, final source integrity, original source manifest and evidence hashes are retained under evidence/ and coverage.json.
''')

priority=[]
for r in sorted(findings,key=lambda x:({'critical':0,'high':1,'medium':2,'low':3}[x['severity']],x['id'])):
 priority.append([f'[{r["id"]}](findings.md#'+r['id'].lower()+')',r['severity'],r['title']])
master=f'''# v1 release audit — {H[:7]}

**Verdict: not ready for an unconditional v1 correctness claim.** The measured project gates pass, but 23 independently reproduced defects remain: **0 critical, 3 high (P1), 20 medium**. All are confidence **confirmed**, conclusion **Incorrect** under their explicit triggers. No speculative security finding is included in that count.

The three P1 findings are DAR-001 (malformed filesystem inputs falsely succeed), DAR-003 (default/export-assignment/aliased exports dispatch to nonexistent JS properties), and DAR-012 (JS Date is exposed as an incompatible Dart DateTime). These are first priority regardless of report category.

{table([['ID','Severity','Finding'],['---','---','---']]+priority)}

## Attribution and method

Every finding pins full commit `{H}`, exact source file/line, captured Git blob and SHA256, a SHA-pinned source permalink, retained source/input/output evidence, repro command, attempted falsification, concrete consequence and remediation direction. See [findings.md](findings.md) and [findings.json](findings.json). Related old IDs are references, not inherited conclusions. No fixes or tracked register updates were made.

The initial tree/HEAD were captured before the no-Git instruction. After that instruction no Git command or metadata read/write occurred. Final content checks match **all 1,848 captured files** in both the repository and isolated snapshot. This proves source-content identity with the captured HEAD, **not a fresh ref-pointer check** or remote availability of constructed GitHub permalinks. No newer commit's evidence is folded in. evidence/final-integrity.json records the check without source contents.

Single auditor, no subagents. Audit skill: /Users/ssrk/.claude-shared/d3/codex-skills/audit/SKILL.md. Session included memory instructions but no project memory was consulted; this is not claimed to be a confirmed memory-disabled audit-profile run. Runtime probes are local macOS arm64; static, local runtime and live evidence are kept separate. No live/production action or remote write was performed.

## Achieved coverage against the complete denominator

{coverage_table}

**Full manual implementation coverage:** all 73 live source files / 12,606 lines, all tests/local test assets, synthetic fixtures, internal tools, CI, root docs/configuration and historical exhibit. Every captured file has a disposition and hash in coverage.json. Full source reading does not prove every behavior correct.

**Automated coverage:** 1,661 declaration files in stress (1,645 reference + 16 synthetic), all default/conformance/snapshot assertions, categorized Dart analyzer baseline, actual-library dart2js e2e, checked-in incremental scenarios, locked dependency install/audit and package smoke. The third-party corpus and lock were not represented as manually read line by line. Snapshots have exact comparisons plus manually reviewed slices.

**Incomplete planned historical-document scope:** 1,124/4,807 prior-report lines are conservatively marked read. All 524 historical claim-bearing lines were machine-inventoried; not every old row was independently closed. The unread 3,683 lines remain in the denominator. No historical claim is required to prove a retained DAR finding. This is a fresh source/release audit, not a completed closing audit of the entire historical register.

## Verification

All 11 requested baseline gates passed: typecheck, build, default (299 passed / 10 opt-in skipped), S2/S3/S4/S5, Dart, actual-library e2e, incremental and stress (1,661 files; 720 classified empties). Coverage also passed: 90.43% lines, 86.72% branches, 96.41% functions. The opt-in tiers were run separately; default skips are not silently called executed. Package tarball production-only install/version/help/h3 generation passed with pinned pnpm. Logs are in evidence/gate-*.log and package-smoke/results.json.

Targeted probes expose gaps beyond those green gates: strict TS inputs, Dart analyzer/compiler errors, wrong runtime dispatch, consumer API/type checks and incremental/cold comparisons. Expected negative analyzer/consumer exits are proof outputs, not baseline failures. Commands and environment are in [REPRODUCE.md](REPRODUCE.md).

## Fix groupings and next independent work

1. Input/failure boundary: DAR-001/002; shared ordinary/watch reporting DAR-023.
2. Module identity/public API: DAR-003/004.
3. Names, literals and comments: DAR-005/007/008/013/014/022.
4. Type and class fidelity: DAR-006/009/010/011/012/015/020/021.
5. Incremental state/reporting: DAR-016/017/018/019.

Preserve each ID when triaging and add regression assertions against actual public consumers/runtime behavior. First have a fresh $audit-verify session independently challenge these records. Do not reuse their status at a later HEAD without rerunning proof against that source.

**Blocked by user constraint:** final ref-pointer check, history/blame-based necessity analysis and historical secret exposure. **Unverified/deferred:** hosted CI, Node 20/22 native runtime, Windows/Linux/browser-native execution, registry-publication/live installation, unbounded resource exhaustion, full per-advisory exploit reachability, power-loss durability and remaining historical register adjudication. No P0/P1 is manufactured from these gaps.

Reports, in pass order: [inventory/IVI](03_INVENTORY_IVI.md), [IVI](04_IVI.md), [implementation](05_OUTPUT_IMPLEMENTATION.md), [CLI/watch/errors](06_CLI_WATCH_ERRORS.md), [release](07_RELEASE.md), [security](08_SECURITY.md), [challenged candidates and limits](09_CHALLENGED_AND_LIMITS.md).
'''
write('MASTER.md',master)
severity=collections.Counter(r['severity']for r in findings);categories=collections.Counter(r['category']for r in findings)
write('summary.md',f'''# Release audit result

Audited source: `{H}`. **23 confirmed defects: 3 high, 20 medium; 0 critical.** Categories: {dict(categories)}. Every retained finding is labelled Incorrect with static and local execution evidence; no live-deployment proof is claimed.

The v1 candidate passes all measured project gates, actual-library e2e and package smoke. It still accepts malformed declaration files as successful input, misdispatches valid exports, and presents JS Date as unusable Dart DateTime. Further medium findings cover missing public exports, invalid generated Dart, erased/misbound generics, constructors, watch freshness and suppressed/misclassified diagnostics. Release correctness claims should wait for adjudication and regression fixes.

Prioritize input validation, export identity and Date runtime representation. Then fix naming/text safety, generic/class fidelity and incremental/reporting state in cohesive groups. Full details and falsification are in findings.md/json; MASTER.md orders priorities independently of audit pass order.

All 73 live files / 12,606 lines were manually read. All test/local fixture/tool/root-doc/history code was read, and the complete 1,661-file declaration corpus was stress-executed. The 180,799-line inventory is not falsely described as fully manually read: third-party files/lock/snapshots use automated and sampled methods, and 3,683 prior-report lines remain unread. Exact per-file ranges and evidence are in coverage.json.

No tracked source, prior report or dependency lock changed. All 1,848 captured source paths still match their initial hashes. Git was not accessed after the explicit prohibition; current ref identity/history and other-platform/live checks remain unverified. The only earlier Git metadata write was the explicitly authorized ignore entry. Next step: independent $audit-verify in a fresh session.
''')

# Mark the original plan honestly; retain its original scope/denominator.
p=B/'01_PLAN.md';s=p.read_text().replace('# v1 release audit plan — pending approval','# v1 release audit plan — approved; execution disposition below')
s=s.replace('- Recheck HEAD and tracked tree before major phases and completion.', '- Originally planned: recheck HEAD and tracked tree before major phases and completion. Superseded by the explicit no-Git instruction: verify captured source content hashes only; do not access refs or metadata.')
s+='\n## Execution disposition\n\nThe later evidence/Git instruction in 00_REQUEST.md authorized proceeding with this plan. Inventory, isolated snapshot, all live source/test/fixture/tool/root-doc/history reading, output/CLI/watch/error probes, 11 baseline gates, coverage, package smoke and targeted security review are complete. No fixes were authorized or made.\n\nPlan deviation kept explicit: full historical-report manual reading/closure remains Incomplete (1,124/4,807 lines marked read); all old claim lines were inventoried. No inherited status is used as proof. Git-history/ref checks are Blocked by the later prohibition. Other runtime/security/deployment limits are in MASTER.md. Original unchecked scope items above are the request checklist, not a false claim that unexecuted history/live work passed.\n'
p.write_text(s)
p=B/'03_INVENTORY_IVI.md';s=p.read_text().replace('# Inventory and intent mapping — in progress','# Inventory and intent mapping').replace('failures awaiting final attribution','failures confirmed in findings.md').replace('package/dependency review pending','package smoke passed; dependency matches and reachability limits in 07_RELEASE.md / 08_SECURITY.md');p.write_text(s)
# Human coverage index remains an inventory; achieved ranges live in JSON.
p=B/'02_COVERAGE.md';s=p.read_text();s+='\n\n## Final achieved coverage\n\n'+coverage_table+'\n\nRead ranges and per-file evidence are in coverage.json. The initial planned-method rows above are not completion claims. Every source path was finally hashed with no Git access. See MASTER.md for automated coverage, explicit unread ranges and limits.\n';p.write_text(s)
print('Wrote master, summary, seven area/method reports and reproduction instructions.')
