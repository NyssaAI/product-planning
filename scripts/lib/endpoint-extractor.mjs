/**
 * Extracts public runtime endpoints from source files.
 *
 * Public Interface:
 * - extractEndpoints(repoRoot, files) -> Endpoint[]
 * - nextRoutePath(file) -> string  (Next.js App Router file -> URL path)
 * - nextRouteSegment(seg) -> string  (single path-segment translator)
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
// Go net/http registrations: http.HandleFunc/Handle and mux-style receivers.
// The literal may be a Go 1.22 "METHOD /path" pattern.
const GO_NET_HTTP_RE =
  /\b[A-Za-z_]\w*\.Handle(?:Func)?\(\s*"([^"]+)"\s*(?:,\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*))?/g;
// gin/echo-style uppercase route methods on a receiver variable.
const GO_UPPER_ROUTE_RE =
  /\b([A-Za-z_]\w*)\.(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\(\s*"([^"]+)"\s*(?:,\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*))?/g;
// chi-style titlecase route methods; gated on a chi import to avoid ordinary
// getter collisions (store.Get("/tmp/x")).
const GO_TITLE_ROUTE_RE =
  /\b([A-Za-z_]\w*)\.(Get|Post|Put|Delete|Patch|Head|Options)\(\s*"([^"]+)"\s*(?:,\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*))?/g;
const GO_CHI_METHOD_RE =
  /\b[A-Za-z_]\w*\.Method(?:Func)?\(\s*"(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)"\s*,\s*"([^"]+)"\s*(?:,\s*([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*))?/g;
// File-scoped router-group bindings: g := r.Group("/prefix").
const GO_GROUP_BINDING_RE =
  /\b([A-Za-z_]\w*)\s*:?=\s*([A-Za-z_]\w*)\.Group\(\s*"([^"]+)"/g;
// Go MCP tools: mark3labs/mcp-go and the official SDK registration shapes.
const GO_MCP_MARK3LABS_RE =
  /\b[A-Za-z_]\w*\.AddTool\(\s*mcp\.NewTool\(\s*"([^"]+)"/g;
const GO_MCP_OFFICIAL_RE =
  /\bmcp\.AddTool\(\s*[^,]+,\s*&mcp\.Tool\{[^}]*?Name:\s*"([^"]+)"/g;
const GO_HTTP_METHOD_PATTERN_RE =
  /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S+)$/;

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
  if (ext === '.go') {
    return extractGoEndpoints(file, text);
  }
  return [];
}

/**
 * @param {string} file
 * @param {string} text
 * @returns {Endpoint[]}
 */
