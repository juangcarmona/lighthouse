import assert from 'node:assert/strict';import{deflateRawSync}from'node:zlib';import{readFileSync}from'node:fs';import{verifyPrefix}from'./verify-prefix-proof-compact.mjs';
const p=JSON.parse(readFileSync('/tmp/lighthouse-567-native/72-prefix-git-proof-compact.json'));const b=readFileSync('/tmp/lighthouse-567-native/72-candidate-summary.mjs');
assert.equal(verifyPrefix(p,b,p.base,p.head).passed,true);
const changed=Buffer.from(b);changed[0]^=1;assert.throws(()=>verifyPrefix(p,changed,p.base,p.head),/Workspace differs/);
const forged=structuredClone(p);forged.objects[p.base].data=deflateRawSync(Buffer.from('forged')).toString('base64');assert.throws(()=>verifyPrefix(forged,b,p.base,p.head),/Git object hash mismatch/);
assert.throws(()=>verifyPrefix(p,b,p.base,'f'.repeat(40)));
console.log(JSON.stringify({positivePassed:true,changedWorkspaceRejected:true,forgedCommitRejected:true,wrongAdmittedHeadRejected:true}));
