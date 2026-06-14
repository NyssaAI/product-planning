/**
 * Extracts public runtime endpoints from source files.
 *
 * Public Interface:
 * - extractEndpoints(repoRoot, files) -> Endpoint[]
 *
 * Dependencies:
 * - Node fs/path for local source reads
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const JS_HTTP_RE =
  /\b(?:app|router|server)\.(get|post|put|delete|patch|head|options)\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*([A-Za-z_$][\w$]*))?/g;
// Next.js App Router route handlers: a `route.{js,ts,…}` file anywhere under an
// `app/` directory, exporting one function per HTTP method.
const NEXT_ROUTE_FILE_RE =
  /(?:^|\/)app\/(?:.*\/)?route\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
const NEXT_METHOD_EXPORT_RE =
  /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(|export\s+const\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*=/g;
const JS_MCP_RE =
  /\b(?:server|mcp)\.(tool|resource|prompt)\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*['"`]([^'"`]+)['"`])?/g;
const PY_HTTP_RE =
  /^\s*@(?:app|router)\.(get|post|put|delete|patch|head|options)\(\s*['"]([^'"]+)['"]/gm;
const PY_MCP_RE =
  /^\s*@(?:mcp|server)\.(tool|resource|prompt)\(\s*(?:name\s*=\s*)?['"]?([^'")\n]+)?/gm;
const PY_MCP_DECORATED_RE =
  /^\s*@(?:mcp|server)\.(tool|resource|prompt)\([^)]*\)\s*\n\s*def\s+([A-Za-z_]\w*)/gm;
const CSHARP_HTTP_RE =
  /\.\s*Map(Get|Post|Put|Delete|Patch|Head|Options)\(\s*"([^"]+)"\s*(?:,\s*([A-Za-z_]\w*))?/g;
const CSHARP_MCP_TRANSPORT_RE = /\.\s*MapMcp\(\s*"([^"]+)"/g;
const CSHARP_MCP_ATTRIBUTE_RE =
  /\[\s*(McpServerTool|McpServerResource|McpServerPrompt)[^\]]*\]\s*(?:public|private|internal|protected|static|async|\s)*(?:[\w<>,.?[\]\s]+\s+)?([A-Za-z_]\w*)\s*\(/g;

/**
 * @typedef {object} Endpoint
 * @property {'http' | 'mcp-tool' | 'mcp-resource' | 'mcp-prompt' | 'mcp-transport'} kind
 * @property {string} [method]
 * @property {string} [path]
 * @property {string} [name]
 * @property {string} file
 * @property {number} line
 * @property {string} [handler]
 * @property {string} [framework]
 * @property {'high' | 'medium' | 'low'} confidence
 */

/**
 * @param {string} repoRoot
 * @param {string[]} files repo-relative files
 * @returns {Endpoint[]}
 */
export function extractEndpoints(repoRoot, files) {
  /** @type {Endpoint[]} */
  const endpoints = [];

  for (const file of [...new Set(files.map(normalizePath))].sort()) {
    const absPath = path.join(repoRoot, file);
    if (!existsSync(absPath)) {
      continue;
    }
    const text = readFileSync(absPath, 'utf8');
    endpoints.push(...extractEndpointsFromText(file, text));
  }

  return dedupeEndpoints(endpoints).sort(compareEndpoints);
}

/**
 * @param {string} file
 * @param {string} text
 * @returns {Endpoint[]}
 */
function extractEndpointsFromText(file, text) {
  const ext = path.extname(file).toLowerCase();
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
    return [
      ...extractJavaScriptEndpoints(file, text),
      ...extractNextAppRouterEndpoints(file, text),
    ];
  }
  if (ext === '.py') {
    return extractPythonEndpoints(file, text);
  }
  if (ext === '.cs') {
    return extractCSharpEndpoints(file, text);
  }
  return [];
}

/**
 * @param {string} file
 * @param {string} text
 * @returns {Endpoint[]}
 */
function extractJavaScriptEndpoints(file, text) {
  /** @type {Endpoint[]} */
  const endpoints = [];

  for (const match of text.matchAll(JS_HTTP_RE)) {
    endpoints.push({
      kind: 'http',
      method: match[1].toUpperCase(),
      path: match[2],
      file,
      line: lineAt(text, match.index ?? 0),
      handler: match[3],
      framework: 'node',
      confidence: 'high',
    });
  }

  for (const match of text.matchAll(JS_MCP_RE)) {
    endpoints.push({
      kind: mcpKind(match[1]),
      name: match[2],
      path: match[1] === 'resource' ? match[3] : undefined,
      file,
      line: lineAt(text, match.index ?? 0),
      framework: 'mcp',
      confidence: 'high',
    });
  }

  return endpoints;
}

/**
 * Extracts Next.js App Router endpoints. A route handler is a `route.*` file
 * under an `app/` directory; each exported HTTP-method function (or const arrow)
 * is one endpoint, and the URL path is derived from the directory layout.
 *
 * @param {string} file
 * @param {string} text
 * @returns {Endpoint[]}
 */
function extractNextAppRouterEndpoints(file, text) {
  if (!NEXT_ROUTE_FILE_RE.test(file)) {
    return [];
  }
  const routePath = nextRoutePath(file);
  /** @type {Endpoint[]} */
  const endpoints = [];
  for (const match of text.matchAll(NEXT_METHOD_EXPORT_RE)) {
    const method = match[1] ?? match[2];
    endpoints.push({
      kind: 'http',
      method,
      path: routePath,
      file,
      line: lineAt(text, match.index ?? 0),
      framework: 'nextjs-app-router',
      confidence: 'high',
    });
  }
  return endpoints;
}

