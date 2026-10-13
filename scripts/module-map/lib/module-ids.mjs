/** Module IDs become filenames on every supported platform. Reject ambiguous outputs. */
export function validateModuleIds(modules) {
  const seen = new Set();
  for (const { id } of modules) {
    if (typeof id !== 'string' || !id || /[<>:"/\\|?*\u0000-\u001f]/.test(id) ||
        /[. ]$/.test(id) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(id)) {
      throw new Error(`Invalid module id: ${JSON.stringify(id)}; use a portable filename segment`);
    }
    const key = id.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate module id: ${id}`);
    seen.add(key);
  }
}
