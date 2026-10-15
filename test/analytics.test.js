import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// protects=private origin/destination data and accepted navigation; fails_when=Maps data leaks or clicks disappear;
// why_new=no existing tests cover this standalone tracker.
function harness(file = '../public/analytics.js', id = 'G-AB12345678') {
  const listeners = {}, windowListeners = {}, pending = [], calls = [], scripts = [];
  const window = {
    dkKeyEventsConfig: { measurementId: id },
    location: { href: 'https://example.com/contact/?message=private#secret', origin: 'https://example.com', pathname: '/contact/' },
    gtag: (...args) => calls.push(args),
    addEventListener: (name, fn) => (windowListeners[name] ||= []).push(fn),
  };
  window.window = window;
  const document = {
    referrer: 'https://search.example.com/find?query=private#hash',
    querySelector: selector => selector.includes('meta') ? { content: id } : null,
    addEventListener: (name, fn) => (listeners[name] ||= []).push(fn),
    createElement: () => ({}),
    head: { appendChild: value => scripts.push(value) },
  };
  const context = { window, document, URL, setTimeout: fn => pending.push(fn), console };
  vm.runInNewContext(readFileSync(new URL(file, import.meta.url), 'utf8'), context);
  function dispatch(href, options = {}) {
    const {download = false, ...eventOptions} = options;
    const link = { getAttribute: name => name === 'href' ? href : null, hasAttribute: name => name === 'download' && download };
    const event = { type: 'click', button: 0, defaultPrevented: false, target: { closest: () => link }, ...eventOptions };
    for (const fn of listeners[event.type] || []) fn(event);
    return { event, link, setHref: value => { href = value; } };
  }
  return { window, document, calls, scripts, dispatch, pagehide: () => { for (const fn of windowListeners.pagehide || []) fn(); }, flush: () => { while (pending.length) pending.shift()(); }, events: () => JSON.parse(JSON.stringify(calls.filter(x => x[0] === 'event'))) };
}


test('directions payload omits coordinates, location labels and query strings', () => {
 const h=harness();h.dispatch('https://www.google.com/maps/dir/?api=1&origin=1.123,103.123&destination=Private+Place');h.flush();assert.deepEqual(h.events(),[['event','directions_click',{send_to:'G-AB12345678',page_location:'https://example.com/contact/',page_referrer:'https://search.example.com'}]]);
});
test('map-search, right-click and cancelled actions are not directions conversions', () => {
 const h=harness();h.dispatch('https://www.google.com/maps/search/?query=Private');h.dispatch('https://evil.example/maps/dir/?api=1');h.dispatch('https://www.google.com/maps/dir/?api=1',{type:'auxclick',button:2});const c=h.dispatch('https://www.google.com/maps/dir/?api=1');c.event.defaultPrevented=true;h.flush();assert.equal(h.events().length,0);
});
test('left, control and middle activations each count once', () => {
 const h=harness(),url='https://www.google.com/maps/dir/?api=1&destination=Secret';h.dispatch(url);h.dispatch(url,{ctrlKey:true});h.dispatch(url,{type:'auxclick',button:1});h.flush();assert.equal(h.events().length,3);
});
test('pagehide flushes pending navigation once without duplication', () => {
 const h=harness();h.dispatch('https://www.google.com/maps/dir/?api=1&destination=Secret');h.pagehide();assert.equal(h.events().length,1);h.flush();assert.equal(h.events().length,1);
});
test('bootstrap uses sanitized location and origin-only referrer', () => {
 const h=harness();assert.deepEqual(JSON.parse(JSON.stringify(h.calls.filter(x=>x[0]==='config'))),[['config','G-AB12345678',{page_location:'https://example.com/contact/',page_referrer:'https://search.example.com'}]]);
});
test('invalid configuration cannot load Google or emit events', () => {
 const h=harness('../public/analytics.js','G-X"onload="bad');h.dispatch('https://www.google.com/maps/dir/?api=1&destination=Secret');h.flush();assert.equal(h.calls.length,0);assert.equal(h.scripts.length,0);
});
