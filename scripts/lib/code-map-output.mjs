import path from 'node:path';

/** Fallback code-map location when neither config file names one. */
export const DEFAULT_CODE_MAP_OUTPUT = 'docs/code-map/code-map.json';

/**
 * Resolve the shared code-map output contract used by both generators.
 *
 * @param {Record<string, unknown>} raw parsed plan-product.config.json (or `{}`)
 * @param {Record<string, unknown>} planProductPaths `.plan-product/config.json` `paths`
 * @param {{ warningPrefix?: string }} [options]
 * @returns {string} repo-relative, forward-slash path
 */
export function resolveCodeMapOutput(raw, planProductPaths, options = {}) {
  if (typeof raw.output === 'string') {
    if (
      typeof raw.codeMapOutput === 'string' &&
      raw.codeMapOutput !== raw.output
    ) {
      const prefix = options.warningPrefix ?? 'code-map';
      process.stderr.write(
        `${prefix}: plan-product.config.json sets both output (${raw.output}) and codeMapOutput (${raw.codeMapOutput}); using output\n`
      );
    }
    return raw.output;
  }
  if (typeof raw.codeMapOutput === 'string') {
    return raw.codeMapOutput;
  }
  if (typeof planProductPaths.codeMap === 'string') {
    return path.posix.join(
      planProductPaths.codeMap.replace(/\\/g, '/').replace(/\/$/, ''),
      'code-map.json'
    );
  }
  return DEFAULT_CODE_MAP_OUTPUT;
}
