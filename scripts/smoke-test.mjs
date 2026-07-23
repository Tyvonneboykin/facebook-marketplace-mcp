import { spawnSync } from 'node:child_process';

const messages = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'package-smoke-test', version: '1.0.0' },
    },
  },
  { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
  { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'list_marketplaces', arguments: {} },
  },
];

const result = spawnSync(process.execPath, ['dist/index.cjs'], {
  cwd: new URL('..', import.meta.url),
  encoding: 'utf8',
  input: `${messages.map((message) => JSON.stringify(message)).join('\n')}\n`,
  timeout: 10_000,
});

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`server exited ${result.status}: ${result.stderr}`);
}

const responses = result.stdout
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const initialized = responses.find((response) => response.id === 1)?.result;
if (initialized?.serverInfo?.name !== 'facebook-marketplace-mcp') {
  throw new Error('initialize response did not identify the expected server');
}
const toolNames = responses
  .find((response) => response.id === 2)
  ?.result?.tools?.map((tool) => tool.name);
for (const required of [
  'search_marketplace',
  'get_listing_details',
  'list_marketplaces',
]) {
  if (!toolNames?.includes(required)) {
    throw new Error(`tools/list omitted ${required}`);
  }
}
const marketplaceText = responses.find((response) => response.id === 3)?.result
  ?.content?.[0]?.text;
if (!marketplaceText?.includes('No auth required')) {
  throw new Error('list_marketplaces did not preserve the no-auth contract');
}

console.log('MCP package smoke test passed');
