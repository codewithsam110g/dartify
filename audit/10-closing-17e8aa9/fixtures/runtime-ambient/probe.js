// How a bundler/UMD build would expose the module: a conventional global.
globalThis.ScopePkg = { make: () => "made via ScopePkg", Widget: class { constructor(n) { this.n = n; } } };
// The private-constructor class exists at runtime like any JS class.
globalThis.Singleton = class Singleton { static instance() { return new Singleton(); } };
