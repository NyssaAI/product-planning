import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const fixBugPath = path.join(root, 'skills', 'fix-bug', 'SKILL.md');
const policyPath = path.join(root, 'skills', 'fix-bug', 'references', 'policy.md');
const designSpecPath = path.join(root, 'skills', 'design-spec', 'SKILL.md');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const fixBug = fs.readFileSync(fixBugPath, 'utf8');
const policy = fs.readFileSync(policyPath, 'utf8');
const designSpec = fs.readFileSync(designSpecPath, 'utf8');

for (const required of [
  'Classify route',
  'Simple bug route',
  'Complex bug route',
  'one production file',
  'No design decision',
  'route to `dev-tools:design-spec`',
]) {
  if (!fixBug.includes(required)) {
    fail(`fix-bug skill missing required routing text: ${required}`);
  }
}

if (!fixBug.includes('Do not use the simple bug route for schema, migration, auth/security, API contract, cross-module, or product behavior changes.')) {
  fail('fix-bug must forbid the simple route for risky bug categories');
}

if (!fixBug.includes('If any simple-bug criterion fails, use the complex bug route.')) {
  fail('fix-bug must default to complex route when the simple gate is not fully satisfied');
}

if (!policy.includes('Simple bugs may skip design-spec only when all simple-bug criteria are satisfied.')) {
  fail('fix-bug policy must document the simple-bug exception');
}

if (!designSpec.includes('bug detail file at `docs/agent-files/bugs/{bug_id}/{bug_id}-detail.md`')) {
  fail('design-spec must accept bug detail files as input for complex bug fixes');
}

console.log('PASS: fix-bug routes simple bugs directly and complex bugs through design');
