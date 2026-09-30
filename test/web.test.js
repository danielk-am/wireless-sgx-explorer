import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCoordinates, searchVenues, distanceLabel, safeGoogleUrl } from '../public/helpers.js';
const venues = [
  { name: 'Albert Centre', address: '270 QUEEN STREET', postal_code: '180270', latitude: 1.301, longitude: 103.854, hotspots: [{ location: 'Albert Centre Level 1 stall 112' }] },
  { name: 'Library', address: '10 STREET', postal_code: '123456', latitude: null, longitude: null, hotspots: [{ location: 'Library Level 2' }] }
];
test('only finite Singapore coordinates are considered mappable', () => {
  assert.equal(hasCoordinates(venues[0]), true);
  for (const latitude of [null, undefined, NaN, '1.3', 0, 51]) assert.equal(hasCoordinates({ latitude, longitude: 103.8 }), false);
});
test('catalogue search preserves unlocated venues and finds floors and postal codes', () => {
  assert.equal(searchVenues(venues, '  LIBRARY  level 2 ')[0], venues[1]);
  assert.equal(searchVenues(venues, '180270')[0], venues[0]);
  assert.equal(searchVenues(venues, 'QUEEN ST.')[0], venues[0]);
  assert.deepEqual(searchVenues(venues, '---'), []);
  assert.equal(searchVenues(venues, 'stall 112')[0], venues[0]);
  assert.deepEqual(searchVenues(venues, 'Fortune Centre'), []);
});
test('distance labels remain explicit approximations', () => {
  assert.equal(distanceLabel(0), '~0 m'); assert.equal(distanceLabel(1245), '~1.2 km'); assert.equal(distanceLabel(null), ''); assert.equal(distanceLabel(-1), '');
});
test('external directions allow only HTTPS Google Maps', () => {
  assert.equal(safeGoogleUrl('javascript:alert(1)'), null); assert.equal(safeGoogleUrl('https://www.google.com.evil.test/maps'), null); assert.equal(safeGoogleUrl('https://www.google.com/maps/?q=Singapore'), 'https://www.google.com/maps/?q=Singapore');
});
