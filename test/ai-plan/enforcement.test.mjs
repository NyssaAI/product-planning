import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function read(relPath) {
  return readFileSync(path.join(root, relPath), 'utf8').replace(/\r\n/g, '\n');
}

const usingAiPlan = read('skills/using-ai-plan/SKILL.md');
const writePlan = read('skills/write-plan/SKILL.md');
const executePlan = read('skills/execute-plan/SKILL.md');
const taskCreatedHook = read('hooks/hooks.json');

assert.match(
  usingAiPlan,
  /module-first enforcement/i,
  'using-ai-plan should name the module-first enforcement contract'
);

assert.match(
  usingAiPlan,
  /Planning context evidence/i,
  'using-ai-plan should define the evidence plans must carry'
);

assert.match(
  writePlan,
  /HARD GATE\s*—\s*ai-plan evidence/i,
  'write-plan should stop before saving a plan without ai-plan evidence'
);

assert.match(
  executePlan,
  /HARD GATE\s*—\s*ai-plan evidence/i,
  'execute-plan should reject implementation plans that omit ai-plan evidence'
);

assert.match(
  executePlan,
  /Do NOT invoke `execute-plan-run`/i,
  'execute-plan should block plan execution before dispatch when ai-plan evidence is missing'
);

assert.match(
  taskCreatedHook,
  /must be enforced by `design-spec`, `write-plan`, and `execute-plan`/i,
  'TaskCreated prompt should tell agents this is enforced, not advisory'
);

console.log('PASS: ai-plan enforcement text is present');
