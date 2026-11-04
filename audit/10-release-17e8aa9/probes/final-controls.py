from pathlib import Path
import subprocess,os,json
base=Path(__file__).resolve().parents[1];root=base/'probes';dart='/Users/ssrk/flutter/bin/cache/dart-sdk/bin/dart';env=os.environ.copy();env.update(PUB_CACHE=str(base/'cache/pub'),TMPDIR=str(base/'tmp'),DART_SUPPRESS_ANALYTICS='true');results=[]
ctrl=root/'controls';(ctrl/'pubspec.yaml').write_text('name: control_probes\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  js: 0.6.7\n');r=subprocess.run([dart,'pub','get'],cwd=ctrl,env=env,capture_output=True,text=True);(ctrl/'pub-get.log').write_text(r.stdout+r.stderr)
for p in sorted(ctrl.iterdir()):
 if not(p/'dart').is_dir():continue
 r=subprocess.run([dart,'analyze','--format=machine',str(p/'dart')],cwd=ctrl,env=env,capture_output=True,text=True);(p/'analyze.log').write_text(r.stdout+r.stderr);results.append(dict(name=p.name,exit=r.returncode,output=r.stdout+r.stderr))
(ctrl/'analyze-results.json').write_text(json.dumps(results,indent=2));print(json.dumps([{k:r[k]for k in ['name','exit']}for r in results]),flush=True)
# Consumer-level public-export checks: generated files themselves can analyze while exporting nothing.
results=[]
for name,typ in [('reexport-alias','B'),('reexport-chain','A')]:
 p=root/'outputs'/name;(p/'consumer.dart').write_text("import 'dart/probe.dart' as b; void consume(b."+typ+" value){}\n")
 r=subprocess.run([dart,'analyze','--format=machine',str(p/'consumer.dart')],cwd=root/'outputs',env=env,capture_output=True,text=True);(p/'consumer-analyze.log').write_text(r.stdout+r.stderr);results.append(dict(name=name,exit=r.returncode,output=r.stdout+r.stderr))
(root/'outputs/export-consumers.json').write_text(json.dumps(results,indent=2));print(json.dumps(results),flush=True)
# Use the TypeScript compiler's own CommonJS output as the export oracle.
results=[]
for name,oracle in [('defaults','Root.default(4)'),('assignment','Root(4)'),('local-alias','Root.publicName(4)')]:
 p=root/'outputs'/name;(p/'compiler-run.cjs').write_text('globalThis.self=globalThis;globalThis.Root=require("./implementation.cjs");console.log("TS compiler oracle="+ '+oracle+');require("./out.js");\n')
 r=subprocess.run(['node',str(p/'compiler-run.cjs')],capture_output=True,text=True);(p/'compiler-runtime.log').write_text(r.stdout+r.stderr);results.append(dict(name=name,exit=r.returncode,stdout=r.stdout,stderr=r.stderr))
(root/'outputs/compiler-oracles.json').write_text(json.dumps(results,indent=2));print(json.dumps(results),flush=True)
