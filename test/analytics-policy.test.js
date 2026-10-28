import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsHead, analyticsPolicy } from '../src/analytics.mjs';
// protects=tag delivery under native CSP; fails_when=Analytics is blocked or unrelated policy weakened.
const policy = "default-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'";
test('valid native configuration loads only fixed script plus validated public measurement ID', () => {
 assert.equal(analyticsHead('G-AB12345678'), '<script defer src="/portfolio-umami.js"></script><meta name="ga-measurement-id" content="G-AB12345678"><script type="module" src="/analytics.js"></script>');
});
test('invalid or missing GA ID cannot inject HTML or enable Google destinations', () => {
 for (const id of ['', undefined, '<script>', 'G-OK"onload="bad', 12]) { assert.equal(analyticsHead(id),'<script defer src="/portfolio-umami.js"></script>'); const next=analyticsPolicy(policy,id); assert.match(next,/https:\/\/umami\.danielk\.am/); assert.doesNotMatch(next,/googletagmanager|google-analytics|onload|<script>/); }
});
test('normal CSP permits GA script and collection without dropping unrelated restrictions', () => {
 const next = analyticsPolicy(policy,'G-AB12345678');
 assert.match(next,/script-src 'self' https:\/\/www.googletagmanager.com/);
 assert.match(next,/connect-src 'self' https:\/\/www.google-analytics.com https:\/\/region1.google-analytics.com/);
 assert.match(next,/object-src 'none'; frame-ancestors 'none'/);
 assert.doesNotMatch(next,/unsafe-inline/);
});
test('ads nonce policy remains exact because it already permits trusted GA loading and collection', () => {
 const strict = "script-src 'nonce-abc' 'strict-dynamic' https:; connect-src 'self' https:; img-src 'self' https:";
 assert.equal(analyticsPolicy(strict,'G-AB12345678'), strict);
});
