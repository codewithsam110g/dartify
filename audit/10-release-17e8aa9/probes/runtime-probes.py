from pathlib import Path
import os,subprocess,json
base=Path(__file__).resolve().parents[1];root=base/'probes/outputs';dart='/Users/ssrk/flutter/bin/cache/dart-sdk/bin/dart';env=os.environ.copy();env.update(PUB_CACHE=str(base/'cache/pub'),TMPDIR=str(base/'tmp'),DART_SUPPRESS_ANALYTICS='true')
cases={
'defaults':('print(bind.named(4));','globalThis.Root={default:x=>x+1,a:1};console.log("JS oracle="+Root.default(4));'),
'assignment':('print(bind.named(4));','globalThis.Root=x=>x+1;console.log("JS oracle="+Root(4));'),
'local-alias':('print(bind.hidden(4));','globalThis.Root={publicName:x=>x+1};console.log("JS oracle="+Root.publicName(4));'),
'date':('print(bind.date().year);','globalThis.date=()=>new Date("2020-01-01T00:00:00Z");console.log("JS oracle="+date().getUTCFullYear());'),
'escaped-member':('print(bind.weird.JS$a_u0062); print(bind.weird.JS$a_b); print(bind.weird.JS$a_b_2);','globalThis.weird={ab:11,"a.b":22,"a-b":33};console.log("JS oracle="+[weird.ab,weird["a.b"],weird["a-b"]]);'),
'callable':('print(bind.fn(4));','globalThis.fn=Object.assign(x=>x+1,{tag:"ok"});console.log("JS oracle="+fn(4));'),
'asserts':('print(bind.JS$assert("ok"));','globalThis.assert=x=>{if(typeof x!=="string")throw Error("bad")};console.log("JS oracle="+assert("ok"));'),
'nullable-function':('print(bind.maybe!(4));print(bind.cb());','globalThis.maybe=x=>"n"+x;globalThis.cb=()=>null;console.log("JS oracle="+maybe(4)+","+cb());')}
cases['private-constructor']=('print(bind.Private().x);','globalThis.Private=function(){this.x=7}; console.log("JS oracle=7");')
results=[]
for name,(body,setup) in cases.items():
 p=root/name;(p/'main.dart').write_text("import 'dart/probe.dart' as bind;\nvoid main(){try {"+body+"}catch(e){print('CAUGHT: $e');}}\n")
 r=subprocess.run([dart,'compile','js','-O1','-o',str(p/'out.js'),str(p/'main.dart')],cwd=root,env=env,text=True,capture_output=True,timeout=90)
 (p/'compile.log').write_text(r.stdout+r.stderr)
 item=dict(name=name,compile_exit=r.returncode)
 if r.returncode==0:
  (p/'run.cjs').write_text('globalThis.self=globalThis;\n'+setup+'\nrequire("./out.js");\n')
  r=subprocess.run(['node',str(p/'run.cjs')],cwd=root,env=env,text=True,capture_output=True,timeout=20)
  (p/'runtime.log').write_text(r.stdout+r.stderr);item.update(exit=r.returncode,stdout=r.stdout,stderr=r.stderr)
 results.append(item);print(json.dumps(item),flush=True)
(root/'runtime-results.json').write_text(json.dumps(results,indent=2)+'\n')
