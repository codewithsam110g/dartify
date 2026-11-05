# Analyze one generated file with `dart analyze`

*Decisions: D-14.*

**When:** checking a single generated `.dart` file (a reproducer, a new fixture) without running the full
`pnpm test:dart` gate. This is a quick check, not a substitute for the gate: analyzer-clean output is not evidence of
correct JS dispatch (D-14).

**Who:** planner, implementer, helper.

**Prerequisites:** a Dart SDK on `PATH` (the baseline is 3.13); the file generated with
`pnpm dev -d "<file>.d.ts" -o <outdir>`.

## Steps

```bash
mkdir -p "$TMPDIR/dc/lib" && cd "$TMPDIR/dc"
printf 'name: dc\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  js: ^0.6.7\n' > pubspec.yaml
dart pub get
cp <outdir>/<generated>.dart lib/
dart analyze
```

Use the session scratchpad (or `$TMPDIR`), never a directory in the repo.

## Verify

The only accepted output is `dart:html` / `dart:svg` deprecation `info` lines. Any error or warning is a defect. If
`dart analyze` prints a stack trace, check the two `E-37` shapes first (D-23).

## Undo

Delete the scratch directory.
