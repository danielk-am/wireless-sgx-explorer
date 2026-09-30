const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {wirelessSgx, endpoint, requestLookup} = require('../dist');

async function server(t, handler) {
 const http=createServer(handler); await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>http.close(resolve)));
 return `http://127.0.0.1:${http.address().port}`;
}
test('all five actual Activepieces action handlers send the shared API contract', async t=>{
 const requests=[];
 const baseUrl=await server(t,async(req,res)=>{
  let raw=''; for await(const chunk of req) raw+=chunk;
  requests.push({url:req.url,method:req.method,token:req.headers.authorization,body:JSON.parse(raw)});
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,metadata:{coordinate_status:'incomplete'}}));
 });
 const cases={nearest_hotspots:{latitude:1.3,longitude:103.85,limit:5},search_hotspots:{query:'Albert',limit:5},search_venues:{query:'Albert',limit:5},get_hotspot:{hotspot_id:'wsgx-0001'},dataset_info:{}};
 for(const [operation,args] of Object.entries(cases)) {
  const result=await wirelessSgx.actions()[operation].run({auth:{props:{baseUrl,token:'test-secret'}},propsValue:args});
  assert.deepEqual(result,{ok:true,metadata:{coordinate_status:'incomplete'}});
  const request=requests.at(-1); assert.equal(request.url,'/api/lookup');assert.equal(request.method,'POST');assert.equal(request.token,'Bearer test-secret');assert.deepEqual(request.body,{operation,arguments:args});
 }
 assert.equal(requests.length,5);
});
test('structured catalogue errors survive without invented results',async t=>{
 const failure={ok:false,error:{code:'ORIGIN_NOT_RESOLVED',message:'No indexed origin'}};
 const baseUrl=await server(t,(req,res)=>res.end(JSON.stringify(failure)));
 assert.deepEqual(await requestLookup({baseUrl},'nearest_hotspots',{query:'unknown'}),failure);
});
test('authentication never follows redirects and errors do not expose request details',async t=>{
 let calls=0;
 const baseUrl=await server(t,(req,res)=>{calls++;res.writeHead(302,{location:'/leak'});res.end();});
 await assert.rejects(requestLookup({baseUrl,token:'do-not-print-me'},'dataset_info',{}),err=>!err.message.includes('do-not-print-me')&&err.message.includes('request failed'));
 assert.equal(calls,1);
});
test('malformed API responses and response overflows fail closed',async t=>{
 for(const body of ['not-json','{}','x'.repeat(2_000_001)]) {
  const baseUrl=await server(t,(req,res)=>res.end(body));
  await assert.rejects(requestLookup({baseUrl},'dataset_info',{}),/request failed/);
 }
});
test('reject unsafe URL configuration and header injection',async()=>{
 for(const baseUrl of ['http://example.com','https://user:pass@example.com','https://example.com?q=1','file:///tmp/data']) assert.throws(()=>endpoint(baseUrl));
 assert.equal(endpoint('https://example.com/explorer/'),'https://example.com/explorer/api/lookup');
 await assert.rejects(requestLookup({baseUrl:'https://example.com',token:'x\r\ny'},'dataset_info',{}),/Invalid bearer/);
 await assert.rejects(requestLookup({baseUrl:'https://example.com'},'delete_everything',{}),/Unsupported operation/);
});
test('patched development deepmerge retains the framework wrapper contract',()=>{
 const {deepMergeAndCast}=require('@activepieces/shared');
 const source={nested:{b:2},items:[2]};
 assert.deepEqual(deepMergeAndCast({nested:{a:1},items:[1]},source),{nested:{a:1,b:2},items:[1,2]});
 assert.deepEqual(source,{nested:{b:2},items:[2]});
});
test('distribution does not auto-install the development framework',()=>{
 const pkg=require('../package.json');
 assert.equal(pkg.dependencies,undefined);
 assert.equal(pkg.peerDependenciesMeta['@activepieces/pieces-framework'].optional,true);
 assert.equal(pkg.devDependencies['@activepieces/pieces-framework'],'0.32.0');
});
