from pathlib import Path
import subprocess,os,json,time
base=Path(__file__).resolve().parent; work=base/'work'; env=os.environ.copy()
env.update(TMPDIR=str(base/'tmp'),PUB_CACHE=str(base/'cache/pub'),XDG_CACHE_HOME=str(base/'cache'),XDG_STATE_HOME=str(base/'cache/state'),DART_SUPPRESS_ANALYTICS='true',CI='true')
env['PATH']='/Users/ssrk/flutter/bin/cache/dart-sdk/bin:'+env['PATH']
gates=[('typecheck',['pnpm','exec','tsc','--noEmit']),('build',['pnpm','build']),('default',['pnpm','test']),('s2',['pnpm','test:s2']),('s3',['pnpm','test:s3']),('s4',['pnpm','test:s4']),('s5',['pnpm','test:s5:fixture']),('dart',['pnpm','test:dart']),('e2e',['pnpm','test:e2e']),('incremental',['pnpm','test:incremental']),('stress',['pnpm','test:stress'])]
results=[]
for name,args in gates:
 start=time.time()
 with (base/'evidence'/f'gate-{name}.log').open('w') as f:
  try:r=subprocess.run(args,cwd=work,env=env,stdout=f,stderr=subprocess.STDOUT,timeout=1000);code=r.returncode
  except subprocess.TimeoutExpired:code='TIMEOUT'
 result=dict(name=name,command=args,exit_code=code,seconds=round(time.time()-start,2));results.append(result)
 (base/'evidence/gates.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(result),flush=True)
