import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const mergePr = read('skills/merge-pr/SKILL.md');
const executePlan = read('skills/execute-plan/SKILL.md');
const usingDevTools = read('skills/using-dev-tools/SKILL.md');
const skillTriggering = read('test/skill-triggering/run-all.sh');
const explicitRequests = read('test/explicit-skill-requests/run-all.sh');

for (const required of [
  'user-invocable: false',
  'disable-model-invocation: true',
  'Internal sub-skill invoked by execute-plan after PR review approval.',
]) {
  if (!mergePr.includes(required)) {
    fail(`merge-pr is not marked internal: ${required}`);
  }
}

if (!executePlan.includes('Post-review closeout')) {
  fail('execute-plan must own post-review closeout');
}

if (!executePlan.includes('invoke `dev-tools:merge-pr`')) {
  fail('execute-plan must invoke merge-pr internally for approved PR closeout');
}

if (!usingDevTools.includes('"Merge the PR" / "PR is approved" / "land it" -> **execute-plan**')) {
  fail('using-dev-tools must route merge requests to execute-plan, not merge-pr');
}

if (skillTriggering.includes('"merge-pr"')) {
  fail('merge-pr must not be in public skill-triggering suite');
}

if (explicitRequests.includes('merge-pr-please')) {
  fail('merge-pr must not be in explicit public skill request suite');
}

console.log('PASS: merge-pr is internal closeout under execute-plan');
