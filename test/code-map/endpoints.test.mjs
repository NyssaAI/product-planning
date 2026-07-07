import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { extractEndpoints } from '../../scripts/lib/endpoint-extractor.mjs';

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

test('extractEndpoints maps Next.js App Router route handlers', () => {
  const root = repo();
  write(
    root,
    'src/app/api/health/route.ts',
    `import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ ok: true });
}
export async function POST(request) {
  return NextResponse.json({ ok: true });
}
`
  );
  write(
    root,
    'src/app/api/users/[id]/route.js',
    `export async function GET(_req, { params }) {
  return Response.json({ id: params.id });
}
export const DELETE = async () => Response.json({});
`
  );
  write(
    root,
    'src/app/route.ts',
    `export function GET() {
  return new Response('root');
}
`
  );

  const endpoints = extractEndpoints(root, [
    'src/app/api/health/route.ts',
    'src/app/api/users/[id]/route.js',
    'src/app/route.ts',
  ]);
  const byKey = new Map(endpoints.map((endpoint) => [key(endpoint), endpoint]));

  assert.equal(byKey.has('http:GET:/api/health:src/app/api/health/route.ts'), true);
  assert.equal(byKey.has('http:POST:/api/health:src/app/api/health/route.ts'), true);
  // Dynamic segment [id] becomes :id; both function and const-arrow exports detected.
  assert.equal(byKey.has('http:GET:/api/users/:id:src/app/api/users/[id]/route.js'), true);
  assert.equal(byKey.has('http:DELETE:/api/users/:id:src/app/api/users/[id]/route.js'), true);
  // A route handler directly under app/ maps to '/'.
  assert.equal(byKey.has('http:GET:/:src/app/route.ts'), true);

  const health = byKey.get('http:GET:/api/health:src/app/api/health/route.ts');
  assert.equal(health.framework, 'nextjs-app-router');
});

test('extractEndpoints strips route groups and maps catch-all App Router segments', () => {
  const root = repo();
  write(
    root,
    'src/app/(admin)/api/files/[...slug]/route.ts',
    `export async function GET() { return new Response(''); }
`
  );

  const endpoints = extractEndpoints(root, [
    'src/app/(admin)/api/files/[...slug]/route.ts',
  ]);
  const found = endpoints.find((e) => e.method === 'GET');
  // Route group (admin) is omitted; catch-all [...slug] becomes :slug*.
  assert.equal(found.path, '/api/files/:slug*');
});

test('extractEndpoints ignores non-route exports under app/', () => {
  const root = repo();
  write(
    root,
    'src/app/dashboard/page.tsx',
    `export default function Page() { return null; }
export function GET() { return null; }
`
  );

  const endpoints = extractEndpoints(root, ['src/app/dashboard/page.tsx']);
  // page.tsx is not a route handler file, so its GET export is not an endpoint.
  assert.equal(endpoints.filter((e) => e.kind === 'http').length, 0);
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
