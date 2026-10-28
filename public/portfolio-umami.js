/* Portfolio Umami. Contact values, link text, form values and URL queries are never collected. */
(function () {
 'use strict';
 if (window.portfolioUmamiReady) return;
 window.portfolioUmamiReady = true;
 const config = window.portfolioUmamiConfig || {};
 const fields = ['section', 'element', 'destination_host', 'contact_method'];
 function safePath(value) {
  try {
   const url = new URL(value, window.location.href);
   const path = url.pathname;
   const sensitive = path.match(/^(.*?\/(?:my-account|checkout|order-pay|order-received|wp-admin|wp-login\.php))(?:\/|$)/i);
   return sensitive ? sensitive[1].replace(/\/$/, '') + '/' : path;
  } catch (error) { return '/'; }
 }
 window.portfolioUmamiBeforeSend = function (type, payload) {
  if (type !== 'event' || !payload) return null;
  const clean = Object.assign({}, payload, { url: safePath(payload.url || window.location.href), title: '' });
  try { clean.referrer = payload.referrer ? new URL(payload.referrer).origin + '/' : ''; } catch (error) { clean.referrer = ''; }
  if (clean.data) {
   const data = {};
   fields.forEach(function (key) {
    if (typeof clean.data[key] === 'string' && clean.data[key].length <= 160) data[key] = clean.data[key];
   });
   clean.data = data;
  }
  return clean;
 };
 function activate(event) {
  if (!((event.type === 'click' && event.button === 0) || (event.type === 'auxclick' && event.button === 1))) return;
  const target = event.target && (event.target.closest ? event.target : event.target.parentElement);
  const element = target && target.closest('a[href],button,input[type="button"],input[type="submit"]');
  if (!element || element.hasAttribute('data-umami-event')) return;
  // Let the site's click handlers and Cloudflare email decoder finish first.
  setTimeout(function () {
   if (!window.umami || typeof window.umami.track !== 'function') return;
   let name = 'button_click';
   const data = {section: config.section || '/', element: element.tagName.toLowerCase()};
   const href = element.getAttribute('href');
   if (href) {
    let url; try { url = new URL(href, window.location.href); } catch (error) { return; }
    if (url.protocol === 'mailto:') data.contact_method = 'email';
    else if (url.protocol === 'tel:') data.contact_method = 'phone';
    else if (url.protocol === 'whatsapp:' || ['wa.me','api.whatsapp.com','web.whatsapp.com','www.whatsapp.com'].includes(url.hostname)) data.contact_method = 'whatsapp';
    if (data.contact_method) name = 'contact_click';
    else if (!['http:','https:'].includes(url.protocol)) return;
    else {
     data.destination_host = url.hostname;
     if (element.hasAttribute('download') || /\.(pdf|zip|docx?|xlsx?|csv)$/i.test(url.pathname)) name = 'download_click';
     else if (/(^|\.)(shopee\.sg|s\.shopee\.sg|shope\.ee|lazada\.sg|lazada\.com|lzd\.co)$/.test(url.hostname)) name = 'affiliate_click';
     else if (url.hostname === 'www.google.com' && url.pathname.startsWith('/maps/dir/')) name = 'directions_click';
     else if (url.hostname !== window.location.hostname) name = 'outbound_click';
     else if (url.searchParams.has('add-to-cart') || element.classList?.contains('add_to_cart_button')) name = 'add_to_cart_click';
     else if (/\/checkout(?:\/|$)/.test(url.pathname)) name = 'checkout_click';
     else if (/\/product\//.test(url.pathname)) name = 'product_click';
     else name = 'navigation_click';
    }
   }
   try { window.umami.track(name, data); } catch (error) { /* Analytics must never interrupt site behavior. */ }
  }, 0);
 }
 document.addEventListener('click', activate, true);
 document.addEventListener('auxclick', activate, true);
})();

// This registration is public configuration. Only the production hostname sends data.
(function () {
 if (window.location.hostname !== "wifiexplorer.danielk.am" || window.navigator.globalPrivacyControl || ['1','yes'].includes(window.navigator.doNotTrack)) return;
 const script = document.createElement('script');
 script.src = 'https://umami.danielk.am/script.js'; script.defer = true; script.referrerPolicy = 'no-referrer';
 if (new URLSearchParams(window.location.search).get('portfolio_qa') === '20261028') script.setAttribute('data-tag','qa');
 const attributes = {'website-id': "514ace53-d571-4379-b8c1-fba1b5eb9437", 'before-send': 'portfolioUmamiBeforeSend', 'exclude-search': 'true', 'exclude-hash': 'true', 'do-not-track': 'true'};
 for (const [key,value] of Object.entries(attributes)) script.setAttribute('data-'+key,value);
 document.head.appendChild(script);
})();
