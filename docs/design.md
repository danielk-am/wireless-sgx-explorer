# Visual identity

The Explorer uses white surfaces, deep teal controls and blue accents. Daniel adopted this palette on 30 September 2026 as the default for all danielk.am creations. The canonical color-tokens.css lives in the shared danielk.am brand folder; public/tokens.css is this project's matching copy.

Edit `public/tokens.css` to update the palette. Components use semantic properties, and Leaflet markers read the same tokens from computed CSS. Avoid introducing hex colors in component CSS or map JavaScript.

| Role | Value |
| --- | --- |
| Canvas / inverse content | `#FFFFFF` |
| Main text | `#153847` |
| Secondary text | `#526B78` |
| Teal brand / venue markers | `#087E8B` |
| Teal hover | `#066571` |
| Soft teal surface | `#F0F9FA` |
| Blue accent / selected origin / focus | `#2563EB` |

The generated `public/logo-mark.png` combines a location pin with two Wi-Fi arcs and a signal dot. It is used in the header and as the favicon. Keep its proportions; allow clear space around it. The image has a transparent background. CSS tokens do not recolor this raster asset; a future palette change also requires updating the logo asset and the HTML theme-color metadata.

Verification: rendered at 1440×900, 820×1000 and 390×844, with no horizontal overflow at tablet or phone sizes. The mark loaded successfully and remains recognizable at header size. White on teal contrast: 4.81:1; muted text on white: 5.63:1. Map rendered 507 markers with fill `#087E8B`. Four existing UI helper tests passed; catalogue behavior is unchanged.
