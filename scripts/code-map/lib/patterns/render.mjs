/**
 * @param {import('./model.mjs').PatternReport} report
 * @returns {string}
 */
export function renderPatternsMarkdown(report) {
  const lines = [];
  lines.push(`# ${report.project.name} Code Patterns`);
  lines.push('');
  lines.push(
    `Generated: ${report.generated}. Regenerate with \`/ci patterns\`.`
  );
  lines.push('');
  lines.push('## Use This When');
  lines.push('');
  lines.push('- Use for architecture/style discovery and codebase consistency review.');
  lines.push(
    '- For routine implementation planning, start with `docs/code-index/index.md` and the minimum relevant module files.'
  );
  lines.push('');
  lines.push('## Coverage Summary');
  lines.push('');
  lines.push(
    'Headline coverage counts unique pattern-eligible files matched by `high` or `medium` confidence patterns. `intent-only` signals and unsupported files are excluded from the headline denominator.'
  );
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Source files | ${report.source.sourceFiles} |`);
  lines.push(`| Pattern-eligible files | ${report.source.eligibleFiles} |`);
  lines.push(`| Excluded files | ${excludedCount(report.source.excludedFiles)} |`);
  lines.push(`| Patterns evaluated | ${report.summary.patternsEvaluated} |`);
  lines.push(`| Patterns matched | ${report.summary.patternsMatched} |`);
  lines.push(`| Occurrences | ${report.summary.occurrences} |`);
  lines.push(`| Covered files | ${report.summary.coveredFiles} |`);
  lines.push(`| Headline coverage | ${formatPercent(report.summary.coveragePercent)} |`);
  lines.push('');
  lines.push('## Inputs');
  lines.push('');
  lines.push('| Input | Value |');
  lines.push('|-------|-------|');
  lines.push(`| Code map | \`${report.source.codeMap}\` |`);
  lines.push(`| Module map | \`${report.source.moduleMap}\` |`);
  lines.push(`| Languages | ${report.source.languages.map((entry) => `\`${entry}\``).join(', ') || '-'} |`);
  lines.push('');
  lines.push('## Confidence Tiers');
  lines.push('');
  lines.push('| Confidence | Files | Coverage | Included in headline |');
  lines.push('|------------|-------|----------|----------------------|');
  for (const confidence of ['high', 'medium', 'intent-only']) {
    const entry = report.summary.coverageByConfidence[confidence] ?? {
      files: 0,
      percent: 0,
      includedInHeadline: confidence !== 'intent-only',
    };
    lines.push(
      `| \`${confidence}\` | ${entry.files} | ${formatPercent(entry.percent)} | ${entry.includedInHeadline ? 'yes' : 'no'} |`
    );
  }
  lines.push('');
  lines.push('## Excluded Source Files');
  lines.push('');
  if (report.source.excludedFiles.length === 0) {
    lines.push('No detected source files were excluded from the pattern-eligible denominator.');
  } else {
    lines.push('| Extension | Language | Count | Reason |');
    lines.push('|-----------|----------|-------|--------|');
    for (const excluded of report.source.excludedFiles) {
      lines.push(
        `| \`${excluded.extension}\` | ${excluded.language ? `\`${excluded.language}\`` : '-'} | ${excluded.count} | ${escapeTableCell(excluded.reason)} |`
      );
    }
  }
  lines.push('');
  lines.push('## Pattern Summary');
  lines.push('');
  lines.push('| Pattern | Confidence | Language | Files | Occurrences | Coverage | Headline |');
  lines.push('|---------|------------|----------|-------|-------------|----------|----------|');
  for (const pattern of report.patterns) {
    lines.push(
      `| ${escapeTableCell(pattern.name)} | \`${pattern.confidence}\` | \`${pattern.language}\` | ${pattern.fileCount} | ${pattern.occurrenceCount} | ${formatPercent(pattern.coveragePercent)} | ${pattern.includeInHeadline ? 'yes' : 'no'} |`
    );
  }
  lines.push('');
  lines.push('## Module Coverage');
  lines.push('');
  if (report.modules.length === 0) {
    lines.push('No pattern-eligible files were attributed to modules.');
  } else {
    lines.push('| Module | Eligible files | Covered files | Coverage | Module file |');
    lines.push('|--------|----------------|---------------|----------|-------------|');
    for (const mod of report.modules) {
      lines.push(
        `| ${escapeTableCell(mod.name)} | ${mod.eligibleFiles} | ${mod.coveredFiles} | ${formatPercent(mod.coveragePercent)} | ${mod.planningModule ? `\`${mod.planningModule}\`` : '-'} |`
      );
    }
  }
  lines.push('');
  lines.push('## Pattern Details');
  lines.push('');
  for (const pattern of report.patterns.filter((entry) => entry.occurrenceCount > 0)) {
    lines.push(`### ${pattern.name}`);
    lines.push('');
    lines.push(pattern.description);
    lines.push('');
    lines.push(
      `Confidence: \`${pattern.confidence}\`. Headline coverage: ${pattern.includeInHeadline ? 'included' : 'excluded'}.`
    );
    lines.push('');
    lines.push('| Module | Files | Occurrences | Coverage |');
    lines.push('|--------|-------|-------------|----------|');
    for (const mod of pattern.modules) {
      lines.push(
        `| ${escapeTableCell(mod.name)} | ${mod.fileCount} | ${mod.occurrenceCount} | ${formatPercent(mod.coveragePercent)} |`
      );
    }
    lines.push('');
    lines.push('Examples:');
    lines.push('');
    for (const example of pattern.examples) {
      lines.push(`- \`${example.file}:${example.line}\` (${example.moduleId})`);
    }
    lines.push('');
  }
  if (report.patterns.every((entry) => entry.occurrenceCount === 0)) {
    lines.push('No patterns matched the eligible source files.');
    lines.push('');
  }
  lines.push('## Limitations');
  lines.push('');
  lines.push(
    'Pattern matches are structural evidence, not proof of author intent. Use this report to find repeatable code shapes worth reviewing, then inspect the cited examples before changing code.'
  );
  lines.push(
    '`intent-only` signals are reported separately and excluded from headline coverage.'
  );
  lines.push('');
  lines.push(`<!-- code-index:patterns generated ${report.generated} -->`);
  return `${lines.join('\n')}\n`;
}

/**
 * @param {Array<{ count: number }>} excludedFiles
 * @returns {number}
 */
function excludedCount(excludedFiles) {
  return excludedFiles.reduce((sum, entry) => sum + entry.count, 0);
}

/**
 * @param {number} value
 * @returns {string}
 */
function formatPercent(value) {
  return `${Number(value).toFixed(2)}%`;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeTableCell(value) {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}
