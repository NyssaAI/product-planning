import { summarizeDescription } from './summarize.mjs';
import { classifyNodeOrganization } from './node-organization.mjs';

/**
 * @param {ReturnType<import('./build.mjs').buildAiPlanModel>} model
 * @param {import('./config.mjs').AiPlanConfig} config
 */
export function renderIndex(model, config) {
  const lines = [];
  const out = config.outputDir.replace(/\\/g, '/');

  lines.push(`# ${model.project.name} — AI planning index`);
  lines.push('');
  lines.push(`Generated: ${model.generated}. Regenerate: \`npm run ai-plan\`.`);
  lines.push('');
  lines.push('## Progressive disclosure (for planning agents)');
  lines.push('');
  lines.push('| Level | Inject | When |');
  lines.push('|-------|--------|------|');
  for (const level of model.progressiveDisclosure.levels) {
    const when = level.when ?? 'Always for feature planning';
    lines.push(`| L${level.level} ${level.name} | ${level.inject} | ${when} |`);
  }
  lines.push('');
  lines.push('**Default for a feature:** L0 task + **one** L1 module file. Add L2 only if product/stack context is unclear.');
  lines.push('');
  lines.push('## Module files (pick one)');
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
  lines.push(`- **Symbol index:** [\`code-map.json\`](./code-map.json)`);
  lines.push(`- **Product docs:** \`docs/product.md\`, \`docs/roadmap.md\`, \`docs/tech-stack.md\` (read directly — do not duplicate in BRIEF)`);
  lines.push('');
  if (model.project.docs.product) {
    lines.push(`- Source docs: \`${model.project.docs.product}\`, roadmap, tech-stack`);
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
  lines.push('- Bootstrap: `node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --init` (dev-tools plugin)');
  lines.push('- Validate: `node <PLUGIN_ROOT>/scripts/ai-plan/generate.mjs --doctor`');
  lines.push('- Backlog: `docs/agent-plan/backlog/{YYYY.MM.DD-HHMMSS-slug}/`');
  lines.push('- Bugs: `docs/agent-plan/bugs/{YYYY.MM.DD-HHMMSS-slug}/`');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

/**
 * Append a Node/TypeScript code-organization view: discovered modules grouped
 * by structural role (app routes, API routes, feature packages, shared libs,
 * state stores, native/platform), each pointing at its module doc and the
 * `code-map.json` slice. Emits nothing when there are no modules.
 *
 * @param {string[]} lines
 * @param {ReturnType<import('./build.mjs').buildAiPlanModel>} model
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
 * @param {ReturnType<import('./build.mjs').buildAiPlanModel>} model
 * @param {ReturnType<import('./build.mjs').buildAiPlanModel>['modules'][number]} mod
 */
export function renderModuleScope(model, mod) {
  const lines = [];
  lines.push(`# ${mod.name} (\`${mod.id}\`) — module`);
  lines.push('');
  lines.push(
    '**Inject with your task doc only.** Do not load other module files or the full code map for planning.'
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
    lines.push('| Symbol | Signature | Summary |');
    lines.push('|--------|-----------|---------|');
    for (const sym of apiRows.slice(0, 20)) {
      const signature = sym.signature
        ? `\`${sym.signature.replace(/\|/g, '\\|')}\``
        : '';
      const summary = (sym.summary ?? '').replace(/\|/g, '\\|');
      lines.push(`| \`${sym.name}\` | ${signature} | ${summary} |`);
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
      lines.push(`- \`${root}/\` (mirrors module layout per standards/project-structure.md)`);
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
      lines.push(`- \`${methods}\` \`${route.path}\` -> \`${route.file}\``);
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
  lines.push(`- Symbols: [\`code-map.json\`](../code-map.json)`);
  lines.push('- Open only files your plan names');
  lines.push('');

  return `${lines.join('\n')}\n`;
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
      : endpoint.name ?? '?';
    lines.push(`- \`${label}\` -> \`${endpoint.file}\``);
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
    lines.push(`- \`${endpoint.path ?? '?'}\` -> \`${endpoint.file}\``);
  }
  lines.push('');
}
