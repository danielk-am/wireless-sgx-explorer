import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/http.js';
async function page(options, path='/') {
 const server=createApp(options).listen(0,'127.0.0.1'); await once(server,'listening');
 try { const r=await fetch(`http://127.0.0.1:${server.address().port}${path}`);return {text:await r.text(),csp:r.headers.get('content-security-policy'),cache:r.headers.get('cache-control')}; }
 finally {server.closeAllConnections();await new Promise(r=>server.close(r));}
}
test('AdSense is absent unless both publisher and slot configuration are valid',async()=>{
 for(const options of [{},{adsenseClient:'ca-pub-1234567890123456'},{adsenseClient:'"><script>',adsenseSlot:'1234567890'}]) {
  const p=await page(options);assert.ok(!p.text.includes('data-ad-client='));assert.ok(!p.csp.includes('strict-dynamic'));
 }
});
test('Configured AdSense renders a single manual unit with fresh matching script nonces',async()=>{
 const options={adsenseClient:'ca-pub-1234567890123456',adsenseSlot:'1234567890'};
 const a=await page(options),b=await page(options,'/index.html');
 assert.match(a.text,/data-ad-slot="1234567890"/);
 assert.equal((a.text.match(/class="adsbygoogle"/g)||[]).length,1);
 const nonce=a.csp.match(/'nonce-([^']+)'/)[1];assert.ok(nonce.length>=24);
 assert.notEqual(a.csp,b.csp);assert.equal(a.cache,'no-store');
 for(const tag of a.text.matchAll(/<script\b[^>]*>/g))assert.ok(tag[0].includes(`nonce="${nonce}"`));
 assert.match(a.csp,/'strict-dynamic'/);assert.match(a.csp,/object-src 'none'/);
 assert.match(a.text,/data-ad-client="ca-pub-1234567890123456"/);
 const privacy=await page(options,'/privacy.html');assert.ok(!privacy.csp.includes('strict-dynamic'));
});
test('blocked and unfilled ads preserve fallback; late fill restores ad visibility',async()=>{
 const {readFileSync}=await import('node:fs');const {runInNewContext}=await import('node:vm');
 const classes=()=>{const set=new Set();return {add:v=>set.add(v),toggle:(v,on)=>on?set.add(v):set.delete(v),contains:v=>set.has(v)};};
 const section={classList:classes()},fallback={classList:classes()};
 const unit={dataset:{},closest:()=>section};let observer,timeout;
 const window={};
 runInNewContext(readFileSync(new URL('../public/adsense.js',import.meta.url),'utf8'),{window,document:{querySelector:s=>s.includes('.adsbygoogle')?unit:fallback},MutationObserver:class{constructor(fn){observer=fn;}observe(){}},setTimeout:fn=>{timeout=fn;}});
 assert.equal(window.adsbygoogle.length,1);timeout();assert.ok(section.classList.contains('ad-empty'));assert.ok(!fallback.classList.contains('replaced-by-network-ad'));
 unit.dataset.adStatus='filled';observer();assert.ok(!section.classList.contains('ad-empty'));assert.ok(fallback.classList.contains('replaced-by-network-ad'));
 unit.dataset.adStatus='unfilled';observer();assert.ok(section.classList.contains('ad-empty'));assert.ok(!fallback.classList.contains('replaced-by-network-ad'));assert.equal(window.adsbygoogle.length,1);
});
