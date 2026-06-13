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

const skill = read('skills/systematic-debugging/SKILL.md');
const fixBug = read('skills/fix-bug/SKILL.md');
const skillTriggering = read('test/skill-triggering/run-all.sh');
const explicitRequests = read('test/explicit-skill-requests/run-all.sh');

for (const required of [
  'user-invocable: false',
  'disable-model-invocation: true',
  'Internal sub-skill invoked by fix-bug Step 2.',
]) {
  if (!skill.includes(required)) {
    fail(`systematic-debugging is not marked internal: ${required}`);
  }
}

if (!fixBug.includes('dev-tools:systematic-debugging')) {
  fail('fix-bug must still invoke systematic-debugging for Step 2 analysis');
}

if (skillTriggering.includes('"systematic-debugging"')) {
  fail('systematic-debugging must not be in public skill-triggering suite');
}

if (explicitRequests.includes('use-systematic-debugging')) {
  fail('systematic-debugging must not be in explicit public skill request suite');
}

console.log('PASS: systematic-debugging is internal and still used by fix-bug');
