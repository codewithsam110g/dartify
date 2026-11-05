# Master report — v1 release audits of `17e8aa9`, combined and independently verified

This report merges three bodies of work into one verified defect list for the
`1.0.0` candidate:

| Source | Folder | IDs | Author |
|---|---|---|---|
| Closing v1 audit | [`10-closing-17e8aa9/`](review/master.md) | `CA-01`–`CA-31` | Claude session |
| Independent release audit (`codex-audit` branch, merged unchanged) | [`10-release-17e8aa9/`](../02-release-17e8aa9/review/master.md) | `DAR-001`–`DAR-023` | Codex session |
| Fresh-session verification of both | [`11-closing-verification.md`](verification-pass1.md) and this file | adds `CA-32`, `CA-33` | this session |

Both audits target `17e8aa9`. The branch head when verified was `3d5276c`; between them, no file under
`src/`, `test/`, `tools/`, `.github/` or `package.json` changed, so every
finding was re-executed against the exact audited code.

## Verdict

**Not releasable as `1.0.0` under its current public claims; safe to adopt for h3.**

- Every documented gate passes, and the gated corpora (h3, Leaflet, all 420
  three.js libraries) are analyzer-clean and pass the dart2js e2e suite.
- **48 distinct defects** are confirmed outside those corpora: **3 high, 26
  medium, 19 low, 0 critical.** Two audits that never saw each other's work
  overlap on only 8 of them, so neither audit alone is a complete picture.
- **The three high findings** break correctness for valid input, and two of
  them do it with no analyzer error:
  1. `Date` is bound as Dart `DateTime` (`CA-01` = `DAR-012`): wrong values
     or `JsNoSuchMethodError` at runtime.
  2. Default, `export =` and aliased exports dispatch to non-existent
     JavaScript properties (`DAR-003`): valid packages compile and then fail
     at runtime.
  3. Malformed declaration files generate "successful" output (`DAR-001`,
     also `CA-10`): the parser's error recovery can silently *absorb the next
     declaration* into a broken signature, with exit 0 even under `-lv`.

Recommendation: fix the three high findings and the silent-output medium ones
(`DAR-002`, `CA-03`/`DAR-004`, `CA-25`, `CA-32`/`DAR-022`, `DAR-023`) before
the S6.10 publish. Alternatively, publish S6.9 `1.0.0-beta.0` under `next` with this
list as known issues.

## How it was verified

- Dart SDK 3.13.7 (the baseline SDK), `package:js` 0.6.7, Node 22.23.4,
  pnpm 10.9.0, Linux x64. The codex audit used macOS arm64 with Dart 3.13.5,
  so this is also a second-platform reproduction.
- **CA findings:** every `10-closing-17e8aa9/fixtures/` reproducer was re-run.
  Each backend fixture was generated in its own CLI run and analyzed. The
  runtime cases were compiled with dart2js and executed under Node.
  Test-coverage claims were checked by **reverting the fix and running the
  suite**. Detail: [`11-closing-verification.md`](verification-pass1.md).
- **DAR findings:** the codex probes depend on a gitignored `work/` snapshot
  and macOS paths, so **every DAR trigger was rebuilt from its "Minimal
  trigger" text** and checked the same way. Strict `tsc --noEmit` is 0 errors
  for every input except `DAR-019`'s deliberately missing type. Each case got
  its own CLI run and `dart analyze`. Type-loss claims were checked with
  real Dart consumers, runtime claims with dart2js and Node, and watch claims with
  a `WatchSession` harness compared byte-for-byte to cold builds.
- All 64 codex evidence references outside `work/` exist in the merged
  folder. The 23 into `work/` (the captured source snapshot) are covered by
  each finding's SHA-pinned GitHub permalink.

**Result:** 30 of 31 original CA findings confirmed, 1 partly refuted
(`CA-23`); 23 of 23 DAR findings confirmed. Two new findings added (`CA-32`,
`CA-33`). Nothing was refuted outright.

## Unified defect list

