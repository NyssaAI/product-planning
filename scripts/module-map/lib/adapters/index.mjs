/**
 * Stack graph adapter registry. Each adapter conforms to StackGraphAdapter
 * (see ../detection/types.mjs) and is selected by matches(), or forced by
 * `config.modules.discover`. Parallel language work plugs in by adding one
 * import + array entry here.
 */

import csharpAdapter from './csharp.mjs';
import pythonAdapter from './python.mjs';
import typescriptAdapter from './typescript.mjs';
import { createLogger } from '../logger.mjs';

const log = createLogger({ module: 'adapters' });

// Adapter/code-map asymmetry: code-map ships ast-grep rules for Go and Java
// (see scripts/code-map/sgconfig.yml + rules/), but code-indexer has NO stack-graph
// adapter for them — only csharp/python/typescript below. For a Go/Java repo,
// code-map still extracts symbols/endpoints, but code-indexer cannot build the
// import/reference FileGraph used for module dependsOn/usedBy edges. Writing
// those adapters is out of scope here; selectAdapter warns instead of silently
// returning null so the gap is observable.
/** @type {import('../detection/types.mjs').StackGraphAdapter[]} */
const ADAPTERS = [
  csharpAdapter,
  pythonAdapter,
  typescriptAdapter,
];

/**
 * Select an adapter for the repo. `forcedId` (from config) wins; otherwise the
 * first whose `matches()` returns true.
 *
 * @param {string} repoRoot
 * @param {string} [forcedId]
 * @returns {import('../detection/types.mjs').StackGraphAdapter | null}
 */
export function selectAdapter(repoRoot, forcedId) {
  if (forcedId) {
    const forced = ADAPTERS.find((a) => a.id === forcedId) ?? null;
    if (!forced) {
      log.warn(
        `no code-indexer stack-graph adapter for ${forcedId}; code-map symbols only`,
        { language: forcedId }
      );
    }
    return forced;
  }
  for (const adapter of ADAPTERS) {
    if (adapter.matches(repoRoot)) {
      return adapter;
    }
  }
  return null;
}
