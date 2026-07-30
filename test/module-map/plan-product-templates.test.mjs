import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('plan-product uses configured template paths that exist', () => {
  const config = readJson('.plan-product/config.json');
  const skill = readFileSync('skills/plan-product/SKILL.md', 'utf8');

  for (const field of [
    'productTemplate',
    'featuresTemplate',
    'techStackTemplate',
    'featureTemplate',
    'useCaseTemplate',
    'patternLibraryTemplate',
    'patternExpectationsTemplate',
  ]) {
    assert.equal(typeof config.paths[field], 'string', `paths.${field}`);
    assert.ok(existsSync(config.paths[field]), config.paths[field]);
    if (!field.startsWith('pattern')) {
      assert.match(skill, new RegExp(`paths\\.${field}`), field);
    }
  }

  assert.doesNotMatch(skill, /# Product Feature Progress/);
  assert.doesNotMatch(skill, /# F-000 Feature Name/);
});

test('plan-roadmap uses configured paths and enforces tie-out validation', () => {
  const config = readJson('.plan-product/config.json');
  const skill = readFileSync('skills/plan-roadmap/SKILL.md', 'utf8');

  assert.equal(typeof config.paths.roadmap, 'string', 'paths.roadmap');
  assert.equal(typeof config.paths.roadmapTemplate, 'string', 'paths.roadmapTemplate');
  assert.ok(existsSync(config.paths.roadmapTemplate), config.paths.roadmapTemplate);
  assert.equal(typeof config.structure.roadmap.file, 'string', 'structure.roadmap.file');
  assert.equal(config.structure.roadmap.idPattern, 'R-NNN');

  for (const phrase of [
    'paths\\.roadmapTemplate',
    'paths\\.roadmap',
    'never renumber',
    'Resolution',
    'Coverage',
    'Ordering',
    'Reference integrity',
    'after:',
    'no cycles',
    'placeholder features',
  ]) {
    assert.match(skill, new RegExp(phrase), phrase);
  }
});

test('product doc templates live in .plan-product/templates only', () => {
  for (const path of [
    'scripts/bootstrap-templates/docs-product.md',
    'scripts/bootstrap-templates/docs-features.md',
    'scripts/bootstrap-templates/docs-tech-stack.md',
    'scripts/bootstrap-templates/docs-roadmap.md',
  ]) {
    assert.equal(existsSync(path), false, path);
  }
});

test('plan-product keeps a standard-depth discovery interview', () => {
  const skill = readFileSync('skills/plan-product/SKILL.md', 'utf8');

  for (const phrase of [
    'Interview Quality Bar',
    'Product capsule',
    'workflow gap',
    'solution shape',
    'dependencies or sequencing constraints',
    'high-level tech-stack context',
  ]) {
    assert.match(skill, new RegExp(phrase), phrase);
  }
});

test('plan-product keeps tech-stack capture light touch', () => {
  const skill = readFileSync('skills/plan-product/SKILL.md', 'utf8');
  const techStackTemplate = readFileSync('.plan-product/templates/tech-stack.md', 'utf8');

  assert.match(skill, /Keep tech-stack capture light touch/);
  assert.doesNotMatch(skill, /What core services and operational concerns/);
  assert.doesNotMatch(skill, /logging, observability\/health, error handling/);
  assert.doesNotMatch(techStackTemplate, /Logging:/);
  assert.doesNotMatch(techStackTemplate, /Observability:/);
  assert.doesNotMatch(techStackTemplate, /Security and access:/);
});
