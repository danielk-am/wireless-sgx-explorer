import test from 'node:test';
import assert from 'node:assert/strict';
import { bannerSettings, createBannerLink, removeFailedBannerArtwork, safeLink } from '../public/banners.js';
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
test('affiliate offers enforce a clear label and commission disclosure', () => {
  const settings = bannerSettings({ ...sample, state: 'affiliate', label: 'Recommended', disclosure: '' }, origin);
  assert.ok(settings);
  assert.equal(settings.label, 'Affiliate');
  assert.equal(settings.disclosure, 'We may earn a commission if you buy through this link.');
  assert.equal(bannerSettings(sample, origin).disclosure, '');
  assert.equal(bannerSettings({ ...sample, state: 'affiliate', url: '' }, origin), null);
});

test('affiliate artwork and button use the same protected destination', () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) { return { tagName, className: '', href: '', textContent: '', rel: '', referrerPolicy: '' }; }
  };
  try {
    const settings = bannerSettings({ ...sample, state: 'affiliate', image: '/banner-assets/klook.png' }, origin);
    const artwork = createBannerLink(settings, 'banner-image-link');
    const button = createBannerLink(settings, 'banner-button', settings.button);
    assert.equal(artwork.href, button.href);
    assert.equal(artwork.rel, 'sponsored noopener noreferrer');
    assert.equal(artwork.referrerPolicy, 'no-referrer');
    assert.equal(button.textContent, 'Learn more');
  } finally {
    globalThis.document = previousDocument;
  }
});

test('failed affiliate artwork removes its otherwise empty keyboard link', () => {
  let removed = false;
  removeFailedBannerArtwork({ remove() { removed = true; } });
  assert.equal(removed, true);
});
