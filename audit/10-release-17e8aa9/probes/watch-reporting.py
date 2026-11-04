from pathlib import Path
import subprocess,json
b=Path(__file__).resolve().parents[1];d=b/'probes/watch-reporting';d.mkdir(exist_ok=True)
(d/'probe.d.ts').write_text('export interface A {[Symbol.iterator]():Iterator<number>;}\nexport declare const a:Missing;')
cmd=['node',str(b/'work/dist/cli.js'),'-d',str(d/'probe.d.ts'),'-o',str(d/'out')]
r=subprocess.run(cmd,cwd=d,text=True,capture_output=True,timeout=20)
p=subprocess.Popen([*cmd,'-w','-lv'],cwd=d,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
 try:o,e=p.communicate(timeout=2)
 except subprocess.TimeoutExpired:
  p.terminate();o,e=p.communicate(timeout=5)
finally:
 if p.poll() is None:p.kill();p.communicate()
(d/'results.json').write_text(json.dumps({'oneShot':{'exit':r.returncode,'stdout':r.stdout,'stderr':r.stderr},'watch':{'command':[*cmd,'-w','-lv'],'terminated_by_harness':True,'stdout':o,'stderr':e}},indent=2))
