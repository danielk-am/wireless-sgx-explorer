import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { datasetInfo, venues, lookup } from '../src/catalogue.js';
const rows=JSON.parse(readFileSync(process.env.HOTSPOTS_DATA_PATH || new URL('../data/hotspots.json',import.meta.url)));
const metadata=JSON.parse(readFileSync(process.env.HOTSPOTS_METADATA_PATH || new URL('../data/metadata.json',import.meta.url)));
assert.match(metadata.sha256,/^[a-f0-9]{64}$/);
assert.match(metadata.date,/^\d{4}-\d{2}(?:-\d{2})?$/);
const ids=new Set();
for(const r of rows){
 assert.match(r.id,/^wsgx-\d{4}$/);assert.ok(!ids.has(r.id),`Duplicate ${r.id}`);ids.add(r.id);
 for(const k of ['location','address','postal_code','operator','source_url','source_date'])assert.ok(typeof r[k]==='string'&&r[k].length,`${r.id}: ${k}`);
 assert.match(r.postal_code,/^\d{6}$/);assert.ok(Number.isInteger(r.source_page)&&r.source_page>0);
 assert.equal(r.source_url,metadata.url);assert.equal(r.source_date,metadata.date);
 assert.equal(r.coverage_radius_m,null);assert.equal(r.coverage_status,'not_published');assert.equal(r.operational_status,'unverified');
 assert.equal(r.latitude===null,r.longitude===null);
 if(r.latitude!==null){assert.ok(r.latitude>=1.1&&r.latitude<=1.5);assert.ok(r.longitude>=103.5&&r.longitude<=104.2);assert.equal(r.coordinate_source,metadata.coordinate_dataset_url);assert.equal(r.coordinate_source_date,metadata.coordinate_dataset_date);}
}
const pins=venues();assert.equal(pins.reduce((n,v)=>n+v.hotspots.length,0),rows.length);
const info=datasetInfo();
if (!process.env.HOTSPOTS_DATA_PATH) {
 assert.equal(info.entry_count,3855);assert.equal(info.venue_count,763);assert.equal(info.venues_with_coordinates,507);
 assert.equal(lookup('nearest_hotspots',{query:'188979'}).error.code,'ORIGIN_NOT_RESOLVED');
}
console.log(JSON.stringify({ok:true,entries:rows.length,venues:pins.length,mapped_venues:info.venues_with_coordinates,unlocated_venues:info.unlocated_venue_count,source_date:metadata.date,coordinate_date:metadata.coordinate_dataset_date},null,2));
