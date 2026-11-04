import {Transpiler} from '../work/src/transpiler.ts';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const cases={
 'default-explicit-control':`export interface Pair<T,U=T>{a:T;b:U} export declare function f<T>(x:Pair<string,string>):T;`,
 'constructor-explicit-control':`export declare class Base<T>{constructor(value:T);value:T} export declare class Child extends Base<string>{constructor(value:string);}`,
 'public-constructor-control':`export declare class Private {constructor();x:number}`,
 'ordinary-export-control':`export declare function named(x:number):number;`
};
for(const[name,source]of Object.entries(cases)){
 const dir=resolve('../probes/controls',name);mkdirSync(dir,{recursive:true});const file=join(dir,'probe.d.ts');writeFileSync(file,source);
 await new Transpiler({files:[file],outDir:join(dir,'dart'),...(name==='ordinary-export-control'?{jsRoot:'Root'}:{})}).transpile();
}
