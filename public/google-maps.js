import { hasCoordinates } from './helpers.js';
let loading;
export function loadGoogleMaps(key) {
  if (globalThis.google?.maps?.importLibrary) return Promise.resolve(globalThis.google.maps);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => { clearTimeout(timer); script.remove(); loading = null; reject(new Error('Google Maps could not load. Please retry or use the catalogue search.')); };
    globalThis.wirelessGoogleReady = () => { clearTimeout(timer); resolve(globalThis.google.maps); };
    globalThis.gm_authFailure = () => { fail(); globalThis.dispatchEvent(new Event('wireless-google-error')); };
    script.onerror = fail;
    const params = new URLSearchParams({ key, v: 'quarterly', loading: 'async', callback: 'wirelessGoogleReady', libraries: 'places', region: 'SG', language: 'en' });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true; document.head.append(script);
  });
  return loading;
}
export async function selectedOrigin(prediction) {
  const place = prediction.toPlace();
  // Location and address only: no contact, reviews, opening hours or persistent storage.
  await place.fetchFields({ fields: ['location', 'formattedAddress'] });
  const origin = { latitude: place.location?.lat(), longitude: place.location?.lng() };
  if (!hasCoordinates(origin)) throw new Error('Choose a place in Singapore with a usable map location.');
  return { ...origin, label: place.formattedAddress || 'selected Google place' };
}
export async function attachAutocomplete(key, container, onSelect, onError, onStart) {
  const maps = await loadGoogleMaps(key);
  const { PlaceAutocompleteElement } = await maps.importLibrary('places');
  const input = new PlaceAutocompleteElement({ includedRegionCodes: ['sg'] });
  input.placeholder = 'Search a Singapore place, address or postal code';
  input.setAttribute('aria-label', 'Search any Singapore place');
  input.addEventListener('gmp-select', async ({ placePrediction }) => {
    const request = onStart();
    try { onSelect(await selectedOrigin(placePrediction), request); }
    catch (error) { onError(error, request); }
  });
  input.addEventListener('gmp-error', () => onError(new Error('Google place search is unavailable. Use the catalogue search, your location or coordinates.')));
  container.replaceChildren(input);
  return input;
}
export async function createGoogleMap(key, element, onPoint) {
  const maps = await loadGoogleMaps(key);
  const { Map, Data, InfoWindow } = await maps.importLibrary('maps');
  const { SymbolPath } = await maps.importLibrary('core');
  const color = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const map = new Map(element, { center: { lat: 1.3521, lng: 103.8198 }, zoom: 11, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, gestureHandling: 'cooperative', clickableIcons: false });
  map.addListener('click', event => { if (event.latLng) onPoint(event.latLng.lat(), event.latLng.lng()); });
  const layer = new Data({ map });
  const origins = new Data({ map });
  layer.setStyle(feature => ({ title: feature.getProperty('venue').name, icon: { path: SymbolPath.CIRCLE, scale: 6, fillColor: color('--color-marker'), fillOpacity: .95, strokeColor: color('--color-marker-outline'), strokeWeight: 2 } }));
  origins.setStyle({ clickable: false, zIndex: 2, icon: { path: SymbolPath.CIRCLE, scale: 9, fillColor: color('--color-marker-outline'), fillOpacity: 1, strokeColor: color('--color-origin'), strokeWeight: 4 } });
  const popup = new InfoWindow();
  const clear = data => { const features = []; data.forEach(feature => features.push(feature)); features.forEach(feature => data.remove(feature)); };
  let makePopup;
  layer.addListener('click', event => {
    popup.setContent(makePopup(event.feature.getProperty('venue')));
    popup.setPosition(event.latLng); popup.open({ map });
  });
  return {
    clearOrigin() { clear(origins); popup.close(); },
    showOrigin(point) {
      clear(origins);
      const center = { lat: point.latitude, lng: point.longitude };
      origins.add({ geometry: new Data.Point(center) });
      map.setCenter(center); map.setZoom(15);
    },
    render(venues, popupBuilder) {
      clear(layer); popup.close(); makePopup = popupBuilder;
      venues.filter(hasCoordinates).forEach(venue => {
        layer.add({ geometry: new Data.Point({ lat: venue.latitude, lng: venue.longitude }), properties: { venue } });
      });
    }
  };
}
