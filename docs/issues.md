# Issues log

This lists problems found in hands-on testing or released builds (audit findings live in [hardening/findings.md](hardening/findings.md), not here), and which version or brief fixed each one. It's
documentation: work on a fix still goes through a brief in `milestones/`.

**Rules**

- IDs are `I-NN`, assigned in order and never reused.
- An entry gets **Found in** (a version or brief), **Platform** (or "all"), a short symptom, and **Status**: `Open`,
  `Fixed`, `Won't fix` (with the reason) or `Duplicate of I-NN`.
- When a cause is found, it's appended to the symptom as **Cause (brief-id):** …, so the entry tells the whole story.
- No private data or identifying details in an entry: describe the kind of data involved.

## Log

| ID | Found in | Platform | Symptom | Status | Fixed in |
|----|----------|----------|---------|--------|----------|
| I-01 | HG-3 Phase A | all | A user declaration that augments a browser type (`interface Window { myProp: string }`, in a script file or `declare global`) generates a standalone anonymous Dart class `Window` holding only the user's members: it silently shadows `dart:html`'s `Window` in that library, with no diagnostic. **Cause (HG-3):** the augmentation is treated as a new global declaration; nothing relates it to the SDK type `browserTypes.ts` maps the lib declaration to. Fix decided as HD-22 (typed extension on the SDK type). | Open | HG-3 Phase B (planned) |

## Risks and suggestions

Not defects: things that can bite under conditions the corpora don't exercise (**Risk**), or improvements nobody has
committed to (**Suggestion**). IDs are `RS-NN`, never reused. Each says where it was found and what would settle it. A
risk that turns into a real failure becomes an issue above (or a register finding) that cites its `RS` ID; a suggestion
that is taken up goes into a brief.

| ID | Kind | Found in | Description | Status |
|----|------|----------|-------------|--------|
| RS-01 | Risk | HG-2 | **Dual-package typings without a plain `.d.ts`.** A glob matching `x.d.mts` and `x.d.cts` with no `x.d.ts` (some bundlers emit only the two) stops the run with an output-collision error, since both map to `x.dart` (HD-04, HD-15). Fails loudly and writes nothing; workaround: narrow the glob or name one file. Possible fix: prefer `.d.mts` (the ESM typings a browser bundle loads) with the same notice the `.d.ts` rule prints; needs a decision refining HD-04. | Open |
| RS-02 | Risk | HG-2 | **Dependency typings in newer syntax.** Syntax errors in dependency files fail the run (HD-16), so a package whose typings use syntax newer than ts-morph's bundled TypeScript stops it. The e2e libraries (h3-js, leaflet, three) parse cleanly. Mitigation: keep ts-morph current; revisit if a real package hits it. | Accepted (HD-16) |
| RS-03 | Risk | HG-2 (behaviour predates it) | **Globs never reach `node_modules/`.** Glob patterns carry an `ignore: node_modules/**`, so `-d "node_modules/@types/x/*.d.ts"` matches nothing; since HG-2 that is a named warning (and exit 1 when nothing else is left) instead of a silent drop. Explicit paths into `node_modules` work. Possible fix: drop the ignore for a pattern that itself names `node_modules`. | Open |
| RS-04 | Risk | HG-2 | **Deep broken chains and memory.** Each indirect link result stores its full `viaChain`, so a very long, entirely broken dependency chain grows memory quadratically (predates HG-2; the cycle rewrite kept it). Real corpora are shallow. Possible fix: store the next hop only and expand the chain when reporting. | Open |
| RS-05 | Suggestion | HG-2 | three.js runs now always print `Link report: 1178 broken symbol(s)…` (the absent `webxr` and `@webgpu/types` packages; the count became correct with the cycle fix). The README's three.js usage could say why and how to clear it (install those type packages). | Open |
| RS-06 | Suggestion | HG-2 | `tools/graph.ts` and `tools/ir.ts` still accept only `.d.ts` explicit inputs and fail with "No .d.ts files"; they could reuse `collectInputs()` (`src/cliInputs.ts`). | Open |
| RS-07 | Suggestion | HG-2 | Watch mode prints the same report as a one-shot run but not the `-l` pipeline and module-resolution logs (`debug` is not passed to `WatchSession`). Candidate for HG-7 (watch state). | Open |
| RS-08 | Suggestion | HG-2 | `--help` lists the "js_facade_gen compatibility" group before the main options; list it last. | Open |
| RS-09 | Risk | HG-3 Phase A | **`export *` forwards the whole target library** (`export 'a.dart';`), so declarations the target's own export list omits stay visible to Dart consumers of the barrel. Possible fix: a `hide` list of the target's non-exported names. | Open |
| RS-10 | Risk | HG-3 Phase A | **Ambient modules in dependency files under a root.** With `--js-root R`, an ambient `declare module "fs"` pulled in from a dependency (e.g. `@types/node`) now binds `R.<name>` with route diagnostics (HD-17, HD-20), where it bound `fs.<name>` before; both are guesses for a browser. Possible fix: apply the root only to ambient modules declared in input files. | Open |
| RS-11 | Risk | HG-3 Phase A | **`import x = require("…")` and `export import x = …` are not followed by the export graph**; an export list that depends on one reports `MODULE_EXPORT_UNRESOLVED` (visible, not silent). | Open |
| RS-12 | Suggestion | HG-3 Phase A | Barrel output formatting (predates HG-3, kept byte-exact): the `export` block runs straight into the body with no blank line, and export-only barrels end without a trailing newline. Fix in a change that re-baselines snapshots deliberately. | Open |
| RS-13 | Suggestion | HG-3 Phase A | Documented corpus size drifted: docs say 1,654 `.d.ts` files, 1,661 are tracked (1,676 with the HG-3 fixtures). Re-measure at HG-8 (`CA-21`). | Open |
| RS-14 | Risk | HG-3 Phase B | **Augmented lib types with no Dart mapping** (`interface Math { … }`, `HTMLElementTagNameMap`) become one merged class holding only the project's members, so references to them see only those members, not the lib's. Nothing in the SDK is shadowed (there is no SDK type), and Phase A behaved the same. Possible fix: bind the class to the global (`@JS("Math")`) and say in a diagnostic that only the project's members are bound. | Open |
