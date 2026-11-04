globalThis.self=globalThis;
globalThis.weird={ab:11,"a.b":22,"a-b":33};console.log("JS oracle="+[weird.ab,weird["a.b"],weird["a-b"]]);
require("./out.js");
