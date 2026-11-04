import {WatchSession} from '../work/src/watch.ts';
import {mkdirSync,rmSync,writeFileSync}from'node:fs';import{resolve,join}from'node:path';
const dir=resolve('../probes/watch-recovery-isolated');rmSync(dir,{recursive:true,force:true});mkdirSync(dir,{recursive:true});
const a=join(dir,'a.d.ts'),b=join(dir,'b.d.ts');const source='import {B} from "./b";export declare const b:B;';writeFileSync(a,source);
const s=new WatchSession({files:[a],outDir:join(dir,'out'),write:false});const results=[];
const initial=await s.build();results.push({step:'initial',files:[...initial.files].map(([p,f])=>[p,f.content])});
writeFileSync(b,'export interface B{x:number}');const created=await s.build([b]);results.push({step:'created',files:[...created.files].map(([p,f])=>[p,f.content])});
writeFileSync(a,source+'\n');try{const edited=await s.build([a]);results.push({step:'importer edited',files:[...edited.files].map(([p,f])=>[p,f.content])});}catch(e){results.push({step:'importer edited',error:String(e)});}
writeFileSync(join(dir,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
