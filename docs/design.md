# Visual identity

The Explorer uses white surfaces, blue controls and pale blue supporting surfaces. Daniel approved this blue-primary palette on 2 October 2026 as the default for danielk.am creations; it replaces the teal-primary palette adopted on 30 September 2026. The canonical color-tokens.css lives in the shared danielk.am brand folder; public/tokens.css is this project's byte-identical copy.

Edit `public/tokens.css` to update the palette. Components use semantic properties, and Leaflet and Google map markers read the same tokens from computed CSS. Avoid introducing hex colors in component CSS or map JavaScript.

| Role | Value |
| --- | --- |
| Canvas / inverse content | `#FFFFFF` |
| Main text | `#153847` |
| Secondary text | `#526B78` |
| Blue brand / actions / venue markers / focus | `#2563EB` |
| Blue hover / link and distance text | `#1D4ED8` |
| Soft blue surface | `#EDF3FF` |
| Supporting teal | `#087E8B` |

Venue pins and the selected starting point both resolve to the brand blue, so they differ by form: venue pins are filled dots with a white outline, and the starting point is a larger white dot with a blue ring. The "Not yet located on map" badge uses the supporting teal pair so it stays distinct from the standard blue badge.

The generated `public/logo-mark.png` combines a location pin with two Wi-Fi arcs and a signal dot. It is used in the header and as the favicon. Keep its proportions; allow clear space around it. The image has a transparent background. The pin is product-specific and keeps its teal body and blue tip; CSS tokens do not recolor this raster asset. A palette change also requires updating the HTML theme-color metadata and the asset version query strings in the three HTML pages.

Verification, 7 October 2026: rendered locally with the public data.gov.sg catalogue at 1440×900, 820×1000 and 375×812, with no horizontal overflow at any width, on the explorer, advertise and privacy pages. Contrast: white on blue button 5.17:1; blue hover text on white 6.70:1 and on soft blue 6.02:1; muted text on white 5.63:1 and on soft blue 5.05:1; blue focus ring on white 5.17:1 and on soft blue 4.64:1. The OpenStreetMap view rendered venue pins with fill `#2563EB` and the starting point as a white dot with a `#2563EB` ring. The Google Maps view uses the same tokens but was not rendered here, because no browser key was configured locally. All 45 tests passed; catalogue behavior is unchanged.
