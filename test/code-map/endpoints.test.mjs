import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractEndpoints } from '../../scripts/code-map/lib/endpoint-extractor.mjs';

/** @type {string[]} */
const tempDirs = [];

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'endpoint-map-test-'));
  tempDirs.push(dir);
  return dir;
}

function write(root, rel, content) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}

function key(endpoint) {
  return `${endpoint.kind}:${endpoint.method ?? ''}:${endpoint.name ?? endpoint.path}:${endpoint.file}`;
}

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('extractEndpoints maps Express routes and MCP tools/resources/prompts', () => {
  const root = repo();
  write(
    root,
    'src/server.ts',
    `import express from 'express';
const app = express();
app.get('/health', health);
router.post('/orders/:id', createOrder);
server.tool('lookup_order', {}, lookupOrder);
server.resource('order', 'orders://{id}', readOrder);
server.prompt('summarize_order', summarizeOrder);
`
  );

  const endpoints = extractEndpoints(root, ['src/server.ts']);
  const byKey = new Map(endpoints.map((endpoint) => [key(endpoint), endpoint]));

  assert.equal(byKey.has('http:GET:/health:src/server.ts'), true);
  assert.equal(byKey.has('http:POST:/orders/:id:src/server.ts'), true);
  assert.equal(byKey.has('mcp-tool::lookup_order:src/server.ts'), true);
  assert.equal(byKey.has('mcp-resource::order:src/server.ts'), true);
  assert.equal(byKey.has('mcp-prompt::summarize_order:src/server.ts'), true);
});

test('extractEndpoints maps FastAPI decorators and C# minimal APIs', () => {
  const root = repo();
  write(
    root,
    'src/api.py',
    `from fastapi import FastAPI
app = FastAPI()

@app.get("/users/{user_id}")
def get_user(user_id: str):
    return {}
`
  );
  write(
    root,
    'Api/Program.cs',
    `var app = WebApplication.CreateBuilder(args).Build();
app.MapPost("/users", CreateUser);
app.MapMcp("/mcp");
`
  );

  const endpoints = extractEndpoints(root, ['src/api.py', 'Api/Program.cs']);
  const byKey = new Map(endpoints.map((endpoint) => [key(endpoint), endpoint]));

  assert.equal(byKey.has('http:GET:/users/{user_id}:src/api.py'), true);
  assert.equal(byKey.has('http:POST:/users:Api/Program.cs'), true);
  assert.equal(byKey.has('mcp-transport::/mcp:Api/Program.cs'), true);
});

test('extractEndpoints maps Python and C# MCP tool declarations', () => {
  const root = repo();
  write(
    root,
    'src/tools.py',
    `from mcp.server.fastmcp import FastMCP
mcp = FastMCP("orders")

@mcp.tool()
def lookup_order(order_id: str):
    return {}
`
  );
  write(
    root,
    'Tools/OrderTools.cs',
    `public static class OrderTools
{
    [McpServerTool]
    public static string LookupOrder(string orderId) => "";
}
`
  );

  const endpoints = extractEndpoints(root, ['src/tools.py', 'Tools/OrderTools.cs']);
  const byKey = new Map(endpoints.map((endpoint) => [key(endpoint), endpoint]));

  assert.equal(byKey.has('mcp-tool::lookup_order:src/tools.py'), true);
  assert.equal(byKey.has('mcp-tool::LookupOrder:Tools/OrderTools.cs'), true);
});
