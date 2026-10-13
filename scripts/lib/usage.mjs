import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { resolveRepoContainedPath } from './repo-paths.mjs';

const DEFAULT_EVENTS_PATH = '.plan-product/usage/events.jsonl';
const DEFAULT_REPORT_PATH = 'docs/code-map/effectiveness.md';

/**
 * @typedef {object} UsageSettings
 * @property {boolean} enabled
 * @property {string} eventsPath
 * @property {string} effectivenessReportPath
 */

/**
 * @param {string} repoRoot
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @returns {UsageSettings}
 */
export function loadUsageSettings(repoRoot, env = process.env) {
  const raw = readJsonIfPresent(path.join(repoRoot, 'plan-product.config.json'));
  const pathConfig = readJsonIfPresent(
    path.join(repoRoot, '.plan-product', 'config.json')
  );
  const usage = objectOrEmpty(raw?.usage);
  const paths = objectOrEmpty(pathConfig?.paths);

  let enabled = usage.enabled !== false;
  const envValue = env.PLAN_PRODUCT_USAGE;
  if (typeof envValue === 'string' && envValue.trim() !== '') {
    enabled = truthyEnv(envValue);
  }

  return {
    enabled,
    eventsPath: normalizeRel(
      typeof usage.events === 'string'
        ? usage.events
        : typeof paths.usageEvents === 'string'
          ? paths.usageEvents
          : DEFAULT_EVENTS_PATH
    ),
    effectivenessReportPath: normalizeRel(
      typeof usage.effectivenessReport === 'string'
        ? usage.effectivenessReport
        : typeof paths.effectivenessReport === 'string'
          ? paths.effectivenessReport
          : DEFAULT_REPORT_PATH
    ),
  };
}

/**
 * Best-effort local usage capture. This must never fail the command being
 * measured.
 *
 * @param {string} repoRoot
 * @param {Record<string, unknown>} event
 * @param {{ settings?: UsageSettings, now?: Date }} [options]
 * @returns {{ recorded: boolean, skipped?: boolean, path?: string, error?: string }}
 */
/**
 * Keep the usage ledger out of version control.
 *
 * The ledger is append-only machine-local telemetry: one line per generator
 * run. Tracked, it dirties the working tree on every regeneration and grows
 * without bound — and the pre-push hook regenerates on every push, so the
 * dirt is permanent. Writing the ignore rule beside the ledger means no repo
 * has to remember, and it travels with whatever `usage.events` path is
 * configured.
 *
 * Scoped to the ledger's own filename rather than a blanket `*`, in case the
 * configured path points into a directory holding anything else.
 *
 * @param {string} ledgerPath absolute path to the events file
 */
function ensureLedgerIgnored(repoRoot, ledgerPath) {
  try {
    const ignoreFile = path.join(path.dirname(ledgerPath), '.gitignore');
    resolveRepoContainedPath(repoRoot, ignoreFile, 'usage ignore file');
    const rule = path.basename(ledgerPath);
    const existing = existsSync(ignoreFile)
      ? readFileSync(ignoreFile, 'utf8')
      : '';
    if (existing.split(/\r?\n/).some((line) => line.trim() === rule)) {
      return;
    }
    const header = existing
      ? existing.endsWith('\n')
        ? existing
        : `${existing}\n`
      : '# plan-product local usage telemetry — machine-local, never shared.\n';
    writeFileSync(ignoreFile, `${header}${rule}\n`, 'utf8');
  } catch {
    // Never break a generator run over telemetry hygiene.
  }
}

