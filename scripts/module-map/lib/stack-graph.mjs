import { selectAdapters } from './adapters/index.mjs';
import { loadCodeMapConfig, SOURCE_EXTENSIONS } from '../../code-map/lib/code-map-config.mjs';
import { sourceInventory } from '../../code-map/lib/source-files.mjs';
import { listRepoFiles } from './repo-files.mjs';
import path from 'node:path';

/**
 * @typedef {object} StackGraph
 * @property {import('./detection/types.mjs').StackGraphAdapter} adapter
 * @property {ReturnType<import('./detection/types.mjs').StackGraphAdapter['extract']>} graph
 */

/**
 * Run each enabled adapter over the shared source inventory. Module discovery
 * and module-edge derivation reuse the result. Required scan failures abort;
 * unsupported files and unresolved imports remain explicit coverage diagnostics.
 *
 * @param {string} repoRoot
 * @param {import('./config.mjs').PlanProductConfig} [config]
 * @returns {StackGraph}
 */
export function extractStackGraph(repoRoot, config, inventory = sourceInventory(repoRoot, loadCodeMapConfig(repoRoot))) {
  const adapters = selectAdapters(inventory.files, config?.modules?.adapter);
  const allowed = new Set(inventory.files);
  const files = new Map(inventory.files.map(file => [file, { path: file, symbols: [] }]));
  const edges = new Map();
  const diagnostics = [];
  const extractedFiles = new Set();
  // Resolution manifests supply context; they never expand the source boundary.
  const context = listRepoFiles(repoRoot).filter(file =>
    !SOURCE_EXTENSIONS.has(path.extname(file)) &&
    /(?:\.csproj|\.sln|(?:^|\/)go\.(?:mod|work)|(?:^|\/)(?:package\.json|tsconfig[^/]*\.json|pyproject\.toml|setup\.cfg))$/.test(file));
  for (const adapter of adapters) {
    const graph = adapter.extract(repoRoot, [...inventory.files, ...context]);
    const failure = graph.diagnostics?.find(item => item.kind === 'extraction-failed');
    if (failure) throw new Error(`${adapter.id} dependency extraction failed: ${failure.message}`);
    for (const file of graph.files) if (allowed.has(file.path)) {
      files.set(file.path, file);
      extractedFiles.add(file.path);
    }
    for (const edge of graph.edges) {
      if (allowed.has(edge.from) && allowed.has(edge.to)) {
        edges.set(`${edge.from}\0${edge.to}`, { ...edge, adapter: adapter.id });
      } else diagnostics.push({ kind: 'outside-source-inventory', ...edge, adapter: adapter.id });
    }
    diagnostics.push(...(graph.diagnostics ?? []).map(item => ({ ...item, adapter: adapter.id })));
  }
  for (const file of inventory.files) if (!extractedFiles.has(file)) diagnostics.push({ kind: 'dependency-coverage-unavailable', file });
  return {
    adapter: { id: adapters.map(adapter => adapter.id).join('+') || 'none' },
    adapters: adapters.map(adapter => adapter.id),
    inventory,
    graph: {
      files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)),
      edges: [...edges.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
      diagnostics,
    },
  };
}
