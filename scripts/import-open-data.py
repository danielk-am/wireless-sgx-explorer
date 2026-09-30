#!/usr/bin/env python3
"""Import the reviewed openly licensed IMDA GeoJSON snapshot, without PDF data."""
import argparse, datetime, hashlib, html, json, re, urllib.request
from pathlib import Path

DATASET_ID = 'd_d8644084f8b54f851a1acbb2f04d5089'
SOURCE_URL = f'https://data.gov.sg/datasets/{DATASET_ID}/view'
SOURCE_DATE = '2024-06-06'
# Pin the reviewed download: a changed upstream file requires a new source/date review.
EXPECTED_SHA = 'a9f7ee90ff1e62c3ebd341bb86933612a9d8b8293cde61444d880192ea120628'
ROOT = Path(__file__).resolve().parent.parent

def transform(raw):
    if hashlib.sha256(raw).hexdigest() != EXPECTED_SHA:
        raise ValueError('Upstream snapshot changed. Review dates, licence and fields before updating the pinned digest.')
    geo = json.loads(raw)
    assert geo['type'] == 'FeatureCollection'
    rows = []
    for index, feature in enumerate(geo['features'], 1):
        attrs = {html.unescape(k).strip(): html.unescape(v).strip() for k, v in re.findall(r'<th>(.*?)</th>\s*<td>(.*?)</td>', feature['properties']['Description'], re.S)}
        assert feature['geometry']['type'] == 'Point'
        lon, lat = feature['geometry']['coordinates'][:2]
        assert 1.1 <= lat <= 1.5 and 103.5 <= lon <= 104.2
        assert re.fullmatch(r'\d{6}', attrs['POSTAL_CODE'])
        assert attrs['OPERATOR_NAME'] in ['M1', 'Singtel', 'StarHub', 'MyRepublic']
        assert attrs['FMEL_UPD_D'] == '20200318162531'
        rows.append(dict(id=f'wsgx-{index:04}', serial=index, operator=attrs['OPERATOR_NAME'],
            location=attrs['LOCATION_NAME'], address=attrs['STREET_ADDRESS'], postal_code=attrs['POSTAL_CODE'],
            location_type=attrs['LOCATION_TYPE'], source_page=None, source_feature_id=feature['properties']['Name'],
            source_feature_updated_at=attrs['FMEL_UPD_D'], source_url=SOURCE_URL, source_date=SOURCE_DATE,
            latitude=lat, longitude=lon, coordinate_source=SOURCE_URL, coordinate_source_date=SOURCE_DATE,
            coordinate_match_basis='same_source_feature', coordinate_precision='source_point',
            coverage_radius_m=None, coverage_status='not_published', operational_status='unverified'))
    assert len(rows) == 1800
    assert len({r['source_feature_id'] for r in rows}) == len(rows)
    return rows

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, help='Previously downloaded GeoJSON; otherwise fetch official API')
    parser.add_argument('--output-dir', type=Path, default=ROOT/'data')
    args = parser.parse_args()
    if args.source:
        raw = args.source.read_bytes()
    else:
        with urllib.request.urlopen(f'https://api-open.data.gov.sg/v1/public/api/datasets/{DATASET_ID}/poll-download', timeout=30) as response:
            result = json.load(response)
        if result['code'] != 0:
            raise RuntimeError('Official data download unavailable; retry later.')
        with urllib.request.urlopen(result['data']['url'], timeout=60) as response:
            raw = response.read()
    rows = transform(raw)
    retrieved = datetime.date.today().isoformat()
    encoded = (json.dumps(rows, ensure_ascii=False, indent=2)+'\n').encode()
    metadata = dict(url=SOURCE_URL, title='IMDA Wireless HotSpots (GEOJSON)', date=SOURCE_DATE,
        source_format='geojson', sha256=EXPECTED_SHA, retrieved_at=retrieved,
        coordinate_dataset_url=SOURCE_URL, coordinate_dataset_date=SOURCE_DATE,
        refresh_mode='versioned_open_data_snapshot', catalogue_sha256=hashlib.sha256(encoded).hexdigest(),
        source_feature_updated_at='2020-03-18',
        date_note='data.gov.sg lists 6 June 2024 as the dataset update date. Every source feature carries FMEL_UPD_D 20200318162531; this is a historical catalogue, not a live inventory.',
        license_url='https://data.gov.sg/open-data-licence', license_name='Singapore Open Data Licence version 1.0',
        attribution=f'Contains information from IMDA Wireless HotSpots (GEOJSON), accessed {retrieved} from data.gov.sg, made available under the Singapore Open Data Licence version 1.0.',
        source_record_count=len(rows))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir/'public-hotspots.json').write_bytes(encoded)
    (args.output_dir/'public-metadata.json').write_text(json.dumps(metadata, indent=2)+'\n')
    print(json.dumps(dict(entries=len(rows), source_date=SOURCE_DATE, sha256=EXPECTED_SHA)))

if __name__ == '__main__':
    main()
