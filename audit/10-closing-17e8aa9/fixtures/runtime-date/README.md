# CA-01 reproducer

1. `pnpm dev -d audit/10-closing-17e8aa9/fixtures/runtime-date/datelib.d.ts -o <pkg>/lib/datecheck`
   (`<pkg>` is a Dart package depending on `js: ^0.6.7`).
2. Copy `main.dart` to `<pkg>/web/` and run `dart compile js -o out.js web/main.dart`.
3. Run with a Node script: `globalThis.self = globalThis; require('<this dir>/datelib.js'); require('./out.js');`
4. Compare with `observed.txt`.
