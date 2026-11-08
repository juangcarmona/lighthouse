import assert from 'node:assert/strict';
import http from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
let requests=0;const server=http.createServer((req,res)=>{requests++;res.end('ok');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{const signal=AbortSignal.timeout(5);await delay(20);assert.equal(signal.aborted,true);await assert.rejects(fetch(`http://127.0.0.1:${server.address().port}/dispatches`,{method:'POST',body:'original request',signal}),{name:'TimeoutError'});await delay(20);assert.equal(requests,0);console.log(JSON.stringify({preAbortedNativeFetchRejected:true,serverRequests:requests}));}finally{server.close();}
