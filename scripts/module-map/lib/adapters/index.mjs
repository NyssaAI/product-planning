/**
 * Stack graph adapter registry. Each adapter conforms to StackGraphAdapter
 * (see ../detection/types.mjs) and is selected by matches(), or forced by
 * `config.modules.discover`. Parallel language work plugs in by adding one
 * import + array entry here.
 */

import csharpAdapter from './csharp.mjs';
import goAdapter from './go.mjs';
import pythonAdapter from './python.mjs';
import typescriptAdapter from './typescript.mjs';
import { createLogger } from '../logger.mjs';

const log = createLogger({ module: 'adapters' });

// Selection is first-match-wins in this order. Go is appended after the
// original three so polyglot repos keep their existing adapter selection.
/** @type {import('../detection/types.mjs').StackGraphAdapter[]} */
const ADAPTERS = [
  csharpAdapter,
  pythonAdapter,
  typescriptAdapter,
  goAdapter,
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
        `no plan-product stack-graph adapter for ${forcedId}; code-map symbols only`,
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
