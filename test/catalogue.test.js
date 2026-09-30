import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {lookup,datasetInfo,venues} from '../src/catalogue.js';
const source=JSON.parse(readFileSync(new URL('../data/hotspots.json',import.meta.url)));
const all=venues();
const located=all.filter(v=>v.latitude!==null);
const missing=all.filter(v=>v.latitude===null);
test('preserves all source membership with stable unique venue IDs',()=>{
  assert.equal(all.length,763); assert.equal(located.length,507); assert.equal(missing.length,256);
  const ids=all.flatMap(v=>v.hotspots.map(h=>h.hotspot_id));
  assert.equal(ids.length,3855); assert.equal(new Set(ids).size,3855);
  assert.deepEqual(ids.slice().sort(),source.map(r=>r.id).sort());
  assert.equal(new Set(all.map(v=>v.venue_id)).size,763);
  assert.equal(all.reduce((n,v)=>n+v.listed_hotspot_count,0),3855);
  for(const v of all) for(const h of v.hotspots) assert.equal(h.postal_code,v.postal_code);
});
test('metadata states incomplete historic coordinate coverage',()=>{
 const info=datasetInfo(); assert.equal(info.entry_count,3855); assert.equal(info.entries_with_coordinates,2725);
 assert.equal(info.unlocated_entry_count,1130); assert.equal(info.unlocated_venue_count,256); assert.equal(info.ranking_complete,false);
 assert.equal(info.catalogue_date,'2026-03'); assert.equal(info.coordinate_dataset_date,'2024-06-06');
});
test('Fortune Centre and historical-only venues never become current catalogue results',()=>{
 for(const query of ['Acctrain Academy','155 Waterloo Street','National Design Centre','Fortune Centre']) assert.equal(lookup('search_hotspots',{query}).total_matches,0,query);
 assert.equal(lookup('nearest_hotspots',{query:'188979'}).error.code,'ORIGIN_NOT_RESOLVED');
 assert.ok(lookup('search_hotspots',{query:'Albert Centre'}).total_matches>0);
});
test('map representatives and nearest output coordinates are identical and origin is zero',()=>{
 const v=located[0]; const result=lookup('nearest_hotspots',{latitude:v.latitude,longitude:v.longitude,limit:20});
 const match=result.results.find(x=>x.venue_id===v.venue_id); assert.equal(match.distance_m,0);
 for(const r of result.results){const pin=all.find(v=>v.venue_id===r.venue_id); assert.equal(r.latitude,pin.latitude);assert.equal(r.longitude,pin.longitude);assert.deepEqual(r.hotspots,pin.hotspots);}
 assert.equal(result.ranking_complete,false); assert.equal(result.unlocated_venue_count,256);
});
test('distances and ordering agree with independent spherical cosine calculation',()=>{
 const latitude=1.3006,longitude=103.853; const rad=Math.PI/180;
 const expected=located.map(v=>({id:v.venue_id,d:6371008.8*Math.acos(Math.min(1,Math.max(-1,Math.sin(latitude*rad)*Math.sin(v.latitude*rad)+Math.cos(latitude*rad)*Math.cos(v.latitude*rad)*Math.cos((v.longitude-longitude)*rad))))})).sort((a,b)=>a.d-b.d);
 const actual=lookup('nearest_hotspots',{latitude,longitude,limit:20});
 assert.deepEqual(actual.results.map(r=>r.venue_id),expected.slice(0,20).map(r=>r.id));
 actual.results.forEach((r,i)=>assert.ok(Math.abs(r.distance_m-expected[i].d)<=0.51));
 const radius=100;const within=lookup('nearest_hotspots',{latitude,longitude,radius_m:radius}); assert.equal(within.total_matching_venues,expected.filter(r=>r.d<=radius).length);
});
test('unlocated venues stay searchable and return honest origin error',()=>{
 const v=missing.find(v=>all.filter(x=>x.postal_code===v.postal_code).length===1);
 const search=lookup('search_venues',{query:v.postal_code});assert.equal(search.results[0].latitude,null);
 const nearest=lookup('nearest_hotspots',{query:v.postal_code});assert.equal(nearest.error.code,'ORIGIN_COORDINATES_UNAVAILABLE');assert.equal(nearest.unlocated_venue_count,256);
});
test('address abbreviations resolve aliases, broad origins require clarification',()=>{
 const v=located.find(v=>v.address.includes(' ROAD')&&all.filter(x=>x.address===v.address).length===1);
 const result=lookup('nearest_hotspots',{query:v.address.replace(/ ROAD/g,' RD')});assert.equal(result.ok,true);assert.equal(result.origin.venue_id,v.venue_id);
 assert.equal(lookup('nearest_hotspots',{query:'road'}).error.code,'AMBIGUOUS_ORIGIN');
});
test('strict input validation handles null, unknown fields, non-finite and reversed coordinates',()=>{
 for(const value of [null,[],2,'x'])assert.equal(lookup('nearest_hotspots',value).ok,false);
 for(const op of ['wat','__proto__','constructor'])assert.equal(lookup(op,{}).error.code,'UNKNOWN_OPERATION');
 for(const limit of [null,0,21,1.2,'5']) assert.equal(lookup('search_hotspots',{query:'road',limit}).error.code,'INVALID_LIMIT');
 for(const latitude of [NaN,Infinity,'1.3',null])assert.equal(lookup('nearest_hotspots',{latitude,longitude:103.8}).error.code,'INVALID_COORDINATES');
 assert.equal(lookup('nearest_hotspots',{latitude:103.8,longitude:1.3}).error.code,'OUTSIDE_SERVICE_AREA');
 assert.equal(lookup('nearest_hotspots',{latitude:1.3,longitude:103.8,query:'road'}).error.code,'CONFLICTING_ORIGIN');
 assert.equal(lookup('nearest_hotspots',{latitude:1.3,longitude:103.8,radius_m:-1}).error.code,'INVALID_RADIUS');
 assert.equal(lookup('search_venues',{query:'!!!'}).error.code,'INVALID_QUERY');
 assert.equal(lookup('dataset_info',{latitude:1.3}).error.code,'INVALID_INPUT');
});
test('boundary coordinates are accepted without claiming Singapore land containment',()=>{
 for(const latitude of [1.1,1.5])for(const longitude of [103.5,104.2])assert.equal(lookup('nearest_hotspots',{latitude,longitude,limit:1}).ok,true);
});
test('outputs cannot mutate shared catalogue or metadata',()=>{
 const result=venues();result[0].hotspots[0].location='poison';result[0].latitude=0;
 assert.notEqual(venues()[0].hotspots[0].location,'poison');assert.notEqual(venues()[0].latitude,0);
 const info=datasetInfo();info.source.date='poison';assert.equal(datasetInfo().source.date,'2026-03');
 const one=lookup('get_hotspot',{hotspot_id:'wsgx-0001'});one.hotspot.location='poison';assert.notEqual(lookup('get_hotspot',{hotspot_id:'wsgx-0001'}).hotspot.location,'poison');
});
test('full hotspot detail and explicit uncertainties remain on grouped results',()=>{
 const v=all.find(v=>v.hotspots.length>20);const result=lookup('search_venues',{query:v.postal_code,limit:20}).results.find(x=>x.venue_id===v.venue_id);
 assert.equal(result.hotspots.length,v.listed_hotspot_count);assert.equal(result.coverage_radius_m,null);assert.equal(result.operational_status,'unverified');
 assert.ok(result.hotspots.every(h=>h.source_page>0&&h.source_url.startsWith('https://www.imda.gov.sg/')));
});