Severity is the higher of the two audits' ratings where they overlap.
Evidence tags: **A** = analyzer error reproduced; **R** = dart2js/Node runtime
reproduced; **C** = Dart consumer type check; **W** = watch vs cold
byte comparison; **X** = CLI exit/output; **S** = static/config read;
**M** = mutation test.

### High (3)

| # | IDs | Defect | Verified |
|---|---|---|---|
| H1 | `CA-01` = `DAR-012` | TS `Date` → Dart `DateTime`. `final d = now(); d.year` prints `NaN`, and `date().year` throws `JsNoSuchMethodError`; a Dart `DateTime` argument reaches JS as a non-Date. Analyzer clean | R |
| H2 | `DAR-003` | `jsPath` ignores module-export identity. With `--js-root Root`: `export default function named` → `@JS("Root.named")` (should be `Root.default`); `export = named` → `Root.named` (should be `Root`); `export {hidden as publicName}` → `Root.hidden`, and `publicName` doesn't exist in Dart. Runtime: `JsNoSuchMethodError`. Named-export control is correct | R, X |
| H3 | `DAR-001` ⊃ `CA-10` | The filesystem path never collects syntax diagnostics. `broken(x: number: string;` followed by `const fine` emits `broken(num x, dynamic string, dynamic JS$binding, dynamic JS$binding_2, num fine)`: `fine` is never bound. Exit 0, nothing printed even with `-lv`. `transpileFromString` does report the same errors | X |

### Medium (26)

| # | IDs | Defect | Verified |
|---|---|---|---|
| M1 | `CA-02` | Watch: a module file's `declare global` change doesn't re-link non-importers (`typedef Gfoo = dynamic` vs cold import; link valid 1 vs 2) | W |
| M2 | `DAR-016` | Watch: creating a previously missing imported file leaves the dynamic fallback and never emits it; the next importer edit throws ts-morph "node was removed or forgotten" | W |
| M3 | `DAR-017` | Watch: an empty barrel gaining its first declaration switches cold output to shared support (`Promise`) but watch keeps `a.dart`'s own `Promise` class | W |
| M4 | `CA-15` = `DAR-018` | Watch root by string prefix: with `types/` and `types2/`, edits to `types2` cause 0 rebuilds | X (real `-w` process) |
| M5 | `DAR-023` | Watch prints no semantic/emission diagnostics and ignores `-lv`; one-shot mode warns on the same input | X |
| M6 | `CA-03` ∪ `DAR-004` | Re-exports lost silently: import-then-export and `export * as ns` emit no library; a chained `export {A} from "./b"` (with `b` = `export *`) emits an empty library; `export {A as B}` emits `show A`. Consumers fail `UNDEFINED_CLASS`. Exit 0, no diagnostic | A, C, X |
| M7 | `CA-06` | Ambient `declare module "@scope/pkg"` binds `@JS("@scope/pkg.make")`: analyzer clean, but **dart2js crashes**; `--js-root` doesn't apply; no diagnostic | R |
| M8 | `CA-07` | Cross-file global interface merging unsupported: two partial `Settings` classes, use site `typedef Settings_cdbad5 = dynamic`, ambiguous edge | X |
| M9 | `CA-25` | Anonymous FQNs strip `$`: `A.x` and `A$.x` merge into one `{p, q}` shape (`merges=1`), no diagnostic | X |
| M10 | `CA-32` = `DAR-022` | A lone CR in JSDoc escapes `///` (`text.ts:84` splits only `\r?\n`). Doc text becomes Dart: `injected()` analyzes and compiles, or (codex shape) syntax errors. **The closing audit had marked this falsified** | A, R |
| M11 | `CA-11` ∪ `DAR-014` | Import/export URIs not escaped: `'` → `UNTERMINATED_STRING_LITERAL`, `$` → `URI_WITH_INTERPOLATION`, `#` → `URI_DOES_NOT_EXIST` | A |
| M12 | `CA-04` | Members named like `Object` members (`toString(base)`, `hashCode: string`, …) → 5 × `INVALID_OVERRIDE` | A |
| M13 | `DAR-005` | Parameter lowering after allocation: destructured `{switch: s}` emits `switch`; duplicate `p_d`; rest expansion collides with `args1` | A |
| M14 | `DAR-006` | Override padding through two inheritance levels: `Child.f` shorter than emitted `Mid.f` → `INVALID_OVERRIDE` (Base+Mid control clean) | A |
| M15 | `DAR-007` | Hoisted inherited-static name `Child_foo` not reserved → `DUPLICATE_DEFINITION` (control clean) | A |
| M16 | `DAR-008` | Minted alias renamed by allocation (`…_2`) but use sites keep the stale name → `UNDEFINED_CLASS` | A |
| M17 | `DAR-009` | Dependent generic default resolved in the caller's binder: `Pair<string>` in `f<T>` → `Pair<String, T>`; a valid consumer is rejected | A, C |
| M18 | `DAR-010` | Nullable generic alias drops its arguments: `accept(Maybe x)`; `accept(42)` analyzes clean | C |
| M19 | `DAR-011` | Hoisted object literals lose enclosing type parameters: `{value: T}` becomes a non-generic class over `typedef T = dynamic`; `Box(value: 42)` accepted | C |
| M20 | `DAR-021` | Inherited constructors not substituted: `Child extends Base<string>` gets `external Child(T value)` with `typedef T = dynamic`; `Child(42)` accepted | C |
| M21 | `DAR-013` | Quoted member escapes not decoded: `"ab"` binds JS property `ab`, not `ab`; runtime `_TypeError` | R |
| M22 | `DAR-015` | `asserts x is T` emitted as `bool`; JS returns `undefined`, so a non-nullable `bool` holds `null` | R |
| M23 | `CA-13` = `DAR-019` | Link-report cycle memoisation: `B` reported `LinkedResolved` though it reaches broken `A` | X |
| M24 | `CA-16` = `DAR-020` | Private-only constructor → Dart implicit public constructor; dart2js constructs a local object | R |
| M25 | `DAR-002` | Explicit inputs dropped silently: `valid.d.ts` + missing file → exit 0, no message; a directory named `x.d.ts` → exit 0, no output (missing-only control exits 1) | X |
| M26 | `CA-19` | Dev lockfile: 53 advisories, 3 critical (vitest 3.2.4 UI file read, tinypool 1.1.1 ×2) | S (`pnpm audit`) |

