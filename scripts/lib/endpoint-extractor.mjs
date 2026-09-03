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

// Express-style registrations. The path must start with `/` so settings
// lookups (`app.get('env')`) are not reported as routes; the handler is the
// last call argument, after any middleware.
const JS_HTTP_RE =
  /\b(?:app|router|server)\.(get|post|put|delete|patch|head|options)\(\s*['"`](\/[^'"`]*)['"`]/g;
const JS_IDENTIFIER_RE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
// Next.js App Router route handlers: a `route.{js,ts,…}` file anywhere under an
// `app/` directory, exporting one function per HTTP method.
const NEXT_ROUTE_FILE_RE =
  /(?:^|\/)app\/(?:.*\/)?route\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
const NEXT_METHOD_EXPORT_RE =
  /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*\(|export\s+const\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s*=/g;
const JS_MCP_RE =
  /\b(?:server|mcp)\.(tool|resource|prompt)\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*['"`]([^'"`]+)['"`])?/g;
// FastAPI/Flask method decorators on any receiver (app, router, bp, api).
const PY_HTTP_RE =
  /^[ \t]*@([A-Za-z_]\w*)\.(get|post|put|delete|patch|head|options)\(/gm;
// Flask `@<name>.route(path, methods=[...])`; GET when `methods` is omitted.
const PY_ROUTE_RE = /^[ \t]*@([A-Za-z_]\w*)\.route\(/gm;
const PY_METHODS_KWARG_RE = /^methods\s*=\s*[[(]([^\])]*)[\])]/;
const PY_FLASK_IMPORT_RE = /^[ \t]*(?:from|import)\s+flask\b/m;
// FastMCP decorators, with or without a call. The registration name is the
// explicit positional or `name=` string, else the decorated function's name.
const PY_MCP_RE = /^[ \t]*@(?:mcp|server)\.(tool|resource|prompt)\b/gm;
// The `def`/`async def` that follows a decorator, past any further decorator,
// comment, or blank lines.
const PY_DECORATED_DEF_RE =
  /^[ \t]*(?:#[^\n]*)?\r?\n(?:[ \t]*(?:@[^\n]*|#[^\n]*)?\r?\n)*[ \t]*(?:async\s+)?def\s+([A-Za-z_]\w*)/;
const PY_STRING_RE = /^(?:[rbu]|rb|br)?(['"])([^'"]*)\1$/i;
const PY_NAME_KWARG_RE = /^name\s*=\s*(['"])([^'"]*)\1$/;
const CSHARP_HTTP_RE =
  /\.\s*Map(Get|Post|Put|Delete|Patch|Head|Options)\(\s*"([^"]+)"\s*(?:,\s*([A-Za-z_]\w*))?/g;
const CSHARP_MCP_TRANSPORT_RE = /\.\s*MapMcp\(\s*"([^"]+)"/g;
// MCP attributes may be followed by further attribute lines ([Description])
// before the method declaration.
const CSHARP_MCP_ATTRIBUTE_RE =
  /\[\s*(McpServerTool|McpServerResource|McpServerPrompt)[^\]]*\](?:\s*\[[^\]]*\])*\s*(?:public|private|internal|protected|static|async|\s)*(?:[\w<>,.?[\]\s]+\s+)?([A-Za-z_]\w*)\s*\(/g;
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
// Chained segments after a group call's closing paren: .Group("/v2", mw)...
const GO_GROUP_CHAIN_RE = /^\s*\.Group\(/;
const GO_STRING_RE = /^"([^"]*)"$/;
// Group-typed function parameters: routes on these receivers come from
// another file's Group call, so their prefix is unresolvable here.
const GO_GROUP_PARAM_RE =
  /\b([A-Za-z_]\w*)\s+\*?(?:gin\.RouterGroup|echo\.Group)\b/g;
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
 * nested groups accumulate their parents' prefixes. A variable maps to null
 * (unresolvable -> sub-path at confidence medium) when it is rebound with a
 * second Group call, is a group-typed function parameter (the prefix lives in
 * another file), or its chain cannot be resolved within this file.
 * @param {string} text
 * @returns {Map<string, string | null>} var -> full prefix, or null
 */
function collectGoGroupPrefixes(text) {
  const POISONED = Symbol('poisoned');
  /** @type {Map<string, { parent: string, prefix: string } | typeof POISONED>} */
  const bindings = new Map();
  for (const match of text.matchAll(GO_GROUP_BINDING_RE)) {
    let prefix = match[3];
    let chainResolved = true;
    // Accumulate chained .Group("...") links on the same expression. Each
    // link may carry middleware arguments after its prefix string; a link
    // whose prefix is not a string literal makes the chain unresolvable.
    let openIndex = match.index + match[0].indexOf('.Group(') + '.Group'.length;
    for (;;) {
      const call = scanCallArguments(text, openIndex);
      const chain = call ? text.slice(call.end).match(GO_GROUP_CHAIN_RE) : null;
      if (!chain) {
        break;
      }
      openIndex = call.end + chain[0].length - 1;
      const link = scanCallArguments(text, openIndex);
      const literal = link?.args[0]?.match(GO_STRING_RE);
      if (!literal) {
        chainResolved = false;
        break;
      }
      prefix += literal[1];
    }
    if (bindings.has(match[1]) || !chainResolved) {
      // Rebinding across functions: first-binding-wins would fabricate wrong
      // paths at high confidence, so the name becomes unresolvable instead.
      bindings.set(match[1], POISONED);
    } else {
      bindings.set(match[1], { parent: match[2], prefix });
    }
  }
  for (const match of text.matchAll(GO_GROUP_PARAM_RE)) {
    if (!bindings.has(match[1])) {
      bindings.set(match[1], POISONED);
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
      if (binding === undefined) {
        // Chain root: a variable with no Group binding is the router itself.
        break;
      }
      if (binding === POISONED) {
        ok = false;
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
    const call = scanCallArguments(text, match.index + match[0].indexOf('('));
    endpoints.push({
      kind: 'http',
      method: match[1].toUpperCase(),
      path: match[2],
      file,
      line: lineAt(text, match.index ?? 0),
      handler: lastIdentifierArgument(call),
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
  const httpFramework = PY_FLASK_IMPORT_RE.test(text) ? 'flask' : 'fastapi';

  for (const match of text.matchAll(PY_HTTP_RE)) {
    const routePath = pythonRoutePath(text, match);
    if (!routePath) {
      continue;
    }
    endpoints.push({
      kind: 'http',
      method: match[2].toUpperCase(),
      path: routePath,
      file,
      line: lineAt(text, match.index ?? 0),
      framework: httpFramework,
      confidence: 'high',
    });
  }

  for (const match of text.matchAll(PY_ROUTE_RE)) {
    const routePath = pythonRoutePath(text, match);
    if (!routePath) {
      continue;
    }
    const call = scanCallArguments(text, match.index + match[0].length - 1);
    for (const method of pythonRouteMethods(call?.args ?? [])) {
      endpoints.push({
        kind: 'http',
        method,
        path: routePath,
        file,
        line: lineAt(text, match.index ?? 0),
        framework: 'flask',
        confidence: 'high',
      });
    }
  }

  for (const match of text.matchAll(PY_MCP_RE)) {
    const type = match[1];
    let end = match.index + match[0].length;
    /** @type {string[]} */
    let args = [];
    if (text[end] === '(') {
      const call = scanCallArguments(text, end);
      if (!call) {
        continue;
      }
      args = call.args;
      end = call.end;
    }
    const positional = args[0]?.match(PY_STRING_RE)?.[2];
    const keyword = args
      .map((arg) => arg.match(PY_NAME_KWARG_RE)?.[2])
      .find((value) => value !== undefined);
    // A resource's positional string is its URI, not its name.
    const explicitName = keyword ?? (type === 'resource' ? undefined : positional);
    const defName = text.slice(end).match(PY_DECORATED_DEF_RE)?.[1];
    const name = explicitName ?? defName;
    if (!name) {
      continue;
    }
    endpoints.push({
      kind: mcpKind(type),
      name,
      path: type === 'resource' ? positional : undefined,
      file,
      line: lineAt(text, match.index ?? 0),
      framework: 'mcp',
      confidence: defName ? 'high' : 'medium',
    });
  }

  return endpoints;
}

/**
 * The route path of a Python decorator whose match ends at its `(`: the first
 * argument must be a plain string starting with `/`.
 * @param {string} text
 * @param {RegExpMatchArray} match
 * @returns {string | undefined}
 */
function pythonRoutePath(text, match) {
  const call = scanCallArguments(text, match.index + match[0].length - 1);
  const literal = call?.args[0]?.match(PY_STRING_RE)?.[2];
  return literal?.startsWith('/') ? literal : undefined;
}

/**
 * HTTP methods of a Flask `route(...)` call from its `methods=` keyword; GET
 * when absent.
 * @param {string[]} args
 * @returns {string[]}
 */
function pythonRouteMethods(args) {
  for (const arg of args) {
    const kwarg = arg.match(PY_METHODS_KWARG_RE);
    if (kwarg) {
      const methods = [...kwarg[1].matchAll(/['"]([A-Za-z]+)['"]/g)].map((m) =>
        m[1].toUpperCase()
      );
      return methods.length > 0 ? methods : ['GET'];
    }
  }
  return ['GET'];
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
 * Splits the argument list of the call whose `(` sits at `openIndex` on
 * top-level commas, tolerating nested brackets and quoted strings. Returns
 * null when the parenthesis is unbalanced.
 * @param {string} text
 * @param {number} openIndex
 * @returns {{ args: string[], end: number } | null} end = index after `)`
 */
function scanCallArguments(text, openIndex) {
  if (text[openIndex] !== '(') {
    return null;
  }
  /** @type {string[]} */
  const args = [];
  let depth = 0;
  let start = openIndex + 1;
  /** @type {string | null} */
  let quote = null;
  for (let i = openIndex + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') {
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth += 1;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth > 0) {
        depth -= 1;
      } else if (ch === ')') {
        args.push(text.slice(start, i).trim());
        return { args: args.filter(Boolean), end: i + 1 };
      } else {
        return null;
      }
    } else if (ch === ',' && depth === 0) {
      args.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  return null;
}

/**
 * The handler of a route registration: the last argument after the path,
 * when it is a plain (possibly dotted) identifier rather than an inline
 * function.
 * @param {{ args: string[] } | null} call
 * @returns {string | undefined}
 */
function lastIdentifierArgument(call) {
  if (!call || call.args.length < 2) {
    return undefined;
  }
  const last = call.args[call.args.length - 1];
  return JS_IDENTIFIER_RE.test(last) ? last : undefined;
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
