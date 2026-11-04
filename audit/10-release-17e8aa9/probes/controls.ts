import {Transpiler} from '../work/src/transpiler.ts';import {Project,ts} from '../work/node_modules/ts-morph/dist/ts-morph.js';import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';import{resolve,join}from'node:path';
const root=resolve('../probes/controls');mkdirSync(root,{recursive:true});const cases:Record<string,Record<string,string>>={
 'parameter-control':{'probe.d.ts':`export declare function f(first:number,...values:number[]):number; export declare function two({p,d}:{p:number,d:number},third:number):number;`},
 'override-control':{'probe.d.ts':`export declare class Base {f(x:number,y:string):number;} export declare class Mid extends Base {f(x:number):number;}`},
 'alias-control':{'probe.d.ts':`export interface FooExtension {x:number} export declare const x:keyof FooExtension;`},
 'static-control':{'probe.d.ts':`export declare class Base {foo():void} export declare class Child extends Base {static foo():void}`},
 'uri-control':{'ab.d.ts':`export interface A{x:number}`,'probe.d.ts':`import {A} from './ab';export declare const a:A;`},
 'export-control':{'a.d.ts':`export interface A{x:number}`,'probe.d.ts':`export {A} from './a';`},
 'predicate-control':{'probe.d.ts':`export declare function check(x:unknown):x is string;`},
 'escape-control':{'probe.d.ts':`export interface Weird { "ab":number; "a.b":number; "a-b":number } export declare const weird:Weird;`},
 'crlf-doc-control':{'probe.d.ts':`/**\r\n * Description\r\n * Text\r\n */\r\nexport declare const a:number;`},
 'cr-doc':{'probe.d.ts':`/**\r * Description\r * Text\r */\rexport declare const a:number;`},
 'generic-named-control':{'probe.d.ts':`export interface Box<T>{value:T} export declare const box:Box<string>;`}
};
for(const [name,files]of Object.entries(cases)){const dir=join(root,name);mkdirSync(dir,{recursive:true});const paths=[];for(const[n,s]of Object.entries(files)){const p=join(dir,n);writeFileSync(p,s);paths.push(p);}await new Transpiler({files:paths,outDir:join(dir,'dart')}).transpile();}
const malformed=readFileSync(resolve('../probes/cli/truncated.d.ts'),'utf8');const a=await Transpiler.transpileFromString(malformed);writeFileSync(join(root,'syntax-api.json'),JSON.stringify({errors:a.errors.map(e=>({code:e.code,message:e.message,line:e.line,column:e.column})),content:a.content},null,2));
const implementations:Record<string,string>={defaults:'export default function named(x:number){return x+1;} export const a=1;',assignment:'function named(x:number){return x+1;} export = named;','local-alias':'function hidden(x:number){return x+1;} export {hidden as publicName};'};
for(const[name,source]of Object.entries(implementations)){const dir=resolve('../probes/outputs',name);writeFileSync(join(dir,'implementation.ts'),source);writeFileSync(join(dir,'implementation.cjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText);}
const cycleCases={acyclic:'export interface A{z:Missing} export interface B{a:A}',cycle:'export interface A{b:B;z:Missing} export interface B{a:A}',cycleWithoutMiss:'export interface A{b:B} export interface B{a:A}'};const cycleResults=[];for(const[name,source]of Object.entries(cycleCases)){const r=await Transpiler.transpileFromString(source);cycleResults.push({name,states:[...r.program!.report.results],broken:r.program!.report.broken});}writeFileSync(join(root,'cycle-controls.json'),JSON.stringify(cycleResults,null,2));
console.log('Controls generated, syntax API checked, TypeScript export implementations compiled.');
