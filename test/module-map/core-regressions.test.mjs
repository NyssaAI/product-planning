import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { detectApiRoutes } from '../../scripts/module-map/lib/auto-detect.mjs';
import { bootstrapRepo } from '../../scripts/module-map/lib/bootstrap.mjs';
import { buildPlanProductModel } from '../../scripts/module-map/lib/build.mjs';
import { loadPlanProductConfig } from '../../scripts/module-map/lib/config.mjs';
import {
  applyPins,
  discoverModules,
} from '../../scripts/module-map/lib/discover-modules.mjs';
import { runDoctor } from '../../scripts/module-map/lib/doctor.mjs';
import { embedModuleMap } from '../../scripts/module-map/lib/embed.mjs';
import { runMigrate } from '../../scripts/module-map/lib/migrate.mjs';
import { discoverHttpRoutes } from '../../scripts/module-map/lib/routes.mjs';
import { findPluginRoot } from '../../scripts/lib/plugin-root.mjs';

const projectRoot = path.resolve('.');
const moduleMapScript = path.join(
  projectRoot,
  'scripts/module-map/generate-module-map.mjs'
);

function tempRepo(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'plan-product-core-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function write(root, rel, content = '') {
  const full = path.join(root, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
}

function config(overrides = {}) {
  return {
    projectName: 'Fixture',
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
      manual: [],
      pinned: [],
      globs: [],
      flows: {},
    },
    nav: null,
    apiRoutes: {
      enabled: false,
      root: '',
      routeFile: 'route.js',
      pathPrefix: '',
    },
    conventions: [],
    configFilePresent: false,
    ...overrides,
  };
}

function moduleDef(id, root, source = 'manual') {
  return {
    id,
    name: id,
    root,
    description: '',
    flows: [],
    packageDependencies: [],
    exportEntries: [],
    source,
  };
}

test('pins override every discovery route by root and disambiguate ids', (t) => {
  const root = tempRepo(t);
  write(
    root,
    'package.json',
    JSON.stringify({ workspaces: { packages: ['packages/*'] } })
  );
  write(root, 'packages/alpha/package.json', JSON.stringify({ name: 'core' }));
  write(root, 'packages/beta/package.json', JSON.stringify({ name: 'beta' }));

  const modulesConfig = {
    manual: [
      { id: 'core', root: 'packages/alpha' },
      { id: 'beta', root: 'packages/beta' },
    ],
    pinned: [
      { id: 'core', root: 'packages/alpha', name: 'Pinned core' },
      { root: 'packages/beta', exclude: true },
    ],
    globs: ['packages/*'],
    flows: {},
  };

  for (const discover of ['manual', 'workspaces', 'glob', 'auto']) {
    const modules = discoverModules(
      root,
      config({ modules: { ...modulesConfig, discover } })
    );
    assert.deepEqual(
      modules.map((entry) => [entry.id, entry.root, entry.source]),
      [['core', 'packages/alpha', 'pinned']],
      discover
    );
  }

  const merged = applyPins(
    [
      moduleDef('core', 'src/core', 'src-child'),
      moduleDef('other', 'src/other', 'fallback'),
    ],
    config({
      modules: {
        discover: 'auto',
        manual: [],
        pinned: [{ id: 'core', root: 'src/pinned' }],
        globs: [],
        flows: {},
      },
    })
  );
  assert.equal(merged.find((entry) => entry.root === 'src/core')?.id, 'src-core');
});

test('migrate flattens legacy context contents and scopes, then removes it', (t) => {
  const root = tempRepo(t);
  write(root, 'docs/code-map/context/INDEX.md', '[scope](./scopes/core.md)\n');
  write(root, 'docs/code-map/context/CODE_MAP.json', '{}\n');
  write(
    root,
    'docs/code-map/context/MODULE_MAP.json',
    '{"planningScope":"docs/code-map/scopes/core.md"}\n'
  );
  write(root, 'docs/code-map/context/scopes/core.md', '# Core\n');

  const actions = runMigrate(root);

  assert.equal(existsSync(path.join(root, 'docs/code-map/context')), false);
  assert.equal(existsSync(path.join(root, 'docs/code-map/index.md')), true);
  assert.equal(existsSync(path.join(root, 'docs/code-map/code-map.json')), true);
  assert.equal(existsSync(path.join(root, 'docs/code-map/module-map.json')), true);
  assert.equal(existsSync(path.join(root, 'docs/code-map/modules/core.md')), true);
  assert.match(
    readFileSync(path.join(root, 'docs/code-map/module-map.json'), 'utf8'),
    /planningModule/
  );
  assert.ok(actions.some((action) => action.kind === 'removed'));
});

