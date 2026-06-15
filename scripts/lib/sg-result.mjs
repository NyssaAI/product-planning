/**
 * Shared parsing helpers for ast-grep `scan --json` output.
 *
 * These were previously copied across sg-scan.mjs, the python/typescript
 * adapters, and code-map's generate-code-map.mjs. Centralizing them keeps the
 * JSON shape and the symbol-name extraction (including the METHOD fallback)
 * identical across every consumer.
 *
 * Public Interface:
 * - parseScanJson(stdout) -> match[]
 * - symbolNameFromMatch(match) -> string | null
 *
 * Symbol-name contract: the returned `name` is the raw captured identifier
 * (`$NAME`, or `$METHOD` for method declarations). It is NOT namespace- or
 * type-qualified. The C# adapter qualifies its declarations with the enclosing
 * namespace downstream (see csharp.mjs buildDeclarations); the TypeScript and
 * Python adapters emit these bare identifiers as-is.
 */

/**
 * @param {string} stdout
 * @returns {Array<Record<string, unknown>>}
 */
export function parseScanJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }
  const data = JSON.parse(trimmed);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {Record<string, unknown>} match
 * @returns {string | null}
 */
export function symbolNameFromMatch(match) {
  const meta = /** @type {{ single?: Record<string, { text?: string }> }} */ (
    match.metaVariables
  );
  return meta?.single?.NAME?.text ?? meta?.single?.METHOD?.text ?? null;
}
