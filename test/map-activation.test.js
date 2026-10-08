import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function harness() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { textContent: '', isConnected: true, disabled: false, replaceChildren() {}, append() {}, addEventListener() {}, setAttribute() {}, querySelector: () => node('button'), classList: { toggle() {} } });
    return nodes.get(id);
  };
  let calls = 0;
  let reply = { ok: true, origin: { latitude: 1.3, longitude: 103.85 }, results: [] };
  let resolveMap; let rejectMap;
  const context = vm.createContext({
    document: { getElementById: node, createElement: () => node('created') },
    window: { addEventListener() {} }, setTimeout, clearTimeout, AbortController,
    hasCoordinates: () => true, searchVenues: venues => venues,
    fetch: async () => ({ ok: true, json: async () => reply }),
    createGoogleMap: () => { calls++; return new Promise((resolve, reject) => { resolveMap = resolve; rejectMap = reject; }); }
  });
  const code = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/\nload\(\);\s*$/, '');
  vm.runInContext(code + '\nrender = () => {}; renderMarkers = () => {}; showStartingPoint = () => {}; state.loaded = true; state.mapsKey = "test"; globalThis.api = { nearest, browse, showMap, state };', context);
  return { api: context.api, calls: () => calls, reply: value => { reply = value; }, finish: () => resolveMap({}), fail: () => rejectMap(new Error("Map unavailable")), nodes };
}

test('successful location search opens map, initial browsing and failed lookups do not', async () => {
  const h = harness();
  h.api.browse(); assert.equal(h.calls(), 0);
  h.reply({ ok: false, error: { message: 'Unknown location' } });
  await h.api.nearest(undefined, undefined, 'unknown', 'unknown'); assert.equal(h.calls(), 0);
  h.reply({ ok: true, origin: { latitude: 1.3, longitude: 103.85 }, results: [] });
  await h.api.nearest(1.3, 103.85, 'selected place'); assert.equal(h.calls(), 1);
  await h.api.nearest(1.31, 103.86, 'second place'); assert.equal(h.calls(), 1, 'concurrent searches reuse pending map load');
  h.finish(); await new Promise(resolve => setImmediate(resolve));
  await h.api.nearest(1.32, 103.87, 'third place'); assert.equal(h.calls(), 1, 'existing map reused');
});

test('failed automatic map load preserves results and allows a later retry', async () => {
  const h = harness();
  await h.api.nearest(1.3, 103.85, 'selected place');
  h.fail(); await new Promise(resolve => setImmediate(resolve));
  assert.match(h.nodes.get('status').textContent, /still search and browse/);
  assert.equal(h.api.state.mapLoading, false);
  assert.equal(h.nodes.get('show-map').disabled, false);
  assert.equal(h.nodes.get('results-heading').textContent, 'Near selected place');
  await h.api.nearest(1.3, 103.85, 'retry place');
  assert.equal(h.calls(), 2);
  h.finish(); await new Promise(resolve => setImmediate(resolve));
});
