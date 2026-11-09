# Cross-file global fixtures

Hand-written inputs for global declaration merging (HD-06) and browser/lib
type augmentation (HD-22, HD-23). `test/decl/global-merge.test.ts` renders them,
`pnpm test:dart` analyzes the generated libraries and compiles `main.dart`
with dart2js against `probe.js`.

- `merge/` is the audit's `globalmerge` reproducer (`part1.d.ts`, `part2.d.ts`)
  plus a third script file: one global interface `Settings` declared in three
  files becomes one Dart class, owned by the first file.
- `augment/` augments lib.dom's `Window` from a script file and from a
  `declare global` block in a module: one extension on `dart:html`'s `Window`,
  owned by the first file. The file names make `a_window.d.ts` the owner.
- `core/` augments lib types the core lowering maps to Dart SDK types (HD-23):
  `Array`, `ReadonlyArray`, `String`, `Number`, `Boolean`, `Object`, `Function`, with collection- and
  generic-typed members. `b_use.d.ts` uses `Array<string>` and `String` in
  function signatures: they stay `List<String>` and `String`. The probe checks
  that every member returns what JavaScript defines on the prototypes, that
  list members arrive as typed lists, and that a list handed back to
  JavaScript is a real array.
- `companion/` declares `interface Window` and its `declare var Window` value in
  one file: the extension, no class, one diagnostic per companion member.
- `redeclared/` repeats `declare var shared` and one function signature in two
  files (one binding), next to a function and a variable that differ (D-12
  behaviour: overloads, a visible conflict).
- `split/` declares an interface and its constructor-shaped value in different
  files, in both orders: `Counter` (interface first) is one class with the
  constructor and statics of the second file; `Window` (value first) is the one
  extension, owned by the file that sorts first.
