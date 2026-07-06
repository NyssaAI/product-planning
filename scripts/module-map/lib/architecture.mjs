import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { summarizeDescription } from './summarize.mjs';

const OVERVIEW_REGION = 'system-overview';

/**
 * @typedef {object} ArchitectureModule
 * @property {string} id
 * @property {string} name
 * @property {string} root
 * @property {string} [description]
 * @property {string[]} capabilities
 * @property {string[]} dependsOn
 * @property {string[]} usedBy
 * @property {string} [planningModule]
 */

/**
 * @typedef {object} ArchitectureModel
 * @property {string} schemaVersion
 * @property {string} generated
 * @property {{ name?: string }} project
 * @property {ArchitectureModule[]} modules
 * @property {{ from: string, to: string }[]} edges
 * @property {string} [codeMap]
 * @property {Record<string, unknown>} [stats]
 */

/**
 * @param {string} repoRoot
 * @param {import('./config.mjs').PlanProductConfig} config
 * @returns {ArchitectureModel}
 */
export function loadArchitectureModel(repoRoot, config) {
  const mapPath = path.join(repoRoot, config.outputDir, 'module-map.json');
  if (!existsSync(mapPath)) {
    const err = new Error(
      `MISSING_MODULE_MAP: ${toRelative(repoRoot, mapPath)} not found`
    );
    err.code = 'MISSING_MODULE_MAP';
    throw err;
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(mapPath, 'utf8'));
  } catch (cause) {
    const err = new Error(
      `INVALID_MODULE_MAP: ${toRelative(repoRoot, mapPath)} is not valid JSON`
    );
    err.code = 'INVALID_MODULE_MAP';
    err.cause = cause;
    throw err;
  }

  return normalizeArchitectureModel(raw);
}

/**
 * @param {unknown} raw
 * @returns {ArchitectureModel}
 */
export function normalizeArchitectureModel(raw) {
  if (!raw || typeof raw !== 'object') {
    const err = new Error('INVALID_MODULE_MAP: module-map.json must be an object');
    err.code = 'INVALID_MODULE_MAP';
    throw err;
  }

  const source = /** @type {Record<string, unknown>} */ (raw);
  if (!Array.isArray(source.modules)) {
    const err = new Error('INVALID_MODULE_MAP: modules must be an array');
    err.code = 'INVALID_MODULE_MAP';
    throw err;
  }
  const modules = source.modules
    .map(normalizeModule)
    .filter((mod) => mod.id)
    .sort((a, b) => a.id.localeCompare(b.id));
  const moduleIds = new Set(modules.map((mod) => mod.id));
  const rawEdges = Array.isArray(source.edges) ? source.edges : [];
  const edges = rawEdges
    .map(normalizeEdge)
    .filter(
      (edge) => edge.from && edge.to && moduleIds.has(edge.from) && moduleIds.has(edge.to)
    )
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  const rawProject =
    source.project && typeof source.project === 'object'
      ? /** @type {Record<string, unknown>} */ (source.project)
      : {};

  return {
    schemaVersion: stringOr(source.schemaVersion, '1.0'),
    generated: stringOr(source.generated, new Date(0).toISOString()),
    project: { name: stringOr(rawProject.name, 'Project') },
    modules,
    edges,
    codeMap: typeof source.codeMap === 'string' ? source.codeMap : undefined,
    stats:
      source.stats && typeof source.stats === 'object'
        ? /** @type {Record<string, unknown>} */ (source.stats)
        : undefined,
  };
}

/**
 * @param {ArchitectureModel} model
 * @param {{ existingMarkdown?: string, moduleMapPath?: string }} [options]
 * @returns {string}
 */
