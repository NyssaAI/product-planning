import { existsSync, readFileSync } from 'node:fs';
import { writeArtifactIfChanged } from '../../lib/write-artifact.mjs';
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
 * @param {string} text
 * @param {string} marker
 * @returns {number}
 */
function countOccurrences(text, marker) {
  let count = 0;
  let idx = text.indexOf(marker);
  while (idx >= 0) {
    count += 1;
    idx = text.indexOf(marker, idx + marker.length);
  }
  return count;
}

/**
 * Describes why a file's markers cannot be rewritten safely, or null when the
 * markers are either absent (append) or a single well-formed pair (replace).
 *
 * A lone start marker, a lone end marker, an end before its start, or repeated
 * markers all mean a previous edit or merge damaged the block. Rewriting in
 * that state can swallow user prose between the damaged marker and wherever a
 * later marker lands, so the file is left alone and the problem is reported.
 *
 * @param {string} original
 * @returns {string | null}
 */
export function describeMarkerDamage(original) {
  const starts = countOccurrences(original, START_MARKER);
  const ends = countOccurrences(original, END_MARKER);
  if (starts === 0 && ends === 0) {
    return null;
  }
  if (starts > 1 || ends > 1) {
    return `found ${starts} start and ${ends} end markers; expected one of each`;
  }
  if (starts === 1 && ends === 0) {
    return 'start marker present but end marker missing';
  }
  if (starts === 0 && ends === 1) {
    return 'end marker present but start marker missing';
  }
  if (original.indexOf(END_MARKER) < original.indexOf(START_MARKER)) {
    return 'end marker appears before start marker';
  }
  return null;
}

/**
 * Rewrites the bounded plan-product:module-map section in one file. Content
 * outside the markers is never touched; if the markers are absent the whole
 * section is appended. If the markers are damaged the file is left unchanged
 * and a warning names the file and the damage.
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

  const damage = describeMarkerDamage(original);
  if (damage) {
    log.warn('module-map markers damaged; file left unchanged', {
      file: path.basename(filePath),
      damage,
      fix: `restore a single '${START_MARKER}' ... '${END_MARKER}' pair, or remove both markers so the block is re-appended`,
    });
    return false;
  }

  const startIdx = original.indexOf(START_MARKER);
  const endIdx = original.indexOf(END_MARKER);
  let updated;

  if (startIdx >= 0) {
    updated =
      original.slice(0, startIdx) +
      section +
      original.slice(endIdx + END_MARKER.length);
  } else {
    const base = original.endsWith('\n') ? original : `${original}\n`;
    updated = `${base}\n${section}\n`;
  }

  // Not `updated === original`: that guard could never fire, because the
  // embedded `generated` stamp differs on every run. writeArtifactIfChanged
  // compares with timestamps neutralized, so an unchanged module table leaves
  // CLAUDE.md and AGENTS.md untouched.
  return writeArtifactIfChanged(filePath, updated);
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
