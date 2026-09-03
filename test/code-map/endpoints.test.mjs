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

test('extractEndpoints maps Go net/http including Go 1.22 method patterns', () => {
  const root = repo();
  write(
    root,
    'cmd/api/main.go',
    `package main

import "net/http"

func main() {
	mux := http.NewServeMux()
	http.HandleFunc("/health", health)
	mux.HandleFunc("GET /users/{id}", getUser)
	store.Get("key")
}
`
  );

  const endpoints = extractEndpoints(root, ['cmd/api/main.go']);
  const byKey = new Map(endpoints.map((endpoint) => [key(endpoint), endpoint]));

  assert.equal(byKey.has('http::/health:cmd/api/main.go'), true);
  assert.equal(byKey.has('http:GET:/users/{id}:cmd/api/main.go'), true);
  assert.equal(byKey.get('http::/health:cmd/api/main.go').framework, 'net-http');
  assert.equal(endpoints.length, 2);
});

test('extractEndpoints resolves gin group prefixes file-scoped', () => {
  const root = repo();
  write(
    root,
    'internal/api/routes.go',
    `package api

import "github.com/gin-gonic/gin"

func Register(r *gin.Engine) {
	g := r.Group("/api/v1")
	g.GET("/users", listUsers)
	r.POST("/login", login)
}
`
  );

  const endpoints = extractEndpoints(root, ['internal/api/routes.go']);
  const byKey = new Map(endpoints.map((endpoint) => [key(endpoint), endpoint]));

  assert.equal(byKey.has('http:GET:/api/v1/users:internal/api/routes.go'), true);
  assert.equal(
    byKey.get('http:GET:/api/v1/users:internal/api/routes.go').confidence,
    'high'
  );
  assert.equal(byKey.has('http:POST:/login:internal/api/routes.go'), true);
});

test('extractEndpoints maps chi and echo routes with import gating', () => {
  const root = repo();
  write(
    root,
    'internal/chi/routes.go',
    `package chiapi

import "github.com/go-chi/chi/v5"

func Register(r chi.Router) {
	r.Get("/orders", listOrders)
	r.Method("DELETE", "/orders/{id}", deleteOrder)
	r.Route("/admin", func(r chi.Router) {
		r.Get("/stats", stats)
	})
}
`
  );
  write(
    root,
    'internal/echo/routes.go',
    `package echoapi

import "github.com/labstack/echo/v4"

func Register(e *echo.Echo) {
	e.POST("/login", login)
}
`
  );
  write(
    root,
    'internal/store/store.go',
    `package store

func Load(c Cache) {
	c.Get("/tmp/cache", nil)
}
`
  );

  const endpoints = extractEndpoints(root, [
    'internal/chi/routes.go',
    'internal/echo/routes.go',
    'internal/store/store.go',
  ]);
  const byKey = new Map(endpoints.map((endpoint) => [key(endpoint), endpoint]));

  assert.equal(byKey.has('http:GET:/orders:internal/chi/routes.go'), true);
  assert.equal(
    byKey.get('http:GET:/orders:internal/chi/routes.go').confidence,
    'medium'
  );
  assert.equal(
    byKey.has('http:DELETE:/orders/{id}:internal/chi/routes.go'),
    true
  );
  assert.equal(byKey.has('http:POST:/login:internal/echo/routes.go'), true);
  assert.equal(
    byKey.get('http:POST:/login:internal/echo/routes.go').framework,
    'echo'
  );
  assert.equal(
    endpoints.some((endpoint) => endpoint.file === 'internal/store/store.go'),
    false
  );
});

