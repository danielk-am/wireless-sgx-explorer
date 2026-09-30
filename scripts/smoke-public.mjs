import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const base = new URL(process.argv[2] || 'http://127.0.0.1:3001');
assert.ok(['http:', 'https:'].includes(base.protocol));
const get = async path => { const response = await fetch(new URL(path, base), {signal: AbortSignal.timeout(20000)}); assert.equal(response.status, 200, path); return response.json(); };
const health = await get('/healthz'); assert.equal(health.ok, true);
const map = await get('/api/venues');
assert.equal(map.metadata.entry_count, 1800); assert.equal(map.venues.length, 1306);
assert.equal(map.metadata.source.source_format, 'geojson');
assert.equal(map.metadata.source.source_feature_updated_at, '2020-03-18');
assert.equal(map.metadata.source.license_url, 'https://data.gov.sg/open-data-licence');
assert.ok(map.venues.every(v => v.hotspots.every(h => h.source_page === null)));
const client = new Client({name: 'public-deployment-smoke', version: '1.0.0'});
try {
 await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', base)));
 const tools = await client.listTools(); assert.equal(tools.tools.length, 5);
 const info = (await client.callTool({name:'dataset_info',arguments:{}})).structuredContent;
 assert.deepEqual(info, map.metadata);
 const args={query:'188979',limit:5};
 const nearby = (await client.callTool({name:'nearest_hotspots',arguments:args})).structuredContent;
 assert.equal(nearby.ok,true); assert.equal(nearby.results.length,5);
 const response=await fetch(new URL('/api/lookup',base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation:'nearest_hotspots',arguments:args})});
 assert.equal(response.status,200); assert.deepEqual(await response.json(),nearby);
 for(const result of nearby.results){const pin=map.venues.find(v=>v.venue_id===result.venue_id);assert.ok(pin);assert.equal(pin.latitude,result.latitude);assert.equal(pin.longitude,result.longitude);}
 const denied=await fetch(new URL('/api/dataset',base),{headers:{Origin:'https://untrusted.example'}});assert.equal(denied.status,403);
 console.log(JSON.stringify({ok:true,url:base.origin,entries:1800,venues:1306,mcp_tools:5,map_rest_mcp_agree:true,source_record_date:'2020-03-18',origin_rejection:403},null,2));
} finally { await client.close(); }
