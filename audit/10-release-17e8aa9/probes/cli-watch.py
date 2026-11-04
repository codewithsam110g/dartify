from pathlib import Path
import subprocess,time,json,os,select
base=Path(__file__).resolve().parents[1];root=base/'probes/cli-watch';root.mkdir(exist_ok=True)
for n in ['types','types2']:(root/n).mkdir(exist_ok=True)
a=root/'types/a.d.ts';b=root/'types2/b.d.ts';a.write_text('export declare const a:number;');b.write_text('export declare const b:number;')
out=root/'out';log=root/'watch.log';p=None
try:
 with log.open('w')as f:
  cmd=['node',str(base/'work/dist/cli.js'),'-d',str(a),str(b),'-o',str(out),'-w'];p=subprocess.Popen(cmd,cwd=root,stdout=f,stderr=subprocess.STDOUT)
  for i in range(60):
   if 'Watching' in log.read_text():break
   if p.poll() is not None:break
   time.sleep(.1)
  b.write_text('export declare const b:string;');time.sleep(1)
  before=(out/'types2/b.dart').read_text()
  a.write_text('export declare const a:string;');time.sleep(1)
  after=(out/'types2/b.dart').read_text()
  result=dict(command=cmd,pid=p.pid,watched=log.read_text(),unwatchedOutput=before,afterWatchedEdit=after,unwatchedEditMissed='num get b' in before,controlUpdated=(out/'types/a.dart').exists() and 'String get a' in (out/'types/a.dart').read_text())
 (root/'result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
finally:
 if p is not None and p.poll() is None:p.terminate();p.wait(timeout=5)
