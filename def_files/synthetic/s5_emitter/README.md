# Stage 5 Emitter Fixture

This multi-file fixture is the acceptance baseline for the Stage 5 emitter
rewrite. Its scope is specifically the TypeScript declaration-file language:
`.d.ts` declarations and type syntax, not executable `.ts` programs. It
deliberately combines constructs that are easy to handle in isolation but
interact in real declaration packages. Function bodies, runtime statements,
implementation inference, and general expression lowering are out of scope.

`foundation.d.ts` covers declaration reopening, class/interface merging,
interface-plus-variable constructor companions, same-name type/value facets,
function and method overloads, generic constraints/defaults, heritage,
call/construct/index signatures, accessors, static and readonly members,
reserved/computed names, enums, unions, tuples, intersections, literals, and
named degradation of TypeScript-only types.

`augmentation.d.ts` covers global augmentation and external-module
augmentation. Stage 4 intentionally emits globals while suppressing external
augmentation with a visible diagnostic; the Stage 5 audit can use this fixture
to decide and verify the final module policy.

`consumer.d.ts` covers cross-file imports, aliased imports, namespace
collisions, and references to merged declarations. `ambient.d.ts` has no
top-level import/export and therefore covers a primary ambient external module
without accidentally turning it into an augmentation.

Keep examples minimal and deterministic. Add a construct only when it represents
a distinct parser, semantic, linker, or emitter behavior. The corresponding
test first asks TypeScript to validate every input as a declaration file, then
snapshots every rendered Dart file and the normalized verbose linker report,
making intended Stage 5 changes reviewable as a single golden diff.

## Pre-S5 Baseline

Run `pnpm test:s5:fixture` to verify the golden. Run `pnpm fixture:s5` to see
the real verbose CLI report and write inspectable Dart files to
`output/s5_emitter/`. The locked baseline is 49 input declarations, 40 output
symbols, 41 facets, and 36/36 resolved edges. Two external augmentations are
suppressed with explicit diagnostics.

Dart analysis currently reports 34 errors: 12 missing cross-file imports
(`E-08`), eight generic/`Record` lowering errors (`E-03`), two typed-array
substitution errors (S5.3), and 12 malformed quoted-member annotation errors
(`E-13`). These are expected S5 targets, not accepted final output. Building
this fixture also exposed analyzer-invisible `E-23`: `Consumer.options` links
to `foundation::Toolkit|Options` but currently emits as bare `Options`, which
Dart silently resolves to the consumer's local `Alpha.Options`. S5.2 must emit
a prefixed `foundation.Options` reference and lock that exact assertion.

The fixture additionally exposed a `this`-type redirect gap; `P-07` now carries
a linkable owner identity and the golden proves both fluent returns resolve
from `WidgetType` to the merged `Widget` declaration.