test('migrate rejects output paths that escape the repository before mutation', (t) => {
  const root = tempRepo(t);
  const outside = tempRepo(t);

  for (const outputDir of ['', '../escaped', path.join(outside, 'generated')]) {
    assert.throws(
      () => runMigrate(root, { outputDir }),
      /migration output directory must be (?:a non-empty path )?within the project root/
    );
    assert.equal(existsSync(path.join(root, 'docs/features.md')), false);
  }

  try {
    symlinkSync(outside, path.join(root, 'linked-output'), 'junction');
  } catch (error) {
    t.diagnostic(`directory links unavailable: ${error.message}`);
    return;
  }
  assert.throws(
    () => runMigrate(root, { outputDir: 'linked-output/context' }),
    /migration output directory must be within the project root/
  );
  assert.equal(existsSync(path.join(root, 'docs/features.md')), false);
});

test('migrate recursively merges directories without overwriting collisions', (t) => {
  const root = tempRepo(t);
  write(root, 'docs/code-map/context/scopes/core/shared.md', 'legacy collision\n');
  write(root, 'docs/code-map/context/scopes/core/legacy.md', 'legacy only\n');
  write(root, 'docs/code-map/modules/core/shared.md', 'current collision\n');
  write(root, 'docs/code-map/modules/core/current.md', 'current only\n');

  const actions = runMigrate(root);

  assert.equal(
    readFileSync(path.join(root, 'docs/code-map/modules/core/shared.md'), 'utf8'),
    'current collision\n'
  );
  assert.equal(
    readFileSync(path.join(root, 'docs/code-map/context/scopes/core/shared.md'), 'utf8'),
    'legacy collision\n'
  );
  assert.equal(
    readFileSync(path.join(root, 'docs/code-map/modules/core/legacy.md'), 'utf8'),
    'legacy only\n'
  );
  assert.equal(
    readFileSync(path.join(root, 'docs/code-map/modules/core/current.md'), 'utf8'),
    'current only\n'
  );
  assert.ok(
    actions.some(
      (action) =>
        action.kind === 'skipped' &&
        action.detail.includes('core/shared.md') &&
        action.detail.includes('target exists')
    )
  );
  assert.equal(existsSync(path.join(root, 'docs/code-map/context')), true);
});

test('platform is present while edges are derived and duplicate roots are skipped', (t) => {
  const root = tempRepo(t);
  for (const doc of ['product', 'features', 'tech-stack']) {
    write(root, `docs/${doc}.md`, `# ${doc}\n`);
  }
  write(root, 'src/app/api/health/route.js', 'export function GET() {}\n');
  write(root, 'src/lib/index.mjs', "import { feature } from '@acme/feature';\n");
  write(root, 'packages/feature/index.mjs', 'export const feature = true;\n');

  const baseModules = {
    discover: 'manual',
    manual: [
      {
        id: 'feature',
        name: '@acme/feature',
        root: 'packages/feature',
      },
    ],
    pinned: [],
    globs: [],
    flows: {},
  };
  const baseConfig = config({
    modules: baseModules,
    apiRoutes: {
      enabled: true,
      root: 'src/app/api',
      routeFile: 'route.js',
      pathPrefix: 'src/app',
    },
  });

  const model = buildPlanProductModel(root, baseConfig, { files: [], endpoints: [] });
  assert.ok(model.modules.some((entry) => entry.id === 'platform'));
  assert.deepEqual(model.moduleGraph.edges, [{ from: 'platform', to: 'feature' }]);

  const duplicateRoot = buildPlanProductModel(
    root,
    config({
      ...baseConfig,
      modules: {
        ...baseModules,
        manual: [
          ...baseModules.manual,
          { id: 'shared', name: 'shared', root: 'src/lib' },
        ],
      },
    }),
    { files: [], endpoints: [] }
  );
  assert.equal(duplicateRoot.modules.some((entry) => entry.id === 'platform'), false);
  assert.equal(new Set(duplicateRoot.modules.map((entry) => entry.root)).size, 2);
});

