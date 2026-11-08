import sys
import base64,hashlib,io,json,subprocess,tarfile,urllib.request,urllib.error,time
from pathlib import Path
source=sys.argv[1];root='/srv/workspaces/juangcarmona/lighthouse/567-worker-completion';out=Path('/tmp/lighthouse-567-native/registry-callback');out.mkdir(exist_ok=True)
def get(url):
 for attempt in range(120):
  try:return urllib.request.urlopen(url+('&'if'?'in url else'?')+'inspection='+str(time.time_ns()),timeout=40).read()
  except urllib.error.HTTPError as error:
   if error.code!=404 or attempt==119:raise
   if attempt%6==0:print('Waiting for official registry propagation:',url,flush=True)
   time.sleep(10)
report={'source':source,'packages':[]}
for folder,name,version in [('sdlc','lighthouse-sdlc',sys.argv[3]),('cli','lighthouse',sys.argv[2])]:
 metadata=json.loads(get(f'https://registry.npmjs.org/@juangcarmona%2F{name}/{version}?verification={int(time.time())}'));assert metadata['gitHead']==source
 data=get(metadata['dist']['tarball']);integrity='sha512-'+base64.b64encode(hashlib.sha512(data).digest()).decode();assert integrity==metadata['dist']['integrity']
 archive=subprocess.check_output(['git','archive',source,f'src/packages/{folder}'],cwd=root)
 with tarfile.open(fileobj=io.BytesIO(archive)) as tar:expected={m.name.removeprefix(f'src/packages/{folder}/'):tar.extractfile(m).read() for m in tar if m.isfile()}
 with tarfile.open(fileobj=io.BytesIO(data)) as tar:actual={m.name.removeprefix('package/'):tar.extractfile(m).read() for m in tar if m.isfile()}
 assert all(expected.get(p)==b for p,b in actual.items())
 if folder=='sdlc':assert b'signalAdmissionRejection' in actual['src/admission-recovery.mjs'] and b'completedAdmission' in actual['src/admission-recovery.mjs'] and b'admissionCompletion' in actual['src/admission-recovery.mjs'] and b'workflows: [review]' in actual['workflows/lighthouse-worker-maintenance.yml'] and b'lighthouse-admission-wake-' in actual['workflows/lighthouse-worker-maintenance.yml'] and b'verifyAdmissionRecovery' in actual['src/admission-recovery.mjs'] and b'if (!revalidate) return' in actual['src/admission-recovery.mjs'] and b'workflow-revision-rejected' in actual['src/stage-dispatch.mjs'];assert 'src/implementation-plan.mjs' in actual and b'prepareImplementationPlanMetadata' in actual['src/opencode-execute.mjs'] and b'planningMetadata' in actual['src/opencode-execute.mjs'] and b'1.15.0' in actual['src/openspec-provider.mjs'] and b'discovery' in actual['src/proposal.mjs']
 assert folder!='sdlc' or b'engineSlotWaitSeconds' in actual['src/engine-slot.mjs'] and b'await acquireEngineSlot' in actual['src/opencode-execute.mjs'];(out/f'{name}-{version}.tgz').write_bytes(data);(out/f'{name}-{version}-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
 report['packages'].append({'name':'@juangcarmona/'+name,'version':version,'gitHead':metadata['gitHead'],'integrity':integrity,'filesCompared':len(actual)})
 print(name,version,'verified',len(actual),'source files',flush=True)
(out/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
