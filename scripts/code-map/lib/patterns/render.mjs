/**
 * @param {import('./model.mjs').PatternReport} report
 * @returns {string}
 */
export function renderPatternsMarkdown(report) {
  const lines = [];
  lines.push(`# ${report.project.name} Code Patterns`);
  lines.push('');
  lines.push(
    `Generated: ${report.generated}. Regenerate with \`find-code-patterns\`.`
  );
  lines.push('');
  lines.push('## Use This When');
  lines.push('');
  lines.push('- Use for module-rooted architecture and coding-practice review.');
  lines.push(
    '- Treat missing patterns as a quality signal to inspect, not proof that the code is wrong.'
  );
  lines.push(
    '- For routine implementation planning, start with the generated index and the minimum relevant module files.'
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
  if (report.source.eligibleLines !== undefined) {
    lines.push(`| Pattern-eligible source lines | ${report.source.eligibleLines} |`);
  }
  lines.push(`| Excluded files | ${excludedCount(report.source.excludedFiles)} |`);
  lines.push(`| Patterns evaluated | ${report.summary.patternsEvaluated} |`);
  lines.push(`| Patterns matched | ${report.summary.patternsMatched} |`);
  lines.push(`| Occurrences | ${report.summary.occurrences} |`);
  lines.push(`| Covered files | ${report.summary.coveredFiles} |`);
  lines.push(`| Headline coverage | ${formatPercent(report.summary.coveragePercent)} |`);
  if (report.summary.patternLines !== undefined) {
    lines.push(`| Pattern lines | ${report.summary.patternLines} |`);
  }
  if (report.summary.patternLinePercent !== undefined) {
    lines.push(`| Pattern line coverage | ${formatPercent(report.summary.patternLinePercent)} |`);
  }
  if (report.summary.modulesWithPatternEvidence !== undefined) {
    lines.push(`| Modules with pattern evidence | ${report.summary.modulesWithPatternEvidence} |`);
  }
  if (report.summary.modulesWithoutPatternEvidence !== undefined) {
    lines.push(`| Modules without pattern evidence | ${report.summary.modulesWithoutPatternEvidence} |`);
  }
  lines.push('');
  if (report.summary.moduleSignals) {
    lines.push('## Module Signal Summary');
    lines.push('');
    lines.push('| Signal | Modules |');
    lines.push('|--------|---------|');
    for (const [signal, count] of Object.entries(report.summary.moduleSignals)) {
      lines.push(`| \`${signal}\` | ${count} |`);
    }
    lines.push('');
  }
  lines.push('## Inputs');
  lines.push('');
  lines.push('| Input | Value |');
  lines.push('|-------|-------|');
  lines.push(`| Code map | \`${report.source.codeMap}\` |`);
  lines.push(`| Module map | \`${report.source.moduleMap}\` |`);
  if (report.source.patternLibrary) {
    lines.push(`| Pattern library | \`${report.source.patternLibrary}\` |`);
  }
  if (report.source.patternExpectations) {
    lines.push(`| Pattern expectations | \`${report.source.patternExpectations}\` |`);
  }
  if (report.source.roots?.length) {
    lines.push(`| Source roots | ${report.source.roots.map((entry) => `\`${entry}\``).join(', ')} |`);
  }
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
  lines.push('| Pattern | Family | Confidence | Language | Files | Occurrences | Coverage | Headline |');
  lines.push('|---------|--------|------------|----------|-------|-------------|----------|----------|');
  for (const pattern of report.patterns) {
    lines.push(
      `| ${escapeTableCell(pattern.name)} | ${pattern.familyName ? escapeTableCell(pattern.familyName) : '-'} | \`${pattern.confidence}\` | \`${pattern.language}\` | ${pattern.fileCount} | ${pattern.occurrenceCount} | ${formatPercent(pattern.coveragePercent)} | ${pattern.includeInHeadline ? 'yes' : 'no'} |`
    );
  }
  lines.push('');
  lines.push('## Module Pattern Signals');
  lines.push('');
  if (report.modules.length === 0) {
    lines.push('No pattern-eligible files were attributed to modules.');
  } else {
    lines.push('| Module | Signal | Eligible files | Covered files | File coverage | Eligible lines | Pattern lines | Pattern line % | Used | Expected not detected | Uncovered examples | Module file |');
    lines.push('|--------|--------|----------------|---------------|---------------|----------------|---------------|----------------|------|-----------------------|--------------------|-------------|');
    for (const mod of report.modules) {
      lines.push(
        `| ${escapeTableCell(mod.name)} | \`${mod.signal ?? 'unknown'}\` | ${mod.eligibleFiles} | ${mod.coveredFiles} | ${formatPercent(mod.coveragePercent)} | ${mod.eligibleLines ?? '-'} | ${mod.patternLines ?? '-'} | ${formatOptionalPercent(mod.patternLinePercent)} | ${patternNames(mod.patternsUsed)} | ${patternNames(mod.patternsNotDetected)} | ${fileExamples(mod.filesWithoutHeadlinePatterns)} | ${mod.planningModule ? `\`${mod.planningModule}\`` : '-'} |`
      );
    }
  }
  lines.push('');
  lines.push('## Module Details');
  lines.push('');
  for (const mod of report.modules) {
    lines.push(`### ${mod.name}`);
    lines.push('');
    lines.push(
      `Root: \`${mod.root ?? ''}\`. Signal: \`${mod.signal ?? 'unknown'}\`. Pattern line coverage: ${formatOptionalPercent(mod.patternLinePercent)} (${mod.patternLines ?? 0}/${mod.eligibleLines ?? 0} lines).`
    );
    lines.push('');
    if (mod.patternsUsed?.length) {
      lines.push('Detected patterns:');
      lines.push('');
      lines.push('| Pattern | Family | Confidence | Files | Occurrences | Lines | Line % | Examples |');
      lines.push('|---------|--------|------------|-------|-------------|-------|--------|----------|');
      for (const pattern of mod.patternsUsed) {
        lines.push(
          `| ${escapeTableCell(pattern.name)} | ${pattern.familyName ? escapeTableCell(pattern.familyName) : '-'} | \`${pattern.confidence}\` | ${pattern.fileCount} | ${pattern.occurrenceCount} | ${pattern.lineCount ?? '-'} | ${formatOptionalPercent(pattern.linePercent)} | ${exampleLocations(pattern.examples)} |`
        );
      }
    } else {
      lines.push('No configured headline patterns were detected in this module.');
    }
    lines.push('');
    if (mod.patternsNotDetected?.length) {
      lines.push('Expected headline patterns not detected:');
      lines.push('');
      lines.push('| Pattern | Family | Confidence | Language | Tags |');
      lines.push('|---------|--------|------------|----------|------|');
      for (const pattern of mod.patternsNotDetected) {
        lines.push(
          `| ${escapeTableCell(pattern.name)} | ${pattern.familyName ? escapeTableCell(pattern.familyName) : '-'} | \`${pattern.confidence}\` | \`${pattern.language}\` | ${pattern.tags?.length ? pattern.tags.map((tag) => `\`${tag}\``).join(', ') : '-'} |`
        );
      }
      lines.push('');
    }
    if (mod.filesWithoutHeadlinePatterns?.length) {
      lines.push('Files without headline pattern evidence:');
      lines.push('');
      for (const file of mod.filesWithoutHeadlinePatterns) {
        lines.push(`- \`${file}\``);
      }
      lines.push('');
    }
  }
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
    if (pattern.undetectedModules?.length) {
      lines.push('Modules where this headline pattern was not detected:');
      lines.push('');
      for (const mod of pattern.undetectedModules.slice(0, 10)) {
        lines.push(`- ${mod.name} (\`${mod.root}\`)`);
      }
      if (pattern.undetectedModules.length > 10) {
        lines.push(`- ...and ${pattern.undetectedModules.length - 10} more`);
      }
      lines.push('');
    }
  }
  if (report.patterns.every((entry) => entry.occurrenceCount === 0)) {
    lines.push('No patterns matched the eligible source files.');
    lines.push('');
  }
  lines.push('## Limitations');
  lines.push('');
  lines.push(
    'Pattern matches are structural evidence, not proof of author intent. Pattern absence is a review signal, not a defect by itself. Inspect the cited examples and module responsibilities before changing code.'
  );
  lines.push(
    '`intent-only` signals are reported separately and excluded from headline coverage.'
  );
  lines.push('');
  lines.push(`<!-- plan-product:patterns generated ${report.generated} -->`);
  return `${lines.join('\n')}\n`;
}

