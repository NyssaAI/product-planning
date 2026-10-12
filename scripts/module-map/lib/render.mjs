import { summarizeDescription } from './summarize.mjs';
import { classifyNodeOrganization } from './node-organization.mjs';
import path from 'node:path';

/**
 * @param {ReturnType<import('./build.mjs').buildPlanProductModel>} model
 * @param {import('./config.mjs').PlanProductConfig} config
 */
export function renderIndex(model, config) {
  const lines = [];
  const out = config.outputDir.replace(/\\/g, '/');

  lines.push(`# ${model.project.name} Code Map`);
  lines.push('');
  lines.push(
    `Generated: ${model.generated}. Regenerate with \`node <PLUGIN_ROOT>/scripts/map-code/generate.mjs\`, or \`npm run map-code\` when package scripts were installed.`
  );
  lines.push('');
  lines.push('## Progressive disclosure (for planning agents)');
  lines.push('');
  lines.push('| Level | Inject | When |');
  lines.push('|-------|--------|------|');
  for (const level of model.progressiveDisclosure.levels) {
    const when = level.when ?? 'When relevant to the task';
    lines.push(`| L${level.level} ${level.name} | ${level.inject} | ${when} |`);
  }
  lines.push('');
  lines.push('**Maps are optional orientation.** Targeted search and source reading are sufficient when they answer the task. When maps help, read the minimum in-scope module set and add a directly coupled module only when the work crosses its boundary. Use bounded queries for detailed evidence; verify relevant source before making changes.');
  lines.push('');
  lines.push('## Module files (pick the in-scope set)');
  lines.push('');
  lines.push('| Module | What it does | Owns | Module file |');
  lines.push('|--------|--------------|------|-------------|');
  for (const mod of model.modules) {
    const label =
      mod.id === 'platform' ? 'platform' : `${mod.name} (\`${mod.id}\`)`;
    const whatItDoes = summarizeDescription(mod.description, mod.id);
    const owns = (mod.capabilities ?? []).slice(0, 3).join('; ');
    lines.push(
      `| ${label} | ${whatItDoes} | ${owns} | [modules/${mod.id}.md](./modules/${mod.id}.md) |`
    );
  }
  lines.push('');
  renderCodeOrganization(lines, model);
  lines.push('## Artifacts');
  lines.push('');
  lines.push(`- **Module graph:** [module-map.json](./module-map.json)`);
  lines.push(`- **Symbols and file dependencies:** [code-map.json](${path.posix.relative(out, model.codeMap ?? config.codeMapOutput ?? `${out}/code-map.json`)})`);
  const coverage = model.coverage ?? {};
  lines.push(`- **Coverage:** ${coverage.scannedFileCount ?? 'unknown'} scanned files; ${coverage.unownedFiles?.length ?? 0} unowned; ${coverage.unsupportedFiles?.length ?? 0} unsupported; ${coverage.diagnostics?.length ?? 0} dependency diagnostics.`);
  lines.push('- Query bounded evidence: `node <PLUGIN_ROOT>/scripts/map-code/query.mjs module <id> --limit 20` (also `symbol`, `callers`, `coverage`). File dependencies are static references, not a call graph.');
  // Emit "read directly" pointers only for product docs that actually resolved
  // (docs.mjs silently skips missing ones); flag unresolved docs instead of
  // pointing at a path that does not exist.
  const docs = model.project.docs ?? {};
  const resolvedDocs = [
    ['product', docs.product],
    ['features', docs.features],
    ['tech-stack', docs.techStack],
  ].filter(([, value]) => Boolean(value));
  const missingDocs = [
    ['product', docs.product],
    ['features', docs.features],
    ['tech-stack', docs.techStack],
  ].filter(([, value]) => !value);
  if (resolvedDocs.length > 0) {
    const pointers = resolvedDocs
      .map(([, value]) => `\`${value}\``)
      .join(', ');
    lines.push(`- **Product docs:** ${pointers} (read directly — do not duplicate in BRIEF)`);
  }
  if (missingDocs.length > 0) {
    const names = missingDocs.map(([label]) => label).join(', ');
    lines.push(`- **Product docs (not present):** ${names} — add these for richer context`);
  }
  lines.push('');
  lines.push('## Conventions');
  lines.push('');
  for (const rule of model.conventions) {
    lines.push(`- ${rule}`);
  }
  lines.push('');
  lines.push('## Cross-repo workflow');
  lines.push('');
  lines.push('- Bootstrap: `node <PLUGIN_ROOT>/scripts/module-map/generate-module-map.mjs --init` (plan-product plugin)');
  lines.push('- Validate: `node <PLUGIN_ROOT>/scripts/module-map/generate-module-map.mjs --doctor`');
  lines.push('');
  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * Append a Node/TypeScript code-organization view: discovered modules grouped
 * by structural role (app routes, API routes, feature packages, shared libs,
 * state stores, native/platform), each pointing at its module doc and the
 * `code-map.json` slice. Emits nothing when there are no modules.
 *
 * @param {string[]} lines
 * @param {ReturnType<import('./build.mjs').buildPlanProductModel>} model
 */
function renderCodeOrganization(lines, model) {
  const groups = classifyNodeOrganization(model.modules ?? []);
  if (groups.length === 0) {
    return;
  }

  lines.push('## Code organization (Node/TypeScript)');
  lines.push('');
  lines.push(
    'Read the module doc for the role you are touching; filter `code-map.json` by `moduleId` to get that module\'s slice (files, symbols, endpoints).'
  );
  lines.push('');

  for (const group of groups) {
    lines.push(`### ${group.title}`);
    lines.push('');
    for (const mod of group.modules) {
      const root = String(mod.root ?? '').replace(/\\/g, '/').replace(/\/$/, '');
      const rootText = root && root !== '.' ? `\`${root}/\`` : '`./` (repo root)';
      const routeCount = mod.httpRoutes?.length ?? 0;
      const routeNote = routeCount > 0 ? ` — ${routeCount} HTTP route${routeCount === 1 ? '' : 's'}` : '';
      lines.push(
        `- **${mod.name ?? mod.id}** (\`moduleId: ${mod.id}\`) — ${rootText} — [module doc](./modules/${mod.id}.md)${routeNote}`
      );
    }
    lines.push('');
  }

  const entryRows = (model.modules ?? [])
    .filter((mod) => (mod.entryPoints?.length ?? 0) > 0)
    .map((mod) => ({ id: mod.id, entryPoints: mod.entryPoints.slice(0, 4) }));
  if (entryRows.length > 0) {
    lines.push('### Public entry points');
    lines.push('');
    for (const row of entryRows) {
      lines.push(
        `- \`${row.id}\`: ${row.entryPoints.map((e) => `\`${e}\``).join(', ')}`
      );
    }
    lines.push('');
  }
}

/**
 * @param {ReturnType<import('./build.mjs').buildPlanProductModel>} model
 * @param {ReturnType<import('./build.mjs').buildPlanProductModel>['modules'][number]} mod
 */
export function renderModuleScope(model, mod) {
  const lines = [];
  lines.push(`# ${mod.name} (\`${mod.id}\`) — module`);
  lines.push('');
  lines.push(
    '**Optional module context.** Use this when it helps orient the task; targeted source reading is also sufficient. Add a directly coupled module only when the work crosses its boundary. Use bounded queries for detailed evidence and verify relevant source.'
  );
  lines.push('');

  if (mod.description) {
    lines.push(`**What this module does:** ${mod.description}`);
    lines.push('');
  }

  if (mod.capabilities?.length > 0) {
    lines.push('## Capabilities (owns)');
    lines.push('');
    for (const capability of mod.capabilities) {
      lines.push(`- ${capability}`);
    }
    lines.push('');
  }

  if (mod.doesNotOwn?.length > 0) {
    lines.push('## Does not own');
    lines.push('');
    for (const entry of mod.doesNotOwn) {
      lines.push(`- ${entry}`);
    }
    lines.push('');
  }

  const apiRows = (mod.publicSurface ?? []).filter(
    (sym) => sym.signature || sym.summary
  );
  if (apiRows.length > 0) {
    lines.push('## Public API');
    lines.push('');
    // L1 lists the public symbol name + a one-line summary only. Full
    // signatures and line numbers stay in the L3 code-map (code-map.json) to
    // keep this module doc at a planning altitude rather than implementation.
    lines.push('| Symbol | Summary |');
    lines.push('|--------|---------|');
    for (const sym of apiRows.slice(0, 20)) {
      const summary = (sym.summary ?? '').replace(/\|/g, '\\|');
      lines.push(`| \`${sym.name}\` | ${summary} |`);
    }
    lines.push('');
  }

  lines.push('## Boundaries');
  lines.push('');
  lines.push(`| | Path |`);
  lines.push(`|--|------|`);
  lines.push(`| Root | \`${mod.root}/\` |`);
  if (mod.nav) {
    lines.push(`| UI | \`${mod.nav.label}\` |`);
  }
  if (mod.dependsOn.length > 0) {
    lines.push(`| Depends on modules | ${mod.dependsOn.join(', ')} |`);
  }
  if (mod.usedBy.length > 0) {
    lines.push(`| Used by | ${mod.usedBy.join(', ')} |`);
  }
  if (mod.outOfScope?.length > 0) {
    lines.push(`| Out of scope | ${mod.outOfScope.slice(0, 8).join(', ')} |`);
  }
  lines.push('');

  const flows = mod.flows ?? [];
  if (flows.length > 0) {
    lines.push('## Flows');
    lines.push('');
    for (const flow of flows) {
      lines.push(`- ${flow}`);
    }
    lines.push('');
  }

  if (mod.entryPoints?.length > 0) {
    lines.push('## Entry points');
    lines.push('');
    for (const entry of mod.entryPoints.slice(0, 8)) {
      lines.push(`- \`${entry}\``);
    }
    lines.push('');
  }

  if (mod.testRoots?.length > 0) {
    lines.push('## Tests');
    lines.push('');
    for (const root of mod.testRoots.slice(0, 6)) {
      lines.push(`- \`${root}/\` (mirrors module source layout)`);
    }
    lines.push('');
  }

  if (mod.configFiles?.length > 0) {
    lines.push('## Configuration');
    lines.push('');
    for (const cfg of mod.configFiles.slice(0, 8)) {
      lines.push(`- \`${cfg}\``);
    }
    lines.push('');
  }

  if (mod.httpRoutes.length > 0) {
    lines.push('## HTTP routes');
    lines.push('');
    for (const route of mod.httpRoutes) {
      const methods =
        route.methods.length > 0 ? route.methods.join(', ') : '?';
      lines.push(`- \`${methods}\` \`${route.path ?? route.pathExpression ?? '?'}\` -> \`${route.file}:${route.line ?? '?'}\`${endpointEvidence(route)}`);
    }
    lines.push('');
  }

  renderNamedEndpointSection(lines, 'MCP tools', mod.mcpTools);
  renderNamedEndpointSection(lines, 'MCP resources', mod.mcpResources);
  renderNamedEndpointSection(lines, 'MCP prompts', mod.mcpPrompts);
  renderPathEndpointSection(lines, 'MCP transports', mod.mcpTransports);

  if (mod.symbolsSample.length > 0) {
    lines.push('## Key symbols (sample)');
    lines.push('');
    const byFile = groupBy(mod.symbolsSample, (s) => s.file);
    for (const [file, syms] of Object.entries(byFile).slice(0, 10)) {
      lines.push(
        `- \`${file}\`: ${syms.map((s) => s.name).join(', ')}`
      );
    }
    lines.push('');
  }

  lines.push('## After planning');
  lines.push('');
  const mapLink = path.posix.relative(`${model.outputDir ?? 'docs/code-map'}/modules`, model.codeMap ?? 'docs/code-map/code-map.json');
  if ((mod.fileCount ?? mod.symbolCount ?? 0) > 0) {
    lines.push(
      `- **Code-map slice:** query \`module ${mod.id}\` (\`moduleId: ${mod.id}\`) in [code-map.json](${mapLink}) for files, symbols, endpoints, and file dependencies. Symbols above are a sample (${mod.symbolCount ?? 0} total); absence of a symbol is not absence of code.`
    );
  } else {
    lines.push(
      `- **No code-map coverage** for \`moduleId: ${mod.id}\`; inspect [code-map.json](${mapLink}) coverage diagnostics and source roots before inferring absence of code.`
    );
  }
  lines.push('- Open only files your plan names');
  lines.push('');

  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} keyFn
 */
function groupBy(items, keyFn) {
  /** @type {Record<string, T[]>} */
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!out[key]) {
      out[key] = [];
    }
    out[key].push(item);
  }
  return out;
}

