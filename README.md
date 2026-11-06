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
| 1,655-file stress corpus | no throws, no returned errors, no emission-error markers |

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
- **Barrels become libraries** that expose the TypeScript public names:
  `export * from "./x"` becomes `export 'x.dart';` (names two sources both
  supply are hidden, as TypeScript does), names are followed through chains of
  barrels, and a renamed export gets its public name (see
  [Modules, barrels and runtime paths](#modules-barrels-and-runtime-paths)).
- `Promise<T>` is a typed interop class: `await load().toFuture()`.

## Getting started

**Prerequisites:** Node.js `^22.12.0 || >=24`.

```bash
npm install -g dart_bindgen
```

```bash
Usage: dart_bindgen [options] [inputs...]

Inputs (declaration files or glob patterns; positional inputs are the same as -d):
  -d, --def-files <patterns...>   .d.ts, .d.mts and .d.cts files or glob patterns

Options:
  -o, --output <directory>        Output directory for generated .dart files
                                  (alias --destination; default ./dart_out)
      --base-path <directory>     Directory output paths are relative to; every input must lie under it
  -p, --tsconfig <path>           Use a tsconfig for authoritative module resolution
  -l, --enable-logs               Enable phase and module-resolution logging
  -v, --verbose                   Print structured linker and emission details; implies -l
      --dry-run                   Show what would be processed without writing files
  -w, --watch                     Rebuild incrementally whenever an input changes
      --js-root <name>            Global that module libraries are reached through (e.g. THREE)
  -h, --help                      Show help
      --version                   Show version number
```

```bash
# Generate bindings for every .d.ts under types/ into ./generated
dart_bindgen -d "types/**/*.d.ts" -o ./generated

# Show resolution, linking and emission diagnostics in full
dart_bindgen -d "path/to/my-lib.d.ts" -lv

# Print one library to stdout (js_facade_gen's basic usage)
dart_bindgen path/to/my-lib.d.ts

# Keep bindings current while you edit; rebuilds take tens of milliseconds
dart_bindgen -d "types/**/*.d.ts" -o ./generated --watch

# A module library loaded as a <script> global (three.js exposes THREE)
dart_bindgen -d "node_modules/@types/three/index.d.ts" -o ./generated --js-root THREE
```

Libraries that declare `export as namespace X` (Leaflet's `L`) get that root
automatically.

### Modules, barrels and runtime paths

**Dispatch follows the exports.** With a root (`--js-root R`, or the library's
own `export as namespace R`) every value binds to the path its package really
exports it under, read off the declaration files you pass, not off where the
declaration happens to be written:

- `export { Widget as Gadget } from "./widgets"` binds `R.Gadget`;
- a default export of an input file binds `R.default`
  (`export { default as Tool } from "./tool"` binds `R.Tool`);
- `export = fn` makes `fn` the root itself, so `declare namespace fn { … }`
  members bind `R.member` (the lodash shape), not `R.fn.member`;
- `export * as ns from "./m"` adds `ns.` to the path (`R.ns.foo`);
- a declaration reachable by several routes takes the most direct one, then the
  first input in path order; they all denote one JavaScript object.

Only the files you name are entry points; their dependencies are followed.
A value no input exports (an internal class a signature mentions) keeps
`R.<its name>` and is reported as `EXPORT_ROUTE_MISSING`; two different values
at one path are reported as `EXPORT_PATH_CONFLICT`. Without a root nothing
changes: module declarations bind bare globals.

**Barrels expose the TypeScript public names.** Dart cannot rename on `export`,
so a name a module exports under a different name is declared in its library:

| TypeScript | Dart |
|---|---|
| `export { A } from "./b"` (b re-exports `./a`), `import { A } from "./a"; export { A }` | `export 'a.dart' show A;` |
| `declare function hidden(): void; export { hidden as publicName }` | emitted as `publicName` |
| `export { A as B } from "./a"` (class, interface, enum, type alias) | `typedef B<T> = A<T>;` (constructors and static members work through it) |
| `export { f as g } from "./a"` (function, variable) | a second `external` binding of `g` |
| `export { default as X } from "./a"` | `X` (a bare `default` keeps the declaration's name) |

**`export * as ns from "./m"`** has no Dart spelling that carries types, so the
barrel does not re-export `ns`. It carries a comment with the line that gives
the same names, and `m.dart` is always generated:

```dart
// export * as ns from './m': import 'm.dart' as ns;
```

Write that import where you use it: `ns.foo()` and `ns.Widget` both work. The
run counts it as a `NAMESPACE_REEXPORT_NOT_FORWARDED` diagnostic.

**Ambient modules** (`declare module "@scope/pkg" { … }` in a script file) bind
under `--js-root` like any module. Without a root, a specifier that is a valid
JavaScript property path (`h3`) is kept as the path prefix (`@JS("h3.fn")`);
any other specifier (`@scope/pkg`, `my-lib`) cannot appear in an `@JS` string
(dart2js crashes on it), so its values bind bare globals and the run reports
`AMBIENT_MODULE_UNROOTED`; pass `--js-root` to bind them under one global.

### What counts as input, and when a run fails

The input is declaration files: `.d.ts`, `.d.mts` and `.d.cts` (each written
as `<name>.dart`). dartify never reports success for input it did not
understand.

- **Every explicit path must be a readable declaration file.** A missing or
  unreadable path, a directory, or a file that is not a declaration file
  (`foo.ts`) is reported by name and the run exits 1 before generating
  anything, even when the other inputs are fine.
- **A glob that matches nothing warns**, naming the pattern; the run continues
  if other inputs remain, and exits 1 if none do.
- **Dual-package typings:** when a glob matches `x.d.ts` and also `x.d.mts` or
  `x.d.cts`, they describe one API, so the `.d.ts` is used and a notice names
  the skipped file. Two inputs that would still be written to the same `.dart`
  file (for example `x.d.mts` and `x.d.cts` with no `x.d.ts`, or an explicitly
  named sibling) are an error naming both.
- **Syntax errors fail the run.** A TypeScript syntax error in any file
  dartify reads (inputs, and the files they import) is printed as
  `path:line:column TSnnnn message`, one line per error; the run exits 1 and
  writes nothing, because the parser's error recovery would otherwise produce
  plausible but wrong bindings. Type-check errors do not fail the run: a name
  that is declared nowhere degrades to a documented typedef, and the run
  prints `Link report: N broken symbol(s), M ambiguous reference(s)` (exit 0;
  `-lv` itemizes them).
- **Watch mode reports the same things** on the first build and on every
  rebuild: syntax errors (nothing is written while one stands), warnings, the
  link summary and, with `-lv`, the detailed records.

### Coming from js_facade_gen

The common invocation shapes work unchanged:

| js_facade_gen | dartify |
|---|---|
| `dart_js_facade_gen lib.d.ts` (Dart to stdout) | `dart_bindgen lib.d.ts`: positional inputs without `-o`/`--destination` print the single resulting library to stdout, everything else goes to stderr. A multi-library result is an error asking for `--destination`. |
| `--destination=<dir>` | `--destination=<dir>` (the same as `-o`) |
| `--base-path=<dir>` | `--base-path=<dir>`: output paths are relative to it; an input outside it is an error |
| positional input files | positional inputs (the same as `-d`) |
| `--skip-formatting` | accepted and ignored: dartify never runs a formatter |
| `--generate-html`, `--rename-conflicting-types`, `--explicit-static`, `--trust-js-types` | exit 1 with a one-line message stating what dartify does instead: these flags changed js_facade_gen's output, so they are never silently ignored |

Unknown flags are rejected.

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
pnpm test:e2e             # generated bindings run against real h3-js, three and leaflet (needs Dart)
pnpm test:incremental     # watch mode must equal a cold build after every scripted edit
pnpm bench                # watch rebuild latency per corpus, each build verified
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

See [`ROADMAP.md`](ROADMAP.md) for direction, [`docs/`](docs/README.md) for the
design, decisions and milestone status, and
[`docs/hardening/findings.md`](docs/hardening/findings.md) for every known
defect with a stable ID. Bug reports and pull requests are welcome:

*   [Create a Bug Report or Issue](https://github.com/codewithsam110g/dartify/issues/new)
*   [Start a Discussion](https://github.com/codewithsam110g/dartify/discussions)

---

## Author

Made with ❤️, a lot of coffee, and a deep belief in good tooling by [@codewithsam110g](https://github.com/codewithsam110g).
