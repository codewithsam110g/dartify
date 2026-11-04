globalThis.self=globalThis;
globalThis.fn=Object.assign(x=>x+1,{tag:"ok"});console.log("JS oracle="+fn(4));
require("./out.js");
