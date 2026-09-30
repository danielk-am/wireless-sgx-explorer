import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApp } from '../src/http.js';
import { lookup } from '../src/catalogue.js';

async function serve(options = {}) {
  const server = createApp({ rateLimit: 1000, ...options }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
const expected = ['dataset_info','get_hotspot','nearest_hotspots','search_hotspots','search_venues'];
async function exercise(client) {
  const listed = await client.listTools();
  assert.deepEqual(listed.tools.map(t => t.name).sort(), expected);
  assert(listed.tools.every(t=>t.annotations.readOnlyHint && !t.annotations.destructiveHint));
  const info = await client.callTool({ name:'dataset_info', arguments:{} });
  assert.equal(info.structuredContent.entry_count,3855);
  const nearest = await client.callTool({name:'nearest_hotspots',arguments:{query:'319260',limit:3}});
  assert.deepEqual(nearest.structuredContent, lookup('nearest_hotspots',{query:'319260',limit:3}));
  assert.equal(nearest.structuredContent.ranking_complete,false);
  const missing = await client.callTool({name:'nearest_hotspots',arguments:{query:'188979'}});
  assert.equal(missing.isError,true);
  assert.equal(missing.structuredContent.error.code,'ORIGIN_NOT_RESOLVED');
  const old = await client.callTool({name:'search_hotspots',arguments:{query:'Acctrain'}});
  assert.equal(old.structuredContent.total_matches,0);
  const invalid = await client.callTool({name:'nearest_hotspots',arguments:{latitude:90,longitude:103}});
  assert.equal(invalid.isError,true);
  const resources = await client.listResources();
  assert(resources.resources.some(r=>r.uri==='wireless-sgx://dataset'));
}

test('stdio: real subprocess initialization, discovery, success, errors and provenance',async()=>{
  const transport = new StdioClientTransport({command:process.execPath,args:['src/stdio.js'],cwd:process.cwd(),stderr:'pipe'});
  let errors='';transport.stderr?.on('data',d=>errors+=d);
  const client = new Client({name:'verification',version:'1.0'});
  try { await client.connect(transport); await exercise(client); }
  finally { await client.close(); }
  assert(!errors.includes('188979'),'must not log query inputs');
});

test('HTTP MCP: same outputs over real SDK client; authorization enforced when configured',async()=>{
  const {server,url}=await serve({mcpToken:'test-only-secret'});
  const client = new Client({name:'verification',version:'1.0'});
  try {
    assert.equal((await fetch(url+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,401);
    assert.equal((await fetch(url+'/mcp',{method:'POST',headers:{authorization:'Bearer wrong','content-type':'application/json'},body:'{}'})).status,401);
    await client.connect(new StreamableHTTPClientTransport(new URL(url+'/mcp'),{requestInit:{headers:{authorization:'Bearer test-only-secret'}}}));
    await exercise(client);
  } finally { await client.close(); server.closeAllConnections(); await new Promise(r=>server.close(r)); }
});

test('REST, map dataset and security/error boundaries',async()=>{
 const {server,url}=await serve();
 try {
  const post=(body,headers={})=>fetch(url+'/api/lookup',{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});
  const map=await (await fetch(url+'/api/venues')).json();
  assert.equal(map.venues.length,763);
  assert.equal(map.venues.filter(v=>Number.isFinite(v.latitude)).length,507);
  const nearest=await (await post({operation:'nearest_hotspots',arguments:{query:'319260',limit:5}})).json();
  for(const r of nearest.results){const p=map.venues.find(v=>v.venue_id===r.venue_id);assert(p);assert.equal(p.latitude,r.latitude);assert.equal(p.longitude,r.longitude);}
  assert.equal((await post({operation:'dataset_info',arguments:{}})).status,200);
  assert.equal((await post({operation:'bogus'})).status,400);
  assert.equal((await post({operation:'dataset_info',arguments:null})).status,400);
  assert.equal((await post({operation:'dataset_info',arguments:{},unexpected:1})).status,400);
  assert.equal((await post({operation:'dataset_info'},{origin:'https://evil.example'})).status,403);
  const badHost = await new Promise((resolve,reject)=>{const req=request(url+'/healthz',{headers:{host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
  assert.equal(badHost,403);
  assert.equal((await fetch(url+'/api/lookup',{method:'POST',headers:{'content-type':'application/json'},body:'{'})).status,400);
  assert.equal((await post({operation:'search_hotspots',arguments:{query:'x'.repeat(40000)}})).status,413);
  assert.equal((await fetch(url+'/mcp')).status,405);
  assert.equal((await fetch(url+'/.env')).status,404);
  const page=await fetch(url+'/');assert.equal(page.status,200);assert(page.headers.get('content-security-policy').includes("default-src 'self'"));assert(page.headers.get('content-security-policy').includes('https://tile.openstreetmap.org '));
  assert.equal((await fetch(url+'/healthz')).status,200);
 } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('bounded rate limit returns retry guidance',async()=>{
 const {server,url}=await serve({rateLimit:2});
 try{await fetch(url+'/api/venues');await fetch(url+'/api/venues');const res=await fetch(url+'/api/venues');assert.equal(res.status,429);assert(res.headers.get('retry-after'));}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('legacy public hostname redirects permanently to the canonical hostname',async()=>{
 const {server,url}=await serve({allowedHosts:['wireless.danielk.am','wifiexplorer.danielk.am'],canonicalHost:'wifiexplorer.danielk.am',redirectHosts:['wireless.danielk.am']});
 try {
  const redirected=await new Promise((resolve,reject)=>{const req=request(url+'/mcp?source=legacy',{method:'POST',headers:{host:'wireless.danielk.am'}},res=>{res.resume();resolve({status:res.statusCode,location:res.headers.location});});req.on('error',reject);req.end();});
  assert.deepEqual(redirected,{status:308,location:'https://wifiexplorer.danielk.am/mcp?source=legacy'});
  const canonical=await new Promise((resolve,reject)=>{const req=request(url+'/healthz',{headers:{host:'wifiexplorer.danielk.am'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
  assert.equal(canonical,200);
 } finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
});
