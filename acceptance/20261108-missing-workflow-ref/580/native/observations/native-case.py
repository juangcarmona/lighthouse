from pathlib import Path
import subprocess,json,re,hashlib,sys,zipfile
p=Path('/tmp/lighthouse-580-native');repo='juangcarmona/lighthouse';scope='[133,580]'
def api(path,method='GET',body=None):
 args=['gh','api','repos/'+repo+'/'+path,'-X',method]
 raw=subprocess.check_output(args+(['--input','-']if body is not None else[]),input=json.dumps(body)if body is not None else None,text=True)
 return json.loads(raw)if raw.strip()else None
def vars():return {v['name']:v['value']for v in api('actions/variables')['variables']}
def state():
 issues={}
 for num in [133,580]:
  issue=api('issues/'+str(num));comments=api(f'issues/{num}/comments?per_page=100');assert len(comments)<100
  issues[str(num)]={'state':issue['state'],'state_reason':issue['state_reason'],'titleDigest':hashlib.sha256(issue['title'].encode()).hexdigest(),'bodyDigest':hashlib.sha256(issue['body'].encode()).hexdigest(),'labels':sorted(l['name']for l in issue['labels']),'comments':[{'id':c['id'],'bodyDigest':hashlib.sha256(c['body'].encode()).hexdigest(),'author':c['user']['login'],'updated':c['updated_at']}for c in comments]}
 runs=api('actions/runs?per_page=100')['workflow_runs'];workers=[{k:r[k]for k in ['id','run_attempt','head_sha','status','conclusion']}for r in runs if r['path'].endswith('.lock.yml')and re.search(r'#(?:133|580)\b',r['display_title'])]
 refs={kind:api('git/matching-refs/'+kind+'/codex%2Findependent-stage-workflows?per_page=100')for kind in ['heads','tags']};assert all(v==[]for v in refs.values())
 return {'issues':issues,'workers':workers,'missingRefs':refs,'main':api('commits/main')['sha']}
def collect(run,prefix):subprocess.run(['python3',str(p/'collect-run.py'),str(run),prefix],check=True,stdout=subprocess.DEVNULL)
if sys.argv[1]=='start':
 expected=json.loads((p/'adoption-proof.json').read_text());assert expected['state']=='verified'
 before=state();assert before['main']==expected['mergedMain'];original=vars();assert 'LIGHTHOUSE_MAINTENANCE_ISSUES'not in original,'Preserve a concurrently configured scope';assert original['LIGHTHOUSE_MAINTENANCE_ENABLED']==original['LIGHTHOUSE_AUTOMATION_ENABLED']=='true'
 previous=api('actions/workflows/lighthouse-worker-maintenance.yml/runs?per_page=100');(p/'native-before.json').write_text(json.dumps(before,indent=2)+'\n');(p/'variables-before.json').write_text(json.dumps(original,indent=2)+'\n');(p/'maintenance-before.json').write_text(json.dumps(previous,indent=2)+'\n')
 api('actions/variables','POST',{'name':'LIGHTHOUSE_MAINTENANCE_ISSUES','value':scope});assert vars()=={**original,'LIGHTHOUSE_MAINTENANCE_ISSUES':scope}
 api('actions/workflows/lighthouse-worker-maintenance.yml/dispatches','POST',{'ref':'main','inputs':{}});print('Scoped native batch133+580 requested. Restore its temporary scope after completion.')
elif sys.argv[1]=='finish':
 old={r['id']for r in json.loads((p/'maintenance-before.json').read_text())['workflow_runs']};matches=[r for r in api('actions/workflows/lighthouse-worker-maintenance.yml/runs?per_page=100')['workflow_runs']if r['id']not in old and r['event']=='workflow_dispatch'and r['actor']['login']=='juangcarmona'];assert len(matches)==1;run=matches[0];assert run['status']=='completed'and run['conclusion']=='success'and run['run_attempt']==1
 before=json.loads((p/'native-before.json').read_text());after=state();assert before==after,'Native maintenance changed source issue or delivery effects'
 collect(run['id'],'native-batch');jobs=json.loads((p/'native-batch-jobs.json').read_text())['jobs']
 assert {j['name']for j in jobs}=={'scan','observe (133)','observe (580)','reconcile (133)','reconcile (580)','report','report-stalled'}
 for name in ['scan','observe (133)','observe (580)','reconcile (133)','reconcile (580)']:assert len([j for j in jobs if j['name']==name and j['conclusion']=='success'])==1,name
 artifacts={}
 for number in [133,580]:
  for kind in ['observation','maintenance']:
   with zipfile.ZipFile(p/f'native-batch-lighthouse-{kind}-{number}.zip')as z:artifacts[f'{kind}-{number}']=json.loads(z.read('observations.json'))
 assert artifacts['observation-580']==artifacts['maintenance-580']==[]
 expected=json.loads((p/'source-observe133-proof.json').read_text())['observations'];assert artifacts['observation-133']==artifacts['maintenance-133']==expected
 missing=[o for o in expected if o['code']=='workflow-ref-missing'];assert len(missing)==1 and missing[0]['state']=='blocked'and missing[0]['runId']=='40496296153'and missing[0]['requestCommentId']==6440754608
 out={'state':'accepted','run':{k:run[k]for k in ['id','head_sha','event','run_attempt','conclusion','html_url']},'source':json.loads((p/'registry/verification.json').read_text())['source'],'originalHistoryStillAuthenticated':True,'exactMissingRefBlocker':missing[0],'bothObserveAndReconcileJobsPassed':True,'otherBatchIssueObserved':580,'noSourceIssueOrRequestOrModelOrBranchChanges':True,'before':before,'after':after,'artifactObservations':artifacts};(p/'native-proof.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:out[k]for k in ['state','run','bothObserveAndReconcileJobsPassed','noSourceIssueOrRequestOrModelOrBranchChanges']}))
elif sys.argv[1]=='restore':
 original=json.loads((p/'variables-before.json').read_text());current=vars();assert current=={**original,'LIGHTHOUSE_MAINTENANCE_ISSUES':scope};api('actions/variables/LIGHTHOUSE_MAINTENANCE_ISSUES','DELETE');assert vars()==original
 (p/'settings-restored.json').write_text(json.dumps({'state':'restored','originalValuesExactlyPreserved':True,'variables':original},indent=2)+'\n');print('Temporary scope removed; all original variable values exactly restored.')
