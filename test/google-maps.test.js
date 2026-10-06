import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { selectedOrigin } from '../public/google-maps.js';
import { createApp } from '../src/http.js';
test('Google place resolves to coordinates without a postal-code dependency', async () => {
  let requested;
  const origin = await selectedOrigin({ toPlace: () => ({ location: { lat: () => 1.3, lng: () => 103.85 }, formattedAddress: 'Example place, Singapore', fetchFields: async fields => { requested = fields; } }) });
  assert.deepEqual(origin, { latitude: 1.3, longitude: 103.85, label: 'Example place, Singapore' });
  assert.deepEqual(requested.fields, ['location', 'formattedAddress']);
});
test('Google locations reject missing, nonfinite and out-of-area coordinates', async () => {
  for (const location of [undefined, {lat:()=>NaN,lng:()=>103.8}, {lat:()=>51,lng:()=>0}]) {
    await assert.rejects(selectedOrigin({toPlace:()=>({location,fetchFields:async()=>{}})}), /Singapore/);
  }
});
test('browser config exposes only designated browser key; Google policy is conditional', async () => {
  for (const key of ['', 'public-browser-test-key']) {
    const server = createApp({mapsBrowserKey:key,mcpToken:'private-mcp-test-token'}).listen(0,'127.0.0.1');
    await once(server,'listening');
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/config`);
      assert.deepEqual(await response.json(), {googleMapsBrowserKey:key});
      assert.equal(response.headers.get('cache-control'),'no-store');
      assert.equal(response.headers.get('content-security-policy').includes('https://*.googleapis.com'), Boolean(key));
    } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
  }
});
test('Google map uses fixed-size point icons, replaces results and clears origin', async () => {
  const { createGoogleMap } = await import('../public/google-maps.js');
  const layers = [];
  class Data {
    constructor() { this.items = []; layers.push(this); }
    static Point = class { constructor(point) { this.point = point; } };
    setStyle(style) { this.style = style; }
    addListener() {}
    forEach(fn) { this.items.forEach(fn); }
    remove(item) { this.items.splice(this.items.indexOf(item), 1); }
    add(item) { this.items.push(item); }
  }
  class Map { addListener() {} setCenter() {} setZoom() {} }
  class InfoWindow { close() {} }
  const previousGoogle = globalThis.google; const previousDocument = globalThis.document; const previousStyle = globalThis.getComputedStyle;
  globalThis.google = { maps: { importLibrary: async () => ({ Map, Data, InfoWindow, SymbolPath: { CIRCLE: 0 } }) } };
  globalThis.document = {documentElement:{}}; globalThis.getComputedStyle = () => ({getPropertyValue:()=> '#2563EB'});
  try {
    const view = await createGoogleMap('public-test', {}, () => {});
    const venue = {name:'Listed venue',latitude:1.3,longitude:103.85};
    view.render([venue],()=>{}); assert.equal(layers[0].items.length,1);
    assert.equal(layers[0].style({getProperty:()=>venue}).icon.scale,6);
    view.render([venue],()=>{}); assert.equal(layers[0].items.length,1);
    view.showOrigin(venue); assert.equal(layers[1].items.length,1);
    view.clearOrigin(); assert.equal(layers[1].items.length,0);
  } finally { globalThis.google=previousGoogle; globalThis.document=previousDocument; globalThis.getComputedStyle=previousStyle; }
});