function extractGoEndpoints(file, text) {
  /** @type {Endpoint[]} */
  const endpoints = [];
  const importsGin = text.includes('github.com/gin-gonic/gin');
  const importsEcho = text.includes('github.com/labstack/echo');
  const importsChi = text.includes('github.com/go-chi/chi');
  const groupPrefixes = collectGoGroupPrefixes(text);
  const hasUnresolvableGrouping = /\.(Route|Mount)\(\s*"/.test(text);

  for (const match of text.matchAll(GO_NET_HTTP_RE)) {
    const pattern = parseGoHttpPattern(match[1]);
    if (!pattern) {
      continue;
    }
    endpoints.push({
      kind: 'http',
      method: pattern.method,
      path: pattern.path,
      file,
      line: lineAt(text, match.index ?? 0),
      handler: match[2],
      framework: 'net-http',
      confidence: 'high',
    });
  }

  if (importsGin || importsEcho) {
    for (const match of text.matchAll(GO_UPPER_ROUTE_RE)) {
      if (!match[3].startsWith('/')) {
        continue;
      }
      const resolved = resolveGoGroupPath(match[1], match[3], groupPrefixes);
      endpoints.push({
        kind: 'http',
        method: match[2],
        path: resolved.path,
        file,
        line: lineAt(text, match.index ?? 0),
        handler: match[4],
        framework: importsGin ? 'gin' : 'echo',
        confidence: resolved.resolved ? 'high' : 'medium',
      });
    }
  }

  if (importsChi) {
    for (const match of text.matchAll(GO_TITLE_ROUTE_RE)) {
      if (!match[3].startsWith('/')) {
        continue;
      }
      endpoints.push({
        kind: 'http',
        method: match[2].toUpperCase(),
        path: match[3],
        file,
        line: lineAt(text, match.index ?? 0),
        handler: match[4],
        framework: 'chi',
        // Routes inside chi Route/Mount closures carry sub-paths this
        // file-scoped pass cannot prefix; mark the whole file medium.
        confidence: hasUnresolvableGrouping ? 'medium' : 'high',
      });
    }
    for (const match of text.matchAll(GO_CHI_METHOD_RE)) {
      if (!match[2].startsWith('/')) {
        continue;
      }
      endpoints.push({
        kind: 'http',
        method: match[1],
        path: match[2],
        file,
        line: lineAt(text, match.index ?? 0),
        handler: match[3],
        framework: 'chi',
        confidence: hasUnresolvableGrouping ? 'medium' : 'high',
      });
    }
  }

  for (const match of text.matchAll(GO_MCP_MARK3LABS_RE)) {
    endpoints.push({
      kind: 'mcp-tool',
      name: match[1],
      file,
      line: lineAt(text, match.index ?? 0),
      framework: 'go-mcp',
      confidence: 'high',
    });
  }
  for (const match of text.matchAll(GO_MCP_OFFICIAL_RE)) {
    endpoints.push({
      kind: 'mcp-tool',
      name: match[1],
      file,
      line: lineAt(text, match.index ?? 0),
      framework: 'go-mcp',
      confidence: 'high',
    });
  }

  return endpoints;
}

/**
 * Go 1.22 ServeMux patterns embed the method in the path literal
 * ("GET /users/{id}"). Plain "/path" literals carry no method.
 * @param {string} literal
 * @returns {{ method?: string, path: string } | null}
 */
function parseGoHttpPattern(literal) {
  const withMethod = literal.match(GO_HTTP_METHOD_PATTERN_RE);
  if (withMethod) {
    return { method: withMethod[1], path: withMethod[2] };
  }
  if (literal.startsWith('/')) {
    return { path: literal };
  }
  return null;
}

/**
 * File-scoped `g := r.Group("/prefix")` bindings, resolved transitively so
 * nested groups accumulate their parents' prefixes.
 * @param {string} text
 * @returns {Map<string, string | null>} var -> full prefix, or null when the
 *   parent chain leaves the file (unresolvable)
 */
function collectGoGroupPrefixes(text) {
  /** @type {Map<string, { parent: string, prefix: string }>} */
  const bindings = new Map();
  for (const match of text.matchAll(GO_GROUP_BINDING_RE)) {
    if (!bindings.has(match[1])) {
      bindings.set(match[1], { parent: match[2], prefix: match[3] });
    }
  }

  /** @type {Map<string, string | null>} */
  const resolved = new Map();
  for (const name of bindings.keys()) {
    let prefix = '';
    let current = name;
    let ok = true;
    for (let depth = 0; depth < 10; depth += 1) {
      const binding = bindings.get(current);
      if (!binding) {
        // Chain root: a variable with no Group binding is the router itself.
        break;
      }
      prefix = binding.prefix + prefix;
      current = binding.parent;
      if (bindings.has(current) && depth === 9) {
        ok = false;
      }
    }
    resolved.set(name, ok ? prefix : null);
  }
  return resolved;
}

/**
 * @param {string} receiver
 * @param {string} subPath
 * @param {Map<string, string | null>} groupPrefixes
 * @returns {{ path: string, resolved: boolean }}
 */
function resolveGoGroupPath(receiver, subPath, groupPrefixes) {
  if (!groupPrefixes.has(receiver)) {
    // Not a group variable: the route is registered on the router directly.
    return { path: subPath, resolved: true };
  }
  const prefix = groupPrefixes.get(receiver);
  if (prefix === null) {
    return { path: subPath, resolved: false };
  }
  const joined = `${prefix}/${subPath}`.replace(/\/{2,}/g, '/');
  return { path: joined, resolved: true };
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
export function nextRouteSegment(seg) {
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