/**
 * @param {Array<{ name?: string }> | undefined} patterns
 * @returns {string}
 */
function patternNames(patterns) {
  if (!patterns?.length) {
    return '-';
  }
  const names = patterns.slice(0, 4).map((pattern) => escapeTableCell(pattern.name));
  const suffix = patterns.length > 4 ? `, +${patterns.length - 4} more` : '';
  return `${names.join(', ')}${suffix}`;
}

/**
 * @param {string[] | undefined} files
 * @returns {string}
 */
function fileExamples(files) {
  if (!files?.length) {
    return '-';
  }
  const examples = files.slice(0, 3).map((file) => `\`${file}\``);
  const suffix = files.length > 3 ? `, +${files.length - 3} more` : '';
  return `${examples.join(', ')}${suffix}`;
}

/**
 * @param {Array<{ file?: string, line?: number }> | undefined} examples
 * @returns {string}
 */
function exampleLocations(examples) {
  if (!examples?.length) {
    return '-';
  }
  return examples
    .slice(0, 3)
    .map((example) => `\`${example.file}:${example.line}\``)
    .join(', ');
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
 * @param {number | undefined} value
 * @returns {string}
 */
function formatOptionalPercent(value) {
  return typeof value === 'number' ? formatPercent(value) : '-';
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeTableCell(value) {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}
