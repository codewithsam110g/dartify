# Dart Bindgen

**A TypeScript declaration (`.d.ts`) to Dart JS-interop binding generator — a
drop-in replacement for the archived `js_facade_gen`, written by an h3
maintainer to replace the tool h3's own Dart web bindings depend on.**

[![npm version](https://img.shields.io/npm/v/dart_bindgen.svg)](https://www.npmjs.com/package/dart_bindgen)
[![license](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![made with ts-morph](https://img.shields.io/badge/made%20with-ts--morph-563d7c.svg)](https://ts-morph.com/)

---

## Why it targets `package:js` (on purpose)

`js_facade_gen` is archived and tells you not to use it, yet it still
generates load-bearing bindings for packages such as h3's Dart web support.
Those codebases depend on `package:js` and `dart:html` well beyond the
generated files, so **swapping the generator and re-running it** is near-zero
friction, while migrating to `dart:js_interop` is a project.

v1 therefore emits `package:js` bindings deliberately, not out of staleness.
A `dart:js_interop` backend is planned for v2 behind a CLI flag; the compiler's
IR is target-agnostic and v2 is a second backend, not a second compiler.

## What v1 delivers

Measured on this repository's corpora (Dart SDK 3.13, `package:js` 0.6.7):

| Gate | Result |
|---|---|
| h3 (`h3.d.ts`) | `dart analyze`: 0 errors, 0 warnings |
| h3 golden — the js_facade_gen output that ships in h3 | **63/63 declarations reproduced** |
| Leaflet (`leaflet.d.ts` + `geojson.d.ts`) | 0 errors, 0 warnings (was 239 issues) |
| three.js (`Three.Core.d.ts`, 420 libraries) | 0 errors, 0 warnings (was 8,342 errors) |
| js_facade_gen reference cases (90) | **67 parity, 16 deliberately improved, 2 differ, 5 out of scope** — all analyzer-clean |
| dart2js runtime probe | overloads, rest arguments, named constructors, extension renames, index operators, anonymous factories, promises |
| 1,654-file stress corpus | no throws, no returned errors, no emission-error markers |

The only analyzer output on these sets is the expected `dart:html`
deprecation info.

### Strictly better than the tool it replaces

- **Named degradations instead of inline `dynamic /*…*/`.** Anything Dart
  cannot spell becomes a documented typedef, stated once:

  ```dart
  /// A JavaScript union of `String | List<num>`; Dart has no union types.
  typedef H3IndexInput = dynamic;
  ```

  Use sites say `H3IndexInput`; one edit upgrades all of them.
- **Real generics, heritage and imports.** Type parameters and bounds, `extends`
  / `implements` with restated members, covariant overrides, and
  collision-safe cross-file imports (`import 'a.dart' show X;`, prefixed only
  when a name would be captured).
- **Correct runtime dispatch.** Overloads keep exact signatures (`f_1`, `f_2`
  bound to JavaScript `f`), overloaded constructors become named factories,
  rest parameters reach JavaScript as separate arguments, enums cannot be
  instantiated, const enums become compile-time constants.
- **Platform types by identity.** `HTMLElement` → `dart:html` `HtmlElement`,
  `Uint8Array` → `dart:typed_data` `Uint8List` and ~500 more (the reference
  tool's registry, re-validated against the current SDK) — matched on the
  TypeScript checker's declaration identity, never on spelling, so your own
  `HtmlElement` is never confused with the platform's.
- **Barrels become libraries.** `export * from "./x"` becomes
  `export 'x.dart';`, with names two sources both supply hidden as TypeScript
  does.
- `Promise<T>` is a typed interop class: `await load().toFuture()`.

## Getting started

**Prerequisites:** Node.js `^20.19.0 || ^22.12.0 || >=23`.

```bash
npm install -g dart_bindgen
```

```bash
Usage: dart_bindgen [options]

Options:
  -d, --def-files <patterns...>   TypeScript definition files or glob patterns (required)
  -o, --output <directory>        Output directory for generated .dart files
  -p, --tsconfig <path>           Use a tsconfig for authoritative module resolution
  -l, --enable-logs               Enable phase and module-resolution logging
  -v, --verbose                   Print structured linker and emission details; implies -l
      --dry-run                   Show what would be processed without writing files
  -h, --help                      Show help
      --version                   Show version number
```

```bash
# Generate bindings for every .d.ts under types/ into ./generated
dart_bindgen -d "types/**/*.d.ts" -o ./generated

# Show resolution, linking and emission diagnostics in full
dart_bindgen -d "path/to/my-lib.d.ts" -lv
```

The generated libraries need `package:js` in your `pubspec.yaml`:

```yaml
dependencies:
  js: ^0.6.7
```

The input contract is declaration files: ambient and exported declarations,
declaration merging, module/global augmentation and type syntax.
Implementation code is out of scope.

## Developing

```bash
pnpm install
pnpm test                 # unit, smoke, conformance and h3-golden tests
pnpm test:dart            # dart analyze baseline + dart2js runtime probe (needs a Dart SDK)
pnpm test:stress          # the full 1,654-file corpus (opt-in, minutes)
pnpm exec tsc --noEmit
pnpm build
```

Two internal instruments consume the compiler's output without being part of
it (they are not in the published bundle):

```bash
pnpm graph -d "def_files/leaflet/*.d.ts" -o graph.svg   # dependency graph; red nodes are broken links
pnpm ir -d "def_files/h3/h3.d.ts" -o h3.ir.json          # the linked IR as JSON
```

See [`ROADMAP.md`](ROADMAP.md) for direction, [`PLAN.md`](PLAN.md) for the
staged plan, and [`audit/FINDINGS.md`](audit/FINDINGS.md) for every known
defect with a stable ID. Bug reports and pull requests are welcome:

*   [Create a Bug Report or Issue](https://github.com/codewithsam110g/dartify/issues/new)
*   [Start a Discussion](https://github.com/codewithsam110g/dartify/discussions)

---

## Author

Made with ❤️, a lot of coffee, and a deep belief in good tooling by [@codewithsam110g](https://github.com/codewithsam110g).
