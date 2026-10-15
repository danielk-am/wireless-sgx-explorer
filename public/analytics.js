/* No location coordinates, entered place names or Maps URLs enter Analytics. */
(function () {
 'use strict';
 const meta = document.querySelector('meta[name="ga-measurement-id"]');
 const id = meta && meta.content;
 if (typeof id !== 'string' || !/^G-[A-Z0-9]+$/.test(id) || window.dkDirectionsTrackingReady) return;
 window.dkDirectionsTrackingReady = true;
 const pending = new Set();
 const safePage = value => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.origin : ''; } catch (error) { return ''; }
 };
 const context = () => ({ page_location: window.location.origin + window.location.pathname, page_referrer: safePage(document.referrer) });
 window.dataLayer = window.dataLayer || [];
 window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
 window.gtag('js', new Date());
 window.gtag('config', id, context());
 if (!document.querySelector('script[src^="https://www.googletagmanager.com/gtag/js"]')) {
  const loader = document.createElement('script');
  loader.async = true;
  loader.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
  document.head.appendChild(loader);
 }
 function activate(event) {
  if (event.defaultPrevented || !((event.type === 'click' && event.button === 0) || (event.type === 'auxclick' && event.button === 1))) return;
  const element = event.target && (event.target.closest ? event.target : event.target.parentElement);
  const link = element && element.closest('a[href]');
  if (!link || link.hasAttribute('download')) return;
  const send = function () {
   if (!pending.delete(send)) return;
   if (event.defaultPrevented || typeof window.gtag !== 'function') return;
   let destination;
   try { destination = new URL(link.getAttribute('href'), window.location.href); } catch (error) { return; }
   if (destination.protocol !== 'https:' || destination.hostname !== 'www.google.com' || destination.username || destination.password || !destination.pathname.startsWith('/maps/dir/')) return;
   try { window.gtag('event', 'directions_click', Object.assign({ send_to: id }, context())); } catch (error) { /* Navigation always proceeds. */ }
  };
  pending.add(send);
  setTimeout(send, 0);
 }
 document.addEventListener('click', activate, true);
 document.addEventListener('auxclick', activate, true);
 window.addEventListener('pagehide', function () { for (const send of pending) send(); });
})();
