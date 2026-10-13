import { readFile, mkdir, writeFile, cp, readdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(await readFile(join(here, 'cases.json'), 'utf8'));
const source = resolve(process.argv[2] || join(here, '../..'));
const skills = (await readdir(join(source, 'skills'), { withFileTypes: true }))
  .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
assert.deepEqual(cases.routing.map(row => row.skill).sort(), skills);
for (const row of cases.routing) {
  for (const kind of ['positive', 'ambiguous', 'negative']) assert.ok(row[kind]?.trim());
}
assert.equal(new Set(cases.content.map(row => row.id)).size, cases.content.length);
for (const row of cases.content) {
  assert.equal(row.criteria.reduce((sum, item) => sum + item.weight, 0), 100);
  assert.equal(new Set(row.criteria.map(item => item.name)).size, row.criteria.length);
  assert.ok(row.task && row.criteria.every(item => item.description && item.weight > 0));
}
console.log(`Validated ${cases.routing.length * 3} routing cases and ${cases.content.length} content cases.`);
if (!process.argv[3]) process.exit(0);
const output = resolve(process.argv[3]);
// A fresh destination prevents accidentally replacing another run or source tree.
await mkdir(output);
for (const path of ['skills', 'scripts', '.plan-product', 'commands', 'package.json', 'package-lock.json']) {
  await cp(join(source, path), join(output, path), { recursive: true });
}
await mkdir(join(output, '.tessl-plugin'));
await writeFile(join(output, '.tessl-plugin/plugin.json'), JSON.stringify({
  name: 'jamaynor/plan-product-review', version: '0.1.0',
  description: 'Temporary evaluation adapter for plan-product', private: true,
}, null, 2));
async function scenario(group, id, task, criteria) {
  const folder = join(output, group, id);
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, 'task.md'), task + '\n');
  await writeFile(join(folder, 'scenario.json'), '{}\n');
  await writeFile(join(folder, 'criteria.json'), JSON.stringify({
    context: 'Judge the requested behavior; equivalent correct wording receives full credit. Do not reward merely repeating the prompt.',
    type: 'weighted_checklist',
    checklist: criteria.map(({ weight, ...criterion }) => ({ ...criterion, max_score: weight })),
  }, null, 2) + '\n');
}
for (const row of cases.routing) {
  for (const kind of ['positive', 'ambiguous', 'negative']) {
    await scenario('routing', `${row.skill}-${kind}`, row[kind], [
      { name: 'Routing observation only', description: 'This case is unscored. Inspect natural skill activation against cases.json.', weight: 1 },
    ]);
  }
}
for (const row of cases.content) await scenario('content', row.id, row.task, row.criteria);
const fixture = join(output, 'content', 'scoped-map-artifact', 'fixture');
const files = {
  'docs/code-map/index.md': '# Modules\n- [billing](modules/billing.md)\n- [accounts](modules/accounts.md)\n- [analytics](modules/analytics.md)\n',
  'docs/code-map/modules/billing.md': '# Billing\nSnapshot is stale. Previous endpoint: src/billing/cancel-old.js. Calls accounts authorization.\n',
  'docs/code-map/modules/accounts.md': '# Accounts\nAuthorization: src/accounts/authorize.js.\n',
  'docs/code-map/modules/analytics.md': '# Analytics\nReporting: src/analytics/report.js. No cancellation ownership recorded.\n',
  'src/billing/cancel.js': "import { authorize } from '../accounts/authorize.js';\nexport function cancel(actor, subscription) {\n  authorize(actor, subscription.owner);\n  return { ...subscription, status: 'cancelled' };\n}\n",
  'src/accounts/authorize.js': "export function authorize(actor, owner) { if (actor.id !== owner) throw new Error('Forbidden'); }\n",
  'src/analytics/report.js': 'export const report = records => records.length;\n',
};
for (const [path, content] of Object.entries(files)) {
  await mkdir(dirname(join(fixture, path)), { recursive: true });
  await writeFile(join(fixture, path), content);
}
await scenario('content', 'scoped-map-artifact',
  'Plan a change to let administrators cancel a subscription owned by another user. Use this repository and its generated context. Write implementation-plan.md with the actual edit targets, proposed behavior and meaningful verification. Do not implement the change.', [
    { name: 'Verified edit targets', description: 'Writes implementation-plan.md referencing existing billing cancellation and accounts authorization sources; rejects the stale cancel-old.js path based on source inspection.', weight: 40 },
    { name: 'Behavior and regression coverage', description: 'Plan covers administrator cancellation, existing owner success, and unrelated non-owner denial without weakening authorization globally.', weight: 40 },
    { name: 'Bounded evidence and limitations', description: 'Uses the index and directly relevant module/source context; distinguishes generated hints from current source evidence and avoids unsupported claims of complete dependency coverage.', weight: 20 },
  ]);
await writeFile(join(output, 'content/scoped-map-artifact/scenario.json'), JSON.stringify({
  fixtures: { codebase: { type: 'directory', path: './fixture', installPath: '.' } },
}, null, 2));
console.log(`Prepared temporary plugin and scenarios at ${output}`);
