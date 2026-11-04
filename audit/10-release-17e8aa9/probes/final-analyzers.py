from pathlib import Path
import subprocess, os, json
base=Path(__file__).resolve().parents[1]
dart='/Users/ssrk/flutter/bin/cache/dart-sdk/bin/dart'
env=os.environ.copy();env.update(PUB_CACHE=str(base/'cache/pub'),TMPDIR=str(base/'tmp'),DART_SUPPRESS_ANALYTICS='true',XDG_CACHE_HOME=str(base/'cache'),XDG_STATE_HOME=str(base/'cache/state'))
results=[]
for name in ['generics','generic-literal','generic-default-outer','generic-constructor','private-constructor']:
 p=base/'probes/outputs'/name/'generic-consumer.dart'
 r=subprocess.run([dart,'analyze','--format=machine',str(p)],cwd=base/'probes/outputs',env=env,text=True,capture_output=True,timeout=40)
 (p.parent/'generic-consumer-analyze.log').write_text(r.stdout+r.stderr)
 results.append(dict(name=name,exit=r.returncode,output=r.stdout+r.stderr))
(base/'probes/outputs/generic-consumer-dart.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
