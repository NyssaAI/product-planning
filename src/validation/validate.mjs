// Responsibility: Validate plugin manifests, harness-adapters, evals/ matrix & Waza contracts, docs/ allowed-set lockdown, Ubiquitous Language rules, concepts, and DP-pp.ss links.
// Public interface:
// `-- validate(repoRoot, options)

import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble } from '../../scripts/assemble.mjs';
import { resolvePlanningConfig, validatePlanningConfig } from '../init/repo-paths.mjs';

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BANNED_FEATURE_TITLE_JARGON = /\b(?:surgical|storage|ingestion|ingest|syndication)\b/i;
const VERIFICATION_HEADING_REGEX = /^##\s+(?:\d+\.\s+)?Verification\b/m;
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.db', '.pyc',
]);

function buildBannedSourceRules() {
  const tokWorkspace = ['', 'srv', 'repos', 'NyssaAI', ''].join('/');
  const tokBrain = ['', 'root', '.gemini', 'antigravity-cli', 'brain', ''].join('/');
  const tokWinUsers = ['C:', 'Users', ''].join('\\');
  const tokLegacyStateEnv = ['NYSSA', 'PLUGIN', 'STATE', 'DIR'].join('_');
  const tokPluginData = '${' + ['PLUGIN', 'DATA'].join('_') + '}';
  const tokSettingsSchema = ['settings', 'schema', 'json'].join('.');
  return {
    retiredSchemaFilename: tokSettingsSchema,
    patterns: [
      {
        label: `leaked machine-local workspace path "${tokWorkspace}"`,
        regex: new RegExp(['', 'srv', 'repos', 'NyssaAI(?:\\/|$|\\b)'].join('\\/')),
      },
      {
        label: `leaked machine-local Antigravity path "${tokBrain}"`,
        regex: new RegExp(['', 'root', '\\.gemini', 'antigravity-cli', 'brain(?:\\/|$|\\b)'].join('\\/')),
      },
      {
        label: `leaked machine-local Windows path "${tokWinUsers}"`,
        regex: new RegExp(['C:', 'Users', ''].join('\\\\+'), 'i'),
      },
      {
        label: `retired runtime environment variable "${tokLegacyStateEnv}" (use NYSSA_RUNTIME_ROOT)`,
        regex: new RegExp(`\\b${tokLegacyStateEnv}\\b`),
      },
      {
        label: `retired runtime token "${tokPluginData}" (use canonical runtime_root)`,
        regex: new RegExp('\\$\\{' + ['PLUGIN', 'DATA'].join('_') + '\\}'),
      },
      {
        label: `retired schema filename "${tokSettingsSchema}"`,
        regex: new RegExp(`(?:^|[^\\w.-])${['settings', 'schema', 'json'].join('\\.')}(?=$|[^\\w.-])`),
      },
    ],
  };
}

const BANNED_SOURCE_RULES = buildBannedSourceRules();

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').trim();
}

function stripFencedCodeBlocks(content) {
  return content
    .replace(/^(?:```|~~~)[\s\S]*?^(?:```|~~~)/gm, '')
    .replace(/```[\s\S]*?```/g, '');
}

function stripMarkdownCode(content) {
  return stripFencedCodeBlocks(content).replace(/(`+)([^`\n]*?)\1/g, (_m, _ticks, inner) =>
    inner.includes('](') ? '' : 'code'
  );
}

function parseYamlFrontmatter(content) {
  const clean = content.startsWith('\uFEFF') ? content.slice(1) : content;
  const match = clean.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const lines = match[1].replace(/\r\n/g, '\n').split('\n');
  const fields = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) {
      i++;
      continue;
    }
    const [, key, rawRest] = keyMatch;
    const rest = rawRest.trim();
    i++;
    if (/^[>|][+-]?$/.test(rest)) {
      const folded = rest.startsWith('>');
      const blockLines = [];
      let blockIndent = null;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (!nextLine.trim()) {
          if (blockIndent !== null) blockLines.push('');
          i++;
          continue;
        }
        const indent = nextLine.match(/^(\s*)/)[1].length;
        if (indent === 0) break;
        if (blockIndent === null) blockIndent = indent;
        blockLines.push(nextLine.slice(Math.min(blockIndent, nextLine.length)));
        i++;
      }
      while (blockLines.length > 0 && blockLines[blockLines.length - 1] === '') {
        blockLines.pop();
      }
      if (!folded) {
        fields[key] = blockLines.join('\n');
      } else {
        const paragraphs = [];
        let current = [];
        for (const bl of blockLines) {
          if (bl === '') {
            if (current.length > 0) {
              paragraphs.push(current.join(' '));
              current = [];
            }
            paragraphs.push('');
          } else {
            current.push(bl.trim());
          }
        }
        if (current.length > 0) paragraphs.push(current.join(' '));
        fields[key] = paragraphs.join('\n');
      }
    } else if (rest === '') {
      const cont = [];
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        cont.push(lines[i].trim());
        i++;
      }
      fields[key] = cont.join(' ');
    } else if (
      (rest.startsWith('"') && rest.endsWith('"') && rest.length >= 2) ||
      (rest.startsWith("'") && rest.endsWith("'") && rest.length >= 2)
    ) {
      fields[key] = rest.slice(1, -1);
    } else {
      const cont = [rest];
      while (i < lines.length && /^\s+\S/.test(lines[i])) {
        cont.push(lines[i].trim());
        i++;
      }
      fields[key] = cont.join(' ');
    }
  }
  return fields;
}

/**
 * Template-Only Detection: returns true when docPath is unedited boilerplate matching its configured or bundled template.
 */
