import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const cwd=new URL('../',import.meta.url);
const env={...process.env,HOTSPOTS_DATA_PATH:new URL('../data/public-hotspots.json',import.meta.url).pathname,HOTSPOTS_METADATA_PATH:new URL('../data/public-metadata.json',import.meta.url).pathname};
const bytes=readFileSync(env.HOTSPOTS_DATA_PATH), rows=JSON.parse(bytes), metadata=JSON.parse(readFileSync(env.HOTSPOTS_METADATA_PATH));
function run(code){return JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',`import {datasetInfo,venues,lookup} from './src/catalogue.js';${code}`],{cwd,env,encoding:'utf8'}));}

test('public snapshot is wholly open GeoJSON, with honest dates and no PDF membership',()=>{
 assert.equal(rows.length,1800);assert.equal(metadata.source_format,'geojson');
 assert.equal(metadata.catalogue_sha256,createHash('sha256').update(bytes).digest('hex'));
 assert.equal(metadata.date,'2024-06-06');assert.equal(metadata.source_feature_updated_at,'2020-03-18');
 assert.equal(metadata.license_url,'https://data.gov.sg/open-data-licence');
 assert.equal(new Set(rows.map(r=>r.source_feature_id)).size,1800);
 for(const r of rows){assert.equal(r.source_page,null);assert.equal(r.source_url,metadata.url);assert.equal(r.source_date,metadata.date);assert.equal(r.source_feature_updated_at,'20200318162531');}
 assert.equal(rows.filter(r=>r.address==='').length,2);
});
test('public map and nearest results share all 1306 deterministic venue points',()=>{
 const result=run(`const info=datasetInfo(), pins=venues().map(({venue_id,latitude,longitude})=>({venue_id,latitude,longitude})), nearest=lookup('nearest_hotspots',{query:'188979',limit:20});console.log(JSON.stringify({info,pins,nearest}));`);
 assert.equal(result.info.venue_count,1306);assert.equal(result.info.venues_with_coordinates,1306);assert.equal(result.info.ranking_complete,true);
 assert.equal(result.nearest.ok,true);assert.equal(result.nearest.results[0].distance_m,0);
 for(const r of result.nearest.results){const p=result.pins.find(p=>p.venue_id===r.venue_id);assert.equal(p.latitude,r.latitude);assert.equal(p.longitude,r.longitude);}
 assert.match(result.nearest.results[0].name,/Acctrain/i);
});
test('historic MyRepublic entries remain searchable and accepted by MCP schema',()=>{
 const result=run(`console.log(JSON.stringify(lookup('search_hotspots',{query:'a',operator:'MyRepublic',limit:20})));`);
 assert.equal(result.ok,true);assert.ok(result.results.length>0);assert.ok(result.results.every(r=>r.operator==='MyRepublic'));
 const mcp=run(`
 import {Client} from '@modelcontextprotocol/sdk/client/index.js';
 import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
 import {createMcpServer} from './src/mcp.js';
 const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
 const server=createMcpServer(),client=new Client({name:'public-catalogue-test',version:'1.0.0'});
 await server.connect(serverTransport);await client.connect(clientTransport);
 const result=await client.callTool({name:'search_hotspots',arguments:{query:'a',operator:'MyRepublic',limit:2}});
 console.log(JSON.stringify(result));await client.close();await server.close();`);
 assert.equal(mcp.isError,false);assert.equal(mcp.structuredContent.ok,true);assert.ok(mcp.structuredContent.results.every(r=>r.operator==='MyRepublic'));
});
