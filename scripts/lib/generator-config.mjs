import { existsSync } from 'node:fs';
import path from 'node:path';
import { resolveRepoContainedPath } from './repo-paths.mjs';

export const GENERATOR_CONFIG = '.jamaynor/plan-product/config.json';
export const LEGACY_GENERATOR_CONFIG = 'plan-product.config.json';

// New repositories use the namespaced file. Existing root configs remain readable
// and editable until moved; a namespaced config always takes precedence.
export function resolveGeneratorConfigPath(repoRoot) {
  const preferred = resolveRepoContainedPath(repoRoot, GENERATOR_CONFIG, 'generator config');
  if (existsSync(preferred)) return preferred;
  const legacy = resolveRepoContainedPath(repoRoot, LEGACY_GENERATOR_CONFIG, 'legacy generator config');
  return existsSync(legacy) ? legacy : preferred;
}

export function hasGeneratorConfig(repoRoot) {
  return [GENERATOR_CONFIG, LEGACY_GENERATOR_CONFIG]
    .some(relative => existsSync(path.join(repoRoot, relative)));
}
