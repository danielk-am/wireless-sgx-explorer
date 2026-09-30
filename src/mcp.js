import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { lookup, datasetInfo } from './catalogue.js';

const query = z.string().trim().min(1).max(200);
const limit = z.number().int().min(1).max(20).optional();
const definitions = {
  nearest_hotspots: {
    description: 'Find nearest venues in the loaded Wireless@SG catalogue among entries with matched coordinates. Provide a catalogue query OR numeric coordinates. Unknown landmarks return an error: never substitute historical/web-only locations. Distances are straight-line, not walking or Wi-Fi range. Always disclose ranking_complete and unlocated venues. Private premises may restrict access.',
    inputSchema: z.object({query:query.optional(),latitude:z.number().finite().optional(),longitude:z.number().finite().optional(),limit,radius_m:z.number().min(0).max(50000).optional()}).strict()
  },
  search_hotspots: { description:'Search original IMDA hotspot entries, including floor and sub-location details and unlocated entries. Preserve source dates. A listed hotspot does not establish current Wi-Fi reception or public access.',inputSchema:z.object({query,limit,operator:z.enum(['M1','Singtel','StarHub']).optional()}).strict()},
  search_venues: { description:'Search the same grouped venue catalogue used by the map. Unlocated venues remain searchable; do not infer their coordinates.',inputSchema:z.object({query,limit}).strict()},
  get_hotspot: { description:'Retrieve one exact hotspot record by its returned hotspot_id, with evidence and coordinate provenance.',inputSchema:z.object({hotspot_id:query}).strict()},
  dataset_info: { description:'Get catalogue version, counts, source dates, mapping completeness and limitations. This service does not retrieve live Google Maps data or Wi-Fi status.',inputSchema:z.object({}).strict()}
};
export function createMcpServer() {
 const server=new McpServer({name:'Wireless@SGX hotspots MCP',version:'0.2.0'}, {
   instructions:'Use returned tool results as the sole catalogue evidence. Call a tool before claiming an MCP answer. Report tool failures honestly; web results must be separately labelled and must not be added to the ranked catalogue results. Never invent coordinates, signal coverage, open status, seating or sockets. Always disclose incomplete geographic ranking and source dates.'
 });
 for(const [name,definition] of Object.entries(definitions)) {
   server.registerTool(name,{...definition,title:name.replaceAll('_',' '),annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},async args=>{
     const result=lookup(name,args);
     return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result,isError:!result.ok};
   });
 }
 server.registerResource('dataset','wireless-sgx://dataset',{mimeType:'application/json',description:'Catalogue provenance and mapping coverage'},async uri=>({contents:[{uri:uri.href,mimeType:'application/json',text:JSON.stringify(datasetInfo())}]}));
 return server;
}