test('extractEndpoints maps both Go MCP SDK registration shapes', () => {
  const root = repo();
  write(
    root,
    'internal/mcp/server.go',
    `package mcpserver

import "github.com/mark3labs/mcp-go/mcp"

func Register(s *Server) {
	s.AddTool(mcp.NewTool("lookup_order",
		mcp.WithDescription("Lookup an order"),
	), lookupOrder)
	mcp.AddTool(server, &mcp.Tool{
		Name: "cancel_order",
	}, cancelOrder)
}
`
  );

  const endpoints = extractEndpoints(root, ['internal/mcp/server.go']);
  const byKey = new Map(endpoints.map((endpoint) => [key(endpoint), endpoint]));

  assert.equal(byKey.has('mcp-tool::lookup_order:internal/mcp/server.go'), true);
  assert.equal(byKey.has('mcp-tool::cancel_order:internal/mcp/server.go'), true);
  assert.equal(
    byKey.get('mcp-tool::lookup_order:internal/mcp/server.go').framework,
    'go-mcp'
  );
});

test('extractEndpoints marks cross-file group receivers medium per UC-002', () => {
  const root = repo();
  write(
    root,
    'internal/api/users.go',
    `package api

import "github.com/gin-gonic/gin"

func RegisterUsers(g *gin.RouterGroup) {
	g.GET("/users", listUsers)
}
`
  );

  const endpoints = extractEndpoints(root, ['internal/api/users.go']);
  const entry = endpoints.find((e) => e.path === '/users');
  assert.notEqual(entry, undefined);
  assert.equal(entry.confidence, 'medium');
});

test('extractEndpoints degrades reused group variable names to medium', () => {
  const root = repo();
  write(
    root,
    'internal/api/reuse.go',
    `package api

import "github.com/gin-gonic/gin"

func RegisterA(r *gin.Engine) {
	g := r.Group("/a")
	g.GET("/x", ax)
}

func RegisterB(r *gin.Engine) {
	g := r.Group("/b")
	g.GET("/y", by)
}
`
  );

  const endpoints = extractEndpoints(root, ['internal/api/reuse.go']);
  for (const entry of endpoints) {
    assert.equal(entry.confidence, 'medium');
    assert.equal(entry.path.startsWith('/a') || entry.path.startsWith('/b'), false);
  }
  assert.equal(endpoints.length, 2);
});

test('extractEndpoints accumulates chained Group prefixes', () => {
  const root = repo();
  write(
    root,
    'internal/api/chain.go',
    `package api

import "github.com/gin-gonic/gin"

func Register(r *gin.Engine) {
	g := r.Group("/api").Group("/v2")
	g.GET("/z", z)
}
`
  );

  const endpoints = extractEndpoints(root, ['internal/api/chain.go']);
  const entry = endpoints.find((e) => e.method === 'GET');
  assert.equal(entry.path, '/api/v2/z');
  assert.equal(entry.confidence, 'high');
});

test('extractEndpoints ignores Express settings lookups and records the last argument as handler', () => {
  const root = repo();
  write(
    root,
    'src/server.js',
    `const app = express();
app.get('env');
app.get('port', 3000);
app.get('/health', health);
app.post('/orders', auth, validate, createOrder);
app.put('/orders/:id', auth, (req, res) => res.json({}));
router.get('/reports', ctrl.list);
`
  );

  const endpoints = extractEndpoints(root, ['src/server.js']);
  const byKey = new Map(endpoints.map((endpoint) => [key(endpoint), endpoint]));

  // app.get('env') / app.get('port') are settings reads, not routes.
  assert.equal(endpoints.some((e) => e.path === 'env' || e.path === 'port'), false);
  assert.equal(endpoints.length, 4);
  assert.equal(byKey.get('http:GET:/health:src/server.js').handler, 'health');
  // The handler is the last argument, after middleware.
  assert.equal(byKey.get('http:POST:/orders:src/server.js').handler, 'createOrder');
  // An inline handler has no name to record.
  assert.equal(byKey.get('http:PUT:/orders/:id:src/server.js').handler, undefined);
  assert.equal(byKey.get('http:GET:/reports:src/server.js').handler, 'ctrl.list');
});