export function recordUsageEvent(repoRoot, event, options = {}) {
  try {
    const settings = options.settings ?? loadUsageSettings(repoRoot);
    if (!settings.enabled) {
      return { recorded: false, skipped: true };
    }

    const fullPath = resolveInsideRepo(repoRoot, settings.eventsPath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    ensureLedgerIgnored(repoRoot, fullPath);
    const entry = {
      schemaVersion: 'plan-product-usage-event/v1',
      timestamp: (options.now ?? new Date()).toISOString(),
      ...event,
    };
    appendFileSync(fullPath, `${JSON.stringify(cleanObject(entry))}\n`, 'utf8');
    return { recorded: true, path: settings.eventsPath };
  } catch (error) {
    return {
      recorded: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param {string} repoRoot
 * @param {{ settings?: UsageSettings }} [options]
 * @returns {{ events: Record<string, any>[], invalidLines: number, eventsPath: string }}
 */
export function readUsageEvents(repoRoot, options = {}) {
  const settings = options.settings ?? loadUsageSettings(repoRoot);
  const fullPath = resolveInsideRepo(repoRoot, settings.eventsPath);
  if (!existsSync(fullPath)) {
    return { events: [], invalidLines: 0, eventsPath: settings.eventsPath };
  }

  const events = [];
  let invalidLines = 0;
  const text = readFileSync(fullPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === 'object') {
        events.push(parsed);
      } else {
        invalidLines += 1;
      }
    } catch {
      invalidLines += 1;
    }
  }
  return { events, invalidLines, eventsPath: settings.eventsPath };
}

/**
 * @param {string} repoRoot
 * @param {{ doctorReport?: { ok: boolean, checks: Array<{ id: string, status: string, message: string }> }, now?: Date }} [options]
 * @returns {{ ok: boolean, wrote: string, eventCount: number, invalidLines: number, summary: string }}
 */
export function writeEffectivenessReport(repoRoot, options = {}) {
  const settings = loadUsageSettings(repoRoot);
  const usage = readUsageEvents(repoRoot, { settings });
  const model = buildEffectivenessModel(repoRoot, {
    events: usage.events,
    invalidLines: usage.invalidLines,
    eventsPath: usage.eventsPath,
    doctorReport: options.doctorReport,
    now: options.now,
  });
  const markdown = renderEffectivenessMarkdown(model);
  const reportPath = resolveInsideRepo(repoRoot, settings.effectivenessReportPath);
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, markdown, 'utf8');

  return {
    ok: true,
    wrote: settings.effectivenessReportPath,
    eventCount: usage.events.length,
    invalidLines: usage.invalidLines,
    summary: `${usage.events.length} usage events -> ${settings.effectivenessReportPath}`,
  };
}

/**
 * @param {string} repoRoot
 * @param {{ events: Record<string, any>[], invalidLines: number, eventsPath: string, doctorReport?: { ok: boolean, checks: Array<{ id: string, status: string, message: string }> }, now?: Date }} input
 * @returns {Record<string, any>}
 */
export function buildEffectivenessModel(repoRoot, input) {
  const config = readJsonIfPresent(path.join(repoRoot, 'plan-product.config.json'));
  const pathConfig = readJsonIfPresent(
    path.join(repoRoot, '.plan-product', 'config.json')
  );
  const configuredCodeMap =
    typeof config?.codeMapOutput === 'string' ? config.codeMapOutput : null;
  const outputDir = normalizeRel(
    typeof config?.outputDir === 'string'
      ? config.outputDir
      : configuredCodeMap
        ? path.posix.dirname(normalizeRel(configuredCodeMap))
        : typeof pathConfig?.paths?.codeMap === 'string'
          ? pathConfig.paths.codeMap
          : 'docs/code-map'
  );
  const codeMapPath = normalizeRel(
    typeof config?.codeMapOutput === 'string'
      ? config.codeMapOutput
      : typeof config?.output === 'string'
        ? config.output
        : path.posix.join(outputDir, 'code-map.json')
  );
  const moduleMapPath = path.posix.join(outputDir, 'module-map.json');
  const patternsPath = path.posix.join(outputDir, 'patterns.json');
  const architecturePath = path.posix.join(outputDir, 'system-architecture.md');

  return {
    generated: (input.now ?? new Date()).toISOString(),
    eventsPath: input.eventsPath,
    eventCount: input.events.length,
    invalidLines: input.invalidLines,
    usage: summarizeUsage(input.events),
    artifacts: [
      describeCodeMap(repoRoot, codeMapPath),
      describeModuleMap(repoRoot, moduleMapPath),
      describePatterns(repoRoot, patternsPath),
      describeMarkdownArtifact(repoRoot, architecturePath, 'system architecture'),
    ],
    doctor: input.doctorReport
      ? {
          ok: input.doctorReport.ok,
          checks: input.doctorReport.checks.map((check) => ({
            id: check.id,
            status: check.status,
            message: check.message,
          })),
        }
      : null,
    recent: [...input.events]
      .sort((a, b) => String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? '')))
      .slice(0, 10),
  };
}

