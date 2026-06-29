import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createLogger } from './logger.mjs';

const log = createLogger({ module: 'migrate' });

const FEATURES_STUB = `# Features

Feature-level breakdown of the application. The Inventory is the scan list; the Definitions section carries each feature's definition. Features are numbered \`F-001\`, \`F-002\`, … A checked box (\`[x]\`) means delivered.

## Inventory

<!-- - [ ] F-001: Example Feature -->

## Definitions

<!--
### F-001: Example Feature

One to three sentences: what the feature is, who it serves, and where its boundary lies.
-->
`;

/**
 * @typedef {object} MigrateAction
 * @property {'moved' | 'created' | 'skipped' | 'patched'} kind
 * @property {string} detail
 */

/**
 * @param {MigrateAction[]} actions
 * @param {string} repoRoot
 * @param {string} fromRel
 * @param {string} toRel
 */
function moveIfPresent(actions, repoRoot, fromRel, toRel) {
  const from = path.join(repoRoot, fromRel);
  const to = path.join(repoRoot, toRel);
  const caseOnlyRename = from.toLowerCase() === to.toLowerCase();

  if (!existsSync(from)) {
    actions.push({ kind: 'skipped', detail: `${fromRel} (source not present)` });
    return;
  }

  if (caseOnlyRename) {
    // Case-insensitive filesystems (Windows, macOS default) report the target
    // as existing whenever the source does — compare the on-disk name instead.
    const dir = path.dirname(from);
    const actualName = readdirSync(dir).find(
      (name) => name.toLowerCase() === path.basename(from).toLowerCase()
    );
    if (actualName === path.basename(to)) {
      actions.push({ kind: 'skipped', detail: `${toRel} (already renamed)` });
      return;
    }
    renameSync(path.join(dir, actualName), to);
    actions.push({ kind: 'moved', detail: `${fromRel} → ${toRel}` });
    return;
  }

  if (existsSync(to)) {
    actions.push({ kind: 'skipped', detail: `${fromRel} → ${toRel} (target exists)` });
    return;
  }
  mkdirSync(path.dirname(to), { recursive: true });
  renameSync(from, to);
  actions.push({ kind: 'moved', detail: `${fromRel} → ${toRel}` });
}

/**
 * @param {MigrateAction[]} actions
 * @param {string} repoRoot
 * @param {string} relDir
 */
function createDirWithGitkeep(actions, repoRoot, relDir) {
  const full = path.join(repoRoot, relDir);
  if (existsSync(full)) {
    actions.push({ kind: 'skipped', detail: `${relDir} (exists)` });
    return;
  }
  mkdirSync(full, { recursive: true });
  writeFileSync(path.join(full, '.gitkeep'), '', 'utf8');
  actions.push({ kind: 'created', detail: `${relDir} (with .gitkeep)` });
}

/**
 * Patch cross-references inside the moved context files.
 *
 * @param {MigrateAction[]} actions
 * @param {string} repoRoot
 */
function patchContextReferences(actions, repoRoot) {
  const moduleMapPath = path.join(
    repoRoot,
    'docs/code-index/module-map.json'
  );
  if (existsSync(moduleMapPath)) {
    let text = readFileSync(moduleMapPath, 'utf8');
    const before = text;
    text = text
      .split('docs/ai-plan/CODE_MAP.json')
      .join('docs/code-index/code-map.json')
      .split('"planningScope"')
      .join('"planningModule"')
      .split('docs/ai-plan/scopes/')
      .join('docs/code-index/modules/');
    if (text !== before) {
      writeFileSync(moduleMapPath, text, 'utf8');
      actions.push({
        kind: 'patched',
        detail:
          'module-map.json (codeMap path, planningScope → planningModule, scopes → modules)',
      });
    } else {
      actions.push({ kind: 'skipped', detail: 'module-map.json (no old references)' });
    }
  }

  const indexPath = path.join(repoRoot, 'docs/code-index/index.md');
  if (existsSync(indexPath)) {
    let text = readFileSync(indexPath, 'utf8');
    const before = text;
    text = text
      .split('docs/ai-plan/')
      .join('docs/code-index/')
      .split('./scopes/')
      .join('./modules/')
      .split('scopes/')
      .join('modules/')
      .split('CODE_MAP.json')
      .join('code-map.json')
      .split('MODULE_MAP.json')
      .join('module-map.json');
    if (text !== before) {
      writeFileSync(indexPath, text, 'utf8');
      actions.push({
        kind: 'patched',
        detail: 'index.md (relative links, lowercase artifact names)',
      });
    } else {
      actions.push({ kind: 'skipped', detail: 'index.md (no old references)' });
    }
  }
}

/**
 * Migrate a repo from the legacy docs layout to docs/code-index/.
 * Every step is idempotent — re-running reports "skipped" for completed steps.
 *
 * @param {string} repoRoot
 * @returns {MigrateAction[]}
 */
export function runMigrate(repoRoot) {
  log.info('migrate start', { repoRoot });
  /** @type {MigrateAction[]} */
  const actions = [];

  // 1. Current layout: docs/agent-plan/context/ → docs/code-index/
  moveIfPresent(actions, repoRoot, 'docs/agent-plan/context', 'docs/code-index');
  // 2. Older legacy: docs/ai-plan/ → docs/code-index/ with artifact renames
  moveIfPresent(actions, repoRoot, 'docs/ai-plan', 'docs/code-index');
  const ctx = 'docs/code-index';
  moveIfPresent(actions, repoRoot, `${ctx}/INDEX.md`, `${ctx}/index.md`);
  moveIfPresent(actions, repoRoot, `${ctx}/CODE_MAP.json`, `${ctx}/code-map.json`);
  moveIfPresent(actions, repoRoot, `${ctx}/MODULE_MAP.json`, `${ctx}/module-map.json`);
  moveIfPresent(actions, repoRoot, `${ctx}/scopes`, `${ctx}/modules`);

  // 3. Patch cross-references in moved files
  patchContextReferences(actions, repoRoot);

  // 4. features.md stub
  const featuresPath = path.join(repoRoot, 'docs/features.md');
  if (existsSync(featuresPath)) {
    actions.push({ kind: 'skipped', detail: 'docs/features.md (exists)' });
  } else {
    mkdirSync(path.dirname(featuresPath), { recursive: true });
    writeFileSync(featuresPath, FEATURES_STUB, 'utf8');
    actions.push({ kind: 'created', detail: 'docs/features.md (stub)' });
  }

  log.info('migrate complete', {
    moved: actions.filter((a) => a.kind === 'moved').length,
    created: actions.filter((a) => a.kind === 'created').length,
    patched: actions.filter((a) => a.kind === 'patched').length,
    skipped: actions.filter((a) => a.kind === 'skipped').length,
  });

  return actions;
}

/**
 * @param {MigrateAction[]} actions
 * @returns {string}
 */
export function formatMigrateReport(actions) {
  const lines = ['code-indexer migrate:'];
  for (const action of actions) {
    lines.push(`  ${action.kind.padEnd(7)} ${action.detail}`);
  }
  const counts = ['moved', 'created', 'patched', 'skipped']
    .map((k) => `${actions.filter((a) => a.kind === k).length} ${k}`)
    .join(', ');
  lines.push(`  (${counts})`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}
