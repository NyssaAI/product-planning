import path from 'node:path';

const MAX_PATTERNS_PER_MODULE = 12;
const MAX_EXAMPLES = 3;

/** Render a bounded reading guide; patterns.json retains the complete evidence. */
export function renderPatternsMarkdown(report) {
  const lines = [
    `# ${report.project.name} Known Code Patterns`,
    '',
    `Generated: ${report.generated}. Regenerate with \`find-code-patterns\`.`,
    '',
    'Use this report to find code that may use known patterns and inspect the cited source before reusing or changing it.',
    '',
    'Matches describe detector evidence, not a quality score. A name match suggests intent; it does not establish the relationships that define a design pattern. No match does not establish absence.',
    '',
    '## Scan Scope',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| Source files | ${report.source.sourceFiles} |`,
    `| Eligible files | ${report.source.eligibleFiles} |`,
    `| Excluded files | ${report.source.excludedFiles.reduce((sum, entry) => sum + entry.count, 0)} |`,
    `| Detectors evaluated | ${report.summary.patternsEvaluated} |`,
    `| Detectors matched | ${report.summary.patternsMatched} |`,
    `| Occurrences | ${report.summary.occurrences} |`,
    '',
    `Inputs: \`${report.source.codeMap}\`, \`${report.source.moduleMap}\`.`,
    `Roots: ${(report.source.roots ?? []).map((root) => `\`${root}\``).join(', ') || '(see code map)'}. Languages: ${report.source.languages.join(', ')}.`,
    '',
    '## Confidence and Limits',
    '',
    '- `high`: a detector matched specific syntax or an API shape; this confirms that shape, not correct design.',
    '- `medium`: a structural heuristic matched; inspect its description and surrounding code.',
    '- `intent-only`: names or other weak clues suggest a pattern; verify responsibilities and relationships in source.',
    '',
    'Confidence is catalog-supplied, not a calibrated probability. JSON coverage fields describe matched files or syntax ranges only; they do not measure architecture quality or how much code should use patterns.',
    '',
    '## Module Evidence',
    '',
    '| Module | Eligible files | Matched detectors | Source examples |',
    '|--------|----------------|-------------------|-----------------|',
  ];
  if (report.source.freshness?.fresh === false) {
    lines.splice(4, 0, `Warning: ${report.source.freshness.reason} Run \`map-code\` before relying on module attribution.`, '');
  }
  for (const mod of report.modules) {
    const examples = (mod.patternsUsed ?? []).flatMap((pattern) => pattern.examples ?? []);
    lines.push(`| [${cell(mod.name)}](#${anchor(mod)}) | ${mod.eligibleFiles} | ${mod.patternsUsed?.length ?? 0} | ${locations(examples, report)} |`);
  }
  if (report.modules.length === 0) lines.push('| No eligible modules | 0 | 0 | - |');
  lines.push('', `Each module shows up to ${MAX_PATTERNS_PER_MODULE} matched detectors and ${MAX_EXAMPLES} source examples per detector. [patterns.json](patterns.json) contains every detector and its complete \`occurrences\` list (file, line range, module).`, '');

  const byId = new Map(report.patterns.map((pattern) => [pattern.id, pattern]));
  for (const mod of report.modules) {
    lines.push(`<a id="${anchor(mod)}"></a>`, `### ${mod.name}`, '', `Root: \`${mod.root}\`.`, '');
    if (!mod.patternsUsed?.length) {
      lines.push('No configured detector matched. This is not a defect or a reason to introduce a pattern.', '');
      continue;
    }
    for (const pattern of mod.patternsUsed.slice(0, MAX_PATTERNS_PER_MODULE)) {
      const definition = byId.get(pattern.id) ?? pattern;
      const family = pattern.familyName ?? pattern.name;
      lines.push(`- **${family}** — \`${pattern.confidence}\`, ${pattern.fileCount} files, ${pattern.occurrenceCount} occurrences. ${locations(pattern.examples ?? [], report)}`);
      lines.push(`  Detector: \`${pattern.id}\` (${pattern.language}). ${definition.description ?? ''}`);
      if (definition.notes) lines.push(`  Limit: ${definition.notes}`);
      if (definition.reviewChecks?.length) {
        lines.push(`  Verify in source: ${definition.reviewChecks.join('; ')}.`);
      }
      const omitted = Math.max(0, pattern.occurrenceCount - Math.min(MAX_EXAMPLES, pattern.examples?.length ?? 0));
      if (omitted > 0) lines.push(`  ${omitted} further occurrences are available under this detector in patterns.json.`);
      lines.push('');
    }
    if (mod.patternsUsed.length > MAX_PATTERNS_PER_MODULE) {
      lines.push(`${mod.patternsUsed.length - MAX_PATTERNS_PER_MODULE} additional matched detectors for \`${mod.id}\` are available in patterns.json.`, '');
    }
  }

  lines.push('## Excluded Source Files', '');
  if (report.source.excludedFiles.length === 0) {
    lines.push('No detected source files were excluded from the enabled catalogs.');
  } else {
    lines.push('| Extension | Language | Count | Reason |', '|-----------|----------|-------|--------|');
    for (const entry of report.source.excludedFiles) {
      lines.push(`| \`${entry.extension}\` | ${entry.language ? `\`${entry.language}\`` : '-'} | ${entry.count} | ${cell(entry.reason)} |`);
    }
  }
  lines.push('', '## Configuration', '');
  if (report.source.patternLibrary) lines.push(`Catalog: \`${report.source.patternLibrary}\`.`);
  if (report.source.patternExpectations) lines.push(`Configured review expectations: \`${report.source.patternExpectations}\`.`);
  lines.push('Use language-specific structural rules when a relationship can be detected. Keep name clues tentative. Inspect source responsibilities and dependency direction before claiming a design pattern or recommending a refactor.', '', `<!-- plan-product:patterns generated ${report.generated} -->`);
  return `${lines.join('\n')}\n`;
}

function locations(examples, report) {
  const outputDir = report.source.outputDir ?? path.posix.dirname(report.source.codeMap);
  return examples.slice(0, MAX_EXAMPLES).map((example) => {
    const target = path.posix.relative(outputDir, example.file).split('/').map(encodeURIComponent).join('/');
    return `[${cell(example.file)}:${example.line}](${target}#L${example.line})`;
  }).join(', ') || '-';
}

function anchor(mod) {
  return `module-${String(mod.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function cell(value) {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
}
