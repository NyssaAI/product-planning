import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const skillPath = path.join(root, 'skills', 'add-bug', 'SKILL.md');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

if (!fs.existsSync(skillPath)) {
  fail('skills/add-bug/SKILL.md is missing');
}

const skill = fs.readFileSync(skillPath, 'utf8');

if (!skill.includes('name: add-bug')) {
  fail('add-bug frontmatter name is missing');
}

if (!skill.includes('docs/agent-files/bugs/')) {
  fail('add-bug must write to docs/agent-files/bugs/');
}

if (!skill.includes('Do NOT analyze, debug, resolve, fix, implement, or invoke systematic-debugging.')) {
  fail('add-bug must explicitly forbid implementation and analysis');
}

if (!skill.includes('When ready to fix it, invoke `dev-tools:fix-bug`')) {
  fail('add-bug must hand off to fix-bug instead of continuing');
}

if (/fix-bug-resolve|fix-bug-complete|execute-plan|write-plan/.test(skill)) {
  fail('add-bug must not reference implementation-phase entry points');
}

if (!read('test/skill-triggering/run-all.sh').includes('"add-bug"')) {
  fail('skill-triggering run-all must include add-bug');
}

if (!read('test/explicit-skill-requests/run-all.sh').includes('add-bug-please')) {
  fail('explicit-skill-requests run-all must include add-bug');
}

console.log('PASS: add-bug entry point is planning-only');
