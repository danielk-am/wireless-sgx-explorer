import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const dataPath = process.env.HOTSPOTS_DATA_PATH || new URL('../data/hotspots.json', import.meta.url);
const metadataPath = process.env.HOTSPOTS_METADATA_PATH || new URL('../data/metadata.json', import.meta.url);
if (process.env.HOTSPOTS_DATA_PATH && !process.env.HOTSPOTS_METADATA_PATH) {
  throw new Error('HOTSPOTS_METADATA_PATH is required with HOTSPOTS_DATA_PATH so custom data cannot inherit the bundled provenance.');
}
function requireData(condition, message) {
  if (!condition) throw new Error(`Invalid hotspot catalogue: ${message}`);
}
function validDate(value, allowMonth=false) {
  if (typeof value!=='string') return false;
  if (allowMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed=new Date(value);return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
function httpsUrl(value) {
  try { const url=new URL(value);return typeof value==='string'&&url.protocol==='https:'&&!url.username&&!url.password; } catch { return false; }
}
let records, metadata;
try {
  const bytes=readFileSync(dataPath);
  records=JSON.parse(bytes.toString('utf8'));
  metadata=JSON.parse(readFileSync(metadataPath,'utf8'));
  requireData(Array.isArray(records)&&records.length>0,'expected a nonempty JSON array of hotspot entries.');
  requireData(metadata&&typeof metadata==='object'&&!Array.isArray(metadata),'metadata must be an object.');
  requireData(httpsUrl(metadata.url),'metadata.url must be an absolute HTTPS source URL.');
  requireData(validDate(metadata.date,true),'metadata.date must be a valid YYYY-MM or YYYY-MM-DD date.');
  requireData(typeof metadata.sha256==='string'&&/^[a-f0-9]{64}$/.test(metadata.sha256),'metadata.sha256 must be the source SHA-256 digest.');
  requireData(httpsUrl(metadata.coordinate_dataset_url),'metadata.coordinate_dataset_url must be an absolute HTTPS URL.');
  requireData(validDate(metadata.coordinate_dataset_date),'metadata.coordinate_dataset_date must be a valid YYYY-MM-DD date.');
  requireData(typeof metadata.refresh_mode==='string'&&metadata.refresh_mode.trim().length>0,'metadata.refresh_mode is required.');
  if (metadata.retrieved_at!==undefined) requireData(validDate(metadata.retrieved_at),'metadata.retrieved_at must be a valid YYYY-MM-DD date.');
  if (metadata.catalogue_sha256!==undefined) requireData(typeof metadata.catalogue_sha256==='string'&&/^[a-f0-9]{64}$/.test(metadata.catalogue_sha256)&&createHash('sha256').update(bytes).digest('hex')===metadata.catalogue_sha256,'catalogue_sha256 does not match the exact catalogue JSON bytes.');
  const ids=new Set(), serials=new Set();
  for (const r of records) {
    requireData(r&&typeof r==='object'&&!Array.isArray(r),'each row must be an object.');
    requireData(typeof r.id==='string'&&/^wsgx-\d{4}$/.test(r.id)&&!ids.has(r.id),'row IDs must be unique wsgx-NNNN strings.');ids.add(r.id);
    requireData(Number.isInteger(r.serial)&&r.serial>0&&!serials.has(r.serial),`${r.id}: serial must be unique and positive.`);serials.add(r.serial);
    for (const field of ['location','address']) requireData(typeof r[field]==='string'&&r[field].trim().length>0,`${r.id}: ${field} is required.`);
    requireData(typeof r.postal_code==='string'&&/^\d{6}$/.test(r.postal_code),`${r.id}: postal_code must contain six digits.`);
    requireData(['M1','Singtel','StarHub'].includes(r.operator),`${r.id}: unknown operator.`);
    requireData(Number.isInteger(r.source_page)&&r.source_page>0,`${r.id}: source_page must be positive.`);
    requireData(r.source_url===metadata.url&&r.source_date===metadata.date,`${r.id}: source provenance differs from metadata.`);
    const missing=r.latitude===null&&r.longitude===null;
    requireData(missing||(Number.isFinite(r.latitude)&&Number.isFinite(r.longitude)&&r.latitude>=1.1&&r.latitude<=1.5&&r.longitude>=103.5&&r.longitude<=104.2),`${r.id}: coordinates must both be null or finite numbers within Singapore bounds.`);
    requireData(missing?(r.coordinate_source===null&&r.coordinate_source_date===null):(r.coordinate_source===metadata.coordinate_dataset_url&&r.coordinate_source_date===metadata.coordinate_dataset_date),`${r.id}: coordinate provenance differs from metadata or missing-coordinate status.`);
    requireData(r.coverage_radius_m===null&&r.coverage_status==='not_published'&&r.operational_status==='unverified',`${r.id}: unsupported coverage or live-status claims.`);
  }
} catch (cause) {
  throw new Error(`Cannot load hotspot catalogue and metadata. Supply authorised data and its companion metadata. ${cause.message}`, { cause });
}
const normalize = s => String(s).normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const aliases = {rd:'road',st:'street',ave:'avenue',blk:'block',ctr:'centre',center:'centre',blvd:'boulevard'};
const searchable = s => normalize(s).split(' ').map(t => aliases[t] || t).join(' ');
const point = r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude);
const groupKey = r => `${normalize(r.address)}|${r.postal_code}`;
const maps = r => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.address}, Singapore ${r.postal_code}`)}`;
const basic = r => ({...r,hotspot_id:r.id,source_serial:r.serial,google_maps_url:maps(r)});
const groups = new Map();
for (const r of records) { const k=groupKey(r); if (!groups.has(k)) groups.set(k,[]); groups.get(k).push(r); }
const venueRecords = [...groups].map(([key, rows]) => {
  // Stable source-order representative, never chosen relative to a search origin.
  const first=rows[0], representative=rows.find(point);
  return {venue_id:`venue-${createHash('sha256').update(key).digest('hex').slice(0,16)}`,
    name:first.location,address:first.address,postal_code:first.postal_code,
    latitude:representative?.latitude??null,longitude:representative?.longitude??null,
    coordinate_source:representative?.coordinate_source??null,coordinate_source_date:representative?.coordinate_source_date??null,
    coordinate_precision:representative?'venue_representative_point':null,
    coordinate_status:representative?'historical_imda_match':'unlocated',
    listed_hotspot_count:rows.length,hotspots:rows.map(basic),operators:[...new Set(rows.map(r=>r.operator))],
    google_maps_url:maps(first),coverage_radius_m:null,coverage_status:'not_published',operational_status:'unverified'};
});
const mapped=venueRecords.filter(point);
const coverage = {
  ranking_complete:mapped.length===venueRecords.length,
  unlocated_entry_count:records.filter(r=>!point(r)).length,
  unlocated_venue_count:venueRecords.length-mapped.length,
  rankable_venue_count:mapped.length,
};
const common = {
  source:metadata,
  catalogue_date:metadata.date,
  coordinate_dataset_date:metadata.coordinate_dataset_date,
  coverage_note:'Pins and distances represent venues, not exact indoor access points or measured Wi-Fi coverage. Signal radius, live availability, public access, seating and power are unverified. Check the listed floor and location.',
  google_maps_data_status:'links_only_no_live_google_api',
  walking_distance_m:null,
};
function info() { return {ok:true,...common,...coverage,entry_count:records.length,venue_count:venueRecords.length,entries_with_coordinates:records.filter(point).length,venues_with_coordinates:mapped.length}; }
export function datasetInfo() { return structuredClone(info()); }
export function venues() { return structuredClone(venueRecords); }
const error = (code,message,extra={}) => ({ok:false,error:{code,message},...extra});
function queryError(q) { return typeof q!=='string'||!q.trim()||q.length>200||!normalize(q); }
const matches = (q,s) => searchable(q).split(' ').every(t=>searchable(s).includes(t));
const venueText = v => `${v.address} ${v.postal_code} ${v.hotspots.map(r=>r.location).join(' ')}`;
function distance(p,q) {
  const rad=Math.PI/180;
  const h=Math.sin((q.latitude-p.latitude)*rad/2)**2 + Math.cos(p.latitude*rad)*Math.cos(q.latitude*rad)*Math.sin((q.longitude-p.longitude)*rad/2)**2;
  return 6371008.8*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
function run(operation,a) {
  if (!a || typeof a!=='object' || Array.isArray(a)) return error('INVALID_INPUT','arguments must be an object.');
  const operationFields={dataset_info:[],get_hotspot:['hotspot_id'],search_hotspots:['query','limit','operator'],search_venues:['query','limit'],nearest_hotspots:['query','latitude','longitude','limit','radius_m']};
  const fields=Object.hasOwn(operationFields,operation)?operationFields[operation]:undefined;
  if (!fields) return error('UNKNOWN_OPERATION','Use dataset_info, get_hotspot, search_hotspots, search_venues or nearest_hotspots.');
  if (Object.keys(a).some(k=>!fields.includes(k))) return error('INVALID_INPUT',`Unsupported argument for ${operation}.`);
  const limit=a.limit??5;
  if (a.limit!==undefined && (!Number.isInteger(a.limit)||a.limit<1||a.limit>20)) return error('INVALID_LIMIT','limit must be an integer from 1 to 20.');
  if (operation==='dataset_info') return info();
  if (operation==='get_hotspot') {
    if (typeof a.hotspot_id!=='string'||!/^wsgx-\d{4}$/.test(a.hotspot_id)) return error('INVALID_ID','Use a hotspot_id returned by a catalogue search.');
    const r=records.find(r=>r.id===a.hotspot_id);
    return r?{ok:true,...common,hotspot:basic(r)}:error('NOT_FOUND','No hotspot has that ID.');
  }
  if (operation==='search_hotspots'||operation==='search_venues') {
    if(queryError(a.query)) return error('INVALID_QUERY','query must contain letters or numbers and be 1–200 characters.');
    if(a.operator!==undefined&&!['M1','Singtel','StarHub'].includes(a.operator)) return error('INVALID_OPERATOR','operator must be M1, Singtel or StarHub.');
    const result=operation==='search_venues'?venueRecords.filter(v=>matches(a.query,venueText(v))):records.filter(r=>(!a.operator||a.operator===r.operator)&&matches(a.query,`${r.location} ${r.address} ${r.postal_code}`)).map(basic);
    return {ok:true,...common,total_matches:result.length,returned:Math.min(result.length,limit),results:result.slice(0,limit)};
  }
  if(a.radius_m!==undefined&&(typeof a.radius_m!=='number'||!Number.isFinite(a.radius_m)||a.radius_m<0||a.radius_m>50000)) return error('INVALID_RADIUS','radius_m must be between 0 and 50000; it is a search radius, not signal coverage.');
  let origin;
  if(a.latitude!==undefined||a.longitude!==undefined) {
    if(a.query!==undefined) return error('CONFLICTING_ORIGIN','Provide query or coordinates, not both.');
    if(!Number.isFinite(a.latitude)||!Number.isFinite(a.longitude)) return error('INVALID_COORDINATES','Provide finite numeric latitude and longitude.');
    if(a.latitude<1.1||a.latitude>1.5||a.longitude<103.5||a.longitude>104.2) return error('OUTSIDE_SERVICE_AREA','Coordinates must fall in the Singapore search bounds (latitude 1.1–1.5, longitude 103.5–104.2).');
    origin={latitude:a.latitude,longitude:a.longitude,source:'caller_supplied_coordinates'};
  } else {
    if(queryError(a.query)) return error('ORIGIN_REQUIRED','Provide numeric latitude and longitude, or a catalogue address, postal code or location.');
    const q=searchable(a.query);
    const exact=venueRecords.filter(v=>[v.address,v.postal_code,...v.hotspots.map(r=>r.location)].some(s=>searchable(s)===q));
    const candidates=exact.length?exact:venueRecords.filter(v=>matches(a.query,venueText(v)));
    if(!candidates.length) return error('ORIGIN_NOT_RESOLVED','This location is not in the catalogue. Supply coordinates from a map; no live geocoder is configured.');
    if(candidates.length>1) return error('AMBIGUOUS_ORIGIN','Choose a specific address or postal code.',{candidate_count:candidates.length,candidates:candidates.slice(0,10).map(v=>({venue_id:v.venue_id,name:v.name,address:v.address,postal_code:v.postal_code,has_coordinates:point(v)}))});
    const v=candidates[0];
    if(!point(v)) return error('ORIGIN_COORDINATES_UNAVAILABLE','This venue is listed but has no coordinate in the shared catalogue. Supply coordinates from a map.',{venue_id:v.venue_id});
    origin={latitude:v.latitude,longitude:v.longitude,query:a.query,venue_id:v.venue_id,resolved_address:v.address,postal_code:v.postal_code,source:v.coordinate_source,coordinate_source_date:v.coordinate_source_date};
  }
  const ranked=mapped.map(v=>({v,d:distance(origin,v)})).filter(({d})=>a.radius_m===undefined||d<=a.radius_m).sort((x,y)=>x.d-y.d||x.v.venue_id.localeCompare(y.v.venue_id));
  return {ok:true,origin,ranking:'straight_line_distance_to_matched_venue_coordinate',search_radius_m:a.radius_m??null,total_matching_venues:ranked.length,returned:Math.min(limit,ranked.length),results:ranked.slice(0,limit).map(({v,d})=>({...v,distance_m:Math.round(d),walking_distance_m:null,google_walking_directions_url:`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${origin.latitude},${origin.longitude}`)}&destination=${encodeURIComponent(`${v.address}, Singapore ${v.postal_code}`)}&travelmode=walking`}))};
}
export function lookup(operation, argumentsObject={}) {
  const result=run(operation,argumentsObject);
  return structuredClone(operation==='nearest_hotspots'?{...common,...coverage,...result}:result);
}
