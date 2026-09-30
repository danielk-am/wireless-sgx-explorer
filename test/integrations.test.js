import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const workflow = JSON.parse(readFileSync(new URL('../integrations/n8n/wireless-sgx-portfolio.json',import.meta.url)));
const run = (name, items=[]) => vm.runInNewContext(`(function(){${workflow.nodes.find(node=>node.name===name).parameters.jsCode}})()`, {$input:{all:()=>items}});
const plain = x => JSON.parse(JSON.stringify(x));
test('n8n demo routes all five operations through one shared API',()=>{
 const examples = run('Configure API and examples');
 const prepared = run('Validate request',examples);
 assert.equal(prepared.length,5);
 assert.deepEqual(new Set(prepared.map(x=>x.json.request.operation)),new Set(['dataset_info','search_venues','search_hotspots','nearest_hotspots','get_hotspot']));
 for(const item of prepared) assert.equal(item.json.url,'https://explorer.example.invalid/api/lookup');
 assert.equal(workflow.nodes.find(n=>n.type==='n8n-nodes-base.httpRequest').parameters.options.timeout,15000);
 assert.equal(workflow.active,false);
 assert.equal(workflow.nodes.some(n=>n.type.includes('webhook')),false);
});
test('n8n request boundary rejects malformed operations, URL credentials and unsafe schemes',()=>{
 for(const url of ['http://public.example','https://user:pass@example.com','https://example.com?a=1','javascript:alert(1)']) assert.throws(()=>run('Validate request',[{json:{baseUrl:url,operation:'dataset_info',arguments:{}}}]));
 assert.throws(()=>run('Validate request',[{json:{baseUrl:'https://example.com',operation:'shell',arguments:{}}}]));
 assert.throws(()=>run('Validate request',[{json:{baseUrl:'https://example.com',operation:'dataset_info',arguments:[]}}]));
});
test('n8n response boundary preserves provenance and structured failures',()=>{
 const items=[{json:{ok:false,error:{code:'ORIGIN_NOT_RESOLVED',message:'No indexed origin'},metadata:{unlocated_count:256}}}];
 assert.deepEqual(plain(run('Keep evidence and errors',items)),items);
 assert.throws(()=>run('Keep evidence and errors',[{json:{message:'not a catalogue response'}}]));
});
test('n8n export contains no installed service IDs, private URLs, or credentials',()=>{
 const text=JSON.stringify(workflow);
 assert.equal(workflow.id,undefined);
 assert.equal(workflow.versionId,undefined);
 assert.equal(workflow.meta,undefined);
 assert(!/https:\/\/n8n\./.test(text));
 for(const node of workflow.nodes) assert.equal(node.credentials,undefined);
});