/**
 * @param {Record<string, any>} model
 * @returns {string}
 */
export function renderEffectivenessMarkdown(model) {
  const lines = [
    '# plan-product Command Health Report',
    '',
    `Generated: ${model.generated}`,
    '',
    'This report summarizes local command runs and artifact checks. It does not measure agent accuracy, time saved, or the usefulness of generated maps. The historical --effectiveness flag and output path remain supported.',
    '',
    '## Usage Summary',
    '',
    `Usage events: ${model.eventCount} from \`${model.eventsPath}\`${model.invalidLines ? ` (${model.invalidLines} invalid lines skipped)` : ''}.`,
    '',
  ];

  if (model.usage.byCommand.length === 0) {
    lines.push('No usage events have been captured yet.', '');
  } else {
    lines.push('| Command | Runs | Success | Failure | Warning runs | Avg duration | Last status | Last run |');
    lines.push('|---------|------|---------|---------|--------------|--------------|-------------|----------|');
    for (const row of model.usage.byCommand) {
      lines.push(
        `| \`${row.command}\` | ${row.runs} | ${row.success} | ${row.failure} | ${row.warningRuns} | ${formatDuration(row.avgDurationMs)} | ${row.lastStatus} | ${row.lastRun ?? '-'} |`
      );
    }
    lines.push('');
  }

  lines.push('## Current Artifact Health', '');
  lines.push('| Artifact | Status | Signal |');
  lines.push('|----------|--------|--------|');
  for (const artifact of model.artifacts) {
    lines.push(
      `| \`${artifact.path}\` | ${artifact.status} | ${escapeTable(String(artifact.signal))} |`
    );
  }
  lines.push('');

  if (model.doctor) {
    lines.push('## Doctor Checks', '');
    lines.push(`Overall: ${model.doctor.ok ? 'PASS' : 'FAIL'}`, '');
    lines.push('| Check | Status | Message |');
    lines.push('|-------|--------|---------|');
    for (const check of model.doctor.checks) {
      lines.push(
        `| \`${check.id}\` | ${String(check.status).toUpperCase()} | ${escapeTable(check.message)} |`
      );
    }
    lines.push('');
  }

  lines.push('## Recent Runs', '');
  if (model.recent.length === 0) {
    lines.push('No recent runs recorded.', '');
  } else {
    lines.push('| Time | Command | Status | Duration | Summary |');
    lines.push('|------|---------|--------|----------|---------|');
    for (const event of model.recent) {
      lines.push(
        `| ${event.timestamp ?? '-'} | \`${event.command ?? 'unknown'}\` | ${event.status ?? '-'} | ${formatDuration(event.durationMs)} | ${escapeTable(event.summary ?? '')} |`
      );
    }
    lines.push('');
  }

  lines.push('## Interpretation', '');
  lines.push('- Command success describes execution health, not task outcomes. Nested generator events are separate command runs, not independent agent tasks.');
  lines.push('- Doctor checks core map freshness. Presence of architecture or pattern reports alone does not establish that they reflect current source.');
  lines.push('- Pattern matches identify code to inspect for known patterns. Matched line coverage is not an architecture quality score.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

/**
 * @param {Record<string, any>[]} events
 */
function summarizeUsage(events) {
  const groups = new Map();
  for (const event of events) {
    const command = typeof event.command === 'string' ? event.command : 'unknown';
    const current =
      groups.get(command) ?? {
        command,
        runs: 0,
        success: 0,
        failure: 0,
        warningRuns: 0,
        durationTotal: 0,
        durationCount: 0,
        lastRun: null,
        lastStatus: '-',
      };
    current.runs += 1;
    if (event.status === 'ok') {
      current.success += 1;
    } else {
      current.failure += 1;
    }
    if (Array.isArray(event.warnings) && event.warnings.length > 0) {
      current.warningRuns += 1;
    }
    if (typeof event.durationMs === 'number' && Number.isFinite(event.durationMs)) {
      current.durationTotal += event.durationMs;
      current.durationCount += 1;
    }
    if (!current.lastRun || String(event.timestamp ?? '') > current.lastRun) {
      current.lastRun = event.timestamp;
      current.lastStatus = event.status ?? '-';
    }
    groups.set(command, current);
  }

  return {
    byCommand: [...groups.values()]
      .map((row) => ({
        command: row.command,
        runs: row.runs,
        success: row.success,
        failure: row.failure,
        warningRuns: row.warningRuns,
        avgDurationMs:
          row.durationCount > 0 ? Math.round(row.durationTotal / row.durationCount) : null,
        lastRun: row.lastRun,
        lastStatus: row.lastStatus,
      }))
      .sort((a, b) => b.runs - a.runs || a.command.localeCompare(b.command)),
  };
}

function describeCodeMap(repoRoot, relPath) {
  const raw = readJsonIfPresent(path.join(repoRoot, relPath));
  if (!raw) {
    return missingArtifact(relPath);
  }
  return {
    path: relPath,
    status: 'present',
    signal: `${raw.fileCount ?? raw.files?.length ?? 0} files, ${raw.symbolCount ?? 0} symbols, ${raw.endpointCount ?? raw.endpoints?.length ?? 0} endpoints; generated ${raw.generated ?? 'unknown'}`,
  };
}

function describeModuleMap(repoRoot, relPath) {
  const raw = readJsonIfPresent(path.join(repoRoot, relPath));
  if (!raw) {
    return missingArtifact(relPath);
  }
  return {
    path: relPath,
    status: 'present',
    signal: `${raw.modules?.length ?? 0} modules, ${raw.edges?.length ?? 0} edges; generated ${raw.generated ?? 'unknown'}`,
  };
}

function describePatterns(repoRoot, relPath) {
  const raw = readJsonIfPresent(path.join(repoRoot, relPath));
  if (!raw) {
    return missingArtifact(relPath);
  }
  const summary = raw.summary ?? {};
  return {
    path: relPath,
    status: 'present',
    signal: `${summary.patternsEvaluated ?? 0} patterns, ${summary.occurrences ?? 0} matches, ${summary.modulesWithPatternEvidence ?? 0} modules with evidence, ${summary.patternLinePercent ?? 0}% pattern-line coverage; generated ${raw.generated ?? 'unknown'}`,
  };
}

function describeMarkdownArtifact(repoRoot, relPath, label) {
  if (!existsSync(path.join(repoRoot, relPath))) {
    return missingArtifact(relPath);
  }
  return {
    path: relPath,
    status: 'present',
    signal: `${label} artifact exists`,
  };
}

function missingArtifact(relPath) {
  return {
    path: relPath,
    status: 'missing',
    signal: 'run map-code or the related generator',
  };
}

function readJsonIfPresent(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanObject(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cleanObject(entry));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, cleanObject(entry)])
    );
  }
  return value;
}

function truthyEnv(value) {
  const normalized = value.trim().toLowerCase();
  return !['0', 'false', 'no', 'off', 'disabled'].includes(normalized);
}

function resolveInsideRepo(repoRoot, relPath) {
  return resolveRepoContainedPath(repoRoot, relPath, 'usage path');
}

function normalizeRel(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/\/$/, '');
}

function formatDuration(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }
  if (value < 1000) {
    return `${value} ms`;
  }
  return `${(value / 1000).toFixed(1)} s`;
}

function escapeTable(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}
