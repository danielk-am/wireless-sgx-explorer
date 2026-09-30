# Google place search and map setup

Set `GOOGLE_MAPS_BROWSER_KEY` in the app's runtime environment (Coolify or Compose) and redeploy. Blank means the existing catalogue search and optional OpenStreetMap remain active. Configured means Google place search and Google Maps; Google-selected starting points are never shown on an OpenStreetMap map.

Enable **Maps JavaScript API** and **Places API (New)** in the same billing-enabled Google Cloud project. Restrict the browser key to those APIs and HTTP referrers `https://wireless.danielk.am/*`. Use a separate development key restricted to localhost for local testing. Set API quotas and billing alerts appropriate to the owner's budget. Do not paste keys into the repository or chat.

A browser key is intentionally public: the app exposes ONLY this designated key through `/api/config` with no-store caching. It is not a server secret. Never use an unrestricted server key or place MCP_TOKEN in this setting. Other server environment values are not exposed.

Visitors choose Search any Singapore place to load Google's PlaceAutocompleteElement, restricted to `sg`. Selecting a suggestion requests only `location` and `formattedAddress`, then calls the existing nearest_hotspots lookup with latitude/longitude. Postal code is not required. Google details stay in memory and are not exported, logged by the application or joined to the government dataset. Attribution is provided by Google's widget/map. Privacy and terms are linked in the UI.

The map loads separately on request. Google authentication, billing or network errors leave catalogue/location/coordinate lookup available. API availability cannot be validated with a fake key. Before declaring Google search live, verify a real Singapore suggestion, an address absent from the hotspot catalogue, nearest result ordering, Google map markers/clicks, keyboard/mobile behavior and CSP console/network errors with the restricted production key.

References:
- https://developers.google.com/maps/documentation/javascript/place-autocomplete-new
- https://developers.google.com/maps/documentation/javascript/content-security-policy
- https://developers.google.com/maps/documentation/places/web-service/get-api-key

Implementation tests with stubs do not establish Google billing, key restrictions or real prediction availability.
