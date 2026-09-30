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

## Edit the live banner areas

Two first-party enquiry placeholders are now configured in `public/banners.json`. They do not load an advertising network or tracking scripts. There is no admin dashboard: edit this file in GitHub or your checkout, commit it and redeploy the site in Coolify. The configuration is public; never put a token, password or private customer details in it.

| Slot | Placement |
| --- | --- |
| `map-side` | Card below map information; shown only above 900px |
| `explorer-bottom` | Card below the listings’ Show more button; mobile and desktop |

For each slot, edit `title`, `description`, `button` and `url`. Set `state` to `available` for an enquiry placeholder, `sponsored` for a real advertiser (automatically labelled Sponsored), or `hidden` to remove it. A missing or invalid slot also stays hidden. Links support HTTPS or a local path. Do not include visitor location, search or route information in any advertising link.

Optional `image` must be a path under `/banner-assets/`, e.g. `/banner-assets/campaign.webp`; put that file in `public/banner-assets/`. Supply `imageAlt` for meaningful creative text. Images use contain sizing, so nothing is cropped. Text and the button remain usable if an image fails. Recommended source artwork is 600×400 for the card and 900×600 for the wide banner's image area; these are flexible illustrated cards, not standard network ad units.

Enquiries go through `/advertise.html` to `hey@danielk.am`, with the selected placement in the subject. This opens the visitor's mail app and does not send an email automatically. Edit that page to change the contact address or sales copy.

To add an area, add a unique key under `slots`, then a corresponding element in `public/index.html`:

```html
<section class="banner-slot banner-slot--wide" data-banner-slot="new-slot" aria-label="Advertising space" hidden></section>
```

Keep it outside map controls, search, and result cards. Check mobile and desktop before deploying. Use `banner-slot--side` for desktop-only cards.

For actual **Buy now**: first agree the placement, rate, duration and availability process, then replace the placeholder link with the verified hosted checkout URL and set `button` to `Buy this ad space`. Publish booking terms on the advertising page. A payment link alone does not reserve inventory or automatically publish a creative; that needs a separate booking/fulfilment workflow. Until those details exist, the shipped buttons intentionally say “Advertise here” and “Book this ad space” and lead to an enquiry.

## Manual AdSense unit

Set `ADSENSE_CLIENT` (ca-pub- plus 16 digits) and `ADSENSE_SLOT` (10 digits) in the runtime environment to enable one responsive ad below the listings’ Show more button. Both are public identifiers; leave either blank to disable the integration. Do not commit account-specific values. Keep Auto ads disabled in AdSense to preserve manual placement.

The configured homepage is served with a fresh script nonce and `Cache-Control: no-store`. Its strict CSP follows Google’s nonce/strict-dynamic approach; HTTPS frames, images and connections are permitted for ad creatives and consent services. Other routes retain the existing CSP. Do not place a caching rule over HTML that reuses nonce responses. See https://support.google.com/adsense/answer/16283098.

The network ad is labelled Advertisement, separate from search and directions. A filled unit replaces the bottom enquiry card; unfilled or blocked ads leave that enquiry available. AdSense requests happen only once per page load, not on every search. Do not click live ads during testing.

Before activation, verify the root-domain ads.txt entry, site approval state and Google CMP configuration. Approval and actual ad delivery are external to this app; an empty placement before approval is expected. Runtime smoke tests cannot prove monetisation or regional consent behaviour.

The listings show three cards initially and add three per Show more action. The reserved ad placement follows that button with a 48px separation and divider. Server-rendered placeholders reserve space before banner configuration arrives; network and enquiry content share the same reserved region. Desktop listing scrollbars become visible on hover or keyboard focus. These placements are candidates for measurement, not proven highest-CTR locations.
