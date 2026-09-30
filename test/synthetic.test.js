// Licence-safe fixtures: invented test places, never shipped as real hotspots.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const dir=mkdtempSync(join(tmpdir(),'wireless-synthetic-'));
const fixture=join(dir,'hotspots.json');
const metadataFixture=join(dir,'metadata.json');
writeFileSync(metadataFixture,JSON.stringify({url:'https://example.org/synthetic',date:'2026-03',sha256:'0'.repeat(64),coordinate_dataset_url:'https://example.org/synthetic',coordinate_dataset_date:'2024-06-06',refresh_mode:'synthetic_test_fixture'}));
const row=(id,address,lat,lng)=>({id:`wsgx-${String(id).padStart(4,'0')}`,serial:id,operator:'M1',location:`Synthetic test venue ${address} Level ${id}`,address:`${address} SYNTHETIC ROAD`,postal_code:`90000${address}`,latitude:lat,longitude:lng,coordinate_source:lat===null?null:'https://example.org/synthetic',coordinate_source_date:lat===null?null:'2024-06-06',source_page:1,source_url:'https://example.org/synthetic',source_date:'2026-03',coverage_radius_m:null,coverage_status:'not_published',operational_status:'unverified'});
writeFileSync(fixture,JSON.stringify([row(1,1,1.3,103.8),row(2,1,1.3,103.8),row(3,2,1.301,103.8),row(4,3,null,null)]));
process.env.HOTSPOTS_DATA_PATH=fixture;
process.env.HOTSPOTS_METADATA_PATH=metadataFixture;
const {lookup,venues}=await import('../src/catalogue.js');
const {createApp}=await import('../src/http.js');

test('synthetic catalogue: stable membership, metre distances, incomplete ranking, unknown origins',()=>{
 assert.equal(venues().length,3);
 const out=lookup('nearest_hotspots',{latitude:1.3,longitude:103.8,limit:5});
 assert.equal(out.results.length,2);assert.equal(out.results[0].distance_m,0);assert.equal(out.results[1].distance_m,111);
 assert.equal(out.unlocated_venue_count,1);assert.equal(out.ranking_complete,false);
 assert.equal(lookup('nearest_hotspots',{query:'Fortune Centre'}).error.code,'ORIGIN_NOT_RESOLVED');
 assert.equal(lookup('search_venues',{query:'900003'}).results[0].latitude,null);
});

test('synthetic real stdio and HTTP MCP transports agree with REST and map',async()=>{
 const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');const url=`http://127.0.0.1:${server.address().port}`;
 const local=new Client({name:'synthetic-ci',version:'1'});const remote=new Client({name:'synthetic-ci',version:'1'});
 try {
  await local.connect(new StdioClientTransport({command:process.execPath,args:['src/stdio.js'],env:{...process.env,HOTSPOTS_DATA_PATH:fixture,HOTSPOTS_METADATA_PATH:metadataFixture},stderr:'pipe'}));
  await remote.connect(new StreamableHTTPClientTransport(new URL(url+'/mcp')));
  assert.equal((await local.listTools()).tools.length,5);
  const args={latitude:1.3,longitude:103.8,limit:5};
  const a=await local.callTool({name:'nearest_hotspots',arguments:args});
  const b=await remote.callTool({name:'nearest_hotspots',arguments:args});assert.deepEqual(a.structuredContent,b.structuredContent);
  const rest=await (await fetch(url+'/api/lookup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation:'nearest_hotspots',arguments:args})})).json();
  assert.deepEqual(rest,a.structuredContent);
  const map=await(await fetch(url+'/api/venues')).json();assert.equal(map.venues.length,3);
  for(const r of rest.results){assert.equal(map.venues.find(v=>v.venue_id===r.venue_id).latitude,r.latitude);}
 }finally{await local.close();await remote.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test.after(()=>rmSync(dir,{recursive:true,force:true}));
