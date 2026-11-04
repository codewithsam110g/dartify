from pathlib import Path
import subprocess,json,os
base=Path(__file__).resolve().parents[1];root=base/'probes/cli';root.mkdir(exist_ok=True)
cli=base/'work/dist/cli.js'
inputs={'valid.d.ts':'export declare const answer: number;\n','truncated.d.ts':'export declare function broken(x: number: string;\nexport declare const fine: number;\n','type-mismatch.d.ts':'export interface Wrong extends Missing { x: number }\n','incomplete.d.ts':'export interface Broken { x: ; y: string; }\n','implementation.d.ts':'export function f(x: number) { return x; }\nthrow new Error("no");\n','empty.d.ts':'// empty\n'}
for name,text in inputs.items():(root/name).write_text(text)
(root/'folder.d.ts').mkdir(exist_ok=True)
cases={'valid':['-d','valid.d.ts'],'missing':['-d','missing.d.ts'],'mixed-missing':['-d','valid.d.ts','missing.d.ts'],'no-glob':['-d','no*.d.ts'],'bad-syntax':['-d','truncated.d.ts'],'missing-type':['-d','incomplete.d.ts'],'wrong-semantic':['-d','type-mismatch.d.ts'],'implementation':['-d','implementation.d.ts'],'directory':['-d','folder.d.ts'],'unknown-option':['-d','valid.d.ts','--ouput','lost'],'numeric-input':['-d','123'],'dry-missing':['-d','missing.d.ts','--dry-run'],'empty':['-d','empty.d.ts'],'missing-tsconfig':['-d','valid.d.ts','-p','missing.json'],'empty-output':['-d','valid.d.ts','-o',''],'invalid-root':['-d','valid.d.ts','--js-root','bad root!']}
results=[]
for name,args in cases.items():
 out=root/('out-'+name);command=['node',str(cli),*args,'-o',str(out)]
 try:
  r=subprocess.run(command,cwd=root,encoding='utf8',capture_output=True,timeout=25)
  item=dict(name=name,command=command,exit=r.returncode,stdout=r.stdout,stderr=r.stderr,outputs={str(p.relative_to(out)):p.read_text() for p in out.rglob('*.dart')})
 except subprocess.TimeoutExpired:item=dict(name=name,timeout=True)
 results.append(item)
(root/'results.json').write_text(json.dumps(results,indent=2)+'\n')
for r in results:print(r['name'],r.get('exit','TIMEOUT'),list(r.get('outputs',{})),r.get('stderr','').strip()[:150])
