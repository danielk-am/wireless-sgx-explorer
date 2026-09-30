# Wi-Fi Explorer for Wireless@SGX

A Singapore connectivity explorer for digital nomads, remote workers and curious wanderers. Find listed venues, read the floor details, and open walking directions. The same catalogue powers the mobile map, local/remote MCP server, n8n portfolio workflow and Activepieces integration.

**This is a source-backed location guide, not a live Wi-Fi monitor.** Listings do not establish public access, working signal, opening hours, seating or power availability. An independent project, not affiliated with IMDA or the operators.

## What is included

- A responsive venue map and searchable list. Browser location is optional and requested only on demand.
- A real MCP server using stdio or stateless Streamable HTTP; five read-only tools.
- A read-only JSON API shared by every new integration.
- An importable n8n portfolio demo, plus an Activepieces custom piece prototype and built-in HTTP-action recipe.
- Locked dependencies, Docker/Compose configuration, provenance checks and actual MCP-client tests.

## Public open-data edition

The public launch uses the openly licensed data.gov.sg catalogue: **1,800 historical records grouped into 1,306 mapped venues**. The dataset page is dated **6 June 2024**; every embedded record carries **18 March 2020**. These are historical listings, not a current inventory. This edition is separate from the March 2026 local prototype below; their membership and nearest results differ. Both map and MCP within an edition share the same data.

```sh
npm ci --ignore-scripts
HOTSPOTS_DATA_PATH=data/public-hotspots.json HOTSPOTS_METADATA_PATH=data/public-metadata.json npm start
```

The public files are included under the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence), with IMDA attribution in their metadata and the site. `Dockerfile.public` builds this edition without the PDF-derived catalogue. See [hosting](docs/hosting.md) and [advertising options](docs/monetization.md).

## Local PDF prototype: data and coverage

The validated local March 2026 IMDA snapshot contains **3,855 hotspot entries grouped into 763 venues**. **507 venues** have conservative matches to historical June 2024 IMDA coordinates; **256 remain unlocated**. All venues are searchable; only located venues are pinned and ranked. The map and MCP use the exact same representative point per venue.

The supplied PDF-derived catalogue is deliberately **not included in public Git history**: its redistribution permission has not been established. The MIT licence covers our code, not IMDA's publication. See [source provenance and reuse](docs/data.md). Obtain sources you are authorised to use before running a real-data instance or publishing a public deployment.

The earlier separate Google My Map includes additional Google address matches. Those coordinates have not been imported into this project; do not compare its pin coverage to this release as if they were the same dataset.

## Run locally

Requires Node 22 or newer. No Google Maps API key is needed. Google Maps links are directions/search links, not live Google API enrichment.

```sh
npm ci --ignore-scripts
# Place your authorised imported catalogue at data/hotspots.json.
# Or follow the import instructions below.
npm start
```

Open `http://127.0.0.1:3000`. The map downloads OpenStreetMap tiles only after **Show map** is selected; the venue list works without them.

To import the exact source snapshot:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/import-imda.py --pdf /path/to/imda-march-2026.pdf \
  --coordinates /path/to/imda-june-2024.geojson
npm run verify
```

Download the source PDF and historical GeoJSON from the links in [docs/data.md](docs/data.md) using your normal authorised access. The importer does no network requests and checks the PDF's SHA-256 before extraction. It preserves original fields, rejects ambiguous coordinate matches, and writes catalogue and companion metadata. Omitting `--coordinates` imports searchable entries with no rankable locations; the full snapshot acceptance tests require the documented historical coordinate file. For later sources, deliberately update and review the importer, expected counts and metadata; do not relabel a newer PDF as March 2026.

For a custom runtime mount set **both** `HOTSPOTS_DATA_PATH` and `HOTSPOTS_METADATA_PATH`. The server checks structure, geographic bounds, provenance, and the catalogue hash when present before starting.

## Connect an MCP client

For a client that supports local stdio servers:

```json
{
  "mcpServers": {
    "wireless-sgx": {
      "command": "node",
      "args": ["/absolute/path/to/wireless-sgx-explorer/src/stdio.js"]
    }
  }
}
```

Run `node src/stdio.js` directly; do not use an npm command that writes a banner to stdout. The process communicates only MCP on stdout.

For remote clients, run the HTTP service and use `https://YOUR-HOST/mcp`. The public catalogue service is read-only. `MCP_TOKEN` optionally requires bearer authentication on **/mcp only**; the map and REST API remain public. See [hosting and client setup](docs/hosting.md), including ChatGPT's remote-server requirement and the limits of token authentication.

| Tool | Purpose |
| --- | --- |
| `nearest_hotspots` | Rank mapped venues from coordinates or a catalogue origin |
| `search_venues` | Search grouped venues, including unlocated ones |
| `search_hotspots` | Find exact source entries and floor details |
| `get_hotspot` | Retrieve a source entry by its returned ID |
| `dataset_info` | Inspect dates, provenance and mapping completeness |

Unknown origins fail explicitly. For example, Fortune Centre is absent from this snapshot; supply verified coordinates to search around it. Never invent coordinates or add historical-only venues to current results. Always disclose `ranking_complete:false` when present. Distances are straight-line metres, not walking distances or radio range.

## Automation portfolio

[n8n and Activepieces setup, demonstrations and verification scope →](docs/portfolio.md)

The n8n service is an intentional part of the portfolio. This release adds a portable shared-API demonstration without deleting or silently changing the existing personal n8n MCP. Migrating that live workflow requires a deployed API and a verified client call. Activepieces has a tested adapter source and a no-custom-piece HTTP recipe; sandbox installation remains to be verified on the chosen instance.

## Tests

```sh
npm run test:synthetic # code-only CI; invented fixtures, no IMDA data required
npm run verify        # full validated local snapshot + protocol/API/UI helper tests
cd integrations/activepieces && npm ci --ignore-scripts && npm test
```

To enable GitHub Actions, copy `ci/github-actions.yml` to `.github/workflows/test.yml` using a GitHub connection with workflow-write permission. Until then, tests are locally verified; remote CI is not enabled.

[Verification evidence and remaining deployment checks](docs/verification.md). The current project tests actual SDK clients over both transports; a ChatGPT answer is not evidence of a tool call unless tool activity confirms it.

### Optional Google place search

[Configure Google Autocomplete and Google Maps](docs/google-maps.md) with a restricted `GOOGLE_MAPS_BROWSER_KEY` supplied through the runtime environment. Hotspots still come from data.gov.sg. Without a key, catalogue search and the existing optional map remain available.
