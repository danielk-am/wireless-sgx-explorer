const colorToken = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
import { hasCoordinates, searchVenues, distanceLabel, safeGoogleUrl } from './helpers.js';
import { attachAutocomplete, createGoogleMap } from './google-maps.js?v=google-1';
const $ = id => document.getElementById(id);
const state = { venues: [], shown: [], limit: 12, map: null, markers: null, origin: null, startingPoint: null, request: 0, loaded: false, mapsKey: '', googleView: null };
const number = value => value.toLocaleString('en-SG');
async function requestJSON(url, options = {}) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
  try { const response = await fetch(url, { ...options, signal: controller.signal }); return { response, data: await response.json() }; }
  catch (error) { if (error.name === 'AbortError') throw new Error('The service took too long to respond. Please retry.'); throw error; }
  finally { clearTimeout(timeout); }
}
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function status(text) { $('status').textContent = text; }
function busy(active) { $('locate').disabled = active; $('search-form').querySelector('button').disabled = active; $('coordinates').querySelector('button').disabled = active; $('results').setAttribute('aria-busy', String(active)); }
function directions(venue) {
  return safeGoogleUrl(venue.google_walking_directions_url || venue.google_maps_url) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.address}, Singapore ${venue.postal_code}`)}`;
}
function card(venue) {
  const node = el('article', undefined, 'card'); node.id = `venue-${venue.venue_id}`;
  const top = el('div', undefined, 'card-top'); top.append(el('h3', venue.name));
  const distance = distanceLabel(venue.distance_m); if (distance) top.append(el('span', distance, 'distance')); node.append(top);
  node.append(el('p', `${venue.address || 'Street address not supplied'}, Singapore ${venue.postal_code}`, 'address'));
  const badges = el('div', undefined, 'badges'); badges.append(el('span', `${venue.listed_hotspot_count} listed hotspot${venue.listed_hotspot_count === 1 ? '' : 's'}`, 'badge'));
  badges.append(el('span', hasCoordinates(venue) ? 'Venue coordinates' : 'Not yet located on map', `badge${hasCoordinates(venue) ? '' : ' unlocated'}`)); node.append(badges);
  const details = el('details'); details.append(el('summary', 'View floors & hotspot details'));
  const list = el('ul'); for (const hotspot of venue.hotspots || []) list.append(el('li', `${hotspot.location} · ${hotspot.operator || 'Operator not listed'}${hotspot.source_page ? ` · PDF p. ${hotspot.source_page}` : ''}`));
  details.append(list, el('p', hasCoordinates(venue) ? `Representative venue point. Coordinate reference: ${venue.coordinate_source_date || 'date unknown'}. Signal and access unverified.` : 'This venue remains searchable but is excluded from map pins and distance ranking until coordinates are verified.', 'provenance')); node.append(details);
  const actions = el('div', undefined, 'card-actions'); const link = el('a', 'Open in Google Maps ↗'); link.href = directions(venue); link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
  if (hasCoordinates(venue)) { const nearby = el('button', 'Find nearby', 'secondary'); nearby.type = 'button'; nearby.addEventListener('click', () => nearest(venue.latitude, venue.longitude, venue.name)); actions.append(nearby); }
  node.append(actions); return node;
}
function render() {
  const shown = state.shown.slice(0, state.limit); $('results').replaceChildren(...shown.map(card));
  if (!shown.length) $('results').append(el('div', 'No matching catalogue venues. Try a shorter name, street or postal code. For an unlisted starting point, use your location, enter coordinates or click the loaded map.', 'empty'));
  $('result-count').textContent = `${number(state.shown.length)} venues`;
  $('more').hidden = state.limit >= state.shown.length;
  if (state.map) renderMarkers();
}
function browse(query = '') {
  state.request++; busy(false); state.startingPoint = null; state.googleView?.clearOrigin(); if (state.origin) { state.origin.remove(); state.origin = null; } $('origin-choices').replaceChildren(); state.shown = query.trim() ? searchVenues(state.venues, query) : state.venues;
  state.limit = 12; $('results-heading').textContent = query.trim() ? `Results for “${query.trim()}”` : 'Listed locations';
  $('result-note').textContent = 'Browsing all listed venues. Search a starting point or use your location to sort hotspots by distance.';
  status(query.trim() ? `${number(state.shown.length)} matching venues. This is a catalogue search, not a general address lookup.` : 'Browse the catalogue, or choose a starting point for a distance search.'); render();
}
async function nearest(latitude, longitude, label, query) {
  if (!state.loaded) { status('The catalogue is not ready. Please retry loading it first.'); return; }
  const request = ++state.request; busy(true); $('origin-choices').replaceChildren(); status(`Finding listed venues near ${label}…`);
  try {
    const { response, data } = await requestJSON('/api/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'nearest_hotspots', arguments: query === undefined ? { latitude, longitude, limit: 10 } : { query, limit: 10 } }) });
    if (request !== state.request) return;
    if (data.error?.code === 'AMBIGUOUS_ORIGIN') {
      const choices = $('origin-choices');
      choices.append(el('p', 'Choose your starting point. We’ll find the nearest hotspots around it.', 'help'));
      for (const candidate of data.candidates || []) {
        const venue = state.venues.find(item => item.venue_id === candidate.venue_id);
        if (!venue || !hasCoordinates(venue)) continue;
        const button = el('button', `${venue.name} — ${venue.address}, ${venue.postal_code}`, 'secondary');
        button.type = 'button'; button.addEventListener('click', () => nearest(venue.latitude, venue.longitude, venue.name)); choices.append(button);
      }
      if (!choices.querySelector('button')) {
        choices.replaceChildren();
        status('Matching places have no usable coordinates. Use your location, enter coordinates or choose a point on the map. Previous results remain visible.');
        return;
      }
      status(`Several starting points match. Choose one below${data.candidate_count > 10 ? ' (first 10 matches; refine your search for more)' : ''}; previous results remain until you select.`);
      choices.querySelector('button')?.focus();
      return;
    }
    if (!response.ok || !data.ok) throw new Error(data.error?.message || 'The lookup could not be completed.');
    if (!Array.isArray(data.results)) throw new Error('The lookup returned an unexpected response.');
    latitude = data.origin.latitude; longitude = data.origin.longitude;
    state.startingPoint = { latitude, longitude };
    state.shown = data.results; state.limit = 12; $('results-heading').textContent = `Near ${label}`;
    const located = state.venues.filter(hasCoordinates).length;
    $('result-note').textContent = `Approximate straight-line distance, not walking distance or signal range. Ranking covers ${number(located)} located venues; ${number(state.venues.length - located)} unlocated venues are excluded.`;
    status(`Found ${data.results.length} nearby listed venues. Check floor details and access before travelling.`);
    showStartingPoint();
    render();
  } catch (error) { if (request === state.request) status(`Unable to find nearby venues: ${error.message} Your previous results remain visible. Try again or browse the catalogue.`); }
  finally { if (request === state.request) busy(false); }
}
function showStartingPoint() {
  if (!state.startingPoint) return;
  if (state.googleView) { state.googleView.showOrigin(state.startingPoint); return; }
  if (!state.map) return;
  const { latitude, longitude } = state.startingPoint;
  if (state.origin) state.origin.remove();
  state.origin = window.L.circleMarker([latitude, longitude], { bubblingMouseEvents: false, radius: 9, color: colorToken('--color-origin'), fillColor: colorToken('--color-origin'), fillOpacity: .85, weight: 3 }).addTo(state.map).bindTooltip('Your selected starting point');
  state.map.setView([latitude, longitude], 15);
}
function searchNearby() {
  const query = $('query').value.trim();
  if (!query) { status('Enter a starting place or postal code, or choose Use my location.'); $('query').focus(); return; }
  nearest(undefined, undefined, query, query);
}
function renderMarkers() {
  if (state.googleView) { state.googleView.render(state.shown, venuePopup); return; }
  state.markers.clearLayers();
  for (const venue of state.shown.filter(hasCoordinates)) {
    const marker = window.L.circleMarker([venue.latitude, venue.longitude], { bubblingMouseEvents: false, radius: 6, weight: 2, color: colorToken('--color-marker-outline'), fillColor: colorToken('--color-marker'), fillOpacity: .92 }).addTo(state.markers);
    marker.bindPopup(venuePopup(venue));
  }
}
function venuePopup(venue) {
    const popup = el('div'); popup.append(el('strong', venue.name), el('div', `${venue.address} · ${venue.listed_hotspot_count} listed hotspots`));
    const button = el('button', 'View venue details'); button.type = 'button'; button.addEventListener('click', () => {
      const index = state.shown.findIndex(item => item.venue_id === venue.venue_id); state.limit = Math.max(state.limit, index + 1); render(); const target = $(`venue-${venue.venue_id}`); target.querySelector('details').open = true; target.scrollIntoView({ behavior: 'instant', block: 'nearest' }); target.querySelector('summary').focus();
    }); popup.append(button); return popup;
}
async function showMap() {
  if (!state.loaded) { status('Please wait for the catalogue to load, or use Retry catalogue.'); return; }
  const button = $('show-map'); button.disabled = true; button.textContent = 'Loading map…';
  try {
    if (state.mapsKey) {
      state.googleView = await createGoogleMap(state.mapsKey, $('map'), (lat, lng) => nearest(lat, lng, 'selected map point'));
      state.map = state.googleView;
      renderMarkers(); showStartingPoint(); return;
    }
    if (!window.L) await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = '/vendor/leaflet/leaflet.js'; script.onload = resolve; script.onerror = () => reject(new Error('Map library unavailable')); document.head.append(script); });
    $('map').replaceChildren(); state.map = window.L.map('map', { scrollWheelZoom: false }).setView([1.3521, 103.8198], 11);
    const tiles = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(state.map);
    tiles.on('tileerror', () => status('Some map tiles could not load. The location list and venue details are still available.'));
    state.markers = window.L.layerGroup().addTo(state.map); renderMarkers(); showStartingPoint();
    state.map.on('click', event => nearest(event.latlng.lat, event.latlng.lng, 'selected map point'));
  } catch { status('The map could not load. You can still search and browse all locations in the list.'); if (button.isConnected) { button.disabled = false; button.textContent = 'Retry map'; } }
}
async function load() {
  try {
    if (!state.mapsKey) {
      const { response: configResponse, data: config } = await requestJSON('/api/config');
      if (!configResponse.ok) throw new Error('Configuration unavailable');
      state.mapsKey = config.googleMapsBrowserKey || '';
      if (state.mapsKey) {
        $('google-search').hidden = false;
        $('map-privacy').replaceChildren(document.createTextNode('Google place search and maps receive your IP address, typed searches and viewed area. A selected starting point is sent to this service for distance lookup and is not stored. '));
        const privacy = el('a', 'Privacy and terms'); privacy.href = '/privacy.html'; $('map-privacy').append(privacy);
        $('google-enable').addEventListener('click', enableGoogleSearch);
      }
    }
    const { response, data } = await requestJSON('/api/venues'); if (!response.ok) throw new Error('Catalogue unavailable'); if (!Array.isArray(data.venues)) throw new Error('Unexpected catalogue response');
    state.venues = data.venues; state.loaded = true;
    if (data.metadata?.catalogue_date && data.metadata?.coordinate_dataset_date) {
      const dates = `Catalogue: ${data.metadata.catalogue_date}. Coordinate reference: ${data.metadata.coordinate_dataset_date}.`; $('source-note').textContent = dates; $('catalogue-date').textContent = ` · ${dates}`;
    }
    const source = data.metadata?.source || {};
    for (const [id, url] of [['catalogue-link', source.url], ['source-link', source.url], ['coordinate-link', source.coordinate_dataset_url], ['license-link', source.license_url]]) {
      try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || parsed.username || parsed.password) continue; $(id).href = parsed.href; $(id).hidden = false; } catch {}
    }
    $('source-age').textContent = source.date_note || '';
    $('source-attribution').textContent = source.attribution || '';
    if (source.source_format === 'geojson') $('catalogue-date').textContent += ` Records dated ${source.source_feature_updated_at || 'unknown'}. Historical dataset; current availability unverified.`;
    const located = data.venues.filter(hasCoordinates).length; const entries = data.venues.reduce((total, v) => total + v.listed_hotspot_count, 0);
    $('counts').replaceChildren(...[[entries, 'hotspot entries'], [data.venues.length, 'venues'], [located, 'mapped venues'], [data.venues.length - located, 'awaiting coordinates']].map(([value, label]) => { const node = el('span'); node.append(el('strong', number(value)), document.createTextNode(label)); return node; }));
    browse();
  } catch { status('The catalogue could not load. Check your connection and try again.'); const retry = el('button', 'Retry catalogue', 'secondary'); retry.addEventListener('click', load); $('results').replaceChildren(retry); }
}
async function enableGoogleSearch() {
  if (!state.loaded) { status('Please wait for the catalogue to load, or use Retry catalogue.'); return; }
  $('google-enable').disabled = true;
  try {
    await attachAutocomplete(state.mapsKey, $('google-input'), (origin, request) => {
      if (request !== state.request) return;
      nearest(origin.latitude, origin.longitude, origin.label);
    }, (error, request) => {
      if (request !== undefined && request !== state.request) return;
      busy(false); status(error.message);
    }, () => { const request = ++state.request; busy(true); status('Finding the selected place…'); return request; });
    $('google-enable').hidden = true;
    status('Select a Google suggestion to find nearby hotspots automatically.');
  } catch (error) { status(error.message); $('google-enable').disabled = false; }
}
window.addEventListener('wireless-google-error', () => {
  ++state.request; busy(false); status('Google search or map could not authenticate. Catalogue search, coordinates and Use my location remain available.');
});
$('search-form').addEventListener('submit', event => { event.preventDefault(); if (!state.loaded) return status('Please load the catalogue first using Retry catalogue.'); searchNearby(); });
$('reset').addEventListener('click', () => { if (!state.loaded) return load(); $('query').value = ''; browse(); });
$('more').addEventListener('click', () => { state.limit += 12; render(); });
$('show-map').addEventListener('click', showMap);
$('coordinates').addEventListener('submit', event => { event.preventDefault(); const fields = new FormData(event.target); nearest(Number(fields.get('latitude')), Number(fields.get('longitude')), 'entered coordinates'); });
$('locate').addEventListener('click', () => {
  if (!state.loaded) return status('Please load the catalogue first.');
  if (!navigator.geolocation) return status('Your browser does not support location access. Use coordinates or the map instead.');
  const request = ++state.request; status('Waiting for your location permission…'); $('locate').disabled = true;
  navigator.geolocation.getCurrentPosition(position => { if (request !== state.request) return; $('locate').disabled = false; nearest(position.coords.latitude, position.coords.longitude, 'your location'); }, () => { if (request !== state.request) return; $('locate').disabled = false; status('Your location could not be obtained. You can search a venue, enter coordinates or choose a point on the map.'); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
});
load();
