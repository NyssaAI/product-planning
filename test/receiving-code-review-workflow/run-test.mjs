import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const executePlan = read('skills/execute-plan/SKILL.md');
const executePlanRun = read('skills/execute-plan-run/SKILL.md');
const usingDevTools = read('skills/using-dev-tools/SKILL.md');
const readme = read('README.md');

if (!executePlan.includes('dev-tools:receiving-code-review')) {
  fail('execute-plan must invoke receiving-code-review for PR review feedback follow-up');
}

if (!executePlan.includes('review feedback') || !executePlan.includes('requested changes')) {
  fail('execute-plan must describe the review feedback / requested changes path');
}

if (!executePlanRun.includes('dev-tools:receiving-code-review')) {
  fail('execute-plan-run must use receiving-code-review when reviewer subagents find issues');
}

if (!usingDevTools.includes('"Address PR review feedback"') || !usingDevTools.includes('receiving-code-review')) {
  fail('using-dev-tools must route PR review feedback through receiving-code-review');
}

if (!readme.includes('receiving-code-review') || !readme.includes('review feedback')) {
  fail('README must document receiving-code-review as part of review feedback handling');
}

console.log('PASS: receiving-code-review is linked into execute-plan review feedback workflow');
