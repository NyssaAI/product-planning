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
  lines.push('**Default for a feature:** L0 task + **one** L1 scope file. Add L2 only if product/stack context is unclear.');
  lines.push('');
  lines.push('## Module scopes (pick one)');
  lines.push('');
  lines.push('| Module | Scope file |');
  lines.push('|--------|------------|');
  for (const mod of model.modules) {
    if (mod.id === 'platform') {
      lines.push(
        `| platform | [scopes/platform.md](./scopes/platform.md) |`
      );
    } else {
      lines.push(
        `| ${mod.name} (\`${mod.id}\`) | [scopes/${mod.id}.md](./scopes/${mod.id}.md) |`
      );
    }
  }
  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  lines.push(`- **Module graph:** [MODULE_MAP.json](./MODULE_MAP.json)`);
  lines.push(`- **Symbol index:** [\`CODE_MAP.json\`](./CODE_MAP.json)`);
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
  lines.push('- Backlog: `docs/backlog/{YYYY.MM.DD-HHMMSS-slug}/`');
  lines.push('- Bugs: `docs/bugs/{YYYY.MM.DD-HHMMSS-slug}/`');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

/**
 * @param {ReturnType<import('./build.mjs').buildAiPlanModel>} model
 * @param {ReturnType<import('./build.mjs').buildAiPlanModel>['modules'][number]} mod
 */
export function renderModuleScope(model, mod) {
  const lines = [];
  lines.push(`# ${mod.name} (\`${mod.id}\`) — planning scope`);
  lines.push('');
  lines.push(
    '**Inject with your task doc only.** Do not load other scope files or the full code map for planning.'
  );
  lines.push('');

  if (mod.description) {
    lines.push(mod.description);
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

  if (mod.publicSurface?.length > 0) {
    lines.push('## Public surface (sample)');
    lines.push('');
    for (const sym of mod.publicSurface.slice(0, 15)) {
      lines.push(`- \`${sym.name}\` (\`${sym.kind}\`) — \`${sym.file}\``);
    }
    lines.push('');
  }

  if (mod.httpRoutes.length > 0) {
    lines.push('## HTTP routes');
    lines.push('');
    for (const route of mod.httpRoutes) {
      const methods =
        route.methods.length > 0 ? route.methods.join(', ') : '?';
      lines.push(`- \`${methods}\` \`${route.path}\` → \`${route.file}\``);
    }
    lines.push('');
  }

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
  lines.push(`- Symbols: [\`CODE_MAP.json\`](../CODE_MAP.json)`);
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
