from pathlib import Path
import subprocess,json,tempfile,shutil,os
w=Path('/srv/workspaces/juangcarmona/lighthouse/580-maintenance-adoption');out=Path('/tmp/lighthouse-580-native');sha='879c4e75efebd945f8aea5b8ee09b97db62edbea';env=dict(os.environ,PATH='/opt/bastion-ai/releases/foundation-20261010/node-v24.21.0-linux-x64/bin:'+os.environ['PATH'],TMPDIR='/srv/workspaces/juangcarmona/lighthouse/547-checks-tmp')
def run(a,cwd=w):
 r=subprocess.run(a,cwd=cwd,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);(out/'adoption-generation.log').open('a').write('$ '+' '.join(map(str,a))+'\n'+r.stdout+'\n');assert r.returncode==0,r.stdout[-2000:];return r.stdout.strip()
assert not run(['git','status','--porcelain']);assert run(['git','rev-parse','HEAD'])==sha
with tempfile.TemporaryDirectory(prefix='580-workflow-',dir=out)as temp:
 root=Path(temp);run(['git','init','-q'],root)
 for name in ['.lighthouse/github.json','.github/workflows/ci.yml']:
  p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((w/name).read_bytes())
 run(['node',str(w/'src/packages/sdlc/src/install-workflows.mjs'),str(root),sha,'--with-maintenance','--apply'])
 name='.github/workflows/lighthouse-worker-maintenance.yml';actual=(root/name).read_bytes();expected=(w/'src/packages/sdlc/workflows/lighthouse-worker-maintenance.yml').read_text().replace('__LIGHTHOUSE_REF__',sha).encode();assert actual==expected;(w/name).write_bytes(actual)
run(['node','--input-type=module','-e',"import{readFileSync}from'node:fs';import{parse}from'yaml';parse(readFileSync('.github/workflows/lighthouse-worker-maintenance.yml','utf8'));console.log('Installed maintenance YAML parses.');"])
run(['/tmp/lighthouse-541-native/actionlint/actionlint','-shellcheck=','-ignore','unexpected key "queue" for "concurrency" section','-ignore','label "lighthouse-workflow" is unknown','.github/workflows/lighthouse-worker-maintenance.yml']);run(['git','diff','--check']);assert run(['git','diff','--name-only'])==name
assert not run(['git','diff','--name-only','--','.lighthouse','docs/product/model'])
proof={'state':'verified','base':sha,'qualifiedSource':sha,'versions':{'cli':'0.12.65','sdlc':'0.22.4'},'onlyChangedPath':name,'generatedByOwningInstaller':True,'templateBytesMatchExactly':True,'yamlAndActionlintPassed':True,'productModelsPoliciesAndOtherWorkflowsUnchanged':True};(out/'adoption-prepared-proof.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps(proof))
