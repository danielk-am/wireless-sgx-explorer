export function hasCoordinates(venue) {
  return Number.isFinite(venue.latitude) && Number.isFinite(venue.longitude)
    && venue.latitude >= 1.1 && venue.latitude <= 1.5
    && venue.longitude >= 103.5 && venue.longitude <= 104.2;
}
const aliases = {rd:'road',st:'street',ave:'avenue',blk:'block',ctr:'centre',center:'centre',blvd:'boulevard'};
const searchable = value => String(value).normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').map(word => aliases[word] || word).join(' ');
export function searchVenues(venues, query) {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  if (query.trim() && !words.length) return [];
  return venues.filter(venue => {
    const text = searchable([venue.name, venue.address, venue.postal_code, ...(venue.hotspots || []).map(h => h.location)].join(' '));
    return words.every(word => text.includes(word));
  });
}
export function distanceLabel(metres) {
  if (!Number.isFinite(metres) || metres < 0) return '';
  return metres < 1000 ? `~${Math.round(metres)} m` : `~${(metres / 1000).toFixed(1)} km`;
}
export function safeGoogleUrl(raw) {
  try { const url = new URL(raw); return url.protocol === 'https:' && url.hostname === 'www.google.com' && url.pathname.startsWith('/maps') ? url.href : null; } catch { return null; }
}