export function renderSystemArchitecture(model, options = {}) {
  const lines = [];
  const projectName = model.project?.name ?? 'Project';
  const generated = model.generated ?? new Date(0).toISOString();
  const moduleMapPath = normalizeRel(options.moduleMapPath ?? 'docs/code-map/module-map.json');
  const modules = sortModulesByDependencyCount(model.modules);
  const overviewFallback = [
    'Summarize the system architecture here after reviewing the generated component tree, module responsibilities, dependency flows, and relevant product docs.',
  ].join('\n');

  lines.push(`# ${projectName} System Architecture`);
  lines.push('');
  lines.push(
    `Generated from \`${moduleMapPath}\` at ${generated}. Regenerate with \`map-architecture\`.`
  );
  lines.push('');
  lines.push('## Use This When');
  lines.push('');
  lines.push('- Use for repo onboarding, cross-module architecture review, and human handoff.');
  lines.push(
    '- For routine implementation planning, start with the generated index and the minimum relevant module files.'
  );
  lines.push('');
  lines.push('## System Overview');
  lines.push('');
  lines.push(preserveMarkedRegion(options.existingMarkdown ?? '', OVERVIEW_REGION, overviewFallback));
  lines.push('');
  lines.push('## Component Tree');
  lines.push('');
  lines.push(renderArchitectureTree({ ...model, modules }));
  lines.push('');
  if (model.edges.length === 0) {
    lines.push('No cross-module dependency edges are recorded in `module-map.json`.');
    lines.push('');
  }
  lines.push('## Module Responsibilities');
  lines.push('');
  lines.push('| Module | Owns | Depends on | Used by | Module file |');
  lines.push('|--------|------|------------|---------|-------------|');
  for (const mod of modules) {
    const owns = summarizeDescription(mod.description, mod.id);
    const dependsOn = mod.dependsOn.length > 0 ? mod.dependsOn.join(', ') : '-';
    const usedBy = mod.usedBy.length > 0 ? mod.usedBy.join(', ') : '-';
    const moduleFile = mod.planningModule ? `\`${normalizeRel(mod.planningModule)}\`` : '-';
    lines.push(
      `| ${escapeTableCell(mod.name || mod.id)} | ${escapeTableCell(owns)} | ${escapeTableCell(dependsOn)} | ${escapeTableCell(usedBy)} | ${moduleFile} |`
    );
  }
  lines.push('');
  lines.push('## Dependency Flows');
  lines.push('');
  if (model.edges.length === 0) {
    lines.push('- No cross-module dependency flows are recorded.');
  } else {
    for (const edge of model.edges) {
      lines.push(`- \`${edge.from}\` -> \`${edge.to}\``);
    }
  }
  lines.push('');
  lines.push(`<!-- plan-product:system-architecture generated ${generated} -->`);
  return `${lines.join('\n')}\n`;
}

/**
 * @param {ArchitectureModel} model
 * @returns {string}
 */
export function renderArchitectureTree(model) {
  const modules = sortModulesByDependencyCount(model.modules);
  const lines = ['```text', oneLine(model.project?.name ?? 'Project')];
  if (modules.length === 0) {
    lines.push('`-- No modules recorded');
    lines.push('```');
    return lines.join('\n');
  }

  for (const [index, mod] of modules.entries()) {
    const isLastModule = index === modules.length - 1;
    const modulePrefix = isLastModule ? '`-- ' : '|-- ';
    const childPrefix = isLastModule ? '    ' : '|   ';
    const children = moduleTreeChildren(mod);

    lines.push(`${modulePrefix}${moduleTreeLabel(mod)}`);
    for (const [childIndex, child] of children.entries()) {
      const childMarker = childIndex === children.length - 1 ? '`-- ' : '|-- ';
      lines.push(`${childPrefix}${childMarker}${child}`);
    }
  }

  lines.push('```');
  return lines.join('\n');
}

/**
 * @param {ArchitectureModule[]} modules
 * @returns {ArchitectureModule[]}
 */
export function sortModulesByDependencyCount(modules) {
  return [...modules].sort(
    (a, b) =>
      a.dependsOn.length - b.dependsOn.length ||
      a.id.localeCompare(b.id) ||
      (a.name || '').localeCompare(b.name || '')
  );
}

