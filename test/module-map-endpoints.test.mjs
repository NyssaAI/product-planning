import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildPlanProductModel } from '../scripts/module-map/lib/build.mjs';
import { renderModuleScope } from '../scripts/module-map/lib/render.mjs';
import { discoverHttpRoutes } from '../scripts/module-map/lib/routes.mjs';

/** @type {string[]} */
const tempDirs = [];

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'plan-product-endpoint-test-'));
  tempDirs.push(dir);
  write(dir, 'docs/product.md', '# Product\n');
  write(dir, 'docs/features.md', '# Features\n');
  write(dir, 'docs/tech-stack.md', '# Tech Stack\n');
  return dir;
}

function write(root, rel, content) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
}

test.after(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Next filename fallback does not duplicate an executable route', () => {
  const root = repo();
  const file = 'src/app/api/health/route.ts';
  write(root, file, 'export async function GET() { return Response.json({ ok: true }); }');
  const routes = discoverHttpRoutes(root, { apiRoutes: { enabled: true, root: 'src/app/api', routeFile: 'route.ts', pathPrefix: 'src/app' } }, [], {
    schemaVersion: '2.0', files: [{ path: file, symbols: [{ name: 'GET' }] }],
    endpoints: [{ kind: 'http', file, path: '/api/health', method: 'GET', line: 1, confidence: 'high' }],
  });
  assert.equal(routes.length, 1);
  assert.equal(routes[0].line, 1);
  assert.equal(routes[0].confidence, 'high');
});

