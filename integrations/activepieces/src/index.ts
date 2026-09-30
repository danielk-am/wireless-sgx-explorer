import { createAction, createPiece, PieceAuth, Property } from '@activepieces/pieces-framework';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

export const wirelessSgxAuth = PieceAuth.CustomAuth({
  displayName: 'Explorer API connection', required: true,
  description: 'Your self-hosted Wireless@SGX Explorer API. Use HTTPS except on localhost. Optional token is stored in the connection, never in the flow.',
  props: {
    baseUrl: Property.ShortText({ displayName: 'API base URL', required: true }),
    token: PieceAuth.SecretText({ displayName: 'API bearer token (optional)', required: false }),
  },
});

export function endpoint(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.username || url.password || url.search || url.hash) throw new Error('Use a base URL without credentials, query or fragment.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('HTTPS is required except for localhost.');
  }
  return `${url.toString().replace(/\/$/, '')}/api/lookup`;
}

export async function requestLookup(connection: {baseUrl: string; token?: string}, operation: string, args: Record<string, unknown>) {
  if (!['nearest_hotspots', 'search_hotspots', 'search_venues', 'get_hotspot', 'dataset_info'].includes(operation)) throw new Error('Unsupported operation.');
  const url = endpoint(connection.baseUrl);
  if (connection.token && /[\r\n]/.test(connection.token)) throw new Error('Invalid bearer token.');
  try {
    const body = await new Promise<{ok?: boolean}>((resolve, reject) => {
      const payload = JSON.stringify({ operation, arguments: Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined && value !== '')) });
      const send = url.startsWith('https:') ? httpsRequest : httpRequest;
      const request = send(url, {
        method: 'POST', rejectUnauthorized: true,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), ...(connection.token ? { Authorization: `Bearer ${connection.token}` } : {}) },
      }, response => {
        const chunks: Buffer[] = []; let bytes = 0;
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          response.resume(); reject(new Error('Unexpected HTTP status.')); return;
        }
        response.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 2_000_000) { response.destroy(); reject(new Error('Response too large.')); }
          else chunks.push(chunk);
        });
        response.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('Invalid JSON.')); } });
        response.on('error', reject);
      });
      const deadline = setTimeout(() => request.destroy(new Error('Request timed out.')), 15000);
      request.on('close', () => clearTimeout(deadline));
      request.on('error', reject);
      request.end(payload);
    });
    if (!body || typeof body.ok !== 'boolean') throw new Error('Invalid API response.');
    // Preserve structured catalogue errors; a missing origin is not a successful location match.
    return body;
  } catch {
    // Upstream errors can contain request headers. Never echo them into flow execution logs.
    throw new Error('Wireless@SGX API request failed. Check the URL, connection token and server availability.');
  }
}

const limit = Property.Number({ displayName: 'Maximum results (1–20)', required: false, defaultValue: 5 });
const query = Property.ShortText({ displayName: 'Place, postal code or search text', required: false });
const nearest = createAction({
  name: 'nearest_hotspots', displayName: 'Find nearest hotspot venues',
  description: 'Find venues by an indexed place/postal code or coordinates. Distances are straight-line; missing coordinates and indoor coverage remain explicit.', auth: wirelessSgxAuth,
  props: { query, latitude: Property.Number({ displayName: 'Latitude', required: false }), longitude: Property.Number({ displayName: 'Longitude', required: false }), limit, radius_m: Property.Number({ displayName: 'Maximum radius (metres)', required: false }) },
  async run(context) { return requestLookup(context.auth.props, 'nearest_hotspots', context.propsValue); },
});
const searchHotspots = createAction({
  name: 'search_hotspots', displayName: 'Search individual hotspots', description: 'Search source hotspot and floor descriptions.', auth: wirelessSgxAuth,
  props: { query: Property.ShortText({ displayName: 'Search text', required: true }), limit },
  async run(context) { return requestLookup(context.auth.props, 'search_hotspots', context.propsValue); },
});
const searchVenues = createAction({
  name: 'search_venues', displayName: 'Search grouped venues', description: 'Search the same grouped venues shown on the map.', auth: wirelessSgxAuth,
  props: { query: Property.ShortText({ displayName: 'Search text', required: true }), limit },
  async run(context) { return requestLookup(context.auth.props, 'search_venues', context.propsValue); },
});
const getHotspot = createAction({
  name: 'get_hotspot', displayName: 'Get hotspot details', description: 'Read a catalogue hotspot by its returned ID.', auth: wirelessSgxAuth,
  props: { hotspot_id: Property.ShortText({ displayName: 'Hotspot ID', required: true }) },
  async run(context) { return requestLookup(context.auth.props, 'get_hotspot', context.propsValue); },
});
const datasetInfo = createAction({
  name: 'dataset_info', displayName: 'Read catalogue status', description: 'Get source dates, counts and coordinate limitations.', auth: wirelessSgxAuth, props: {},
  async run(context) { return requestLookup(context.auth.props, 'dataset_info', {}); },
});
export const wirelessSgx = createPiece({
  displayName: 'Wireless@SGX Explorer', description: 'Find listed connectivity venues in Singapore using one shared, source-dated catalogue.',
  auth: wirelessSgxAuth,
  logoUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2212%22 fill=%22%230f766e%22/%3E%3Ctext x=%2232%22 y=%2242%22 text-anchor=%22middle%22 font-size=%2230%22 fill=%22white%22%3EW%3C/text%3E%3C/svg%3E',
  authors: ['wireless-sgx-explorer'], actions: [nearest, searchHotspots, searchVenues, getHotspot, datasetInfo], triggers: [],
});
