# Self-hosting and client setup

## Local service

`npm ci --ignore-scripts && npm start` binds loopback port 3000. Set `PORT` to change it. Keep catalogue and metadata together and restart after a reviewed update. The server is stateless; rollback is restoring the previous code/lockfile and paired data files, then restarting.

## Docker

`docker compose up --build -d` builds the pinned Node 24 image and binds host port 3000 to loopback only. The authorised catalogue and matching metadata are mounted read-only. Missing files fail instead of creating directories. Container filesystems are read-only and Linux capabilities dropped. `docker compose down` stops the service without deleting source data.

The image digest was resolved from Docker Hub on 30 September 2026. A Docker engine was not available in the build environment, so container startup has not been executed here; the Node service itself was tested directly. Verify health and MCP calls after deploying a container.

## Public endpoint

Place an HTTPS reverse proxy in front of the loopback port. Set `ALLOWED_HOSTS` to the exact public hostname **plus** `localhost,127.0.0.1,[::1]` for health checks. Preserve Host and forward requests to the service; do not forward an arbitrary client-controlled destination. Origin checks permit same-host browser requests, reject other origins unless explicitly listed, and allow non-browser clients without Origin.

The bundled rate limit allows 120 API/MCP requests per minute per socket IP. Behind a reverse proxy this becomes a shared backend budget; enforce per-client rate limits at the proxy and tune the application intentionally for expected volume. Do not blindly trust spoofable X-Forwarded-For. Body size is capped at 16 KB; normal lookup arguments are far smaller. No request payload or location logging is implemented; ensure your proxy also avoids retaining precise locations or authorization headers.

Public routes contain only the approved public catalogue: `/`, `/api/venues`, `/api/dataset`, `/api/lookup`. **MCP_TOKEN does not protect these routes.** Do not mount private datasets here. If a private deployment is needed, apply authentication to the entire site/API at the reverse proxy and adapt the client accordingly.

`MCP_TOKEN` is an optional static bearer token for MCP clients that support a configured Authorization header. This is not OAuth. Never embed it in a browser page, URL, workflow JSON or public repository. For a public read-only ChatGPT connector, use a client-supported no-auth connection if available; for OAuth, deploy a compatible OAuth authorization layer or keep the n8n OAuth endpoint. Do not describe this server as offering OAuth.

## ChatGPT acceptance

ChatGPT custom MCP connections need a reachable remote server; local stdio is for clients that launch processes. Configure the HTTPS `/mcp` URL in a supported ChatGPT custom-app surface and its supported authentication mode. Account/workspace availability varies; follow the current [OpenAI instructions](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt).

A successful installation requires evidence from the real client:

1. Discover `dataset_info` and the four lookup tools.
2. Call `dataset_info` and read back source dates/counts.
3. Call `nearest_hotspots` with `query: "319260"`; compare to the map/API.
4. Call with `query: "188979"`; preserve `ORIGIN_NOT_RESOLVED`.
5. Confirm the activity shows actual tool names, inputs and results. Reading mcp.json or searching the web does not count.

The public open-data edition is deployed at https://wifiexplorer.danielk.am/mcp and has real SDK-client evidence. A new ChatGPT installation is not verified. See docs/verification.md.

## Source updates and public data

Review the rights and source age before serving data publicly. Keep source membership separate from coordinate enrichment, preserve match provenance, and reject out-of-bounds/ambiguous positions. Importer output goes to ignored files. Refreshes are explicit; no hidden timer, background location tracking or automatic remote upload exists.

## Open-data public image

`Dockerfile.public` packages only the separately licensed data.gov.sg snapshot: 1,800 records grouped into 1,306 venues. It does not package the March 2026 PDF catalogue. Build with `docker build -f Dockerfile.public -t wireless-sgx-explorer:public .`. Set `ALLOWED_HOSTS=wifiexplorer.danielk.am,localhost,127.0.0.1,[::1]` for the canonical public hostname. The image selects both public files explicitly, avoiding any fallback to the local PDF data. The user approved this source and hostname on 30 September 2026. Current availability is unverified; dataset-page date is 6 June 2024 and embedded record timestamps are 18 March 2020. See `docs/data.md` for attribution.

A separate public image keeps the original local/default catalogue and its regression tests intact. Rollback restores the preceding image; do not substitute the local March 2026 files into the public image. Deployment status and externally verified checks must be recorded separately from this build recipe.

## Live release — 30 September 2026

Public site: https://wifiexplorer.danielk.am/; read-only MCP: https://wifiexplorer.danielk.am/mcp. Coolify manages the canonical service in the danielk.am production project on `dk-fsn1`, which is the target of the existing `*.danielk.am` Cloudflare wildcard. The former `wireless.danielk.am` address returns HTTP 308 to the canonical hostname from its retained legacy route. The WordPress main site is unchanged. Coolify uses command health check `node /app/src/healthcheck.js`, port 3000, interval 30s, timeout 5s, retries 3 and start period 15s. Rebuild the reviewed main revision to update; confirm public health plus `node scripts/smoke-public.mjs https://wifiexplorer.danielk.am` after each deployment.

The initial curl-based platform health check failed because the slim image lacks curl/wget; the Node health check resolved it. The first certificate was issued by Traefik using HTTP challenge. Cloudflare strict TLS was not weakened. The deployment helper workflows were archived after use; no recurring deployment timer was added.
