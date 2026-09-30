#!/usr/bin/env python3
"""Import the exact March 2026 snapshot from operator-supplied sources.
No network fetches, no data publishing, no historical-only membership additions.
"""
import argparse, hashlib, html, json, math, re
from collections import Counter, defaultdict
from pathlib import Path
import pymupdf
PDF_URL='https://www.imda.gov.sg/assets/9a4b742c-3a3f-4ce7-ae22-b5bb421fcdfb.pdf'
GEO_URL='https://data.gov.sg/datasets/d_d8644084f8b54f851a1acbb2f04d5089/view'
EXPECTED_SHA='0b40c373a802651269501fe80ee547160e4b26eb04fc63550edf414dd492be25'
def norm(s):
    s=re.sub(r'[^A-Z0-9 ]',' ',s.upper())
    substitutions={'RD':'ROAD','ST':'STREET','AVE':'AVENUE','CTRL':'CENTRAL','CTR':'CENTRE','BT':'BUKIT','JLN':'JALAN','LOR':'LORONG','DR':'DRIVE','CRES':'CRESCENT','BLK':'BLOCK','UPP':'UPPER','NTH':'NORTH','STH':'SOUTH'}
    return ' '.join(substitutions.get(x,x) for x in s.split())
def dist(a,b):
    lat1,lon1,lat2,lon2=map(math.radians,[a[1],a[0],b[1],b[0]])
    h=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lon2-lon1)/2)**2
    return 6371008.8*2*math.asin(min(1,math.sqrt(h)))
def extract(pdf):
    doc=pymupdf.open(pdf); rows=[]; page_counts=[]
    for pidx,page in enumerate(doc):
        tables=page.find_tables().tables
        assert len(tables)==1,(pidx,len(tables))
        table=tables[0].extract(); count=0; page_text=' '.join(page.get_text().split()); textpage=page.get_textpage(); table_rows=tables[0].rows
        for row_idx,raw in enumerate(table[1:],1):
            assert len(raw)==5,(pidx,raw)
            clean=[' '.join((v or '').split()) for v in raw]
            for ci,value in enumerate(clean):
                if value not in page_text:
                    clean[ci]=' '.join(page.get_textbox(table_rows[row_idx].cells[ci],textpage=textpage).split())
            # PDF text order preserves low-baseline characters such as underscore.
            assert all(v in page_text for v in clean),(pidx,clean)
            serial,operator,location,address,postal=clean
            assert serial.isdigit(),(pidx,raw)
            rows.append({'id':f'wsgx-{int(serial):04d}','serial':int(serial),'operator':operator,'location':location,'address':address,'postal_code':postal,'source_page':pidx+1,'source_url':PDF_URL,'source_date':'2026-03','latitude':None,'longitude':None,'coordinate_source':None,'coordinate_source_date':None,'coordinate_match_basis':None,'coordinate_precision':'unknown','coverage_radius_m':None,'coverage_status':'not_published','operational_status':'unverified'})
            count+=1
        page_counts.append(count)
    assert [r['serial'] for r in rows]==list(range(1,3856))
    for r in rows:
        assert r['operator'] and r['location'] and r['address'],r
    return rows,page_counts

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--pdf', type=Path, required=True)
    p.add_argument('--coordinates', type=Path, help='Historical IMDA GeoJSON dated 6 June 2024; optional')
    p.add_argument('--metadata-output', type=Path, help='Companion metadata output (default: metadata.json beside catalogue)')
    p.add_argument('--output', type=Path, default=Path(__file__).resolve().parent.parent/'data/hotspots.json')
    args=p.parse_args()
    digest=hashlib.sha256(args.pdf.read_bytes()).hexdigest()
    if digest!=EXPECTED_SHA:
        raise SystemExit('Source differs from validated March 2026 snapshot. Review extraction and source dates before updating; refusing to mislabel newer data.')
    rows,page_counts=extract(args.pdf)
    geo=json.loads(args.coordinates.read_text()) if args.coordinates else {'features':[]}
    index=defaultdict(list); records=[]
    for f in geo['features']:
        pairs=re.findall(r'<th>(.*?)</th>\s*<td>(.*?)</td>',f['properties']['Description'],re.S)
        attrs={html.unescape(k).strip():html.unescape(v).strip() for k,v in pairs}
        coords=f['geometry']['coordinates'][:2]
        assert 103<coords[0]<105 and 1<coords[1]<2,coords
        rec={'name':attrs['LOCATION_NAME'],'address':attrs['STREET_ADDRESS'],'postal':attrs['POSTAL_CODE'],'coords':coords,'feature_id':f['properties']['Name']}
        records.append(rec); index[rec['postal']].append(rec)
    counts=Counter(); unmatched=[]
    for r in rows:
        candidates=index.get(r['postal_code'],[])
        exact=[x for x in candidates if norm(x['address'])==norm(r['address'])]
        basis='postal_and_normalized_address'
        if not exact:
            counts['no_matching_address']+=1; unmatched.append(r['serial']); continue
        points=exact
        # Use exact normalized location to resolve distinct venues at the same address when possible.
        same_name=[x for x in exact if norm(x['name'])==norm(r['location'])]
        if same_name:
            points=same_name; basis+='_and_location'
        spread=max((dist(a['coords'],b['coords']) for a in points for b in points),default=0)
        if spread>75:
            counts['ambiguous_coordinates']+=1; unmatched.append(r['serial']); continue
        # Preserve a source point rather than inventing a centroid.
        chosen=points[0]
        r.update(latitude=chosen['coords'][1],longitude=chosen['coords'][0],coordinate_source=GEO_URL,coordinate_source_date='2024-06-06',coordinate_match_basis=basis,coordinate_precision='venue_representative_point',coordinate_feature_id=chosen['feature_id'],coordinate_candidate_spread_m=round(spread,1))
        counts['matched']+=1
    quality={'source_pdf_url':PDF_URL,'source_date':'2026-03','source_sha256':digest,'page_count':len(page_counts),'rows':len(rows),'page_row_counts':page_counts,'coordinate_dataset_url':GEO_URL if args.coordinates else None,'coordinate_dataset_date':'2024-06-06' if args.coordinates else None,'coordinate_join_counts':dict(counts),'unmatched_serials':unmatched}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    # Atomic replacement after every row and join has been checked.
    temp=args.output.with_suffix('.tmp')
    temp.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
    temp.replace(args.output)
    meta={'url':PDF_URL,'date':'2026-03','sha256':digest,'coordinate_dataset_url':GEO_URL,'coordinate_dataset_date':'2024-06-06','refresh_mode':'versioned_snapshot','catalogue_sha256':hashlib.sha256(args.output.read_bytes()).hexdigest()}
    metadata_output=args.metadata_output or args.output.with_name('metadata.json')
    metadata_output.parent.mkdir(parents=True,exist_ok=True)
    metadata_output.write_text(json.dumps(meta,indent=2)+'\n')
    print(json.dumps({k:quality[k] for k in ['rows','page_count','coordinate_join_counts']},indent=2))
if __name__=='__main__':main()