### Low (19)

| # | IDs | Defect | Verified |
|---|---|---|---|
| L1 | `CA-05` | Member sharing its class name → `MEMBER_WITH_CLASS_NAME` and constructor errors | A |
| L2 | `CA-08` | Default CLI hides link failures ("0 unresolved references"; `-l` shows 1 broken) | X |
| L3 | `CA-09` | `1_000n` aborts the whole run (exit 1, nothing written) | X |
| L4 | `CA-12` | Private-use code points act as emitter placeholder tokens (doc text rewritten to `Foo`) | X |
| L5 | `CA-14` | `.d.mts`/`.d.cts` inputs dropped (alone: exit 1; mixed: silent) | X |
| L6 | `CA-17` | CI installs Dart `stable` against a 3.13-exact baseline (configuration only; impact not reproduced) | S |
| L7 | `CA-18` | CI actions on mutable tags, no `permissions:` | S |
| L8 | `CA-20` | Prod glob deps: 9 advisories (6 high ReDoS) | S |
| L9 | `CA-21` | Documented numbers stale (1,661 files / 720 empty, S4 54/54, 262.7 KB, 90.43 %) | X |
| L10 | `CA-22` | `X-16` used for two findings; `Where` columns cite deleted `emitter/old/*` | S |
| L11 | `CA-23` *(partly refuted)* | Only E-44's `NATIVE_NAME_CONFLICT` and the misnamed optional-parameter test are uncovered; P-18 and E-20 reverts fail the suite | M |
| L12 | `CA-24` | No breaking-change / rollback notes for 0.5.0 users | S |
| L13 | `CA-26` | `this` in `Box<T>` emits raw `Box`; stale E-03 rationale; test locks it | X, S |
| L14 | `CA-27` | Watch latency: Leaflet leaf 204.7 ms, three.js core 909.3 ms vs "under 100 ms" | X (`pnpm bench`) |
| L15 | `CA-28` | e2e never runs `expected.cjs` (all three oracles match today) | X |
| L16 | `CA-29` | No committed generator/validator for `browserTypes.ts` | S |
| L17 | `CA-30` | js_facade_gen invocations fail; its five flags are silently ignored (byte-identical output) | X |
| L18 | `CA-31` | Type-only construct signatures dropped; class marked `@anonymous`, no diagnostic | X |
| L19 | `CA-33` | `audit/FINDINGS.md` corrupted by the CA registration (a `` $` `` replace pattern spliced a copy of the file into the `CA-11` row; `CA-30`/`CA-31` outside any table) | S |

## Where the audits disagree, and what was corrected

| Point | Closing audit (CA) | Codex audit (DAR) | Verified outcome |
|---|---|---|---|
| Lone-CR JSDoc | "Falsified, output safe" | `DAR-022`, medium | **DAR is right.** CR survives `split(/\r?\n/)`; injected Dart analyzes and compiles. Registered `CA-32`, cross-referenced to `DAR-022` |
| Syntax errors on the CLI path | `CA-10`, low | `DAR-001`, high | **High.** Recovery can delete a following declaration, not merely tolerate a typo |
| `Date` symptom | Silent `NaN`, nothing throws | `JsNoSuchMethodError` | **Both occur**, depending on the Dart call shape. Same root cause; the defect is not reliably silent *or* loud |
| URI escaping | `CA-11`: `'`, `$` (low) | `DAR-014`: `'`, `#` (medium) | Union; `#` adds a silent wrong-target case |
| Watch root / cycle report / private ctor | low | medium | Medium adopted (each silently misleads) |
| Regression coverage of P-18/E-20 | "no test" (`CA-23`) | not raised | **Refuted for P-18/E-20** by mutation; holds for E-44 |
| Registry state | `CA-22` | not adjudicated | Worse than `CA-22`: the file is corrupted (`CA-33`) |

The codex audit's rejected candidates (callable dispatch, multi-line
unsupported-type comments, five-slot rest policy, raw zero-argument generics)
were re-checked where cheap and agree with this session's results.

