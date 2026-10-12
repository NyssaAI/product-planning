import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAstGrepBinary } from './resolve-ast-grep.mjs';
import { parseScanJson } from './sg-result.mjs';

const toolkitDir = path.dirname(fileURLToPath(import.meta.url));
const syntaxRules = [];
for (const language of ['JavaScript', 'TypeScript']) {
  syntaxRules.push({
    id: `endpoint-call-${language}`,
    language,
    rule: { pattern: '$RECEIVER.$METHOD($$$ARGS)' },
    constraints: {
      RECEIVER: { regex: '^(app|router|server|mcp)$' },
      METHOD: { regex: '^(get|post|put|delete|patch|head|options|tool|resource|prompt)$' },
    },
  }, {
    id: `endpoint-export-${language}`,
    language,
    rule: { kind: 'export_statement' },
  });
}
for (const [language, kinds] of [
  ['Python', ['comment', 'string']],
  ['CSharp', ['comment', 'string_literal', 'verbatim_string_literal', 'raw_string_literal', 'interpolated_string_expression', 'character_literal']],
  ['Go', ['comment', 'raw_string_literal', 'interpreted_string_literal', 'rune_literal']],
]) {
  syntaxRules.push({
    id: `endpoint-noncode-${language}`,
    language,
    rule: { any: kinds.map((kind) => ({ kind })) },
  });
}
syntaxRules.push({ id: 'endpoint-import-Go', language: 'Go', rule: { kind: 'import_spec' } });
const inlineRules = syntaxRules.map((rule) => JSON.stringify(rule)).join('\n---\n');

/**
 * Parse the explicit endpoint source inventory once, in bounded batches. Calls
 * and exports are syntax nodes, so quoted examples cannot become registrations.
 * Other language extractors use non-code spans to filter their existing rules.
 * A failed scan is an error rather than a successful but incomplete endpoint map.
 * @param {string} repoRoot
 * @param {string[]} files
 * @returns {Map<string, { calls: object[], exports: object[], noncode: object[], imports: object[] }>}
 */
export function scanEndpointSyntax(repoRoot, files) {
  const byFile = new Map();
  if (files.length === 0) return byFile;
  const binary = resolveAstGrepBinary({ toolkitDir, projectRoot: repoRoot });
  const batches = [[]];
  let length = 0;
  for (const file of files) {
    const absolute = path.resolve(repoRoot, file);
    if (length + absolute.length > 20000 && batches.at(-1).length > 0) {
      batches.push([]);
      length = 0;
    }
    batches.at(-1).push(absolute);
    length += absolute.length + 1;
  }
  for (const batch of batches) {
    const result = spawnSync(binary, [
      'scan', '--config', path.join(toolkitDir, '../code-map/sgconfig.yml'),
      '--inline-rules', inlineRules, '--json', ...batch,
    ], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (result.error || result.status !== 0) {
      throw new Error(`Endpoint syntax scan failed: ${result.error?.message ?? result.stderr?.trim() ?? result.status}`);
    }
    for (const match of parseScanJson(result.stdout)) {
      const file = path.relative(repoRoot, match.file).replace(/\\/g, '/');
      if (!byFile.has(file)) byFile.set(file, { calls: [], exports: [], noncode: [], imports: [] });
      const syntax = byFile.get(file);
      if (match.ruleId.startsWith('endpoint-call-')) syntax.calls.push(match);
      if (match.ruleId.startsWith('endpoint-export-')) syntax.exports.push(match);
      if (match.ruleId.startsWith('endpoint-noncode-')) syntax.noncode.push(match);
      if (match.ruleId.startsWith('endpoint-import-')) syntax.imports.push(match);
    }
  }
  return byFile;
}