test('extractEndpoints names FastMCP tools from the explicit name or the decorated def', () => {
  const root = repo();
  write(
    root,
    'src/tools.py',
    `from mcp.server.fastmcp import FastMCP
mcp = FastMCP("orders")

@mcp.tool(description="Look up an order")
def lookup_order(order_id: str):
    return {}

@mcp.tool()
async def cancel_order(order_id: str):
    return {}

@mcp.tool("explicit")
def impl():
    return {}

@mcp.tool(name="kw_name")
def other():
    return {}

@mcp.resource("orders://{id}")
def read_order(id: str):
    return ""
`
  );

  const endpoints = extractEndpoints(root, ['src/tools.py']);
  const names = endpoints.map((e) => e.name).sort();

  // Keyword arguments never become names; async defs count; an explicit name
  // wins over the def name and yields a single entry.
  assert.deepEqual(names, ['cancel_order', 'explicit', 'kw_name', 'lookup_order', 'read_order']);
  for (const endpoint of endpoints) {
    assert.equal(endpoint.confidence, 'high');
  }
  const resource = endpoints.find((e) => e.kind === 'mcp-resource');
  assert.equal(resource.path, 'orders://{id}');
});

test('extractEndpoints maps C# MCP attributes stacked above other attribute lines', () => {
  const root = repo();
  write(
    root,
    'Tools/OrderTools.cs',
    `public static class OrderTools
{
    [McpServerTool]
    [Description("Looks up an order")]
    public static string LookupOrder(string orderId) => "";

    [McpServerTool, Description("Cancels an order")]
    public static async Task<string> CancelOrder(string orderId) => "";
}
`
  );

  const endpoints = extractEndpoints(root, ['Tools/OrderTools.cs']);
  const names = endpoints.map((e) => e.name).sort();

  assert.deepEqual(names, ['CancelOrder', 'LookupOrder']);
  assert.equal(endpoints.find((e) => e.name === 'LookupOrder').line, 3);
});

test('extractEndpoints maps Flask route and Blueprint method decorators', () => {
  const root = repo();
  write(
    root,
    'src/app.py',
    `from flask import Flask, Blueprint
app = Flask(__name__)
bp = Blueprint("bp", __name__)

@app.route("/x", methods=["POST"])
def x():
    return ""

@app.route("/y", methods=("GET", "PUT"))
def y():
    return ""

@app.route("/")
def index():
    return ""

@bp.get("/bp")
def bp_get():
    return ""
`
  );

  const endpoints = extractEndpoints(root, ['src/app.py']);
  const byKey = new Map(endpoints.map((endpoint) => [key(endpoint), endpoint]));

  assert.equal(byKey.has('http:POST:/x:src/app.py'), true);
  // One endpoint per listed method.
  assert.equal(byKey.has('http:GET:/y:src/app.py'), true);
  assert.equal(byKey.has('http:PUT:/y:src/app.py'), true);
  // GET is the default when methods is omitted.
  assert.equal(byKey.has('http:GET:/:src/app.py'), true);
  assert.equal(byKey.has('http:GET:/bp:src/app.py'), true);
  assert.equal(endpoints.length, 5);
  assert.equal(byKey.get('http:GET:/bp:src/app.py').framework, 'flask');
});

test('extractEndpoints resolves gin Group chains that carry middleware arguments', () => {
  const root = repo();
  write(
    root,
    'internal/api/middleware.go',
    `package api

import "github.com/gin-gonic/gin"

func Register(r *gin.Engine) {
	g := r.Group("/api", authMiddleware).Group("/v1")
	g.GET("/users", listUsers)
	h := r.Group("/x").Group(prefix)
	h.GET("/y", y)
}
`
  );

  const endpoints = extractEndpoints(root, ['internal/api/middleware.go']);
  const users = endpoints.find((e) => e.handler === 'listUsers');
  assert.equal(users.path, '/api/v1/users');
  assert.equal(users.confidence, 'high');
  // A chain link whose prefix is not a string literal is unresolvable.
  const y = endpoints.find((e) => e.handler === 'y');
  assert.equal(y.path, '/y');
  assert.equal(y.confidence, 'medium');
});
