/**
 * Builds the module summary shown in the index and embedded module-map tables.
 * Uses the first sentence of the description. When it exceeds the per-line cap
 * it wraps onto a second line — the lines are joined with `<br>` so the
 * continuation renders under the same ("What it does") table column. Content
 * beyond the last allowed line is truncated with an ellipsis. Every break
 * falls on a word boundary, never mid-token.
 *
 * @param {string | undefined} description full module description
 * @param {string} fallbackId module id used when no description is present
 * @param {number} [lineLen] soft per-line length cap (column width)
 * @param {number} [maxLines] maximum wrapped lines before truncation
 * @returns {string}
 */
export function summarizeDescription(description, fallbackId, lineLen = 120, maxLines = 2) {
  const firstSentence = (description ?? '').split(/(?<=[.!?])\s/)[0].trim();
  if (!firstSentence) {
    return `${fallbackId} module`;
  }

  /** @type {string[]} */
  const lines = [];
  let rest = firstSentence;
  while (rest.length > 0 && lines.length < maxLines) {
    if (rest.length <= lineLen) {
      lines.push(rest);
      rest = '';
      break;
    }
    const head = rest.slice(0, lineLen);
    const lastSpace = head.lastIndexOf(' ');
    const cut = lastSpace > 0 ? lastSpace : lineLen;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  // More text remains than the allowed lines can hold: end on an ellipsis.
  if (rest.length > 0) {
    const last = lines.length - 1;
    lines[last] = `${lines[last].replace(/[\s,;:.–—-]+$/u, '')}…`;
  }

  return lines.join('<br>');
}
