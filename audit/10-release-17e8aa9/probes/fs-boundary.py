from pathlib import Path
import subprocess,os,json,hashlib
b=Path(__file__).resolve().parents[1];d=b/'probes/fs-boundary';d.mkdir(exist_ok=True);cli=b/'work/dist/cli.js'
source='export declare const a:number;\n'
for name in ['valid.d.ts','space name.d.ts','τύπος.d.ts','denied.d.ts']:(d/name).write_text(source)
link=d/'linked.d.ts'
if not link.is_symlink():link.symlink_to('valid.d.ts')
ro=d/'readonly';ro.mkdir(exist_ok=True)
cases=[('spaces',['-d','space name.d.ts','-o','out spaces']),('unicode-path',['-d','τύπος.d.ts','-o','out τύπος']),('input-symlink',['-d','linked.d.ts','-o','out-link']),('input-output-overlap',['-d','valid.d.ts','-o','.'])]
if os.geteuid()!=0:
 cases += [('denied-input',['-d','denied.d.ts','-o','out-denied']),('mixed-denied',['-d','valid.d.ts','denied.d.ts','-o','out-mixed-denied']),('readonly-output',['-d','valid.d.ts','-o','readonly'])]
out=[]
try:
 (d/'denied.d.ts').chmod(0);ro.chmod(0o500)
 for name,args in cases:
  r=subprocess.run(['node',str(cli),*args],cwd=d,text=True,capture_output=True,timeout=20)
  out.append(dict(name=name,command=['node',str(cli),*args],exit=r.returncode,stdout=r.stdout,stderr=r.stderr))
finally:
 (d/'denied.d.ts').chmod(0o600);ro.chmod(0o700)
(d/'results.json').write_text(json.dumps({'uid':os.geteuid(),'source_unchanged':(d/'valid.d.ts').read_text()==source,'cases':out},indent=2))
print(json.dumps([{'name':r['name'],'exit':r['exit'],'stderr':r['stderr'][:180]}for r in out],indent=2))