test('Next fallback detects App Router extensions and Pages Router files', (t) => {
  const appRoot = tempRepo(t);
  write(appRoot, 'src/app/api/alpha/route.tsx', 'export function GET() {}\n');
  write(appRoot, 'src/app/api/beta/route.js', 'export function POST() {}\n');

  const appDetected = detectApiRoutes(appRoot);
  assert.equal(appDetected.enabled, true);
  assert.match(appDetected.routeFile, /^route\.(?:js|ts|jsx|tsx)$/);
  const appRoutes = discoverHttpRoutes(
    appRoot,
    config({ apiRoutes: appDetected }),
    [],
    { files: [], endpoints: [] }
  );
  assert.deepEqual(
    appRoutes.map((route) => route.path),
    ['/api/alpha', '/api/beta']
  );

  const pagesRoot = tempRepo(t);
  write(pagesRoot, 'src/pages/api/health.js', 'export default function health() {}\n');
  write(pagesRoot, 'src/pages/api/users/index.ts', 'export default function users() {}\n');
  write(pagesRoot, 'src/pages/api/profile.tsx', 'export default function profile() {}\n');

  const pagesDetected = detectApiRoutes(pagesRoot);
  assert.equal(pagesDetected.root, 'src/pages/api');
  const pagesRoutes = discoverHttpRoutes(
    pagesRoot,
    config({ apiRoutes: pagesDetected }),
    [],
    { files: [], endpoints: [] }
  );
  assert.deepEqual(
    pagesRoutes.map((route) => route.path),
    ['/api/health', '/api/profile', '/api/users']
  );
});

test('empty App Router candidates do not mask a populated Pages Router API', (t) => {
  const root = tempRepo(t);
  mkdirSync(path.join(root, 'src/app/api'), { recursive: true });
  mkdirSync(path.join(root, 'app/api'), { recursive: true });
  write(root, 'src/pages/api/health.ts', 'export default function health() {}\n');

  const detected = detectApiRoutes(root);
  assert.deepEqual(detected, {
    enabled: true,
    root: 'src/pages/api',
    routeFile: 'health.ts',
    pathPrefix: 'src/pages',
  });
});

test('module-map and code-map use the same output precedence and warn on conflicts', (t) => {
  const root = tempRepo(t);
  write(
    root,
    'plan-product.config.json',
    JSON.stringify({
      output: 'legacy/map.json',
      codeMapOutput: 'new/map.json',
      outputDir: 'ignored/context',
    })
  );
  const writes = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };
  let loaded;
  try {
    loaded = loadPlanProductConfig(root);
  } finally {
    process.stderr.write = originalWrite;
  }

  assert.equal(loaded.codeMapOutput, 'legacy/map.json');
  assert.match(writes.join(''), /sets both output .*codeMapOutput .*using output/);

  const codeMapOnly = tempRepo(t);
  write(
    codeMapOnly,
    'plan-product.config.json',
    JSON.stringify({ codeMapOutput: 'configured/map.json' })
  );
  assert.equal(
    loadPlanProductConfig(codeMapOnly).codeMapOutput,
    'configured/map.json'
  );

  const pathConfigured = tempRepo(t);
  write(pathConfigured, 'plan-product.config.json', '{}');
  write(
    pathConfigured,
    '.plan-product/config.json',
    JSON.stringify({ paths: { codeMap: 'planning/context' } })
  );
  assert.equal(
    loadPlanProductConfig(pathConfigured).codeMapOutput,
    'planning/context/code-map.json'
  );

  const defaults = tempRepo(t);
  write(defaults, 'plan-product.config.json', '{}');
  assert.equal(
    loadPlanProductConfig(defaults).codeMapOutput,
    'docs/code-map/code-map.json'
  );
});

