import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildAiPlanModel } from '../scripts/ai-plan/lib/build.mjs';
import { renderModuleScope } from '../scripts/ai-plan/lib/render.mjs';

/** @type {string[]} */
const tempDirs = [];

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'ai-plan-endpoint-test-'));
  tempDirs.push(dir);
  write(dir, 'docs/product.md', '# Product\n');
  write(dir, 'docs/roadmap.md', '# Roadmap\n');
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

test('ai-plan renders HTTP routes and MCP capabilities from code-map endpoints', () => {
  const root = repo();
  const config = {
    projectName: 'endpoint-fixture',
    outputDir: 'docs/agent-files/context',
    codeMapOutput: 'docs/agent-files/context/code-map.json',
    docs: {
      product: ['docs/product.md'],
      roadmap: ['docs/roadmap.md'],
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

  const model = buildAiPlanModel(root, config, codeMap);
  const mod = model.modules.find((m) => m.id === 'api');
  const rendered = renderModuleScope(model, mod);

  assert.match(rendered, /## HTTP routes/);
  assert.match(rendered, /`POST` `\/orders` -> `src\/api\/server.ts`/);
  assert.match(rendered, /## MCP tools/);
  assert.match(rendered, /`lookup_order` -> `src\/api\/server.ts`/);
});

test('ai-plan uses code-map endpoints even when legacy apiRoutes are disabled', () => {
  const root = repo();
  const config = {
    projectName: 'endpoint-fixture',
    outputDir: 'docs/agent-files/context',
    codeMapOutput: 'docs/agent-files/context/code-map.json',
    docs: {
      product: ['docs/product.md'],
      roadmap: ['docs/roadmap.md'],
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

  const model = buildAiPlanModel(root, config, codeMap);
  const mod = model.modules.find((m) => m.id === 'server');
  const rendered = renderModuleScope(model, mod);

  assert.match(rendered, /## MCP tools/);
  assert.match(rendered, /`ping` -> `src\/server\/mcp.ts`/);
  assert.equal(
    mod.capabilities.some((capability) => capability.includes('MCP tools')),
    true
  );
});
