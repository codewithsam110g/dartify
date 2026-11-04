import { Transpiler } from '../work/src/transpiler.ts';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root=resolve('../probes/outputs'); mkdirSync(root,{recursive:true});
const cases:Record<string,Record<string,string>>={
generics:{'probe.d.ts':`export type Maybe<T> = T | null; export declare function accept(x: Maybe<string>): Maybe<number>; export interface Box<T,U=T> { first:T; second:U; } export declare const box:Box<string>; export interface Raw<T=string>{value:T} export declare const raw:Raw;`},
defaults:{'probe.d.ts':`export default function named(x:number):number; export declare const a:number;`},
assignment:{'probe.d.ts':`declare function named(x:number):number; export = named; export as namespace Root;`},
'local-alias':{'probe.d.ts':`declare function hidden(x:number):number; export { hidden as publicName };`},
'reexport-alias':{'a.d.ts':`export interface A { x:number }`,'probe.d.ts':`export {A as B} from './a';`},
'reexport-chain':{'a.d.ts':`export interface A { x:number }`,'b.d.ts':`export * from './a';`,'probe.d.ts':`export {A} from './b';`},
'namespace-export':{'a.d.ts':`export interface A {x:number}`,'probe.d.ts':`export * as ns from './a';`},
'escaped-member':{'probe.d.ts':String.raw`export interface Weird { "a\u0062": number; "a.b": number; "a-b": number; } export declare const weird:Weird;`},
destructuring:{'probe.d.ts':`export declare function one({switch:s}: {switch:number}, p_d:number):number; export declare function two({p,d}: {p:number,d:number},p_d:number):number;`},
'rest-collision':{'probe.d.ts':`export declare function f(args1: number, ...args: number[]):number;`},
date:{'probe.d.ts':`export declare function date():Date; export declare function takeDate(d:Date):string;`},
'nullable-function':{'probe.d.ts':`export declare const maybe:((x:number)=>string)|null; export declare const cb:()=>number|null;`},
'multiline-fallback':{'probe.d.ts':`export declare const conditional: (\n string extends number\n ? true\n : false\n);`},
'hash-uri':{'a#b.d.ts':`export interface A { x:number }`,'probe.d.ts':`import {A} from './a#b'; export declare const a:A;`},
'quote-uri':{"a'b.d.ts":`export interface A { x:number }`,'probe.d.ts':`import {A} from "./a'b"; export declare const a:A;`},
'generic-override':{'probe.d.ts':`export declare class Base { f(x:number,y:string):number; } export declare class Mid extends Base { f(x:number):number; } export declare class Child extends Mid { f():number; }`},
'recursive-heritage':{'probe.d.ts':`export interface A extends B {a:number} export interface B extends A {b:number}`},
'construct-interface':{'probe.d.ts':`export interface I {x:number} export interface Maker {new(x:number):I} export declare const maker:Maker;`},
'constructor-default':{'probe.d.ts':`export declare class Base { constructor(x:number); } export declare class Child extends Base { value:number; }`},
callable:{'probe.d.ts':`export interface Callable { (x:number):number; tag:string } export declare const fn:Callable;`},
asserts:{'probe.d.ts':`export declare function assert(x:unknown):asserts x is string;`},
'generic-literal':{'probe.d.ts':`export declare function f<T>(x:{value:T}):T; export type Box<T>={value:T};`}
};
cases['alias-companion-collision']={'probe.d.ts':`export interface KeyOfFoo {} export interface FooExtension {x:number} export declare const x:keyof FooExtension;`};
cases['generic-constructor']={'probe.d.ts':`export declare class Base<T> {constructor(value:T); value:T} export declare class Child extends Base<string> {}`};
cases['private-constructor']={'probe.d.ts':`export declare class Private { private constructor(); x:number; }`};
cases['generic-default-outer']={'probe.d.ts':`export interface Pair<T,U=T> {a:T;b:U} export declare function f<T>(x:Pair<string>):T;`};
cases['heritage-static-collision']={'probe.d.ts':`export declare class Base {foo():void} export declare class Child extends Base {static foo():void} export declare function Child_foo():void;`};
const results=[];
for(const [name,files] of Object.entries(cases)){
 const dir=join(root,name);mkdirSync(dir,{recursive:true});const paths=[];
 for(const [n,s] of Object.entries(files)){writeFileSync(join(dir,n),s);paths.push(join(dir,n));}
 try{const r=await new Transpiler({files:paths,outDir:join(dir,'dart'),...(['defaults','local-alias'].includes(name)?{jsRoot:'Root'}:{})}).transpile();
 const item={name,generation:r.analysis.generation,resolution:r.analysis.resolution.unresolved,semantic:r.analysis.link.semantic.diagnostics,exports:r.analysis.link.moduleExportDiagnostics,files:[...r.files.values()].map(f=>({file:f.outputPath,diagnostics:f.diagnostics,content:f.content}))};
 writeFileSync(join(dir,'report.json'),JSON.stringify(item,null,2));results.push(item);
 }catch(e){results.push({name,error:String(e)})}
}
writeFileSync(join(root,'results.json'),JSON.stringify(results,null,2));
for(const r of results)console.log(r.name,'error' in r?r.error:r.files.map(f=>[f.file.split('/').pop(),f.diagnostics]));