function isTemplateOnlyDocument(docPath, repoRoot, config, templateKey, bundledAssetFile) {
  if (!existsSync(docPath)) return false;
  const docNorm = normalizeText(readFileSync(docPath, 'utf8'));
  const configuredRel = config.paths?.[templateKey];
  if (configuredRel) {
    const configuredFull = path.join(repoRoot, configuredRel);
    if (existsSync(configuredFull) && normalizeText(readFileSync(configuredFull, 'utf8')) === docNorm) {
      return true;
    }
  }
  const bundledFull = path.join(PLUGIN_ROOT, 'skills/plan-product/assets/templates', bundledAssetFile);
  return existsSync(bundledFull) && normalizeText(readFileSync(bundledFull, 'utf8')) === docNorm;
}

function checkMarkdownRelativeLinks(fullPath, repoRoot, fail, label) {
  const content = readFileSync(fullPath, 'utf8');
  const contentWithoutCode = stripMarkdownCode(content);
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(contentWithoutCode)) !== null) {
    const rawTarget = match[2].trim();
    const target =
      rawTarget.startsWith('<') && rawTarget.endsWith('>')
        ? rawTarget.slice(1, -1).trim()
        : rawTarget;
    if (
      !target ||
      /^(?:https?|mailto|file|tel|urn):/i.test(target) ||
      target.startsWith('#')
    ) {
      continue;
    }
    const targetFile = target.split('#')[0].trim();
    if (!targetFile) continue;
    const resolved = path.resolve(path.dirname(fullPath), targetFile);
    const relToRepo = path.relative(repoRoot, resolved);
    if (relToRepo.startsWith('..') || path.isAbsolute(relToRepo)) {
      fail(`Escaping relative link in ${label}: ${targetFile} escapes repo_root`);
      continue;
    }
    if (!existsSync(resolved)) {
      fail(`Broken relative link in ${label}: ${targetFile} (resolved to ${relToRepo.replaceAll('\\', '/')})`);
    }
  }
}

