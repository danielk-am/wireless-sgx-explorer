# Wi-Fi Explorer for Wireless@SGX — Activepieces custom piece

Five real action implementations call your self-hosted Explorer's shared `POST /api/lookup` endpoint: `nearest_hotspots`, `search_hotspots`, `search_venues`, `get_hotspot`, and `dataset_info`. This package contains no catalogue copy. It is a portfolio integration for finding listed Singapore connectivity venues, with provenance and uncertainty preserved.

## Build and test

Use Node 22 or newer, from this directory:

```sh
npm ci --ignore-scripts
npm test
npm pack
```

This produces `wireless-sgx-piece-wireless-sgx-0.1.0.tgz`. Development dependencies are pinned with a lockfile. Tests use official framework 0.32.0 (whose shared dependency is 0.95.1). The distributed package declares the framework as an **optional peer** so npm does not auto-install that older development runtime. A compatible, separately reviewed framework must already be supplied by your host or deployment. The optional marker controls installation only; the framework is required to execute the piece. Actual installation into an Activepieces host and its sandbox has **not** been tested.

## Install and connect

First confirm that your host makes its reviewed `@activepieces/pieces-framework` available to custom pieces. This package does not fetch a framework at runtime. Official community pieces normally list workspace framework dependencies; this optional-peer packaging is our deliberate distribution choice, **not a verified Activepieces host guarantee**. If your host isolates each piece without resolving that peer, use the built-in HTTP flow instead until a host-specific package build is verified.

On an edition supporting private pieces, a platform administrator can upload the archive through **Platform Admin → Catalogue → Pieces → Install Piece → Upload File**. Consult the [official piece management instructions](https://www.activepieces.com/docs/admin-guide/guides/manage-pieces) for your installed version; private/custom-piece installation is a paid feature. This package has not been published to npm or the public Activepieces catalogue.

Create a connection with your Explorer base URL (for example `https://explorer.example.org`). HTTPS is required except for localhost development. An optional bearer token is stored as a secret in the connection. It is only needed when you have configured authentication at your reverse proxy: the Explorer's public read-only `/api/lookup` is not protected by `MCP_TOKEN`.

Add an action, provide its arguments, run it and inspect `ok`. Never treat an unresolved origin or failed request as a successful nearest-place lookup. Keep source dates, distance type and coordinate limitations in downstream messages.

## Safety and release limitations

Requests have a 15-second total deadline, a two-megabyte response cap, explicit HTTPS certificate verification, no redirect following and no retries. Errors omit credentials and upstream request details. Base URLs cannot contain URL credentials, queries or fragments. The connection is trusted administrator configuration; do not map its URL from an untrusted trigger input.

The published `@activepieces/pieces-common` 0.12.5 HTTP implementation was inspected and found to set `NODE_TLS_REJECT_UNAUTHORIZED=0`; this package does **not** depend on it or use that client. It uses Node's built-in HTTP/HTTPS with explicit certificate verification instead.

`dependency-audit.json` records **3 development-tree findings: 2 high propagation findings and 1 critical `expr-eval` finding**. The upstream package has no patched official `expr-eval` version; no unofficial fork was substituted. Development overrides patch `ai` to 6.0.296, `nanoid` to 3.3.19 and `deepmerge-ts` to 8.0.2. The latter is a major upgrade; the only shared-library usage found is `deepMergeAndCast`, whose object/array contract is explicitly tested alongside all action handlers. These overrides apply to this development root, not your host.

The distributed archive has **no runtime dependencies to auto-install**. Its `production-dependency-audit.json` reports zero findings for the package's production dependency installation. This excludes the separately supplied host framework and is **not a clean-host security certification**. Development/build commands still install the vulnerable official test framework; use an isolated development environment and never feed untrusted expressions to it. The piece does not evaluate expressions.

Upstream main currently declares framework 0.40.0 with thinner core dependencies, but that version was not available under the npm latest tag checked for this build (0.32.0). We did not package unpublished source as a release or claim it resolves host risk. References: [upstream framework manifest](https://github.com/activepieces/activepieces/blob/main/packages/pieces/framework/package.json), [upstream example piece manifest](https://github.com/activepieces/activepieces/blob/main/packages/pieces/community/notion/package.json), [deepmerge release changes](https://github.com/RebeccaStevens/deepmerge-ts/blob/main/CHANGELOG.md).

A built-in HTTP action offers the same operations without installing this custom package. See [the complete portfolio guide](../../docs/portfolio.md) for that fallback, the n8n integration and the exact tested/untested boundaries.

Official source references: [Custom authentication](https://www.activepieces.com/docs/build-pieces/piece-reference/authentication), [Create an action](https://www.activepieces.com/docs/build-pieces/building-pieces/create-action), [build custom pieces](https://www.activepieces.com/docs/build-pieces/misc/build-piece).
