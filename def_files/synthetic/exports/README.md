# Export identity fixtures

Hand-written inputs for the module and export identity work (HD-17 to HD-20):
`test/decl/export-dispatch.test.ts` renders them, `pnpm test:dart` analyzes the
generated libraries together with `consumers/` (Dart files that import a
barrel and use every public name it promises) and compiles `main.dart` with
dart2js against `probe.js`, which is shaped like what TypeScript and bundlers
produce for these declarations.

- `rooted/` is generated with `--js-root Root`; `entry.d.ts` is the package
  entry, `callable.d.ts` declares its own root with `export as namespace`.
- `barrels/` is generated without a root: re-export forms and what Dart can
  say about them.
- `ambient/` declares an ambient `@scope/pkg` module, generated once without
  a root (bare globals) and once with `--js-root PKG`.
