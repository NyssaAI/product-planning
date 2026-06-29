import { selectAdapter } from './adapters/index.mjs';
import { listRepoFiles } from './repo-files.mjs';

/**
 * @typedef {object} StackGraph
 * @property {import('./detection/types.mjs').StackGraphAdapter} adapter
 * @property {ReturnType<import('./detection/types.mjs').StackGraphAdapter['extract']>} graph
 */

/**
 * Select the stack-graph adapter for the repo and run a single extraction.
 * Returns null when no adapter matches. Module discovery and module-edge
 * derivation both consume this, so extracting it once and threading the result
 * avoids walking and parsing the whole repo twice per generate run.
 *
 * @param {string} repoRoot
 * @param {import('./config.mjs').CodeIndexerConfig} [config]
 * @returns {StackGraph | null}
 */
export function extractStackGraph(repoRoot, config) {
  const adapter = selectAdapter(repoRoot, config?.modules?.adapter);
  if (!adapter) {
    return null;
  }
  const graph = adapter.extract(repoRoot, listRepoFiles(repoRoot));
  return { adapter, graph };
}