test('module-map config rejects unsafe output paths and normalizes contained paths', (t) => {
  const root = tempRepo(t);
  const outside = tempRepo(t);

  for (const outputDir of ['', '../escaped', path.join(outside, 'generated')]) {
    write(root, 'plan-product.config.json', JSON.stringify({ outputDir }));
    assert.throws(
      () => loadPlanProductConfig(root),
      /module-map output directory must be (?:a non-empty path )?within the project root/
    );
  }

  try {
    symlinkSync(outside, path.join(root, 'linked-output'), 'junction');
  } catch (error) {
    t.diagnostic(`directory links unavailable: ${error.message}`);
    return;
  }
  write(
    root,
    'plan-product.config.json',
    JSON.stringify({ outputDir: 'linked-output/context' })
  );
  assert.throws(
    () => loadPlanProductConfig(root),
    /module-map output directory must be within the project root/
  );

  for (const output of ['', '../escaped.json', path.join(outside, 'map.json')]) {
    write(
      root,
      'plan-product.config.json',
      JSON.stringify({ outputDir: 'docs/code-map', output })
    );
    assert.throws(
      () => loadPlanProductConfig(root),
      /module-map code-map input must be (?:a non-empty path )?within the project root/
    );
  }
  write(
    root,
    'plan-product.config.json',
    JSON.stringify({
      outputDir: 'docs/code-map',
      output: 'linked-output/code-map.json',
    })
  );
  assert.throws(
    () => loadPlanProductConfig(root),
    /module-map code-map input must be within the project root/
  );

  write(
    root,
    'plan-product.config.json',
    JSON.stringify({
      outputDir: path.join(root, 'generated', 'context'),
      output: path.join(root, 'generated', 'code-map.json'),
    })
  );
  const normalized = loadPlanProductConfig(root);
  assert.equal(normalized.outputDir, 'generated/context');
  assert.equal(normalized.codeMapOutput, 'generated/code-map.json');
});

test('malformed local path config warns and doctor reports a failure', (t) => {
  const root = tempRepo(t);
  write(root, '.plan-product/config.json', '{ broken');
  const writes = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };
  let loaded;
  try {
    loaded = loadPlanProductConfig(root);
  } finally {
    process.stderr.write = originalWrite;
  }

  const warning = JSON.parse(writes.join('').trim());
  assert.match(warning.path.replace(/\\/g, '/'), /\.plan-product\/config\.json$/);
  assert.match(warning.error, /JSON|position|property|expected/i);
  assert.ok(loaded.pathConfigError);

  const report = runDoctor(root);
  assert.equal(report.ok, false);
  assert.ok(
    report.checks.some(
      (check) => check.id === 'plan-product-path-config' && check.status === 'fail'
    )
  );

  const command = spawnSync(process.execPath, [moduleMapScript, '--doctor'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(command.status, 1);
  assert.match(command.stdout, /plan-product doctor: FAIL/);
  assert.match(command.stdout, /plan-product-path-config/);
});

test('embed preserves CRLF and uses the configured output path', (t) => {
  const root = tempRepo(t);
  write(root, 'AGENTS.md', '# Agents\r\n\r\nExisting\r\n');

  embedModuleMap(
    root,
    '| Module |\n|---|\n| core |',
    '2026-09-02T00:00:00.000Z',
    { outputDir: 'artifacts/context' }
  );

  const content = readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.doesNotMatch(content, /(?<!\r)\n/);
  assert.match(content, /artifacts\/context\/index\.md/);
});

test('foreign plugin env roots warn and fall back to the script location', (t) => {
  const foreign = tempRepo(t);
  const fallback = tempRepo(t);
  write(foreign, 'package.json', JSON.stringify({ name: 'other-plugin' }));
  write(fallback, '.claude-plugin/plugin.json', JSON.stringify({ name: 'plan-product' }));
  const nested = path.join(fallback, 'scripts', 'module-map');
  mkdirSync(nested, { recursive: true });

  const keys = [
    'PLAN_PRODUCT_PLUGIN_ROOT',
    'PLUGIN_ROOT',
    'CLAUDE_PLUGIN_ROOT',
    'CURSOR_PLUGIN_ROOT',
  ];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    delete process.env[key];
  }
  process.env.CLAUDE_PLUGIN_ROOT = foreign;
  const warnings = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = (chunk) => {
    warnings.push(String(chunk));
    return true;
  };
  let resolved;
  try {
    resolved = findPluginRoot(nested);
  } finally {
    process.stderr.write = originalWrite;
    for (const key of keys) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }

  assert.equal(resolved, fallback);
  assert.match(warnings.join(''), /ignoring CLAUDE_PLUGIN_ROOT/);
});