/**
 * @param {ArchitectureModule} mod
 * @returns {string}
 */
function moduleTreeLabel(mod) {
  const name = oneLine(mod.name || mod.id);
  const id = oneLine(mod.id);
  return name === id ? name : `${name} (${id})`;
}

/**
 * @param {ArchitectureModule} mod
 * @returns {string[]}
 */
function moduleTreeChildren(mod) {
  const children = [];
  if (mod.root) {
    children.push(`root: ${oneLine(mod.root)}`);
  }
  children.push(`depends on: ${formatTreeList(mod.dependsOn)}`);
  children.push(`used by: ${formatTreeList(mod.usedBy)}`);
  return children;
}

/**
 * @param {string[]} values
 * @returns {string}
 */
function formatTreeList(values) {
  return values.length > 0 ? values.map(oneLine).join(', ') : '-';
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function oneLine(value) {
  return String(value).replace(/\r?\n/g, ' ').trim();
}

/**
 * @param {string} existingMarkdown
 * @param {string} regionName
 * @param {string} fallbackMarkdown
 * @param {{ replaceBodies?: string[] }} [options]
 * @returns {string}
 */
export function preserveMarkedRegion(
  existingMarkdown,
  regionName,
  fallbackMarkdown,
  options = {}
) {
  const start = `<!-- plan-product:${regionName}:start -->`;
  const end = `<!-- plan-product:${regionName}:end -->`;
  const startIdx = existingMarkdown.indexOf(start);
  const endIdx = existingMarkdown.indexOf(end);
  let body = fallbackMarkdown.trim();

  if (startIdx >= 0 && endIdx > startIdx) {
    body = existingMarkdown
      .slice(startIdx + start.length, endIdx)
      .replace(/^\r?\n/, '')
      .replace(/\r?\n$/, '');
  } else if (startIdx >= 0 && endIdx < 0) {
    // End marker absent — preserve content from start to end-of-file rather than
    // silently discarding agent-authored content.
    body = existingMarkdown
      .slice(startIdx + start.length)
      .replace(/^\r?\n/, '')
      .replace(/\r?\n$/, '');
  }

  if (options.replaceBodies?.map((entry) => entry.trim()).includes(body.trim())) {
    body = fallbackMarkdown.trim();
  }

  return [start, body, end].join('\n');
}

/**
 * @param {unknown} input
 * @returns {ArchitectureModule}
 */
function normalizeModule(input) {
  const source =
    input && typeof input === 'object'
      ? /** @type {Record<string, unknown>} */ (input)
      : {};
  const id = stringOr(source.id, '');
  return {
    id,
    name: stringOr(source.name, id),
    root: normalizeRel(stringOr(source.root, '')),
    description: typeof source.description === 'string' ? source.description : undefined,
    capabilities: stringArray(source.capabilities),
    dependsOn: stringArray(source.dependsOn).sort(),
    usedBy: stringArray(source.usedBy).sort(),
    planningModule:
      typeof source.planningModule === 'string'
        ? normalizeRel(source.planningModule)
        : undefined,
  };
}

/**
 * @param {unknown} input
 * @returns {{ from: string, to: string }}
 */
function normalizeEdge(input) {
  const source =
    input && typeof input === 'object'
      ? /** @type {Record<string, unknown>} */ (input)
      : {};
  return {
    from: stringOr(source.from, ''),
    to: stringOr(source.to, ''),
  };
}

/**
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
function stringOr(value, fallback) {
  return typeof value === 'string' ? value : fallback;
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function stringArray(value) {
  return Array.isArray(value)
    ? value.filter((entry) => typeof entry === 'string').map(normalizeRel)
    : [];
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeRel(value) {
  return value.replace(/\\/g, '/');
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeTableCell(value) {
  return String(value).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}

/**
 * @param {string} repoRoot
 * @param {string} fullPath
 * @returns {string}
 */
function toRelative(repoRoot, fullPath) {
  return path.relative(repoRoot, fullPath).replace(/\\/g, '/');
}
