# Cross-file global fixtures

Hand-written inputs for global declaration merging (HD-06) and browser/lib
type augmentation (HD-22). `test/decl/global-merge.test.ts` renders them,
`pnpm test:dart` analyzes the generated libraries and compiles `main.dart`
with dart2js against `probe.js`.

- `merge/` is the audit's `globalmerge` reproducer (`part1.d.ts`, `part2.d.ts`)
  plus a third script file: one global interface `Settings` declared in three
  files becomes one Dart class, owned by the first file.
- `augment/` augments lib.dom's `Window` from a script file and from a
  `declare global` block in a module: one extension on `dart:html`'s `Window`,
  owned by the first file. The file names make `a_window.d.ts` the owner.
