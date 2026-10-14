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
  for (const [path, contents] of Object.entries(row.files || {})) {
    assert.ok(path && !path.includes('..') && !path.includes('\\') && !path.startsWith('/') && !path.includes(':'));
    assert.equal(typeof contents, 'string');
  }
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
  name: 'jamaynor/plan-product-planning', version: '0.1.0',
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
for (const row of cases.content) {
  await scenario('content', row.id, row.task, row.criteria);
  if (row.files) {
    const folder = join(output, 'content', row.id);
    for (const [path, contents] of Object.entries(row.files)) {
      const file = join(folder, 'fixture', path);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, contents);
    }
    await writeFile(join(folder, 'scenario.json'), JSON.stringify({
      fixtures: { project: { type: 'directory', path: './fixture', installPath: '.' } },
    }, null, 2) + '\n');
  }
}
console.log(`Prepared temporary plugin and scenarios at ${output}`);
