# Verification record — 30 September 2026

## Public launch verified

The historical open-data edition is live at https://wireless.danielk.am/ with MCP at https://wireless.danielk.am/mcp (30 September 2026). Deployed application commit: `69b1d4304486f53849dae93c30e61a5d9c5860a1`.

- 29 Node tests passed, including the original local-PDF suite and three open-catalogue cases.
- Public image built and container reported healthy on the Singapore host. Health check uses `node /app/src/healthcheck.js`; no curl/wget dependency. Runs as UID 1000 and contains only the two public catalogue files in `/app/data`.
- HTTPS verification succeeded through Cloudflare with strict origin certificate checks preserved.
- `node scripts/smoke-public.mjs https://wireless.danielk.am` passed: 1,800 records / 1,306 venues; five real MCP tools; metadata and nearest-result agreement across public map API, REST and MCP; hostile Origin rejected with HTTP 403.
- Live browser confirmed 1,306 pins, nine loaded map tiles, loaded logo and zero browser errors. Local open-data browser showed 1,306 pins, visible June 2024 dataset / March 2020 record dates, attribution and licence links, and no horizontal overflow at a 390px phone viewport. No browser errors were recorded.
- Ads are not enabled. The existing n8n hotspot service and older My Map have not been switched to this historical release. A ChatGPT client migration/installation has not been performed.

## Original local prototype verification

- `npm run verify`: 26 Node test cases passed, plus full catalogue validation (3,855 entries, 763 venues, 507 mapped, 256 unlocated).
- Real official SDK clients initialized the stdio subprocess and Streamable HTTP service, discovered five tools, read dataset metadata, called nearest/search operations, and received structured errors for unresolved origins.
- REST and MCP results matched. Every ranked venue used exactly the same coordinates as `/api/venues` (the map dataset).
- Missing/invalid configured MCP bearer credentials rejected; hostile Host/Origin rejected; invalid/oversized JSON, null arguments and rate limits tested.
- Custom data requires companion metadata; malformed or inconsistent provenance and out-of-bounds coordinates rejected before serving. Optional catalogue hash checked.
- Code-only CI suite passes 10 tests with invented fixtures; it requires no redistributed IMDA records. The GitHub Actions configuration is supplied at ci/github-actions.yml as a template; the current GitHub OAuth connection lacks workflow-write scope, so remote Actions have not run.
- Standalone production dependency audit reports zero vulnerabilities at check time.
- PDF import executed with the supplied snapshot: every original field in all 3,855 rows exactly matched the earlier independently verified extraction. Coordinates were omitted in this reimport test; the existing matched snapshot passed validation and ranking tests.
- Browser smoke: desktop and 390×844 phone layout; map tiles/pins rendered; Albert Centre search and nearest lookup worked; Fortune Centre returned an honest empty catalogue result; no horizontal overflow on the phone viewport. Floor-detail controls and directions links were present. User location permission was not requested during testing.
- An independent agent review found and helped resolve two issues: explicit null REST arguments and insufficient validation/provenance for custom data mounts. The tile CSP was also corrected after a browser check.
- Activepieces piece: 7 tests passed, compiling the real package and invoking all five action handlers against a local HTTP server. Request body, proxy authorization, failures, redirects, response limits and merge compatibility checked.
- n8n template: actual Code-node source executed in a test VM; five request examples, validation, evidence and error preservation checked.

## Explicitly not yet verified

- A new ChatGPT-to-server connection (public HTTP hosting is verified above).
- Live import/execution of the new n8n template against a hosted Explorer API.
- Activepieces account/sandbox installation. Its package treats the framework as a host-supplied optional peer; compatibility must be verified on the chosen host. The development dependency tree still has three findings rooted in expr-eval; the published archive does not auto-install that framework. Prefer the documented built-in HTTP route until host compatibility/security are confirmed.
- Original local-PDF Compose startup. The separate public Docker image is verified above.
- Individual venue signal, access, opening hours, seating or power; no claims are made.
- Redistribution permission for the March 2026 PDF-derived catalogue. It is excluded from public Git history.

No remote production workflow, public map sharing permission or ChatGPT installation was silently changed. The earlier Google My Map remains a separate address-geocoded view.
