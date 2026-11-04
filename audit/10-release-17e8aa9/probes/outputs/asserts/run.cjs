globalThis.self=globalThis;
globalThis.assert=x=>{if(typeof x!=="string")throw Error("bad")};console.log("JS oracle="+assert("ok"));
require("./out.js");