## Coverage of each audit

| | Found only by CA | Found only by DAR | Found by both |
|---|---:|---:|---:|
| Defects | 25 | 15 | 8 |

The CA audit was strongest on CLI/packaging, CI, docs and dart2js-crash
classes. The DAR audit was strongest on type fidelity (generics, overrides,
constructors), name allocation, export identity and watch state. Their root
cause clusters:

1. **Module/export identity:** H2, M6, M7, M8.
2. **Input boundary and reporting:** H3, M5, M25, L2, L3, L5.
3. **Name and text legality after allocation:** M10–M16, M21, L1, L4.
4. **Type and class fidelity:** H1, M17–M20, M22, M24, L13, L18.
5. **Incremental state:** M1–M4, M23.
6. **Tooling, CI and docs:** M26, L6–L12, L14–L17, L19.

## Gates (this session)

| Gate | Result |
|---|---|
| `tsc --noEmit` / `pnpm build` | 0 errors / 262.72 + 15.29 + 16.06 KB |
| `pnpm test` | 299 passed / 10 skipped (conformance 67/90 parity, 16 improved, 2 differ, 5 out of scope) |
| S2 / S3 / S4 / S5 fixture | 2/2 · 1/1 · 54/54 · 3/3 |
| `test:dart` / `test:e2e` / `test:incremental` | 2/2 · 3/3 · 5/5 |
| stress | 1,661 files, 720 known empties, 0 errors (462 s) |
| `test:coverage` | 90.43 % lines with a long timeout; with the default 30 s, `run-isolation.test.ts` times out (32.8 s) on 4 CPUs, which could redden CI on a slow runner |

## Not verified by any audit

- Hosted CI for this exact tree, Windows, browser-native execution and a real
  npm publish/install/rollback.
- `CA-17`'s behaviour under newer Dart SDKs (configuration only).
- Exploit reachability of the dependency advisories.
- Inputs beyond the corpora and these probes: 48 confirmed defects found by
  targeted probing means more almost certainly exist in the same six clusters.
