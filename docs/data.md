# Catalogue provenance and map agreement

## Public launch: openly licensed historical catalogue

The public deployment uses **only** `data/public-hotspots.json` with companion `data/public-metadata.json`, built from [IMDA Wireless HotSpots (GEOJSON) on data.gov.sg](https://data.gov.sg/datasets/d_d8644084f8b54f851a1acbb2f04d5089/view). It contains **1,800 source features grouped into 1,306 mapped venues**. The original March 2026 local catalogue is retained separately and is not included in the public deployment.

The official catalogue page says **last updated 6 June 2024**. All 1,800 features contain `FMEL_UPD_D: 20200318162531` (18 March 2020). Both dates are disclosed in metadata: the catalogue update date must not imply current hotspot availability. Historical Fortune Centre/Acctrain Academy membership is valid for this older snapshot, even though it is absent from the separate March 2026 PDF snapshot. The public map and public MCP use this same older source, so they agree with each other.

Source download SHA-256: `a9f7ee90ff1e62c3ebd341bb86933612a9d8b8293cde61444d880192ea120628`. Retrieved 30 September 2026 through the official poll-download endpoint. Every row retains the genuine `kml_N` source feature ID and embedded update timestamp. `source_page` is null because there is no PDF. Two missing street addresses are preserved as empty strings; the supplied names, postcodes and coordinates remain available. Operators include historic MyRepublic listings; this does not assert their present operator.

The official dataset page expressly states personal and commercial reuse under the [Singapore Open Data Licence version 1.0](https://data.gov.sg/open-data-licence). Dataset and licence pages were fetched directly and checked on 30 September 2026. Required attribution is included in metadata for conspicuous display: “Contains information from IMDA Wireless HotSpots (GEOJSON), accessed 2026-09-30 from data.gov.sg, made available under the Singapore Open Data Licence version 1.0.” Link both the source and current licence; do not imply official status or endorsement. The software licence does not replace this data licence.

Reproduce the public files with `python3 scripts/import-open-data.py` (Python standard library only), or pass `--source /path/to/download.geojson`. The importer pins the reviewed source hash and refuses changed downloads until dates and schema have been reviewed. It never overwrites `data/hotspots.json` or `data/metadata.json`.

```sh
HOTSPOTS_DATA_PATH=data/public-hotspots.json HOTSPOTS_METADATA_PATH=data/public-metadata.json node scripts/validate-data.js
node --test test/public-catalogue.test.js
```

Set both environment variables in the public deployment. The source-date and feature-ID schema is validated on startup. Tests cover source purity, dates, counts, MyRepublic filtering and agreement between map representatives and nearest results. All points being mapped only makes ranking complete *within this historical catalogue*, not across currently operating Singapore hotspots.

## Separate local March 2026 snapshot

The local working snapshot contains 3,855 entries from the [IMDA March 2026 Wireless@SG hotspot PDF](https://www.imda.gov.sg/assets/9a4b742c-3a3f-4ce7-ae22-b5bb421fcdfb.pdf), retrieved 30 September 2026. PDF SHA-256: `0b40c373a802651269501fe80ee547160e4b26eb04fc63550edf414dd492be25`. Source page, serial, date and URL remain attached to every entry. The PDF determines membership. The older coordinate source cannot add locations omitted from this PDF.

Entries are grouped by normalized address plus postal code into 763 venues. The 507 geolocated venues contain 2,725 entries; 256 venues containing 1,130 entries have no coordinate. Missing coordinates are `null`, never zero. The [IMDA coordinate dataset hosted by data.gov.sg](https://data.gov.sg/datasets/d_d8644084f8b54f851a1acbb2f04d5089/view) is dated 6 June 2024. Coordinates were joined on postal code and normalized address. Their age is disclosed separately from the PDF date.

One deterministic representative point is selected per venue: the first geolocated entry in source order. The web map, grouped search and nearest lookup all consume this exact representative. Ranking never chooses a different point depending on the origin. Venue IDs are a stable hash of the address/postal group. All indoor hotspot rows remain in the venue's `hotspots` list.

The earlier Google My Maps project also included 256 address-geocoded pins. Those Google coordinates were neither independently verified nor imported into this catalogue. They do not silently become rankable here. This application's map and MCP both show the same 507 mapped venues; the other 256 remain searchable as unlocated listings. Returning a nearest result explicitly says ranking is incomplete, with excluded venue and entry counts. “Nearest” means nearest among the mapped catalogue venues.

Distance uses a sphere with mean Earth radius 6,371,008.8 metres and is rounded only for display. It is straight-line distance to a venue point, not walking distance. Radius filtering uses unrounded distance. Google Maps URLs request directions or address search; they are not evidence of live Google API enrichment. Search bounds are a rectangle around Singapore, not proof that every coordinate is on Singapore land.

Text origins resolve only against listed locations, addresses and postal codes. Common address abbreviations are expanded for matching; no landmark coordinates are guessed. Multiple matching venues require clarification. A listed venue without coordinates returns an explicit error. Fortune Centre/188979 does not resolve in this snapshot; Acctrain Academy, 155 Waterloo Street and National Design Centre must not be inserted from historic data or web snippets.

No per-hotspot radio coverage radius or live status was supplied. Coordinates do not establish reception, public access, seating, power sockets, opening hours or suitability for remote work. Source floor/room details matter, including potentially restricted premises.

## Attribution and redistribution

Software licensing and source-data rights are separate. Do not apply a software MIT licence to the PDF, its extracted catalogue, or Google data.

The [Singapore Open Data Licence](https://data.gov.sg/open-data-licence) permits reuse of covered datasets with conspicuous source and licence attribution. Suggested attribution for the coordinate component: “Contains information from IMDA's Wireless@SG Hotspots dataset, accessed 30 September 2026 from data.gov.sg, made available under the Singapore Open Data Licence version 1.0.” Link the dataset and current licence. Do not imply government endorsement.

The [IMDA website terms](https://www.imda.gov.sg/terms-of-use) identify proprietary rights and restrictions on copying and distributing website contents. A separate open-data licence for the March 2026 PDF has not been verified. A publicly downloadable PDF is not by itself evidence of a broad redistribution licence. Keep the extracted March 2026 data in the local working package pending confirmation of applicable permission or licence before bundling it into a public GitHub release or unrestricted public data API. This is a conservative release decision based on an unresolved rights basis, not a legal determination about protection of individual facts. The data.gov.sg licence for the historical dataset must not be assumed to cover a newer PDF from a different source.

Verification on 30 September 2026 used official indexed terms/licence pages; direct browser-tool fetches of the IMDA terms and data.gov.sg pages failed. No permission was obtained and no legal clearance is claimed. A code-only release can document the expected input schema and let operators supply data they are authorised to use.

## Updating and checks

Replace a snapshot only through a reviewed extraction/enrichment process. Retain the original document digest, source-page evidence, extraction counts and coordinate-source date. Compare added/removed entries, confirm joins by address and postal code, and review coordinate bounds and suspicious spreads. Do not scrape/export the Google My Maps geocodes into a redistributed database without first establishing the applicable terms.

Run `node scripts/validate-data.js` and `node --test test/catalogue.test.js`. The validation pins the current snapshot totals so a future source update requires an intentional expectation change. Tests check complete entry membership, shared representatives, independent distance calculations, origin ambiguity, missing coordinates, regression exclusions and caller mutation isolation. They do not assert that a listed hotspot is operational today.

## Custom data mounts

Set both `HOTSPOTS_DATA_PATH=/path/hotspots.json` and `HOTSPOTS_METADATA_PATH=/path/metadata.json` when supplying a replacement catalogue. Startup rejects a custom catalogue without its companion metadata. It never borrows the bundled PDF's attribution for custom data.

The companion metadata object requires these fields:

```json
{
  "url": "https://example.org/authorised-source.pdf",
  "date": "2026-03",
  "sha256": "SOURCE_DOCUMENT_SHA256_AS_64_LOWERCASE_HEX_CHARACTERS",
  "coordinate_dataset_url": "https://example.org/authorised-coordinates",
  "coordinate_dataset_date": "2024-06-06",
  "refresh_mode": "versioned_snapshot"
}
```

Replace the illustrative digest with the actual source-document SHA-256. Source and coordinate URLs must be HTTPS and contain no embedded credentials. The source date accepts a valid `YYYY-MM` or `YYYY-MM-DD`; coordinate date requires `YYYY-MM-DD`. Optional `retrieved_at` requires `YYYY-MM-DD`. Optional `catalogue_sha256` must equal the SHA-256 of the **exact catalogue JSON file bytes**, including whitespace; this binds metadata to a particular extracted file. Digest validation establishes consistency, not permission or authenticity.

Every row requires a unique `wsgx-NNNN` ID, unique positive integer `serial`, nonempty `location` and `address`, six-digit string `postal_code`, operator `M1`, `Singtel`, `StarHub` or `MyRepublic`, positive integer `source_page` for PDF sources, and `source_url`/`source_date` equal to the companion metadata. Coordinates must both be null or both finite numbers within latitude 1.1–1.5 and longitude 103.5–104.2. Located rows' `coordinate_source` and `coordinate_source_date` must match the metadata. Unlocated rows must set both provenance fields to null. Current schema requires `coverage_radius_m: null`, `coverage_status: "not_published"`, and `operational_status: "unverified"`; stronger claims need a separately reviewed schema and evidence.

Run validation with the same two environment variables. Custom validation checks structure, provenance and grouping without asserting the original snapshot's fixed counts. The full original catalogue tests still intentionally target the March 2026 snapshot. Licence-safe synthetic fixtures must identify their own test sources and dates.

For `source_format: "geojson"`, each row instead requires `source_page: null` and a unique nonempty `source_feature_id`; street address may be an empty string if absent upstream. Other provenance and coordinate rules still apply. Omitted `source_format` retains the original PDF validation rules.