/**
 * Derives the URL path for a Next.js App Router route file from its directory
 * layout: route groups `(group)` and parallel-route slots `@slot` are dropped,
 * `[param]` becomes `:param`, `[...param]` becomes `:param*`, and
 * `[[...param]]` becomes `:param?`.
 *
 * @param {string} file repo-relative, forward-slash path ending in `/route.*`
 * @returns {string}
 */
function nextRoutePath(file) {
  const match = file.match(/(?:^|\/)app\/(.*)route\.[^/]+$/);
  const inner = match ? match[1] : '';
  const segments = inner
    .split('/')
    .filter(Boolean)
    .filter((seg) => !/^\(.*\)$/.test(seg))
    .filter((seg) => !seg.startsWith('@'))
    .map(nextRouteSegment);
  return `/${segments.join('/')}`;
}

/**
 * @param {string} seg
 * @returns {string}
 */
function nextRouteSegment(seg) {
  const optionalCatchAll = seg.match(/^\[\[\.\.\.(.+)\]\]$/);
  if (optionalCatchAll) {
    return `:${optionalCatchAll[1]}?`;
  }
  const catchAll = seg.match(/^\[\.\.\.(.+)\]$/);
  if (catchAll) {
    return `:${catchAll[1]}*`;
  }
  const dynamic = seg.match(/^\[(.+)\]$/);
  if (dynamic) {
    return `:${dynamic[1]}`;
  }
  return seg;
}

/**
 * @param {string} file
 * @param {string} text
 * @returns {Endpoint[]}
 */
function extractPythonEndpoints(file, text) {
  /** @type {Endpoint[]} */
  const endpoints = [];

  for (const match of text.matchAll(PY_HTTP_RE)) {
    endpoints.push({
      kind: 'http',
      method: match[1].toUpperCase(),
      path: match[2],
      file,
      line: lineAt(text, match.index ?? 0),
      framework: 'fastapi',
      confidence: 'high',
    });
  }

  for (const match of text.matchAll(PY_MCP_RE)) {
    const type = match[1];
    const name = (match[2] ?? '').trim();
    if (!name) {
      continue;
    }
    endpoints.push({
      kind: mcpKind(type),
      name,
      file,
      line: lineAt(text, match.index ?? 0),
      framework: 'mcp',
      confidence: 'medium',
    });
  }

  for (const match of text.matchAll(PY_MCP_DECORATED_RE)) {
    endpoints.push({
      kind: mcpKind(match[1]),
      name: match[2],
      file,
      line: lineAt(text, match.index ?? 0),
      framework: 'mcp',
      confidence: 'high',
    });
  }

  return endpoints;
}

/**
 * @param {string} file
 * @param {string} text
 * @returns {Endpoint[]}
 */
function extractCSharpEndpoints(file, text) {
  /** @type {Endpoint[]} */
  const endpoints = [];

  for (const match of text.matchAll(CSHARP_HTTP_RE)) {
    endpoints.push({
      kind: 'http',
      method: match[1].toUpperCase(),
      path: match[2],
      file,
      line: lineAt(text, match.index ?? 0),
      handler: match[3],
      framework: 'aspnet-minimal-api',
      confidence: 'high',
    });
  }

  for (const match of text.matchAll(CSHARP_MCP_TRANSPORT_RE)) {
    endpoints.push({
      kind: 'mcp-transport',
      path: match[1],
      file,
      line: lineAt(text, match.index ?? 0),
      framework: 'aspnet-mcp',
      confidence: 'high',
    });
  }

  for (const match of text.matchAll(CSHARP_MCP_ATTRIBUTE_RE)) {
    endpoints.push({
      kind: csharpMcpKind(match[1]),
      name: match[2],
      file,
      line: lineAt(text, match.index ?? 0),
      framework: 'dotnet-mcp',
      confidence: 'high',
    });
  }

  return endpoints;
}

/**
 * @param {string} type
 * @returns {'mcp-tool' | 'mcp-resource' | 'mcp-prompt'}
 */
function mcpKind(type) {
  if (type === 'resource') {
    return 'mcp-resource';
  }
  if (type === 'prompt') {
    return 'mcp-prompt';
  }
  return 'mcp-tool';
}

/**
 * @param {string} attribute
 * @returns {'mcp-tool' | 'mcp-resource' | 'mcp-prompt'}
 */
function csharpMcpKind(attribute) {
  if (attribute === 'McpServerResource') {
    return 'mcp-resource';
  }
  if (attribute === 'McpServerPrompt') {
    return 'mcp-prompt';
  }
  return 'mcp-tool';
}

/**
 * @param {Endpoint[]} endpoints
 * @returns {Endpoint[]}
 */
function dedupeEndpoints(endpoints) {
  const byKey = new Map();
  for (const endpoint of endpoints) {
    const key = [
      endpoint.kind,
      endpoint.method ?? '',
      endpoint.path ?? '',
      endpoint.name ?? '',
      endpoint.file,
      endpoint.line,
    ].join('\0');
    if (!byKey.has(key)) {
      byKey.set(key, endpoint);
    }
  }
  return [...byKey.values()];
}

/**
 * @param {Endpoint} a
 * @param {Endpoint} b
 * @returns {number}
 */
function compareEndpoints(a, b) {
  return (
    a.file.localeCompare(b.file) ||
    a.line - b.line ||
    a.kind.localeCompare(b.kind) ||
    (a.method ?? '').localeCompare(b.method ?? '') ||
    (a.path ?? a.name ?? '').localeCompare(b.path ?? b.name ?? '')
  );
}

/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function lineAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

/**
 * @param {string} p
 * @returns {string}
 */
function normalizePath(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}