function validateGitAttributesAndDocsIgnore(repoRoot, fail, pass, { requireGitattributes = false } = {}) {
  if (requireGitattributes) {
    const gitattributesPath = path.join(repoRoot, '.gitattributes');
    if (!existsSync(gitattributesPath) || !lstatSync(gitattributesPath).isFile()) {
      fail('Missing root .gitattributes (must enforce LF line endings with eol=lf)');
    } else {
      const activeLines = readFileSync(gitattributesPath, 'utf8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));
      if (!activeLines.some(line => /\beol=lf\b/i.test(line))) {
        fail('.gitattributes must enforce LF line endings (missing active eol=lf rule)');
      } else {
        pass('.gitattributes enforces LF line endings (eol=lf)');
      }
    }
  }

  let docsIgnoredInFile = false;
  const gitignorePath = path.join(repoRoot, '.gitignore');
  if (existsSync(gitignorePath) && lstatSync(gitignorePath).isFile()) {
    for (const rawLine of readFileSync(gitignorePath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      if (line.startsWith('!')) {
        const neg = line.slice(1).trim();
        if (/^\/?docs\/?$/.test(neg)) {
          docsIgnoredInFile = false;
        }
        continue;
      }
      if (/^(?:\/|\*\*\/)?docs(?:\/(?:\*\*?)?)?$/.test(line)) {
        docsIgnoredInFile = true;
      }
    }
  }
  if (docsIgnoredInFile) {
    fail("'docs/' directory must be tracked in Git and never ignored in .gitignore");
  } else if (existsSync(path.join(repoRoot, '.git'))) {
    const res = spawnSync('git', ['check-ignore', '-q', 'docs'], {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    if (res.status === 0) {
      fail("'docs/' directory must be tracked in Git and never gitignored (git check-ignore matched docs)");
    }
  }
}

function validateRetiredAgentAndCodexTrees(repoRoot, fail) {
  const skillsRoot = path.join(repoRoot, 'skills');
  if (existsSync(skillsRoot) && statSync(skillsRoot).isDirectory()) {
    for (const skillEntry of readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!skillEntry.isDirectory()) continue;
      const skillDir = path.join(skillsRoot, skillEntry.name);
      const retiredAgentsDir = path.join(skillDir, 'agents');
      if (existsSync(retiredAgentsDir)) {
        fail(
          `Retired 'skills/${skillEntry.name}/agents/' directory detected (including legacy openai.yaml); use plural 'skills/${skillEntry.name}/sub-agents/' or '.codex-plugin/plugin.json'`
        );
      }
      function scanSkillSubtree(currentDir) {
        for (const item of readdirSync(currentDir, { withFileTypes: true })) {
          const itemFull = path.join(currentDir, item.name);
          const itemRel = path.relative(repoRoot, itemFull).replaceAll('\\', '/');
          if (['.nyssa-ai', '.nyssaai', '.nyssa', '.temp'].includes(item.name)) {
            fail(`Private or transient state directory inside skill tree: ${itemRel}`);
            continue;
          }
          if (item.isDirectory()) {
            scanSkillSubtree(itemFull);
          } else if (item.name === 'openai.yaml') {
            fail(
              `Retired Codex UI file '${itemRel}'; declare Codex UI card metadata in '.codex-plugin/plugin.json' interface instead`
            );
          }
        }
      }
      scanSkillSubtree(skillDir);
    }
  }

  const codexAdapterDir = path.join(repoRoot, 'harness-adapters/codex');
  if (existsSync(codexAdapterDir) && statSync(codexAdapterDir).isDirectory()) {
    function scanCodexAdapter(currentDir) {
      for (const item of readdirSync(currentDir, { withFileTypes: true })) {
        const itemFull = path.join(currentDir, item.name);
        const itemRel = path.relative(repoRoot, itemFull).replaceAll('\\', '/');
        if (item.isDirectory()) {
          scanCodexAdapter(itemFull);
        } else if (item.name === 'openai.yaml') {
          fail(
            `Retired dead Codex UI file '${itemRel}'; declare Codex UI card metadata in '.codex-plugin/plugin.json' interface instead`
          );
        }
      }
    }
    scanCodexAdapter(codexAdapterDir);
  }
}

function validateNoLeakedPathsOrRetiredTokens(repoRoot, fail, pass) {
  const scanRoots = ['skills', 'commands', 'src', 'scripts', 'harness-adapters'];
  const skipDirs = new Set(['node_modules', '.git', '.temp', '__pycache__', '.nyssa-ai']);
  const beforeFindings = [];
  const tokenFail = msg => {
    beforeFindings.push(msg);
    fail(msg);
  };

  function walkSourceDir(currentDir) {
    for (const item of readdirSync(currentDir, { withFileTypes: true })) {
      if (skipDirs.has(item.name)) continue;
      const fullPath = path.join(currentDir, item.name);
      const relPath = path.relative(repoRoot, fullPath).replaceAll('\\', '/');
      if (item.isSymbolicLink()) continue;
      if (item.isDirectory()) {
        walkSourceDir(fullPath);
        continue;
      }
      if (!item.isFile()) continue;
      if (item.name === BANNED_SOURCE_RULES.retiredSchemaFilename) {
        tokenFail(`Disallowed retired schema file '${relPath}'; use schema.json or config.schema.json`);
        continue;
      }
      if (relPath === 'src/validation/validate.mjs') continue;
      if (BINARY_EXTENSIONS.has(path.extname(item.name).toLowerCase())) continue;
      const text = readFileSync(fullPath, 'utf8');
      for (const { label, regex } of BANNED_SOURCE_RULES.patterns) {
        if (regex.test(text)) {
          tokenFail(`Disallowed ${label} in ${relPath}`);
        }
      }
    }
  }

  for (const dirName of scanRoots) {
    const fullRoot = path.join(repoRoot, dirName);
    if (existsSync(fullRoot) && statSync(fullRoot).isDirectory()) {
      walkSourceDir(fullRoot);
    }
  }
  if (beforeFindings.length === 0) {
    pass('Zero leaked machine-local paths or retired runtime tokens across skills/, commands/, src/, scripts/, and harness-adapters/');
  }
}

function validatePluginEvals(repoRoot, fail, pass) {
  for (const reqRel of ['evals/README.md', 'evals/matrix.json', 'evals/LATEST.md']) {
    const reqFull = path.join(repoRoot, reqRel);
    if (!existsSync(reqFull) || !statSync(reqFull).isFile()) {
      fail(`Missing mandatory evaluation file: ${reqRel}`);
    } else if (reqRel.endsWith('.md')) {
      checkMarkdownRelativeLinks(reqFull, repoRoot, fail, reqRel);
    }
  }

  const matrixPath = path.join(repoRoot, 'evals/matrix.json');
  if (existsSync(matrixPath) && statSync(matrixPath).isFile()) {
    let matrix = null;
    try {
      matrix = JSON.parse(readFileSync(matrixPath, 'utf8'));
    } catch (err) {
      fail(`evals/matrix.json is not valid JSON: ${err.message}`);
    }
    if (matrix !== null) {
      const beforeErrors = [];
      const matrixFail = msg => { beforeErrors.push(msg); fail(msg); };
      if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
        matrixFail('evals/matrix.json must be a JSON object');
      } else {
        if (matrix.schema !== 1) {
          matrixFail(`evals/matrix.json must set "schema": 1 (found ${JSON.stringify(matrix.schema)})`);
        }
        if (typeof matrix.suite_revision !== 'string' || !matrix.suite_revision.trim()) {
          matrixFail('evals/matrix.json must define a non-empty string "suite_revision"');
        }
        if (!Array.isArray(matrix.rows) || matrix.rows.length === 0) {
          matrixFail('evals/matrix.json must contain a non-empty "rows" array');
        } else {
          const seenRowKeys = new Set();
          for (const [idx, row] of matrix.rows.entries()) {
            if (!row || typeof row !== 'object' || Array.isArray(row)) {
              matrixFail(`evals/matrix.json rows[${idx}] must be an object`);
              continue;
            }
            for (const keyName of ['suite', 'harness', 'platform', 'config', 'remaining']) {
              if (typeof row[keyName] !== 'string' || !row[keyName].trim()) {
                matrixFail(`evals/matrix.json rows[${idx}].${keyName} must be a non-empty string`);
              }
            }
            if (typeof row.required !== 'boolean') {
              matrixFail(`evals/matrix.json rows[${idx}].required must be a boolean`);
            }
            const tupleKey = `${row.suite}\0${row.harness}\0${row.platform}\0${row.config}`;
            if (seenRowKeys.has(tupleKey)) {
              matrixFail(`evals/matrix.json contains duplicate (suite, harness, platform, config) key: (${row.suite}, ${row.harness}, ${row.platform}, ${row.config})`);
            }
            seenRowKeys.add(tupleKey);
          }
        }
      }
      if (beforeErrors.length === 0) {
        pass(`evals/matrix.json conforms to schema 1 (${matrix.rows.length} unique rows)`);
      }
    }
  }

  const wazaEvalRel = 'evals/waza/skills/plan-product/eval.yaml';
  const wazaEvalPath = path.join(repoRoot, wazaEvalRel);
  if (!existsSync(wazaEvalPath) || !statSync(wazaEvalPath).isFile()) {
    fail(`Missing Waza evaluation spec: ${wazaEvalRel}`);
    return;
  }
  const wazaErrors = [];
  const wazaFail = msg => { wazaErrors.push(msg); fail(msg); };
  const evalYaml = readFileSync(wazaEvalPath, 'utf8').replace(/\r\n/g, '\n');
  if (!/^skill:\s*["']?plan-product["']?\s*(?:#.*)?$/m.test(evalYaml)) {
    wazaFail(`${wazaEvalRel} must reference "skill: plan-product"`);
  }

  const wazaTasksDir = path.join(repoRoot, 'evals/waza/skills/plan-product/tasks');
  const taskFiles = existsSync(wazaTasksDir) && statSync(wazaTasksDir).isDirectory()
    ? readdirSync(wazaTasksDir).filter(f => f.endsWith('.yaml')).sort()
    : [];
  if (taskFiles.length === 0) {
    wazaFail('evals/waza/skills/plan-product/tasks/ must contain at least 1 single-TestCase .yaml file');
  } else {
    const seenTaskIds = new Set();
    for (const file of taskFiles) {
      const relTask = `evals/waza/skills/plan-product/tasks/${file}`;
      const rawTask = readFileSync(path.join(wazaTasksDir, file), 'utf8').replace(/\r\n/g, '\n');
      const firstContentLine = rawTask
        .split('\n')
        .map(line => line.trim())
        .find(line => line.length > 0 && !line.startsWith('#'));
      if (!firstContentLine || /^-(?:\s|$)/.test(firstContentLine) || /^tasks\s*:/.test(firstContentLine)) {
        wazaFail(`${relTask} must be a single TestCase mapping (must not start with "- " list item or "tasks:")`);
        continue;
      }
      const idMatch = rawTask.match(/^id:\s*["']?([^\s"'#]+)["']?\s*(?:#.*)?$/m);
      if (!idMatch) {
        wazaFail(`${relTask} missing top-level "id:"`);
      } else if (seenTaskIds.has(idMatch[1])) {
        wazaFail(`Duplicate Waza task id "${idMatch[1]}" in ${relTask}`);
      } else {
        seenTaskIds.add(idMatch[1]);
      }
      if (!/^name:\s*\S+/m.test(rawTask)) {
        wazaFail(`${relTask} missing top-level "name:"`);
      }
      if (!/^inputs:\s*(?:#.*)?$/m.test(rawTask) || !/^\s+prompt:\s*\S+/m.test(rawTask)) {
        wazaFail(`${relTask} missing "inputs:" with non-empty "prompt:"`);
      }
      if (!/^graders:\s*(?:#.*)?$/m.test(rawTask)) {
        wazaFail(`${relTask} missing top-level "graders:"`);
      } else {
        const gradersBlock = rawTask.split(/^graders:\s*(?:#.*)?$/m)[1] || '';
        const skillPaths = [...gradersBlock.matchAll(/^\s*skill_path:\s*["']?([^"'\r\n#]+?)["']?\s*(?:#.*)?$/gm)];
        if (skillPaths.length === 0) {
          wazaFail(`${relTask} graders must declare "skill_path:"`);
        } else {
          for (const [, sp] of skillPaths) {
            const trimmedSp = sp.trim();
            if (!existsSync(path.join(repoRoot, trimmedSp))) {
              wazaFail(`${relTask} references non-existent skill_path: ${trimmedSp}`);
            }
          }
        }
        const modes = [...gradersBlock.matchAll(/^\s*mode:\s*["']?([^"'\r\n#]+?)["']?\s*(?:#.*)?$/gm)];
        if (modes.length === 0) {
          wazaFail(`${relTask} graders must declare "mode:" (positive or negative)`);
        } else {
          for (const [, modeVal] of modes) {
            const trimmedMode = modeVal.trim();
            if (trimmedMode !== 'positive' && trimmedMode !== 'negative') {
              wazaFail(`${relTask} has invalid grader mode "${trimmedMode}" (expected "positive" or "negative")`);
            }
          }
        }
      }
    }
  }
  if (wazaErrors.length === 0) {
    pass(`Validated Waza eval.yaml and ${taskFiles.length} single-TestCase task files`);
  }
}

/**
 * Validate plugin structural integrity (when repoRoot === plugin_root) and planning documentation contracts in repoRoot.
 */
export function validate(repoRoot = PLUGIN_ROOT, options = {}) {
  repoRoot = path.resolve(repoRoot);
  const errors = [];
  const fail = msg => { errors.push(msg); console.error(`[FAIL] ${msg}`); };
  const pass = msg => console.log(`[PASS] ${msg}`);

  const isPluginRepo = repoRoot === PLUGIN_ROOT || options.validatePlugin === true;
  if (isPluginRepo) {
    console.log('--- 1. Validating Plugin Manifest & Harness-Adapter Assemblies ---');
    const readRepoJson = file => JSON.parse(readFileSync(path.join(repoRoot, file), 'utf8'));
    if (!existsSync(path.join(repoRoot, 'plugin.json'))) {
      fail('Root plugin.json is missing');
    } else {
      const manifest = readRepoJson('plugin.json');
      const portableFields = new Set([
        '$schema', 'name', 'version', 'description', 'author',
        'homepage', 'repository', 'license', 'keywords', 'extensions',
      ]);
      if (manifest.$schema !== 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json') {
        fail('plugin.json $schema must be "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"');
      }
      if (!manifest.name || manifest.name !== 'plan-product') fail('plugin.json name must be "plan-product"');
      if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) fail('plugin.json version must be valid semver');
      if (typeof manifest.homepage !== 'string' || !manifest.homepage) fail('plugin.json homepage must be a non-empty string');
      if (typeof manifest.repository !== 'string' || !manifest.repository) fail('plugin.json repository must be a non-empty string');
      if (manifest.license !== 'Apache-2.0') {
        fail(`plugin.json license must be "Apache-2.0" (found ${JSON.stringify(manifest.license)})`);
      }
      for (const key of Object.keys(manifest)) {
        if (!portableFields.has(key)) {
          fail(`plugin.json contains non-portable Agent Plugins v1 field: ${key}`);
        }
      }
      if (!existsSync(path.join(repoRoot, 'package.json'))) {
        fail('Root package.json is missing');
      } else {
        const pkg = readRepoJson('package.json');
        if (pkg.license !== manifest.license) {
          fail(`package.json license (${JSON.stringify(pkg.license)}) must match plugin.json license (${JSON.stringify(manifest.license)})`);
        } else {
          pass(`plugin.json and package.json license match (${manifest.license})`);
        }
        if (pkg.homepage && pkg.homepage !== manifest.homepage) {
          fail(`package.json homepage (${JSON.stringify(pkg.homepage)}) must match plugin.json homepage (${JSON.stringify(manifest.homepage)})`);
        }
      }
      if (!existsSync(path.join(repoRoot, 'CHANGELOG.md'))) {
        fail('Missing root CHANGELOG.md');
      }
      for (const rootDoc of ['README.md', 'CHANGELOG.md']) {
        const rootDocFull = path.join(repoRoot, rootDoc);
        if (existsSync(rootDocFull)) {
          checkMarkdownRelativeLinks(rootDocFull, repoRoot, fail, rootDoc);
        }
      }
      if (!existsSync(path.join(repoRoot, 'skills/plan-product/SKILL.md'))) {
        fail('Missing canonical skill: skills/plan-product/SKILL.md');
      }
      const commandFiles = existsSync(path.join(repoRoot, 'commands'))
        ? readdirSync(path.join(repoRoot, 'commands')).filter(f => f.endsWith('.md'))
        : [];
      if (commandFiles.length === 0) {
        fail('commands/ directory must contain at least one Markdown command wrapper');
      }
    }

    const hermesAdapterPath = path.join(repoRoot, 'harness-adapters/hermes/plugin.py');
    if (!existsSync(hermesAdapterPath) || !statSync(hermesAdapterPath).isFile()) {
      fail('Missing mandatory Hermes harness adapter: harness-adapters/hermes/plugin.py');
    } else {
      pass('Hermes harness adapter present (harness-adapters/hermes/plugin.py)');
    }

    const geminiExtPath = path.join(repoRoot, 'gemini-extension.json');
    if (!existsSync(geminiExtPath)) {
      fail('Missing root harness-adapter manifest: gemini-extension.json');
    } else {
      const geminiExt = readRepoJson('gemini-extension.json');
      if ('contextFileName' in geminiExt) {
        fail('gemini-extension.json must omit contextFileName so contributor GEMINI.md/AGENTS.md rules do not leak into consumer sessions');
      } else {
        pass('gemini-extension.json omits contextFileName');
      }
    }

    const tesslManifestPath = path.join(repoRoot, '.tessl-plugin/plugin.json');
    if (!existsSync(tesslManifestPath)) {
      fail('Missing root harness-adapter manifest: .tessl-plugin/plugin.json');
    } else {
      const tesslManifest = readRepoJson('.tessl-plugin/plugin.json');
      if (tesslManifest.skills !== './skills') {
        fail(`.tessl-plugin/plugin.json must set "skills": "./skills" (found ${JSON.stringify(tesslManifest.skills)})`);
      } else {
        pass('.tessl-plugin/plugin.json sets "skills": "./skills"');
      }
    }

    try {
      assemble('check', { repoRoot });
      pass('Harness-adapter assemblies (.claude-plugin, .codex-plugin, .cursor-plugin, .tessl-plugin, gemini-extension) in sync');
    } catch (err) {
      fail(err.message);
    }

    console.log('\n--- 2. Validating Scope Directives & Cognitive Formatting ---');
    const markdownFiles = [
      ...(existsSync(path.join(repoRoot, 'skills/plan-product/SKILL.md')) ? ['skills/plan-product/SKILL.md'] : []),
      ...(existsSync(path.join(repoRoot, 'skills/plan-product/workflows'))
        ? readdirSync(path.join(repoRoot, 'skills/plan-product/workflows'))
            .filter(f => f.endsWith('.md'))
            .sort()
            .map(f => `skills/plan-product/workflows/${f}`)
        : []),
      ...(existsSync(path.join(repoRoot, 'commands'))
        ? readdirSync(path.join(repoRoot, 'commands'))
            .filter(f => f.endsWith('.md'))
            .sort()
            .map(f => `commands/${f}`)
        : []),
    ];

    for (const rel of markdownFiles) {
      const full = path.join(repoRoot, rel);
      const content = readFileSync(full, 'utf8');
      const lines = content.split('\n');

      if (content.startsWith('\uFEFF')) {
        fail(`${rel} must not contain a UTF-8 BOM (\\uFEFF)`);
      }

      if (rel === 'skills/plan-product/SKILL.md') {
        const fm = parseYamlFrontmatter(content);
        if (!fm) {
          fail(`${rel} missing valid YAML frontmatter`);
        } else {
          if (fm.name !== 'plan-product') {
            fail(`${rel} frontmatter name must be "plan-product" (found ${JSON.stringify(fm.name)})`);
          }
          if (typeof fm.description !== 'string' || !fm.description.trim()) {
            fail(`${rel} frontmatter description must be a non-empty string`);
          } else if (fm.description.length > 1024) {
            fail(`${rel} frontmatter description exceeds 1024-character limit (${fm.description.length} chars)`);
          } else {
            pass(`${rel} frontmatter valid (name="plan-product", description=${fm.description.length} chars <= 1024)`);
          }
        }
      }

      if (!content.includes('> [!IMPORTANT] Scope Directive')) {
        fail(`${rel} missing '> [!IMPORTANT] Scope Directive' header`);
      } else {
        pass(`${rel} contains Scope Directive`);
      }

      if (lines.length > 500) {
        fail(`${rel} exceeds 500 line limit (${lines.length} lines)`);
      }

      if (rel === 'skills/plan-product/SKILL.md' || rel.startsWith('skills/plan-product/workflows/')) {
        const proseOnly = stripFencedCodeBlocks(content);
        if (!VERIFICATION_HEADING_REGEX.test(proseOnly) || !proseOnly.includes('- [ ]')) {
          fail(`${rel} missing '## Verification' section (/^##\\s+(?:\\d+\\.\\s+)?Verification\\b/m) with '- [ ]' checklist items`);
        }
      }

      checkMarkdownRelativeLinks(full, repoRoot, fail, rel);
    }

    console.log('\n--- 3. Validating Filesystem Roles & Directory Layout ---');
    const forbiddenSelfLoadedRoots = new Set(['.agents', '.hermes']);
    const retiredRootDirs = new Map([
      ['artifacts', "Retired 'artifacts/' directory at repo_root; stage distribution bundles under '.temp/dist/' instead"],
      ['adapters', "Retired 'adapters/' directory at repo_root; rename host registration glue to 'harness-adapters/'"],
    ]);
    const allowedTopLevelDirs = [
      'skills', 'src', 'test', 'evals', 'docs', 'scripts',
      'commands', 'harness-adapters', '.temp', '.github',
      '.claude-plugin', '.codex-plugin', '.cursor-plugin', '.tessl-plugin',
      '.nyssa-ai', '.claude', 'node_modules', '.git',
    ];
    for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
      if (forbiddenSelfLoadedRoots.has(entry.name)) {
        fail(
          `Forbidden self-loaded host directory at repo_root: ${entry.name}/ (stage bundles under .temp/dist/ or external --output-dir instead)`
        );
      } else if (retiredRootDirs.has(entry.name)) {
        fail(retiredRootDirs.get(entry.name));
      } else if (entry.isDirectory()) {
        if (!allowedTopLevelDirs.includes(entry.name)) {
          fail(`Non-canonical top-level directory: ${entry.name}`);
        }
      } else if (entry.isFile()) {
        const allowedFiles = [
          'plugin.json', 'package.json', 'package-lock.json', 'README.md', 'CHANGELOG.md', 'LICENSE',
          'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'gemini-extension.json', 'codegraph.json',
          '.gitignore', '.gitattributes',
        ];
        if (!allowedFiles.includes(entry.name)) {
          fail(`Loose non-canonical file at plugin_root: ${entry.name}`);
        }
      }
    }

    validateGitAttributesAndDocsIgnore(repoRoot, fail, pass, { requireGitattributes: true });
    validateRetiredAgentAndCodexTrees(repoRoot, fail);
    validateNoLeakedPathsOrRetiredTokens(repoRoot, fail, pass);

    if (existsSync(path.join(repoRoot, 'src')) && !existsSync(path.join(repoRoot, 'docs/code-map/codegraph.db'))) {
      fail('docs/code-map/codegraph.db is mandatory whenever src/ exists');
    }

    const allowedEvalsChildren = ['waza', 'scenarios', 'reports', 'tessl'];
    if (existsSync(path.join(repoRoot, 'evals'))) {
      const evalsChildren = readdirSync(path.join(repoRoot, 'evals'), { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);
      for (const child of evalsChildren) {
        if (!allowedEvalsChildren.includes(child)) {
          fail(`Non-canonical evals/ immediate subdirectory: evals/${child} (allowed: ${allowedEvalsChildren.join(', ')})`);
        } else {
          pass(`evals/${child} belongs to canonical whitelist`);
        }
      }
    }
    validatePluginEvals(repoRoot, fail, pass);

    const bannedSrcDirs = new Set(['adapters', 'cli', 'ports', 'storage', 'contracts', 'shared', 'utils', 'helpers', 'common', 'misc', 'types', 'models']);
    function scanSrcDirs(dir) {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        if (!item.isDirectory()) continue;
        if (bannedSrcDirs.has(item.name.toLowerCase())) {
          fail(`Banned horizontal directory inside src/: ${path.relative(repoRoot, path.join(dir, item.name)).replaceAll('\\', '/')}`);
        }
        scanSrcDirs(path.join(dir, item.name));
      }
    }
    if (existsSync(path.join(repoRoot, 'src'))) {
      scanSrcDirs(path.join(repoRoot, 'src'));
    }

    function scanTests(dir) {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const itemPath = path.join(dir, item.name);
        if (item.name === 'node_modules' || item.name === '.git' || item.name === '.temp' || item.name === '.nyssa-ai') continue;
        if (item.isDirectory()) {
          scanTests(itemPath);
        } else if (/\.(test|spec)\.(m?js|ts)$/.test(item.name)) {
          const rel = path.relative(repoRoot, itemPath).replaceAll('\\', '/');
          if (!rel.startsWith('test/unit/') && !rel.startsWith('test/use_case/') && !rel.startsWith('test/e2e/')) {
            fail(`Automated test file must reside under test/unit/, test/use_case/, or test/e2e/: ${rel}`);
          }
        }
      }
    }
    scanTests(repoRoot);
    pass('Automated test files isolated in test/unit/ and test/use_case/');
  } else {
    validateGitAttributesAndDocsIgnore(repoRoot, fail, pass, { requireGitattributes: false });
  }

  console.log('\n--- 4. Validating docs/ Lockdown, Concepts, Jargon & Development Plan ---');
  if (existsSync(path.join(repoRoot, '.nyssa-ai/plan-product/usage'))) {
    fail('Mutable usage state at .nyssa-ai/plan-product/usage/ is disallowed; route usage telemetry to runtime_root (.nyssa-ai/plan-product/runtime/usage/)');
  }

  const repoConfigFile = path.join(repoRoot, '.nyssa-ai/plan-product/config.json');
  if (existsSync(repoConfigFile)) {
    try {
      validatePlanningConfig(JSON.parse(readFileSync(repoConfigFile, 'utf8')), '.nyssa-ai/plan-product/config.json');
    } catch (err) {
      fail(err.message);
    }
  }

  const config = resolvePlanningConfig(repoRoot, { userHome: options.userHome ?? null });
  const docsDir = path.join(repoRoot, 'docs');
  if (existsSync(docsDir) && statSync(docsDir).isDirectory()) {
    const allowedDocsFiles = new Set(['GLOSSARY.md', 'product.md', 'features.md', 'tech-stack.md']);
    const allowedDocsDirs = new Set(['code-map', 'concepts', 'features', 'plans', 'learnings', 'specs']);
    for (const entry of readdirSync(docsDir, { withFileTypes: true })) {
      if (entry.isFile() && !allowedDocsFiles.has(entry.name)) {
        fail(`Disallowed file in docs/ allowed-set lockdown: docs/${entry.name}`);
      } else if (entry.isDirectory() && !allowedDocsDirs.has(entry.name)) {
        fail(`Disallowed directory in docs/ allowed-set lockdown: docs/${entry.name}/`);
      }
    }
    const glossaryPath = path.join(repoRoot, config.paths?.glossary || 'docs/GLOSSARY.md');
    if (!existsSync(glossaryPath)) {
      fail(`Mandatory Ubiquitous Language glossary missing: ${config.paths?.glossary || 'docs/GLOSSARY.md'}`);
    }
    const specsDir = path.join(docsDir, 'specs');
    if (existsSync(specsDir) && statSync(specsDir).isDirectory()) {
      for (const entry of readdirSync(specsDir, { withFileTypes: true })) {
        if (entry.isFile() && !entry.name.endsWith('.json')) {
          fail(`Disallowed non-JSON file inside docs/specs/: docs/specs/${entry.name}`);
        }
      }
    }
    const coreDocTemplates = [
      ['GLOSSARY.md', 'glossaryTemplate', 'glossary.md'],
      ['product.md', 'productTemplate', 'product.md'],
      ['features.md', 'featuresTemplate', 'features.md'],
      ['tech-stack.md', 'techStackTemplate', 'tech-stack.md'],
    ];
    for (const [docFile, templateKey, bundledFile] of coreDocTemplates) {
      const fullDoc = path.join(docsDir, docFile);
      if (existsSync(fullDoc) && !isTemplateOnlyDocument(fullDoc, repoRoot, config, templateKey, bundledFile)) {
        checkMarkdownRelativeLinks(fullDoc, repoRoot, fail, `docs/${docFile}`);
      }
    }
  }

  const featuresInventoryPath = path.join(repoRoot, config.structure?.features?.inventory || config.paths?.features || 'docs/features.md');
  if (existsSync(featuresInventoryPath)) {
    const invContent = readFileSync(featuresInventoryPath, 'utf8');
    for (const m of invContent.matchAll(/^\s*[-*]\s+\[[ x]\]\s+(F-\d{2}\.\d{2}):\s*(.+)$/gm)) {
      if (BANNED_FEATURE_TITLE_JARGON.test(m[2])) {
        fail(`Feature title for ${m[1]} in ${path.relative(repoRoot, featuresInventoryPath).replaceAll('\\', '/')} contains banned jargon (Surgical, Storage, Ingestion, or Syndication): ${m[2]}`);
      }
    }
  }

  const conceptsRel = config.structure?.concepts?.root || config.paths?.concepts || 'docs/concepts';
  const conceptsDir = path.join(repoRoot, conceptsRel);
  const featuresRel = config.structure?.features?.root || config.paths?.featureDocs || 'docs/features';
  const featuresDir = path.join(repoRoot, featuresRel);

  const conceptMap = new Map();
  if (existsSync(conceptsDir) && statSync(conceptsDir).isDirectory()) {
    const conceptFiles = readdirSync(conceptsDir).filter(f => f.endsWith('.md')).sort();
    for (const file of conceptFiles) {
      const fullPath = path.join(conceptsDir, file);
      const relPath = path.relative(repoRoot, fullPath).replaceAll('\\', '/');
      const fileMatch = file.match(/^c-(\d{2})-[a-z0-9-]+\.md$/);
      if (!fileMatch) {
        fail(`Concept filename does not match c-nn-short-slug.md pattern: ${relPath}`);
        continue;
      }
      const expectedId = `C-${fileMatch[1]}`;
      const content = readFileSync(fullPath, 'utf8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) {
        fail(`Concept file missing YAML frontmatter: ${relPath}`);
        continue;
      }
      const fm = fmMatch[1];
      const idMatch = fm.match(/^id:\s*(C-\d{2})\s*$/m);
      const kindMatch = fm.match(/^kind:\s*(flow|domain-model)(?:\s+#.*)?\s*$/m);
      const legacyTypeMatch = fm.match(/^type:\s*/m);
      const statusMatch = fm.match(/^status:\s*\S+/m);
      if (!idMatch || idMatch[1] !== expectedId) {
        fail(`Concept frontmatter id must match filename ID (${expectedId}) in ${relPath}`);
      }
      if (legacyTypeMatch) {
        fail(`Concept frontmatter uses retired 'type:' field instead of 'kind:' (Concept Kind) in ${relPath}`);
      }
      if (!kindMatch) {
        fail(`Concept frontmatter kind must be "flow" or "domain-model" in ${relPath}`);
      }
      if (!statusMatch) {
        fail(`Concept frontmatter missing status in ${relPath}`);
      }
      const expectedSeq = String(conceptMap.size + 1).padStart(2, '0');
      if (fileMatch[1] !== expectedSeq) {
        fail(`Concept numbering out of sequence: expected C-${expectedSeq} but found ${expectedId} in ${relPath}`);
      }

      const referencedFeatures = new Set();
      const partSection = content.split(/^## Participating Features\r?\n/m)[1]?.split(/^## /m)[0] || '';
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let m;
      while ((m = linkRegex.exec(partSection)) !== null) {
        const target = m[2].trim().split('#')[0];
        if (!target) continue;
        const resolved = path.resolve(path.dirname(fullPath), target);
        if (!existsSync(resolved)) {
          fail(`Concept ${expectedId} (${relPath}) links to non-existent feature: ${target}`);
        } else {
          referencedFeatures.add(resolved);
          const featContent = readFileSync(resolved, 'utf8');
          const conceptContextSection = featContent.split(/^## Conceptual Context\r?\n/m)[1]?.split(/^## /m)[0] || '';
          const hasReciprocal = conceptContextSection.includes(expectedId) || conceptContextSection.includes(file);
          if (!hasReciprocal) {
            fail(`Bi-directional link missing: Concept ${expectedId} (${relPath}) lists ${path.relative(repoRoot, resolved).replaceAll('\\', '/')}, but that feature's '## Conceptual Context' does not link back to ${expectedId}`);
          }
        }
      }
      conceptMap.set(expectedId, { file, fullPath, referencedFeatures });
      pass(`Validated concept ${expectedId} (${relPath})`);
    }
  }

  if (existsSync(featuresDir) && statSync(featuresDir).isDirectory()) {
    for (const entry of readdirSync(featuresDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        fail(`Disallowed file directly under ${featuresRel}/ (only f-gg.nn/ directories allowed): ${featuresRel}/${entry.name}`);
        continue;
      }
      if (!/^f-\d{2}\.\d{2}$/.test(entry.name)) {
        fail(`Non-canonical feature directory under ${featuresRel}/: ${featuresRel}/${entry.name}`);
        continue;
      }
      const featPath = path.join(featuresDir, entry.name, 'feature.md');
      if (!existsSync(featPath)) continue;
      const relFeat = path.relative(repoRoot, featPath).replaceAll('\\', '/');
      const featContent = readFileSync(featPath, 'utf8');
      const headingMatch = featContent.match(/^#\s+F-\d{2}\.\d{2}\s+(.+)$/m);
      if (headingMatch && BANNED_FEATURE_TITLE_JARGON.test(headingMatch[1])) {
        fail(`Feature title in ${relFeat} contains banned jargon (Surgical, Storage, Ingestion, or Syndication): ${headingMatch[1]}`);
      }
      checkMarkdownRelativeLinks(featPath, repoRoot, fail, relFeat);
      const conceptContextSection = featContent.split(/^## Conceptual Context\r?\n/m)[1]?.split(/^## /m)[0] || '';
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let m;
      while ((m = linkRegex.exec(conceptContextSection)) !== null) {
        const target = m[2].trim().split('#')[0];
        if (!target) continue;
        const resolved = path.resolve(path.dirname(featPath), target);
        if (!existsSync(resolved)) {
          fail(`Feature ${relFeat} links to non-existent concept in '## Conceptual Context': ${target}`);
        } else {
          const conceptContent = readFileSync(resolved, 'utf8');
          const partSection = conceptContent.split(/^## Participating Features\r?\n/m)[1]?.split(/^## /m)[0] || '';
          const featIdMatch = featContent.match(/^id:\s*(F-\S+)/m);
          const featId = featIdMatch ? featIdMatch[1] : entry.name;
          if (!partSection.includes(featId) && !partSection.includes(entry.name)) {
            fail(`Bi-directional link missing: Feature ${relFeat} links to concept ${path.relative(repoRoot, resolved).replaceAll('\\', '/')}, but that concept's '## Participating Features' does not reference ${featId}`);
          }
        }
      }
    }
  }

  const devPlanRel = config.structure?.developmentPlan?.file || config.paths?.developmentPlan || 'docs/plans/development-plan.md';
  const devPlanPath = path.join(repoRoot, devPlanRel);
  if (existsSync(devPlanPath)) {
    const devPlanContent = readFileSync(devPlanPath, 'utf8');
    if (/^\s*-\s+\[[ x]\]\s+R-\d+/m.test(devPlanContent)) {
      fail(`${devPlanRel} contains legacy R-* step IDs; use DP-pp.ss`);
    }
    if (!isTemplateOnlyDocument(devPlanPath, repoRoot, config, 'developmentPlanTemplate', 'development-plan.md')) {
      checkMarkdownRelativeLinks(devPlanPath, repoRoot, fail, devPlanRel);
    }
    pass(`Validated development plan (${devPlanRel})`);
  }

  console.log('\n--- Validation Result ---');
  if (errors.length > 0) {
    throw new Error(`Validation failed with ${errors.length} error(s).`);
  }
  console.log('All structural, manifest, lockdown, link, and cognitive checks passed successfully!');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    let targetRepo = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--repo-root' && i + 1 < args.length) targetRepo = args[++i];
      else if (!args[i].startsWith('-') && targetRepo === null) targetRepo = args[i];
    }
    validate(targetRepo ? path.resolve(targetRepo) : PLUGIN_ROOT);
  } catch (err) {
    console.error(`\n${err.message}`);
    process.exitCode = 1;
  }
}
