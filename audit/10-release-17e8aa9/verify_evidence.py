from pathlib import Path
import json,hashlib,datetime
B=Path(__file__).resolve().parent
def load(p):return json.loads((B/p).read_text())
def keyed(p,key='name'):return {r[key]:r for r in load(p)}
proofs={}
def check(n,condition,description):
 proofs[f'DAR-{n:03}']={'verified':bool(condition),'check':description}
cli=keyed('probes/cli/results.json');syn=load('probes/controls/syntax-api.json')
check(1,cli['bad-syntax']['exit']==0 and cli['missing-type']['exit']==0 and len(syn['errors'])>0,'CLI malformed syntax succeeds; identical string API collects syntax errors')
check(2,cli['mixed-missing']['exit']==0 and not cli['mixed-missing']['stderr'] and cli['missing']['exit']==1 and cli['directory']['exit']==0 and not cli['directory']['outputs'],'mixed missing input and directory accepted; single missing control fails')
oracle=load('probes/outputs/compiler-oracles.json');ctrl=keyed('probes/controls/extra-results.json')
check(3,all('TS compiler oracle=5' in r['stdout'] and 'NoSuchMethodError' in r['stdout'] for r in oracle)and ctrl['ordinary-export-control']['stdout']=='5\n','three actual TypeScript export implementations succeed as JS, fail as Dart; ordinary control succeeds')
check(4,all('UNDEFINED_CLASS' in r['output']for r in load('probes/outputs/export-consumers.json')),'public alias and chained-barrel consumers fail to resolve declared exported classes')
an=keyed('probes/outputs/analyze-results.json')
check(5,'EXPECTED_IDENTIFIER_BUT_GOT_KEYWORD'in an['destructuring']['output']and'DUPLICATE_DEFINITION'in an['rest-collision']['output'],'destructuring keyword and rest duplicate diagnostics')
check(6,'INVALID_OVERRIDE'in an['generic-override']['output'],'third-level override fails Dart analysis')
check(7,'DUPLICATE_DEFINITION'in an['heritage-static-collision']['output'],'late static name duplicates author function')
check(8,'UNDEFINED_CLASS'in an['alias-companion-collision']['output'],'minted alias use no longer names a type')
ts=keyed('probes/outputs/generic-consumer-typescript.json');dart=keyed('probes/outputs/generic-consumer-dart.json')
check(9,not ts['generic-default-outer']['diagnostics']and'ARGUMENT_TYPE_NOT_ASSIGNABLE'in dart['generic-default-outer']['output']and ctrl['default-explicit-control']['exit']==0,'valid defaulted generic consumer rejected; explicit-argument control accepted')
check(10,bool(ts['generics']['diagnostics'])and dart['generics']['exit']==0,'nullable-generic consumer rejected by TS but accepted by Dart')
check(11,bool(ts['generic-literal']['diagnostics'])and dart['generic-literal']['exit']==0,'inline-generic shape misuse rejected by TS but accepted by Dart')
run=keyed('probes/outputs/runtime-results.json')
check(12,run['date']['compile_exit']==0 and 'JS oracle=2020'in run['date']['stdout']and'get$year'in run['date']['stdout'],'native Date returns 2020; compiled Dart DateTime getter fails')
check(13,run['escaped-member']['compile_exit']==0 and'TypeError'in run['escaped-member']['stdout']and ctrl['escape-control']['stdout']=='11\n','escaped spelling dispatch fails; decoded-key control returns 11')
check(14,'URI_DOES_NOT_EXIST'in an['hash-uri']['output']and'UNTERMINATED_STRING_LITERAL'in an['quote-uri']['output'],'hash/quote filenames corrupt generated import URI/literal')
check(15,'external bool'in(B/'probes/outputs/asserts/dart/probe.dart').read_text()and'JS oracle=undefined\nnull'in run['asserts']['stdout'],'assertion signature is bool but successful JS return becomes null')
wr=load('probes/watch-recovery-isolated/results.json')
check(16,len(wr[1]['files'])==1 and'typedef B = dynamic'in wr[1]['files'][0][1]and'forgotten'in wr[2].get('error',''),'isolated watch without any cold run stays stale and then throws on importer edit')
wi=keyed('probes/watch-impact/result.json','kind')
check(17,'ARGUMENT_TYPE_NOT_ASSIGNABLE'in wi['incremental']['output']and wi['cold']['exit']==0,'same Promise consumer fails incrementally, passes cold')
cw=load('probes/cli-watch/result.json')
check(18,cw['unwatchedEditMissed']and cw['controlUpdated'],'native watch misses sibling-prefix input and handles in-root control')
cy=keyed('probes/controls/cycle-controls.json');cyStates=dict(cy['cycle']['states']);acyStates=dict(cy['acyclic']['states'])
check(19,cyStates['/virtual.d.ts::B']['state']=='LinkedResolved'and acyStates['/virtual.d.ts::B']['state']=='NotLinkedIndirect','cycle hides transitive failure; acyclic control propagates it')
check(20,any(d['code']==2673 for d in ts['private-constructor']['diagnostics'])and dart['private-constructor']['exit']==0 and run['private-constructor']['stdout'].endswith('null\n')and ctrl['public-constructor-control']['stdout']=='7\n','private construction accepted and bypasses JS initialization; public external control works')
check(21,bool(ts['generic-constructor']['diagnostics'])and dart['generic-constructor']['exit']==0 and'ARGUMENT_TYPE_NOT_ASSIGNABLE'in ctrl['constructor-explicit-control']['output'],'inherited generic constructor erases string constraint; explicit constructor restores it')
ca=keyed('probes/controls/analyze-results.json');ct=keyed('probes/controls/typescript-input-diagnostics.json')
check(22,not ct['cr-doc']['diagnostics']and ca['cr-doc']['exit']!=0 and ca['crlf-doc-control']['exit']==0,'valid CR-only source creates Dart errors; CRLF control passes')
rp=load('probes/watch-reporting/results.json')
check(23,'Semantic analysis'in rp['oneShot']['stderr']and not rp['watch']['stderr']and'-lv'in rp['watch']['command']and'Verbose linker report'not in rp['watch']['stdout'],'watch with -lv hides warning and verbose records shown/available in ordinary mode')
fs=load('findings.json');manifest={f['path']:f for f in load('coverage.json')['files']}
for r in fs:
 assert r['audited_head']=='17e8aa932bd42aa9c667f40c2ac8567764799380'
 assert manifest[r['file']]['git_blob']==r['source_blob']
 assert f"/blob/{r['audited_head']}/"in r['source_permalink']
 assert 1<=r['line']<=manifest[r['file']]['lines']
 for p in r['evidence_files']:assert (B/p).is_file(),(r['id'],p)
assert len(fs)==len(proofs)==23
(B/'evidence/proof-validation.json').write_text(json.dumps({'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Assertions over retained concrete proof artifacts; does not rerun or replace compiler/runtime evidence.','findings':proofs},indent=2)+'\n')
for key,p in proofs.items():print(key,'PASS'if p['verified']else'FAIL',p['check'])
assert all(r['verified']for r in proofs.values())
