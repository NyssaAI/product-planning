import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const architectureDocs = [
  'commands/map-architecture.md',
  'skills/map-architecture/SKILL.md',
];

const patternDocs = [
  'commands/find-code-patterns.md',
  'skills/find-code-patterns/SKILL.md',
];

const codexSkills = [
  'skills/map-code/SKILL.md',
  'skills/map-architecture/SKILL.md',
  'skills/find-code-patterns/SKILL.md',
];

test('consumer-facing architecture docs use plugin-root script paths', () => {
  for (const file of architectureDocs) {
    const text = readFileSync(file, 'utf8');
    assert.match(text, /\$\{?PLUGIN_ROOT\}?|<PLUGIN_ROOT>/, file);
    assert.doesNotMatch(
      text,
      /node scripts\/module-map\/generate\.mjs --arch/,
      file
    );
  }
});

test('consumer-facing pattern docs use plugin-root script paths', () => {
  for (const file of patternDocs) {
    const text = readFileSync(file, 'utf8');
    assert.match(text, /generate-patterns\.mjs/, file);
    assert.doesNotMatch(
      text,
      /node scripts\/code-map\/generate-patterns\.mjs/,
      file
    );
  }
});

test('Codex command-equivalent skills are packaged and use plugin-root script paths', () => {
  const mapCode = readFileSync('skills/map-code/SKILL.md', 'utf8');
  assert.match(mapCode, /^name: map-code$/m);
  assert.match(mapCode, /map-code\/generate\.mjs/);
  assert.doesNotMatch(mapCode, /module-map\/generate\.mjs/);
  assert.match(mapCode, /\$\{PLUGIN_ROOT\}/);

  const arch = readFileSync('skills/map-architecture/SKILL.md', 'utf8');
  assert.match(arch, /^name: map-architecture$/m);
  assert.match(arch, /--arch/);
  assert.match(arch, /generate-module-map\.mjs/);
  assert.match(arch, /\$\{PLUGIN_ROOT\}/);
  assert.doesNotMatch(arch, /node scripts\/module-map\/generate\.mjs --arch/);

  const patterns = readFileSync('skills/find-code-patterns/SKILL.md', 'utf8');
  assert.match(patterns, /^name: find-code-patterns$/m);
  assert.match(patterns, /generate-patterns\.mjs/);
  assert.match(patterns, /\$\{PLUGIN_ROOT\}/);
  assert.doesNotMatch(patterns, /node scripts\/code-map\/generate-patterns\.mjs/);

  for (const file of codexSkills) {
    const text = readFileSync(file, 'utf8');
    assert.match(text, /PLUGIN_ROOT/, file);
  }
});

test('Codex install docs do not promise bare plugin slash commands', () => {
  const readme = readFileSync('README.md', 'utf8');
  assert.doesNotMatch(readme, /Start a new Codex thread and invoke[^\n]*`\/map-code`/);
  assert.match(
    readme,
    /does not load plugin `commands\/` as bare slash commands/
  );

  const install = readFileSync('.codex/INSTALL.md', 'utf8');
  assert.match(install, /Codex does not load plugin `commands\/` as bare slash commands/);
});

test('init and planning docs route through supported commands and configured paths', () => {
  const exampleConfig = readFileSync(
    'scripts/module-map/plan-product.config.example.json',
    'utf8'
  );
  assert.doesNotMatch(exampleConfig, /npm run map-code -- --init/);
  assert.match(exampleConfig, /generate-module-map\.mjs --init/);

  const featureSkill = readFileSync('skills/plan-feature/SKILL.md', 'utf8');
  assert.match(featureSkill, /paths\.featureTemplate/);
  assert.match(featureSkill, /structure\.features\.featurePathPattern/);

  const featureCommand = readFileSync('commands/plan-feature.md', 'utf8');
  assert.match(featureCommand, /paths\.featureTemplate/);
  assert.match(featureCommand, /structure\.features\.featurePathPattern/);

  const useCaseSkill = readFileSync('skills/plan-use-case/SKILL.md', 'utf8');
  assert.match(useCaseSkill, /paths\.useCaseTemplate/);
  assert.match(useCaseSkill, /structure\.features\.useCasePathPattern/);

  const useCaseCommand = readFileSync('commands/plan-use-case.md', 'utf8');
  assert.match(useCaseCommand, /paths\.useCaseTemplate/);
  assert.match(useCaseCommand, /structure\.features\.useCasePathPattern/);

  const roadmapSkill = readFileSync('skills/plan-roadmap/SKILL.md', 'utf8');
  assert.match(roadmapSkill, /paths\.roadmapTemplate/);
  assert.match(roadmapSkill, /paths\.roadmap/);
  assert.match(roadmapSkill, /structure\.roadmap/);

  const roadmapCommand = readFileSync('commands/plan-roadmap.md', 'utf8');
  assert.match(roadmapCommand, /Load the `plan-roadmap` skill/);
  assert.match(roadmapCommand, /paths\.roadmap/);
  assert.match(roadmapCommand, /paths\.roadmapTemplate/);

  const patternSkill = readFileSync('skills/find-code-patterns/SKILL.md', 'utf8');
  assert.match(patternSkill, /paths\.patternLibrary/);
  assert.match(patternSkill, /paths\.patternExpectations/);

  const patternCommand = readFileSync('commands/find-code-patterns.md', 'utf8');
  assert.match(patternCommand, /paths\.patternLibrary/);
  assert.match(patternCommand, /paths\.patternExpectations/);
});

test('module-map README documents the supported flags, config keys, and environment', () => {
  const readme = readFileSync('scripts/module-map/README.md', 'utf8');
  for (const token of [
    '--migrate',
    '--runtimes',
    '--usage-report',
    '--with-project-manifest',
    '--include-comments',
    '--omit-comments',
    '--output-dir',
    'modules.minFiles',
    'modules.maxFiles',
    'modules.adapter',
    'modules.globs',
    'modules.manual',
    'modules.flows',
    'pinned[].exclude',
    'briefMaxCharsPerDoc',
    'apiRoutes.pathPrefix',
    'sourceRoots',
    'autoRegenerate',
    'preserveModule',
    'preserveScope',
    'projectName',
    'roots',
    'LOG_LEVEL',
    'DEBUG_PLAN_PRODUCT',
    'JAMAYNOR_HOME',
  ]) {
    assert.match(readme, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), token);
  }
  assert.doesNotMatch(readme, /test commands/);

  const exampleConfig = readFileSync(
    'scripts/module-map/plan-product.config.example.json',
    'utf8'
  );
  assert.equal(Object.hasOwn(JSON.parse(exampleConfig), 'test'), false);
});
