# Advertising on wireless.danielk.am

Prepared 30 September 2026. No ad account, paid placement, affiliate contract or tracking script is enabled by this plan.

## Recommended first placement

Offer one clearly labelled “Sponsored” card below the explorer/results workspace, separated from map controls, search and walking-direction links. Suitable advertisers include Singapore coworking spaces, travel connectivity providers and remote-work services. Use a locally hosted creative with an ordinary outbound link (`rel="sponsored noopener noreferrer"`), agreed dates and a factual offer. Keep sponsors out of the distance ranking and catalogue: paid placement must not imply a Wireless@SGX hotspot, current signal, public access or IMDA endorsement. Do not transmit a visitor's exact coordinates, search or route destination to an advertiser.

A disclosed affiliate offer can use this same card once a real affiliate relationship and tracking URL exist. No invented partner logos, rates, earnings or placeholder affiliate IDs. Measure aggregate outbound clicks only if analytics and the privacy notice cover that collection; a static sponsorship does not require third-party ad JavaScript.

## Optional AdSense implementation

1. Use the owner's real AdSense publisher account and obtain site approval. Build useful original visitor guidance around the finder, rather than relying entirely on a reproduced dataset. Approval and earnings are not guaranteed.
2. Add the verified publisher entry to `https://danielk.am/ads.txt`, preserving existing sellers. Google normally checks the root domain. A separate subdomain ads.txt referral is needed when the subdomain uses a different seller/publisher ID; do not blindly overwrite WordPress's existing ads.txt.
3. Add the account's genuine script and one responsive manual ad unit in the separated placement. Reserve its height, keep adequate spacing, and avoid map overlays, sticky obstruction, interstitials and ads among clickable location pins.
4. Update the privacy notice and configure Google's required consent management for applicable visitor regions, including the EEA, UK and Switzerland. Consent requirements depend on visitors, not just the server's Singapore audience.
5. Review the current restrictive Content-Security-Policy in `src/http.js`: allow only the actual ad, frame and connection origins needed by the chosen Google integration. Test in report-only mode before enforcement where appropriate; do not replace it with wildcard permissions. Preserve geolocation permission and API origin checks.
6. Verify with the real approved account: consent states, no accidental clicks, no blocked resources, mobile layout stability, and no location/search data leaking into ad URLs. Never click your own ads during QA.

## References

- Site readiness: https://support.google.com/adsense/answer/7299563
- Approval and account connection: https://support.google.com/adsense/answer/7584263
- Root/subdomain ads.txt: https://support.google.com/adsense/answer/9785052
- Placement: https://support.google.com/adsense/answer/1282097
- Consent: https://support.google.com/adsense/answer/13554116

The historical open-data launch and the March 2026 local PDF prototype are distinct releases. Monetization does not expand source-data licences. Preserve the public dataset attribution and historical dates.
