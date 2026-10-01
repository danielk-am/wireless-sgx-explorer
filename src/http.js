import express from 'express';
import { readFileSync } from 'node:fs';
import { timingSafeEqual, randomUUID, randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './mcp.js';
import { lookup, datasetInfo, venues } from './catalogue.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const escapeHtml=value=>String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const jsonError=(code,message)=>({ok:false,error:{code,message}});
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};

export function createApp({allowedHosts=['localhost','127.0.0.1','[::1]'],allowedOrigins=[],canonicalHost='',redirectHosts=[],mcpToken='',mapsBrowserKey=process.env.GOOGLE_MAPS_BROWSER_KEY||'',adsenseClient=process.env.ADSENSE_CLIENT||'',adsenseSlot=process.env.ADSENSE_SLOT||'',rateLimit=120}={}) {
 const adsEnabled=/^ca-pub-[0-9]{16}$/.test(adsenseClient)&&/^[0-9]{10}$/.test(adsenseSlot);
 const metadata=datasetInfo();
 const source=metadata.source || {};
 const sourceSummary=`<p id="source-note" class="source-summary">${escapeHtml(metadata.entry_count)} hotspot entries grouped into ${escapeHtml(metadata.venue_count)} venues. Source: ${escapeHtml(source.title || 'IMDA hotspot catalogue')}. Dataset date: ${escapeHtml(metadata.catalogue_date)}.${source.source_feature_updated_at ? ` Record date: ${escapeHtml(source.source_feature_updated_at)}.` : ''} Historical listings; current service and access are unverified. <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">View the source</a>.</p>`;
 const indexHtml=readFileSync(resolve(root,'public/index.html'),'utf8').replace('<p id="source-note">Source details loading…</p>',sourceSummary)
  .replace('<p id="source-age"></p>',`<p id="source-age">${escapeHtml(source.date_note || '')}</p>`)
  .replace('<p id="source-attribution"></p>',`<p id="source-attribution">${escapeHtml(source.attribution || '')}</p>`)
  .replace('<a id="source-link" hidden',`<a id="source-link" href="${escapeHtml(source.url)}"`)
  .replace('<a id="license-link" hidden',source.license_url ? `<a id="license-link" href="${escapeHtml(source.license_url)}"` : '<a id="license-link" hidden');
 const googleCsp = "default-src 'self'; script-src 'self' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com; connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://*.google.com data: blob:; font-src 'self' https://fonts.gstatic.com; frame-src https://*.google.com; worker-src blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
 const app=express();app.disable('x-powered-by');
 app.use((req,res,next)=>{
  const hostHeader=req.headers.host;
  if(!hostHeader)return res.status(403).json({jsonrpc:'2.0',error:{code:-32000,message:'Missing Host header'},id:null});
  let hostname;try{hostname=new URL(`http://${hostHeader}`).hostname;}catch{return res.status(403).json({jsonrpc:'2.0',error:{code:-32000,message:`Invalid Host header: ${hostHeader}`},id:null});}
  if(!allowedHosts.some(h=>h.startsWith('.')?hostname.endsWith(h):hostname===h))return res.status(403).json({jsonrpc:'2.0',error:{code:-32000,message:`Invalid Host: ${hostname}`},id:null});
  next();
 });
 app.use((req,res,next)=>{
  const requestHost=(req.headers.host||'').split(':')[0].toLowerCase();
  if(canonicalHost&&redirectHosts.includes(requestHost))return res.redirect(308,`https://${canonicalHost}${req.originalUrl}`);
  next();
 });
 app.use((req,res,next)=>{
  res.set({
   'X-Request-Id':randomUUID(),
   'X-Content-Type-Options':'nosniff',
   'Referrer-Policy':'strict-origin-when-cross-origin',
   'Permissions-Policy':'geolocation=(self), camera=(), microphone=()',
   'Content-Security-Policy':mapsBrowserKey ? googleCsp : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  });
  if(req.headers.origin) {
   let same=false;try{const origin=new URL(req.headers.origin);same=['http:','https:'].includes(origin.protocol)&&origin.host===req.headers.host;}catch{}
   if(!same&&!allowedOrigins.includes(req.headers.origin))return res.status(403).json(jsonError('ORIGIN_DENIED','Origin is not allowed.'));
  }
  next();
 });
 // Counts only; never retain query strings, body data, or location coordinates.
 const clients=new Map();let epoch=Date.now();
 app.use(['/api','/mcp'],(req,res,next)=>{
  if(Date.now()-epoch>=60000){clients.clear();epoch=Date.now();}
  const ip=req.socket.remoteAddress||'unknown';
  if(clients.size>=10000&&!clients.has(ip))return res.status(429).set('Retry-After','60').json(jsonError('BUSY','Please retry shortly.'));
  const count=(clients.get(ip)||0)+1;clients.set(ip,count);
  if(count>rateLimit)return res.status(429).set('Retry-After',String(Math.max(1,Math.ceil((60000-Date.now()+epoch)/1000)))).json(jsonError('RATE_LIMIT','Too many requests; retry shortly.'));
  res.set('Cache-Control','no-store');next();
 });
 app.use(express.json({limit:'16kb',strict:true}));
 app.get('/healthz',(_req,res)=>res.json({ok:true,service:'wireless-sgx-explorer',version:'0.2.0'}));
 app.get('/api/config',(_req,res)=>res.json({googleMapsBrowserKey:mapsBrowserKey}));
 app.get('/api/venues',(_req,res)=>res.json({metadata:datasetInfo(),venues:venues()}));
 app.get('/api/dataset',(_req,res)=>res.json(datasetInfo()));
 app.post('/api/lookup',(req,res)=>{
  const body=req.body;
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>!['operation','arguments'].includes(k)))return res.status(400).json(jsonError('INVALID_INPUT','Use {operation, arguments}.'));
  const result=lookup(body.operation,body.arguments===undefined?{}:body.arguments);
  res.status(result.ok?200:400).json(result);
 });
 app.use('/mcp',(req,res,next)=>{
  if(mcpToken&&!equal(req.headers.authorization||'',`Bearer ${mcpToken}`))return res.status(401).set('WWW-Authenticate','Bearer realm="wireless-sgx"').json(jsonError('UNAUTHORIZED','Valid bearer token required.'));
  next();
 });
 app.post('/mcp',async(req,res)=>{
  const server=createMcpServer();
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  res.once('close',()=>{transport.close().catch(()=>{});server.close().catch(()=>{});});
  try {await server.connect(transport);await transport.handleRequest(req,res,req.body);}
  catch {if(!res.headersSent)res.status(500).json({jsonrpc:'2.0',id:null,error:{code:-32603,message:'Internal server error'}});}
 });
 app.all('/mcp',(_req,res)=>res.status(405).set('Allow','POST').json({jsonrpc:'2.0',id:null,error:{code:-32000,message:'Stateless MCP supports POST only.'}}));
 // Nonces are generated per document, never cached or reused across responses.
 app.get(['/', '/index.html'],(_req,res,next)=>{
  if(!adsEnabled)return res.type('html').send(indexHtml);
  const nonce=randomBytes(24).toString('base64');
  const ad=`<section class="network-ad" aria-label="Advertisement"><p class="banner-label">Advertisement</p><ins class="adsbygoogle" style="display:block;width:100%;height:250px" data-ad-client="${adsenseClient}" data-ad-slot="${adsenseSlot}"></ins></section>`;
  const html=indexHtml.replace('<!-- ADSENSE_UNIT -->',ad)
   .replace('</head>',`<link rel="stylesheet" href="/adsense.css?v=listings-1"><script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}"></script><script type="module" src="/adsense.js?v=1"></script></head>`)
   .replace(/<script\b/g,`<script nonce="${nonce}"`);
  res.set('Cache-Control','no-store');
  // Google's supported strict CSP; trusted scripts may load their dependencies.
  // HTTPS frames/images/connections support advertiser creatives and Google's CMP.
  res.set('Content-Security-Policy',`default-src 'self'; script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https: data: blob:; font-src 'self' https:; frame-src https:; worker-src blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`);
  res.type('html').send(html);
 });
 app.use('/vendor/leaflet',express.static(resolve(root,'node_modules/leaflet/dist'),{dotfiles:'deny',index:false}));
 app.use(express.static(resolve(root,'public'),{dotfiles:'deny',index:'index.html'}));
 app.use((_req,res)=>res.status(404).json(jsonError('NOT_FOUND','Not found.')));
 app.use((err,_req,res,_next)=>{
  const status=err.type==='entity.too.large'?413:err.type==='entity.parse.failed'?400:500;
  res.status(status).json(jsonError(status===413?'TOO_LARGE':status===400?'INVALID_JSON':'INTERNAL_ERROR',status===413?'Request body is too large.':status===400?'Provide valid JSON.':'Internal server error.'));
 });
 return app;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3000);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be 1–65535');
 const allowedHosts=(process.env.ALLOWED_HOSTS||'localhost,127.0.0.1,[::1]').split(',').map(s=>s.trim()).filter(Boolean);
 if(!['127.0.0.1','localhost','::1'].includes(host)&&!process.env.ALLOWED_HOSTS)throw new Error('Set ALLOWED_HOSTS explicitly when binding beyond loopback');
 const app=createApp({allowedHosts,allowedOrigins:(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean),canonicalHost:process.env.CANONICAL_HOST||'',redirectHosts:(process.env.REDIRECT_HOSTS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),mcpToken:process.env.MCP_TOKEN||''});
 const server=app.listen(port,host,()=>console.error(`Wi-Fi Explorer for Wireless@SGX listening on ${host}:${port}`));
 server.requestTimeout=30000;server.headersTimeout=15000;
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>{server.closeAllConnections();process.exit(0);},5000).unref();});
}
