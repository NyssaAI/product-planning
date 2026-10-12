#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCodeMapConfig } from '../code-map/lib/code-map-config.mjs';
import { findProjectRoot } from '../module-map/lib/project-root.mjs';
import { checkMapFreshness } from '../lib/map-freshness.mjs';

/** Bounded queries over canonical file records; callers means file dependents, not runtime calls. */
export function queryCodeMap(map, mode, term = '', limit = 20, offset = 0) {
  if (!['symbol', 'module', 'callers', 'coverage'].includes(mode)) throw new Error(`Unknown query: ${mode}`);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error('--limit must be an integer from 1 to 200');
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('--offset must be a nonnegative safe integer');
  if (mode !== 'coverage' && !term) throw new Error(`${mode} requires a search term`);
  const results = [];
  let total = 0;
  const add = row => { if (total++ >= offset && results.length < limit) results.push(row); };
  const files = map.files ?? [];
  const owned = new Set(files.filter(file => file.moduleId === term).map(file => file.path));
  if (mode === 'symbol' || mode === 'module') {
    for (const file of files) {
      if (mode === 'module' && !owned.has(file.path)) continue;
      if (mode === 'module') add({ kind: 'file', file: file.path, moduleId: file.moduleId, symbolCount: file.symbols?.length ?? 0 });
      for (const symbol of file.symbols ?? []) {
        if (mode === 'module' || symbol.name.toLowerCase().includes(term.toLowerCase())) {
          add({ ...symbol, kind: 'symbol', file: file.path, moduleId: file.moduleId });
        }
      }
    }
  }
  if (mode === 'module') {
    for (const endpoint of map.endpoints ?? []) if (owned.has(endpoint.file)) add({ ...endpoint, kind: 'endpoint', endpointKind: endpoint.kind });
  }
  if (mode === 'callers' || mode === 'module') {
    for (const edge of map.fileDependencies ?? []) {
      if (mode === 'callers' ? edge.to === term.replace(/\\/g, '/') : owned.has(edge.from) || owned.has(edge.to)) {
        add({ kind: 'file-dependency', ...edge });
      }
    }
  }
  if (mode === 'coverage') {
    for (const kind of ['unsupportedFiles', 'disabledFiles', 'unownedFiles', 'zeroSymbolFiles']) {
      for (const file of map.coverage?.[kind] ?? []) add({ kind, file });
    }
    for (const diagnostic of map.coverage?.diagnostics ?? []) add(diagnostic);
  }
  return {
    query: mode,
    term,
    meaning: mode === 'callers' ? 'Incoming static file dependencies, not symbol calls or a complete runtime impact analysis.' : 'Source evidence; verify relevant source before changing code.',
    ...(mode === 'coverage' ? { scannedFileCount: map.coverage?.scannedFileCount, limitations: map.coverage?.limitations } : {}),
    total,
    offset,
    nextOffset: offset + results.length < total ? offset + results.length : null,
    omitted: total - results.length,
    results,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [mode, ...args] = process.argv.slice(2);
    if (!mode || mode === '--help') {
      process.stdout.write('Usage: node <PLUGIN_ROOT>/scripts/map-code/query.mjs symbol|module|callers <term> [--limit 20] [--offset 0]\n       node <PLUGIN_ROOT>/scripts/map-code/query.mjs coverage [--limit 20] [--offset 0]\nUse nextOffset for the next page of the same unchanged map. callers queries an exact repo-relative file path and returns static file dependents.\n');
    } else {
      let term = '';
      let limit = 20;
      let offset = 0;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--limit') limit = Number(args[++i]);
        else if (args[i] === '--offset') offset = Number(args[++i]);
        else if (!term && !args[i].startsWith('-')) term = args[i];
        else throw new Error(`Unknown argument: ${args[i]}`);
      }
      const root = findProjectRoot();
      const config = loadCodeMapConfig(root);
      const map = JSON.parse(readFileSync(path.join(root, config.output), 'utf8'));
      process.stdout.write(`${JSON.stringify({ freshness: checkMapFreshness(root), ...queryCodeMap(map, mode, term, limit, offset) }, null, 2)}\n`);
    }
  } catch (error) {
    process.stderr.write(`code-map query: ${error.message}\n`);
    process.exitCode = 1;
  }
}
