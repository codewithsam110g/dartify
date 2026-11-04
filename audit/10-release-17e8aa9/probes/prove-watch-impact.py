from pathlib import Path
import json,os,subprocess
base=Path(__file__).resolve().parents[1];rows=json.loads((base/'probes/watch/results.json').read_text());dart='/Users/ssrk/flutter/bin/cache/dart-sdk/bin/dart';env=os.environ.copy();env.update(PUB_CACHE=str(base/'cache/pub'),TMPDIR=str(base/'tmp'),DART_SUPPRESS_ANALYTICS='true')
for r in rows:
 if r['name']!='support-toggle' or r['equal']:continue
 dir=base/'probes/watch-impact';dir.mkdir(exist_ok=True);(dir/'pubspec.yaml').write_text('name: watch_impact\nenvironment:\n  sdk: ">=3.0.0 <4.0.0"\ndependencies:\n  js: 0.6.7\n')
 p=subprocess.run([dart,'pub','get'],cwd=dir,env=env,text=True,capture_output=True);(dir/'pub-get.log').write_text(p.stdout+p.stderr)
 result=[]
 for kind in ['incremental','cold']:
  dest=dir/kind;dest.mkdir(exist_ok=True)
  for path,content in r[kind]:(dest/Path(path).name).write_text(content)
  (dest/'main.dart').write_text("import 'a.dart' as a; import 'b.dart' as b; void main(){b.save(a.a);}\n")
  p=subprocess.run([dart,'analyze','--format=machine',str(dest)],cwd=dir,env=env,text=True,capture_output=True);(dest/'analyze.log').write_text(p.stdout+p.stderr);result.append(dict(kind=kind,exit=p.returncode,output=p.stdout+p.stderr))
 (dir/'result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