test('plan-product renders HTTP routes and MCP capabilities from code-map endpoints', () => {
  const root = repo();
  const config = {
    projectName: 'endpoint-fixture',
    outputDir: 'docs/agent-files/context',
    codeMapOutput: 'docs/agent-files/context/code-map.json',
    docs: {
      product: ['docs/product.md'],
      features: ['docs/features.md'],
      techStack: ['docs/tech-stack.md'],
    },
    briefMaxCharsPerDoc: 1200,
    modules: {
      discover: 'manual',
      manual: [{ id: 'api', name: 'API', root: 'src/api' }],
      pinned: [],
      globs: [],
      flows: {},
    },
    nav: null,
    apiRoutes: { enabled: true, root: '', routeFile: '', pathPrefix: '' },
    conventions: [],
    configFilePresent: false,
  };
  const codeMap = {
    files: [
      {
        path: 'src/api/server.ts',
        symbols: [{ name: 'createOrder', kind: 'function', line: 7 }],
      },
    ],
    endpoints: [
      {
        kind: 'http',
        method: 'POST',
        path: '/orders',
        file: 'src/api/server.ts',
        line: 4,
        framework: 'express',
        confidence: 'high',
        pathResolution: 'resolved',
      },
      {
        kind: 'mcp-tool',
        name: 'lookup_order',
        file: 'src/api/server.ts',
        line: 8,
        framework: 'mcp',
        confidence: 'high',
      },
    ],
  };

  const model = buildPlanProductModel(root, config, codeMap);
  const mod = model.modules.find((m) => m.id === 'api');
  const rendered = renderModuleScope(model, mod);

  assert.match(rendered, /## HTTP routes/);
  assert.match(rendered, /`POST` `\/orders` -> `src\/api\/server.ts:4` \(high confidence; resolved\)/);
  assert.equal(mod.httpRoutes[0].confidence, 'high');
  assert.equal(mod.httpRoutes[0].framework, 'express');
  assert.match(rendered, /## MCP tools/);
  assert.match(rendered, /`lookup_order` -> `src\/api\/server.ts:8`/);
});

test('plan-product uses code-map endpoints even when route-file scanning is disabled', () => {
  const root = repo();
  const config = {
    projectName: 'endpoint-fixture',
    outputDir: 'docs/agent-files/context',
    codeMapOutput: 'docs/agent-files/context/code-map.json',
    docs: {
      product: ['docs/product.md'],
      features: ['docs/features.md'],
      techStack: ['docs/tech-stack.md'],
    },
    briefMaxCharsPerDoc: 1200,
    modules: {
      discover: 'manual',
      manual: [{ id: 'server', name: 'Server', root: 'src/server' }],
      pinned: [],
      globs: [],
      flows: {},
    },
    nav: null,
    apiRoutes: { enabled: false, root: '', routeFile: '', pathPrefix: '' },
    conventions: [],
    configFilePresent: false,
  };
  const codeMap = {
    files: [],
    endpoints: [
      {
        kind: 'mcp-tool',
        name: 'ping',
        file: 'src/server/mcp.ts',
        line: 3,
        framework: 'mcp',
        confidence: 'high',
      },
    ],
  };

  const model = buildPlanProductModel(root, config, codeMap);
  const mod = model.modules.find((m) => m.id === 'server');
  const rendered = renderModuleScope(model, mod);

  assert.match(rendered, /## MCP tools/);
  assert.match(rendered, /`ping` -> `src\/server\/mcp.ts:3`/);
  assert.equal(
    mod.capabilities.some((capability) => capability.includes('MCP tools')),
    true
  );
});

test('routes in a shared app/api tree attribute to their feature module by URL segment, not the platform catch-all', () => {
  const root = repo();
  const config = {
    projectName: 'attribution-fixture',
    outputDir: 'docs/code-map',
    codeMapOutput: 'docs/code-map/code-map.json',
    docs: {
      product: ['docs/product.md'],
      features: ['docs/features.md'],
      techStack: ['docs/tech-stack.md'],
    },
    briefMaxCharsPerDoc: 1200,
    modules: {
      discover: 'manual',
      manual: [
        { id: 'core', name: '@nyssa-wc/core', root: 'src/core' },
        { id: 'skills', name: '@nyssa-wc/skills', root: 'src/tools/skills' },
        { id: 'update', name: '@nyssa-wc/update', root: 'src/tools/update' },
      ],
      pinned: [],
      globs: [],
      flows: {},
    },
    nav: null,
    apiRoutes: {
      enabled: false,
      root: 'src/app/api',
      routeFile: 'route.js',
      pathPrefix: 'src/app',
    },
    conventions: [],
    configFilePresent: false,
  };
  // Thin Next.js-style route handlers living in a shared src/app/api tree,
  // outside every feature module's own root.
  const codeMap = {
    files: [],
    endpoints: [
      {
        kind: 'http',
        method: 'GET',
        path: '/api/skills/catalog',
        file: 'src/app/api/skills/catalog/route.js',
        line: 2,
        framework: 'nextjs-app-router',
        confidence: 'high',
      },
      {
        kind: 'http',
        method: 'POST',
        path: '/api/updates',
        file: 'src/app/api/updates/route.js',
        line: 3,
        framework: 'nextjs-app-router',
        confidence: 'high',
      },
      {
        kind: 'http',
        method: 'GET',
        path: '/api/org',
        file: 'src/app/api/org/route.js',
        line: 2,
        framework: 'nextjs-app-router',
        confidence: 'high',
      },
    ],
  };

  const model = buildPlanProductModel(root, config, codeMap);
  const routeOwner = (routePath) => {
    for (const mod of model.modules) {
      if ((mod.httpRoutes ?? []).some((r) => r.path === routePath)) {
        return mod.id;
      }
    }
    return null;
  };

  // Exact segment match: /api/skills -> skills module.
  assert.equal(routeOwner('/api/skills/catalog'), 'skills');
  // Plural URL segment tolerated for a singular module: /api/updates -> update.
  assert.equal(routeOwner('/api/updates'), 'update');
  // No matching feature module for the segment -> platform (a shared/host route).
  assert.equal(routeOwner('/api/org'), 'platform');

  // Nothing that belongs to a feature module leaked into platform.
  const platform = model.modules.find((m) => m.id === 'platform');
  assert.ok(platform, 'platform module should exist for the shared /api/org route');
  assert.equal(
    (platform.httpRoutes ?? []).every((r) => r.path === '/api/org'),
    true
  );
});
