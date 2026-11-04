// Leaflet needs a browser environment; jsdom provides one. The library then
// installs its UMD global `L`, which the bindings address.
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
require("leaflet");
globalThis.L = dom.window.L ?? globalThis.L;
