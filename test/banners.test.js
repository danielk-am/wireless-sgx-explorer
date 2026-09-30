import test from 'node:test';
import assert from 'node:assert/strict';
import { bannerSettings, safeLink } from '../public/banners.js';
const origin = 'https://wireless.danielk.am';
const sample = { state: 'available', title: 'Ad space', url: '/advertise.html' };
test('banner links reject executable and non-web schemes', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'http://advertiser.example', '', null]) assert.equal(safeLink(url, origin), null);
  assert.equal(safeLink('/advertise.html', origin), origin + '/advertise.html');
  assert.equal(safeLink('https://advertiser.example/offer', origin), 'https://advertiser.example/offer');
});
test('hidden or invalid settings collapse optional placements', () => {
  for (const value of [null, {}, { ...sample, state: 'hidden' }, { ...sample, url: 'javascript:test' }, { ...sample, title: '' }]) assert.equal(bannerSettings(value, origin), null);
});
test('paid creatives are always labelled and images stay local', () => {
  const settings = bannerSettings({ ...sample, state: 'sponsored', label: 'Independent result', image: 'https://tracker.example/pixel' }, origin);
  assert.equal(settings.label, 'Sponsored');
  assert.equal(settings.image, null);
  assert.equal(bannerSettings({ ...sample, image: '/banner-assets/../app.js' }, origin).image, null);
  assert.equal(bannerSettings({ ...sample, image: '/banner-assets/campaign.png' }, origin).image, origin + '/banner-assets/campaign.png');
});
