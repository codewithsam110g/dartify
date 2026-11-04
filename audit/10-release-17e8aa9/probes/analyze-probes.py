from pathlib import Path
import subprocess,os,json
base=Path(__file__).resolve().parents[1];root=base/'probes/outputs';dart='/Users/ssrk/flutter/bin/cache/dart-sdk/bin/dart'
env=os.environ.copy();env.update(PUB_CACHE=str(base/'cache/pub'),TMPDIR=str(base/'tmp'),DART_SUPPRESS_ANALYTICS='true')
(root/'pubspec.yaml').write_text('name: audit_probes\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  js: 0.6.7\n')
r=subprocess.run([dart,'pub','get'],cwd=root,env=env,text=True,capture_output=True);(root/'pub-get.log').write_text(r.stdout+r.stderr)
assert r.returncode==0,r.stderr
results=[]
for p in sorted(root.iterdir()):
 if not (p/'dart').is_dir():continue
 r=subprocess.run([dart,'analyze','--format=machine',str(p/'dart')],cwd=root,env=env,text=True,capture_output=True,timeout=40)
 (p/'analyze.log').write_text(r.stdout+r.stderr);results.append(dict(name=p.name,exit=r.returncode,output=r.stdout+r.stderr))
 print(p.name,r.returncode,[line.split('|')[2] for line in (r.stdout+r.stderr).splitlines() if line.startswith(('ERROR','WARNING'))],flush=True)
(root/'analyze-results.json').write_text(json.dumps(results,indent=2)+'\n')
