import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createLogger } from './logger.mjs';
import { summarizeDescription } from './summarize.mjs';

const log = createLogger({ module: 'embed' });

const START_MARKER = '<!-- plan-product:module-map:start -->';
const END_MARKER = '<!-- plan-product:module-map:end -->';

/**
 * @param {{ id: string, name: string, description?: string, capabilities?: string[], planningModule: string }[]} modules
 * @returns {string} markdown table for the embedded module map section
 */
export function renderModuleMapTable(modules) {
  const lines = [
    '| Module | What it does | Owns | Module file |',
    '|--------|--------------|------|-------------|',
  ];
  for (const mod of modules) {
    const whatItDoes = summarizeDescription(mod.description, mod.id);
    const owns = (mod.capabilities ?? []).slice(0, 3).join('; ');
    lines.push(
      `| ${mod.id} | ${whatItDoes} | ${owns} | \`${mod.planningModule}\` |`
    );
  }
  return lines.join('\n');
}

/**
 * Rewrites the bounded plan-product:module-map section in one file. Content
 * outside the markers is never touched; if the markers are absent the
 * whole section is appended.
 *
 * @param {string} filePath
 * @param {string} tableMarkdown
 * @param {string} [generated] ISO timestamp shared with index.md, stamped into
 *   the managed block so the staleness gate can observe drift from index.md
 * @returns {boolean} true when the file was written
 */
function embedIntoFile(filePath, tableMarkdown, generated) {
  if (!existsSync(filePath)) {
    return false;
  }

  const section = [
    START_MARKER,
    '## Module map (auto-updated — do not edit)',
    '',
    // Always-loaded coarse table: route through the index to pick the module set.
    'Start at `docs/code-map/index.md` to pick the module set.',
    '',
    tableMarkdown,
    `<!-- plan-product:module-map generated ${generated ?? new Date().toISOString()} -->`,
    END_MARKER,
  ].join('\n');

  const original = readFileSync(filePath, 'utf8');
  let updated;

  const startIdx = original.indexOf(START_MARKER);
  const endIdx = original.indexOf(END_MARKER);

  if (startIdx >= 0 && endIdx > startIdx) {
    updated =
      original.slice(0, startIdx) +
      section +
      original.slice(endIdx + END_MARKER.length);
  } else {
    const base = original.endsWith('\n') ? original : `${original}\n`;
    updated = `${base}\n${section}\n`;
  }

  if (updated === original) {
    return false;
  }
  writeFileSync(filePath, updated, 'utf8');
  return true;
}

/**
 * Embeds the current module capability table into CLAUDE.md and AGENTS.md
 * (whichever exist at the repo root). This is the primary context-delivery
 * mechanism — the module map is present at session start in every harness
 * without any hook needing to fire.
 *
 * @param {string} repoRoot
 * @param {string} tableMarkdown from renderModuleMapTable
 * @param {string} [generated] ISO timestamp shared with index.md (model.generated)
 * @returns {string[]} relative paths of files updated
 */
export function embedModuleMap(repoRoot, tableMarkdown, generated) {
  /** @type {string[]} */
  const updated = [];
  for (const name of ['CLAUDE.md', 'AGENTS.md']) {
    if (embedIntoFile(path.join(repoRoot, name), tableMarkdown, generated)) {
      updated.push(name);
    }
  }
  log.info('embedModuleMap complete', { updated });
  return updated;
}
