#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcp.js';
const server=createMcpServer();
await server.connect(new StdioServerTransport());
for (const signal of ['SIGINT','SIGTERM']) process.once(signal, async()=>{await server.close();process.exit(0);});