/**
 * @param {string[]} lines
 * @param {string} title
 * @param {{ name?: string, path?: string, file: string }[] | undefined} endpoints
 */
function renderNamedEndpointSection(lines, title, endpoints) {
  if (!endpoints?.length) {
    return;
  }
  lines.push(`## ${title}`);
  lines.push('');
  for (const endpoint of endpoints) {
    const label = endpoint.path
      ? `${endpoint.name ?? '?'} (${endpoint.path})`
      : endpoint.name ?? endpoint.nameExpression ?? '?';
    lines.push(`- \`${label}\` -> \`${endpoint.file}:${endpoint.line ?? '?'}\`${endpointEvidence(endpoint)}`);
  }
  lines.push('');
}

/**
 * @param {string[]} lines
 * @param {string} title
 * @param {{ path?: string, file: string }[] | undefined} endpoints
 */
function renderPathEndpointSection(lines, title, endpoints) {
  if (!endpoints?.length) {
    return;
  }
  lines.push(`## ${title}`);
  lines.push('');
  for (const endpoint of endpoints) {
    lines.push(`- \`${endpoint.path ?? endpoint.pathExpression ?? '?'}\` -> \`${endpoint.file}:${endpoint.line ?? '?'}\`${endpointEvidence(endpoint)}`);
  }
  lines.push('');
}

function endpointEvidence(endpoint) {
  return ` (${endpoint.confidence ?? 'unrated'} confidence; ${endpoint.pathResolution ?? 'resolution not recorded'})`;
}
