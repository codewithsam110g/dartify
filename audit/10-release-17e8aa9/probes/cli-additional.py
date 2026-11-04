from pathlib import Path
import subprocess, os, json
b=Path(__file__).resolve().parents[1];p=b/'probes/cli-additional';p.mkdir(exist_ok=True)
cli=b/'work/dist/cli.js';valid='export declare const answer:number;\n'
inputs={'bom.d.ts':b'\xef\xbb\xbf'+valid.encode(),'invalid-utf8.d.ts':b'export declare const a: string;\n//\xff\n','invalid-token.d.ts':b'export declare const \xff: number;','crlf.d.ts':valid.replace('\n','\r\n').encode(),'unicode.d.ts':'export declare const café:number;\n'.encode(),'bad.d.ts':b'export declare const a: ;'}
for n,s in inputs.items():(p/n).write_bytes(s)
(p/'blocked').write_text('file, not directory')
cases=[(n,['-d',n,'-o',str(p/('out-'+n))])for n in inputs]
cases.extend([('output-is-file',['-d','bom.d.ts','-o',str(p/'blocked')]),('unresolved-verbose',['-d','bad.d.ts','-o',str(p/'out-verbose'),'-lv']),('unknown-only',['--garbage'])])
out=[]
env=os.environ.copy();env['TMPDIR']=str(b/'tmp')
for name,args in cases:
 r=subprocess.run(['node',str(cli),*args],cwd=p,env=env,text=True,capture_output=True,timeout=20)
 out.append(dict(name=name,command=['node',str(cli),*args],exit=r.returncode,stdout=r.stdout,stderr=r.stderr))
(p/'results.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
