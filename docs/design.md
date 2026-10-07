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

The approved `public/logo-mark.png` is a glossy royal blue location pin with exactly two raised white Wi-Fi arcs, one white dot and a small teal tip, generated with imagegen on 7 October 2026 in the 10.sg category emojicon style. The transparent 1254 px original is the master and is not loaded by any page. The 180 px copy serves the header mark and touch icon, the 32 px copy the favicon, and the 512 px copy the sharing image. Logo references use `?v=emojicon-20261007` to refresh cached assets. The previous public logo is backed up in the sibling explorer’s `design/marks/drafts/`. Preserve the aspect ratio and clear space.

The hero shows `public/hero.png` to the right of the headline on tablets and desktops, and hides it on phones so the search stays near the top. It replaced the arrow flourish on 7 October 2026. Today `hero.png` is a copy of the 512 px mark, standing in for a dedicated hero illustration; replacing the file and bumping its `?v=` value installs one.

Verification, 7 October 2026: rendered locally with the public data.gov.sg catalogue at 1440×900, 820×1000 and 375×812, with no horizontal overflow at any width, on the explorer, advertise and privacy pages. Contrast: white on blue button 5.17:1; blue hover text on white 6.70:1 and on soft blue 6.02:1; muted text on white 5.63:1 and on soft blue 5.05:1; blue focus ring on white 5.17:1 and on soft blue 4.64:1. The OpenStreetMap view rendered venue pins with fill `#2563EB` and the starting point as a white dot with a `#2563EB` ring. The Google Maps view uses the same tokens but was not rendered here, because no browser key was configured locally. All 45 tests passed; catalogue behavior is unchanged.
