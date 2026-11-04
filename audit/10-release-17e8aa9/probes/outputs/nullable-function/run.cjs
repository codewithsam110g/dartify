globalThis.self=globalThis;
globalThis.maybe=x=>"n"+x;globalThis.cb=()=>null;console.log("JS oracle="+maybe(4)+","+cb());
require("./out.js");