test('bootstrap honors custom output directories and missing templates fail clearly', (t) => {
  const root = tempRepo(t);
  write(
    root,
    'plan-product.config.json',
    JSON.stringify({ outputDir: 'artifacts/context' })
  );
  bootstrapRepo(root);
  assert.equal(existsSync(path.join(root, 'artifacts/context/modules')), true);
  assert.equal(existsSync(path.join(root, 'docs/code-map/modules')), false);

  const manifestRoot = tempRepo(t);
  assert.throws(
    () => bootstrapRepo(manifestRoot, { withProjectManifest: true }),
    /jamaynor\.project\.json.*(?:missing|not found)/i
  );
  assert.equal(existsSync(path.join(manifestRoot, 'jamaynor.project.json')), false);
});

test('workspace package parse errors name the file and Yarn object workspaces work', (t) => {
  const malformed = tempRepo(t);
  write(malformed, 'package.json', '{ bad');
  assert.throws(
    () =>
      discoverModules(
        malformed,
        config({
          modules: {
            discover: 'workspaces',
            manual: [],
            pinned: [],
            globs: [],
            flows: {},
          },
        })
      ),
    /package\.json.*not valid JSON/
  );

  const malformedWorkspace = tempRepo(t);
  write(
    malformedWorkspace,
    'package.json',
    JSON.stringify({ workspaces: ['packages/*'] })
  );
  write(malformedWorkspace, 'packages/broken/package.json', '{ bad');
  assert.throws(
    () =>
      discoverModules(
        malformedWorkspace,
        config({
          modules: {
            discover: 'workspaces',
            manual: [],
            pinned: [],
            globs: [],
            flows: {},
          },
        })
      ),
    /packages\/broken\/package\.json.*not valid JSON/
  );

  const yarn = tempRepo(t);
  write(yarn, 'package.json', JSON.stringify({ workspaces: { packages: ['work/*'] } }));
  write(yarn, 'work/api/package.json', JSON.stringify({ name: '@fixture/api' }));
  const modules = discoverModules(
    yarn,
    config({
      modules: {
        discover: 'workspaces',
        manual: [],
        pinned: [],
        globs: [],
        flows: {},
      },
    })
  );
  assert.deepEqual(modules.map((entry) => entry.id), ['api']);
});

test('apiRoutes.pathPrefix overrides auto-detection', (t) => {
  const root = tempRepo(t);
  write(root, 'src/app/api/health/route.ts', 'export function GET() {}\n');
  write(
    root,
    'plan-product.config.json',
    JSON.stringify({ apiRoutes: { pathPrefix: 'custom/prefix' } })
  );

  assert.equal(loadPlanProductConfig(root).apiRoutes.pathPrefix, 'custom/prefix');
});

test('CLI warns when higher-priority modes ignore conflicting flags', (t) => {
  const root = tempRepo(t);
  const doctor = spawnSync(
    process.execPath,
    [moduleMapScript, '--doctor', '--init', '--json'],
    { cwd: root, encoding: 'utf8' }
  );
  assert.match(doctor.stderr, /--init.*ignored.*--doctor/i);
  assert.match(doctor.stderr, /--json.*ignored.*--doctor/i);

  const pin = spawnSync(
    process.execPath,
    [moduleMapScript, '--pin', 'missing', '--unpin', 'missing', '--json'],
    { cwd: root, encoding: 'utf8' }
  );
  assert.match(pin.stderr, /--unpin.*ignored.*--pin/i);
  assert.match(pin.stderr, /--json.*ignored.*--pin/i);
});
