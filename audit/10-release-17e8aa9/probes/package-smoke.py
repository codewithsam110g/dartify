from pathlib import Path
import subprocess,os,json,tarfile,shutil
base=Path(__file__).resolve().parents[1];dest=base/'package-smoke';dest.mkdir(exist_ok=True)
with tarfile.open(base/'evidence/dart_bindgen-1.0.0.tgz')as t:
 members=t.getmembers(); names=[m.name for m in members]
 assert all(m.name.startswith('package/') and '..' not in Path(m.name).parts and not m.issym() for m in members)
 t.extractall(dest,filter='data')
root=dest/'package'
for n in ['pnpm-lock.yaml','pnpm-workspace.yaml']:shutil.copyfile(base/'work'/n,root/n)
env=os.environ.copy();env.update(TMPDIR=str(base/'tmp'),XDG_CACHE_HOME=str(base/'cache'),XDG_STATE_HOME=str(base/'cache/state'),COREPACK_HOME=str(base/'cache/corepack'))
cmd=['corepack','pnpm@10.9.0','install','--prod','--frozen-lockfile','--ignore-scripts','--offline','--store-dir',str(base/'cache/pnpm-store')]
r=subprocess.run(cmd,cwd=root,env=env,capture_output=True,text=True,timeout=120);(dest/'install.log').write_text(r.stdout+r.stderr);results=[dict(command=cmd,exit=r.returncode)]
for args in [['--version'],['--help'],['-d',str(base/'work/def_files/h3/h3.d.ts'),'-o',str(dest/'output')]]:
 r=subprocess.run(['node',str(root/'dist/cli.js'),*args],cwd=root,env=env,text=True,capture_output=True,timeout=30);results.append(dict(args=args,exit=r.returncode,stdout=r.stdout,stderr=r.stderr))
(dest/'results.json').write_text(json.dumps(dict(tar_members=names,checks=results),indent=2));print(json.dumps([dict(args=r.get('args','install'),exit=r['exit'])for r in results]))
