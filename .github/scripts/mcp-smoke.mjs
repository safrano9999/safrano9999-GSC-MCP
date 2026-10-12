// Source of truth: SCRIPTS/githubactions. Generated copies are overwritten.
import assert from 'node:assert/strict';

const endpoint = 'http://127.0.0.1:8000/mcp';
const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};
async function rpc(id, method, params) {
  const response = await fetch(endpoint, {
    method: 'POST', headers,
    body: JSON.stringify({ jsonrpc: '2.0', ...(id === undefined ? {} : { id }), method, params }),
    signal: AbortSignal.timeout(20000),
  });
  assert(response.ok, `HTTP ${response.status} for ${method}`);
  const session = response.headers.get('mcp-session-id');
  if (session) headers['mcp-session-id'] = session;
  if (id === undefined) {
    await response.body?.cancel();
    return;
  }
  if (response.headers.get('content-type')?.includes('application/json')) return response.json();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      assert(!done, `No JSON-RPC response for ${method}`);
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const message = JSON.parse(line.slice(5).trim());
        if (message.id === id) return message;
      }
    }
  } finally {
    await reader.cancel();
  }
}

const initialized = await rpc(1, 'initialize', {
  protocolVersion: '2024-11-05', capabilities: {},
  clientInfo: { name: 'gsc-image-smoke', version: '1.0.0' },
});
assert(!initialized.error, JSON.stringify(initialized.error));
assert(initialized.result.serverInfo);
headers['MCP-Protocol-Version'] = initialized.result.protocolVersion;
await rpc(undefined, 'notifications/initialized', {});
const listed = await rpc(2, 'tools/list', {});
assert(!listed.error, JSON.stringify(listed.error));
for (const name of ['sites_list', 'analytics_query', 'inspection_inspect']) {
  assert(listed.result.tools.some(tool => tool.name === name), `Missing ${name}`);
}
if (headers['mcp-session-id']) {
  const closed = await fetch(endpoint, { method: 'DELETE', headers, signal: AbortSignal.timeout(5000) });
  assert(closed.ok, `Session close: HTTP ${closed.status}`);
  await closed.body?.cancel();
}
console.log(`MCP handshake and ${listed.result.tools.length} tools verified; no Google API calls made.`);
