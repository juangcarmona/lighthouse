import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function verifyPrefix(proof, candidate, expectedBase, expectedHead) {
  assert.equal(proof.base, expectedBase); assert.equal(proof.head, expectedHead);
  assert.equal(proof.path,'src/summary.test.mjs');
  const sha=(type,data)=>createHash('sha1').update(Buffer.from(type+' '+data.length+'\0')).update(data).digest('hex');
  const object=(id,type)=>{const o=proof.objects[id];assert(o,'Missing Git object '+id);assert.equal(o.type,type);const data=Buffer.from(o.data,'base64');assert.equal(sha(type,data),id,'Git object hash mismatch');return data};
  const file=(commit)=>{
    const contents=object(commit,'commit').toString('utf8');let tree=/^tree ([a-f0-9]{40})\n/.exec(contents)[1];
    for(const part of proof.path.split('/')){
      const raw=object(tree,'tree');let found=null;
      for(let offset=0;offset<raw.length;){const space=raw.indexOf(32,offset),end=raw.indexOf(0,space);assert(space>=offset&&end>space&&end+21<=raw.length);const name=raw.subarray(space+1,end).toString('utf8');const id=raw.subarray(end+1,end+21).toString('hex');if(name===part)found=id;offset=end+21}
      assert(found,'Missing Git tree entry '+part);tree=found;
    }
    return tree;
  };
  const before=object(file(proof.base),'blob');
  assert.equal(sha('blob',candidate),file(proof.head),'Workspace differs from accepted candidate');
  assert(candidate.length>before.length);assert(candidate.subarray(0,before.length).equals(before),'Original test bytes changed');
  const appended=candidate.subarray(before.length).toString('utf8');assert.equal((appended.match(/^test\(/gm)??[]).length,1,'Expected exactly one appended test');
  return {base:proof.base,head:proof.head,path:proof.path,baselineGitBlob:file(proof.base),candidateGitBlob:file(proof.head),preservedPrefixBytes:before.length,baselineSha256:createHash('sha256').update(before).digest('hex'),candidatePrefixSha256:createHash('sha256').update(candidate.subarray(0,before.length)).digest('hex'),appendedTests:1,passed:true};
}
if(process.argv[1]?.endsWith('verify-prefix-proof.mjs')) console.log(JSON.stringify(verifyPrefix(JSON.parse(readFileSync(process.argv[2],'utf8')),readFileSync(process.argv[3]),process.argv[4],process.argv[5])));
