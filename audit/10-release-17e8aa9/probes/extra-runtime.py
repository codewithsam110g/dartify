from pathlib import Path
import subprocess, os, json
b=Path(__file__).resolve().parents[1];root=b/'probes/controls';dart='/Users/ssrk/flutter/bin/cache/dart-sdk/bin/dart';env=os.environ.copy();env.update(PUB_CACHE=str(b/'cache/pub'),TMPDIR=str(b/'tmp'),DART_SUPPRESS_ANALYTICS='true')
cases={
 'escape-control':('print(bind.weird.JS$ab);','globalThis.weird={ab:11,"a.b":22,"a-b":33};'),
 'ordinary-export-control':('print(bind.named(4));','globalThis.Root={named:x=>x+1};'),
 'public-constructor-control':('print(bind.Private().x);','globalThis.Private=function(){this.x=7};')
}
results=[]
for name,(body,setup) in cases.items():
 p=root/name;(p/'main.dart').write_text("import 'dart/probe.dart' as bind; void main(){"+body+"}\n")
 r=subprocess.run([dart,'compile','js','-O1','-o',str(p/'out.js'),str(p/'main.dart')],cwd=root,env=env,text=True,capture_output=True,timeout=60);(p/'compile.log').write_text(r.stdout+r.stderr)
 item=dict(name=name,compile_exit=r.returncode)
 if r.returncode==0:
  (p/'run.cjs').write_text('globalThis.self=globalThis;'+setup+'require("./out.js");')
  r=subprocess.run(['node',str(p/'run.cjs')],text=True,capture_output=True,timeout=20);(p/'runtime.log').write_text(r.stdout+r.stderr);item.update(exit=r.returncode,stdout=r.stdout,stderr=r.stderr)
 results.append(item)
p=root/'default-explicit-control';(p/'consumer.dart').write_text('import "dart/probe.dart"; void main(){f<num>(Pair<String,String>(a:"a",b:"b"));}')
r=subprocess.run([dart,'analyze','--format=machine',str(p/'consumer.dart')],cwd=root,env=env,text=True,capture_output=True,timeout=30);(p/'consumer-analyze.log').write_text(r.stdout+r.stderr);results.append(dict(name='default-explicit-control',exit=r.returncode,output=r.stdout+r.stderr))
p=root/'constructor-explicit-control';(p/'consumer.dart').write_text('import "dart/probe.dart"; void main(){Child(42);}')
r=subprocess.run([dart,'analyze','--format=machine',str(p/'consumer.dart')],cwd=root,env=env,text=True,capture_output=True,timeout=30);(p/'consumer-analyze.log').write_text(r.stdout+r.stderr);results.append(dict(name='constructor-explicit-control',exit=r.returncode,output=r.stdout+r.stderr))
(root/'extra-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
