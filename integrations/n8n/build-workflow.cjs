// Rebuild the portable workflow after editing the request/response boundary code.
const fs = require('node:fs');
const path = require('node:path');
const configuration = `// Change this to your HTTPS Explorer origin. Do not place tokens in code.
const baseUrl = 'https://explorer.example.invalid';
return [
  {operation: 'dataset_info', arguments: {}},
  {operation: 'search_venues', arguments: {query: 'Albert Centre', limit: 5}},
  {operation: 'search_hotspots', arguments: {query: 'Albert Centre', limit: 5}},
  {operation: 'nearest_hotspots', arguments: {latitude: 1.3008, longitude: 103.8528, limit: 5}},
  {operation: 'get_hotspot', arguments: {hotspot_id: 'wsgx-0001'}},
].map(request => ({json: {baseUrl, ...request}}));`;
const prepare = String.raw`const allowed = ['dataset_info','search_venues','search_hotspots','nearest_hotspots','get_hotspot'];
return $input.all().map(({json: input}) => {
  if (typeof input.baseUrl !== 'string' || !/^https:\/\/[A-Za-z0-9.-]+(?::[0-9]+)?(?:\/[A-Za-z0-9_/-]*)?$/.test(input.baseUrl)) throw new Error('Set a valid HTTPS Explorer base URL without credentials or query parameters.');
  if (!allowed.includes(input.operation)) throw new Error('Unsupported lookup operation.');
  if (!input.arguments || typeof input.arguments !== 'object' || Array.isArray(input.arguments)) throw new Error('Arguments must be an object.');
  return {json:{url:input.baseUrl.replace(/\/$/,'') + '/api/lookup', request:{operation:input.operation,arguments:input.arguments}}};
});`;
const check = `return $input.all().map(({json}) => {
  if (!json || typeof json.ok !== 'boolean') throw new Error('Invalid Explorer API response.');
  return {json}; // Preserve ok:false and all provenance/coordinate limitations.
});`;
const nodes = [
 {parameters:{},id:'manual',name:'Run portfolio demo',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[0,0]},
 {parameters:{jsCode:configuration},id:'config',name:'Configure API and examples',type:'n8n-nodes-base.code',typeVersion:2,position:[240,0]},
 {parameters:{jsCode:prepare},id:'prepare',name:'Validate request',type:'n8n-nodes-base.code',typeVersion:2,position:[480,0]},
 {parameters:{method:'POST',url:'={{ $json.url }}',sendBody:true,specifyBody:'json',jsonBody:'={{ JSON.stringify($json.request) }}',options:{timeout:15000,redirect:{redirect:{followRedirects:false}},response:{response:{responseFormat:'json'}}}},id:'lookup',name:'Shared Explorer API',type:'n8n-nodes-base.httpRequest',typeVersion:4.2,position:[720,0]},
 {parameters:{jsCode:check},id:'check',name:'Keep evidence and errors',type:'n8n-nodes-base.code',typeVersion:2,position:[960,0]},
 {parameters:{content:'## Wi-Fi Explorer for Wireless@SGX · n8n portfolio\nSet your Explorer API URL in Configure API and examples. If protected, select Header Auth credentials on Shared Explorer API (Authorization: Bearer YOUR_TOKEN). Never put secrets in this export.\n\nFive read-only operations demonstrate the shared catalogue. This manual-only template has no public webhook. Distances are straight-line and coverage/availability are unverified. See docs/portfolio.md for the production MCP/tool pattern.',height:270,width:680},id:'notes',name:'Setup and evidence',type:'n8n-nodes-base.stickyNote',typeVersion:1,position:[220,-340]},
];
const connections = {};
for(let i=0;i<4;i++) connections[nodes[i].name]={main:[[{node:nodes[i+1].name,type:'main',index:0}]]};
fs.writeFileSync(path.join(__dirname,'wireless-sgx-portfolio.json'),JSON.stringify({name:'Wi-Fi Explorer for Wireless@SGX | n8n portfolio',nodes,connections,active:false,settings:{executionOrder:'v1',saveDataSuccessExecution:'none',saveDataErrorExecution:'none',saveManualExecutions:false},pinData:{}},null,2)+'\n');
