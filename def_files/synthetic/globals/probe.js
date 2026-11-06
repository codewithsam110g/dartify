// JavaScript for the cross-file global fixtures (`merge/`, `augment/`), loaded
// by `pnpm test:dart` before the dart2js output runs.
globalThis.self = globalThis;
// dart:html reaches the page's global through `window`.
globalThis.window = globalThis;

// merge/: Settings is declared in three script files, so Dart has one class.
const sorted = (value) => JSON.stringify(value, Object.keys(value).sort());
globalThis.configure = (settings) => {
  console.log(`configure ${sorted(settings)}`);
};
globalThis.describeSettings = (settings) =>
  `${settings.theme}/${settings.size}/${settings.locale}/${settings.extra}`;

// augment/: members the extension on dart:html's Window reads, writes and calls.
globalThis.myProp = "hello";
globalThis.version = 7;
globalThis.other = true;
globalThis.ping = function (n, label) {
  return `${arguments.length}:${n}:${label}`;
};
globalThis.add = (a, b) => a + b;
