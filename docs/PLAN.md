# Delivery plan

Accepted direction: standalone portable MCP + shared lookup API + mobile map, retaining n8n as a portfolio integration and adding Activepieces. Audience: Singapore explorers, digital nomads and remote workers.

1. Adopt the verified March 2026 catalogue and conservative IMDA coordinate matches; use one representative point per venue in every interface.
2. Build/test shared lookup and source/mapping completeness metadata.
3. Expose real SDK stdio and stateless Streamable HTTP MCP transports, read-only REST endpoints and the map.
4. Package portable n8n and Activepieces adapters against the same API.
5. Verify protocol initialization, discovery, calls, errors, REST parity, map interaction and adapter request behavior; independently review the release.
6. Produce portable hosting, privacy, data provenance, portfolio and rollback documentation. Verify packaging and dependency audit.
7. Publish/install to the user's selected GitHub and deployment targets when identified and available.

Current remote n8n workflows are preserved during migration. My Maps is an earlier separate address-geocoded view; this release does not silently import those Google coordinates or historical-only venues. No live connectivity, Wi-Fi signal radius, access permission, seating or electrical outlet claims.

No background schedule is necessary for this foreground build. Data refresh is deliberate and validated. Repository destination and Activepieces instance are requested while local work proceeds.