test('custom data requires companion provenance and rejects unsafe or contradictory rows at startup',()=>{
 const dir=mkdtempSync(join(tmpdir(),'catalogue-validation-'));
 const dataPath=join(dir,'hotspots.json'),metadataPath=join(dir,'metadata.json');
 const originalMetadata=JSON.parse(readFileSync(new URL('../data/metadata.json',import.meta.url)));
 const metadata={...originalMetadata};delete metadata.catalogue_sha256;
 const row=structuredClone(source[0]);
 const child=(rows,meta=metadata,withMetadata=true)=>{
  writeFileSync(dataPath,JSON.stringify(rows));writeFileSync(metadataPath,JSON.stringify(meta));
  const env={...process.env,HOTSPOTS_DATA_PATH:dataPath};delete env.HOTSPOTS_METADATA_PATH;if(withMetadata)env.HOTSPOTS_METADATA_PATH=metadataPath;
  return spawnSync(process.execPath,['--input-type=module','-e',"import {datasetInfo} from './src/catalogue.js';process.stdout.write(JSON.stringify(datasetInfo()));"],{cwd:new URL('../',import.meta.url),env,encoding:'utf8'});
 };
 try {
  assert.equal(child([row]).status,0);
  const missing=child([row],metadata,false);assert.notEqual(missing.status,0);assert.match(missing.stderr,/HOTSPOTS_METADATA_PATH is required/);
  const rowCases=[
   [{...row,latitude:90}], [{...row,longitude:null}], [{...row,latitude:'1.3'}],
   [row,row], [{...row,source_url:'https://example.org/wrong'}],
   [{...row,coordinate_source_date:'2025-01-01'}], [{...row,address:''}],
   [{...row,postal_code:123456}], [{...row,coverage_radius_m:100}],
   [{...row,latitude:null,longitude:null}],
  ];
  for(const rows of rowCases)assert.notEqual(child(rows).status,0,JSON.stringify(rows));
  for(const patch of [{date:'2026-13'},{coordinate_dataset_date:'2024-02-30'},{url:'http://example.org/source'},{sha256:'abc'},{refresh_mode:''},{catalogue_sha256:'0'.repeat(64)}])assert.notEqual(child([row],{...metadata,...patch}).status,0,JSON.stringify(patch));
  const digest=createHash('sha256').update(JSON.stringify([row])).digest('hex');assert.equal(child([row],{...metadata,catalogue_sha256:digest}).status,0);
  const unlocated={...row,latitude:null,longitude:null,coordinate_source:null,coordinate_source_date:null};assert.equal(child([unlocated]).status,0);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
