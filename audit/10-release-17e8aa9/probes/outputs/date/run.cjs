globalThis.self=globalThis;
globalThis.date=()=>new Date("2020-01-01T00:00:00Z");console.log("JS oracle="+date().getUTCFullYear());
require("./out.js");
