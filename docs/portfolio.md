# Automation portfolio: one catalogue, two platforms

Hotspot Explorer for Wireless@SGX demonstrates a practical connectivity assistant for remote workers and people exploring Singapore. n8n remains a first-class portfolio integration. Activepieces offers the same five read-only operations through a real custom piece and a built-in HTTP alternative.

The mobile map, MCP tools, n8n and Activepieces all use one shared lookup engine. No workflow carries a separate hotspot database. All responses retain source dates, floor descriptions, coordinate provenance, incomplete ranking and structured lookup failures. None confirms usable signal, seating, power sockets, opening hours or access permission.

## Shared contract

Send `POST https://YOUR-EXPLORER-HOST/api/lookup` with JSON:

```json
{"operation":"search_venues","arguments":{"query":"Albert Centre","limit":5}}
```

| Operation | Arguments | Intended use |
| --- | --- | --- |
| `dataset_info` | `{}` | Explain source dates and coordinate limitations |
| `search_venues` | `query`, optional `limit` | Match the map's grouped venues |
| `search_hotspots` | `query`, optional `limit` | Search individual hotspot/floor entries |
| `nearest_hotspots` | `query` OR `latitude` + `longitude`, optional `limit`, `radius_m` | Rank located venues by straight-line distance |
| `get_hotspot` | `hotspot_id` | Inspect one returned source record |

Limits are 1–20. An unresolved place produces a structured failure; neither adapter silently substitutes web results. Check `ok` before presenting any results. The API is public and read-only by design. The server's `MCP_TOKEN` protects `/mcp`, **not** these API routes. Adapter bearer-token settings are only for an additional reverse proxy or other API authentication you configure yourself.

## n8n portfolio demo

Import [`../integrations/n8n/wireless-sgx-portfolio.json`](../integrations/n8n/wireless-sgx-portfolio.json) from a file. This inactive, manual-only workflow makes five example API calls:

1. Set your deployed HTTPS base URL in **Configure API and examples**.
2. If your reverse proxy protects the API, choose Generic Credential → Header Auth on **Shared Explorer API**. Store `Authorization: Bearer YOUR_TOKEN` in n8n credentials, never in the exported workflow.
3. Execute the workflow. Inspect each result in **Keep evidence and errors**.
4. Demonstrate a venue search, then a nearest request, then a failed/unresolved origin. Show how source dates and incomplete coordinates survive each successful response.

The template uses a 15-second HTTP timeout, disables redirects, preserves structured errors and disables saved execution payloads. Five examples produce five requests; the coordinates are a demonstration origin, not an asserted resolved building address. Change them or select one example for your own run.

For a production n8n MCP portfolio, connect an MCP Server Trigger to five workflow tools, each wrapping the same HTTP operation. Keep the Explorer base URL fixed in administrator configuration; never accept an arbitrary destination URL from an AI tool or public webhook. Use the instance's supported authentication, restrict callers, validate tool inputs, retain `ok:false` responses and test an authenticated client connection. The checked-in demo does not claim to be an already-deployed MCP trigger or to replace the owner's existing live n8n service.

Official references: [n8n workflow import/export](https://docs.n8n.io/workflows/export-import/), [HTTP Request node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/), [MCP Server Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/).

## Activepieces portfolio

The [custom piece](../integrations/activepieces/README.md) contains five actions with the same names and contract. Configure the base URL once in its connection; the optional bearer token uses a secret property. This source compiles against pinned official `@activepieces/pieces-framework` 0.32.0. The archive is built with TypeScript and `npm pack`; platform installation has not been exercised.

**Packaging limitation:** the archive uses an optional framework peer and installs no runtime dependency tree. It requires a compatible framework supplied by a reviewed host; this peer resolution has not been verified in an Activepieces sandbox. Official workspace pieces normally declare framework dependencies, so do not assume every host resolves this packaging. Use the built-in HTTP alternative if yours does not. The production package audit has zero findings, excluding the host. The development framework still has three propagated findings rooted in unpatched `expr-eval` (one critical, two high); other fixable dependencies were patched and tests rerun. Full audit evidence and patch details accompany the source. This does not affect the standalone server dependency tree.

### Built-in HTTP alternative

This route does not require custom-piece installation or a private-piece licence:

1. Create a flow with a manual/testing trigger available in your instance.
2. Add the built-in HTTP action. Set method **POST**, URL `https://YOUR-EXPLORER-HOST/api/lookup`, `Content-Type: application/json`, and the JSON body shown above.
3. Configure a 15-second timeout and disable following redirects if your installed HTTP piece exposes those settings. Store any reverse-proxy token in the platform's supported secret/connection facility.
4. Add a condition for `body.ok`. Present the returned catalogue results only on the true branch. Preserve the API error on the false branch; do not invent a fallback location.
5. Duplicate the HTTP step or create separate flows for the other operations from the contract table.

These are configuration instructions, **not** an unverified flow-export JSON. The repository does not claim an Activepieces account installation or live execution. [Official private-piece documentation](https://www.activepieces.com/docs/build-pieces/sharing-pieces/private) identifies custom/private-piece installation as a paid-edition feature; availability depends on your host/plan.

## Verification scope

- `node --test test/integrations.test.js`: executes the actual n8n Code-node source in a Node VM; covers all five operations, malformed requests, response evidence preservation and portable configuration. It does not execute the n8n engine or confirm importing into every n8n version.
- `cd integrations/activepieces && npm ci --ignore-scripts && npm test`: compiles the real piece and calls all five actual action handlers against a local HTTP test server; verifies request bodies, optional bearer header, errors, redirects, response limits and input safeguards. This is adapter contract testing, not an Activepieces sandbox deployment.
- `npm pack` in the piece directory builds a distributable archive containing compiled code and documentation. No credentials, catalogue copy or installed account IDs are included.

For a public portfolio recording, show the same query in the map, MCP and both automation platforms against the same deployed API, including one failure case. Label the date and the tested platform versions in the recording. A recorded client-to-server run is required before claiming a live integration.
