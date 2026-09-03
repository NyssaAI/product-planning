/**
 * C# stack graph adapter. Produces a FileGraph (symbols + file->file edges)
 * for a .NET repo, conforming to StackGraphAdapter (see ../detection/types.mjs).
 *
 * Public Interface:
 * - default adapter object
 *   - id: 'csharp'
 *   - matches(repoRoot) -> boolean
 *   - extract(repoRoot, files) -> FileGraph
 *
 * Dependencies:
 * - .csproj metadata for root namespaces and project-reference visibility
 * - C# source text for declarations, using directives, and type references
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '../logger.mjs';
import { resolveAstGrepBinary } from '../../../lib/resolve-ast-grep.mjs';
import { runBatchedScan } from './sg-scan.mjs';
import { BASE_SKIP_DIRS } from '../../../lib/skip-dirs.mjs';

const log = createLogger({ module: 'adapter-csharp' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CODE_MAP_DIR = path.resolve(__dirname, '../../../code-map');

// Structural type-declaration rules: match each C# declaration node on the
// tree-sitter parse tree and capture its name. Replaces the previous TYPE_DECL
// regex so declarations are sourced from the syntax tree, not text. One rule
// per declaration kind (any visibility).
const CSHARP_DECL_RULES = [
  ['class', 'class_declaration'],
  ['interface', 'interface_declaration'],
  ['struct', 'struct_declaration'],
  ['enum', 'enum_declaration'],
  ['record', 'record_declaration'],
]
  .map(
    ([kind, node]) => `id: plan-product-csharp-${kind}
language: CSharp
metadata: { mapKind: ${kind} }
rule: { kind: ${node}, has: { field: name, pattern: $NAME } }`
  )
  .join('\n---\n');

const IDENT = /\b[A-Z][A-Za-z0-9_]*\b/g;
const QUALIFIED_IDENT = /\b[A-Z][A-Za-z0-9_]*(?:\.[A-Z][A-Za-z0-9_]*)+\b/g;
// Shared base infra/test-output dirs plus the Visual Studio cache.
const SKIP_DIRS = new Set([...BASE_SKIP_DIRS, '.vs']);

/** @type {import('../detection/types.mjs').StackGraphAdapter} */
const csharpAdapter = {
  id: 'csharp',

  matches(repoRoot) {
    return hasDotnetSignal(repoRoot);
  },

  extract(repoRoot, files) {
    try {
      return extractGraph(repoRoot, files);
    } catch (error) {
      log.warn('csharp adapter extract failed; returning empty graph', {
        error: errorMessage(error),
      });
      return { files: [], edges: [] };
    }
  },
};

export default csharpAdapter;

/**
 * @param {string} repoRoot
 * @param {string[]} files
 * @returns {import('../detection/types.mjs').FileGraph}
 */
function extractGraph(repoRoot, files) {
  const candidateFiles = [...new Set(files.map(normalizePath))]
    .filter((f) => f.endsWith('.cs'))
    .sort();
  const projects = discoverProjects(repoRoot);
  const csFiles = candidateFiles.filter((f) =>
    projectIncludesSource(f, projectForFile(f, projects))
  );
  const globalUsings = collectGlobalUsings(repoRoot, csFiles, projects);
  const declsByFile = extractDeclarationsByFile(repoRoot, csFiles);

  /** @type {Map<string, FileInfo>} */
  const fileInfos = new Map();
  /** @type {Map<string, TypeDecl[]>} */
  const bySimpleName = new Map();
  /** @type {Map<string, TypeDecl[]>} */
  const byFullName = new Map();

  for (const rel of csFiles) {
    let content;
    try {
      content = readFileSync(path.join(repoRoot, rel), 'utf8');
    } catch {
      continue;
    }
    const project = projectForFile(rel, projects);
    const clean = maskCommentsAndStrings(content);
    const namespace = declaredNamespace(clean) ?? inferredNamespace(rel, project);
    const fileUsings = parseUsings(clean);
    const declarations = buildDeclarations(
      declsByFile.get(rel) ?? [],
      rel,
      namespace,
      project
    );
    const info = {
      path: rel,
      content,
      clean,
      namespace,
      project,
      usings: mergeUsings(globalUsings.get(project?.path ?? '') ?? emptyUsings(), fileUsings),
      declarations,
    };
    fileInfos.set(rel, info);

    for (const decl of declarations) {
      addToIndex(bySimpleName, decl.simpleName, decl);
      addToIndex(byFullName, decl.fullName, decl);
    }
  }

  /** @type {Map<string, Set<string>>} */
  const edgeTypes = new Map();
  for (const info of fileInfos.values()) {
    const ownFullNames = new Set(info.declarations.map((d) => d.fullName));
    for (const decl of referencedTypes(info, bySimpleName, byFullName)) {
      if (decl.path === info.path || ownFullNames.has(decl.fullName)) {
        continue;
      }
      if (!projectCanSee(info.project, decl.project)) {
        continue;
      }
      const key = `${info.path}\t${decl.path}`;
      if (!edgeTypes.has(key)) {
        edgeTypes.set(key, new Set());
      }
      edgeTypes.get(key).add(decl.fullName);
    }
  }

  const edges = [...edgeTypes.entries()]
    .map(([key, types]) => {
      const [from, to] = key.split('\t');
      return { from, to, weight: types.size };
    })
    .sort(
      (a, b) =>
        a.from.localeCompare(b.from) ||
        a.to.localeCompare(b.to) ||
        a.weight - b.weight
    );

  const filesOut = csFiles.map((p) => ({
    path: p,
    symbols: (fileInfos.get(p)?.declarations ?? []).map((d) => ({
      name: d.fullName,
      kind: d.kind,
      line: d.line,
    })),
  }));

  log.debug('csharp adapter extract complete', {
    files: filesOut.length,
    types: byFullName.size,
    edges: edges.length,
  });
  return { files: filesOut, edges };
}

/**
 * @typedef {object} ProjectInfo
 * @property {string} path repo-relative .csproj path
 * @property {string} absPath
 * @property {string} dir repo-relative project directory
 * @property {string} absDir
 * @property {string} rootNamespace
 * @property {string} assemblyName
 * @property {Set<string>} references referenced repo-relative .csproj paths
 * @property {string[]} compileIncludes
 * @property {string[]} compileRemoves
 */

/**
 * @typedef {object} TypeDecl
 * @property {string} simpleName
 * @property {string} fullName
 * @property {string} namespace
 * @property {string} kind
 * @property {number} line
 * @property {string} path
 * @property {ProjectInfo | null} project
 */

/**
 * @typedef {object} Usings
 * @property {Set<string>} namespaces
 * @property {Map<string, string>} aliases
 */

/**
 * @typedef {object} FileInfo
 * @property {string} path
 * @property {string} content
 * @property {string} clean
 * @property {string} namespace
 * @property {ProjectInfo | null} project
 * @property {Usings} usings
 * @property {TypeDecl[]} declarations
 */

/** @param {string} repoRoot @param {number} [limit] */
function hasDotnetSignal(repoRoot, limit = 800) {
  if (!existsSync(repoRoot)) {
    return false;
  }
  const stack = [repoRoot];
  let scanned = 0;
  while (stack.length > 0 && scanned < limit) {
    const dir = stack.pop();
    scanned += 1;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (
        e.isFile() &&
        (e.name.endsWith('.csproj') ||
          e.name.endsWith('.sln') ||
          e.name.endsWith('.slnx'))
      ) {
        return true;
      }
      if (e.isDirectory() && !SKIP_DIRS.has(e.name)) {
        stack.push(path.join(dir, e.name));
      }
    }
  }
  return false;
}

/**
 * @param {string} repoRoot
 * @returns {ProjectInfo[]}
 */
function discoverProjects(repoRoot) {
  /** @type {ProjectInfo[]} */
  const projects = [];
  const stack = [repoRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          stack.push(full);
        }
        continue;
      }
      if (!entry.name.endsWith('.csproj')) {
        continue;
      }
      projects.push(readProject(repoRoot, full));
    }
  }
  return projects.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * @param {string} repoRoot
 * @param {string} absPath
 * @returns {ProjectInfo}
 */
function readProject(repoRoot, absPath) {
  const text = readFileSync(absPath, 'utf8');
  const relPath = normalizePath(path.relative(repoRoot, absPath));
  const relDir = normalizePath(path.relative(repoRoot, path.dirname(absPath)));
  const projectName = path.basename(absPath, '.csproj');
  const rootNamespace = tagValue(text, 'RootNamespace') ?? projectName;
  const assemblyName = tagValue(text, 'AssemblyName') ?? projectName;
  const references = new Set();
  const compileIncludes = [];
  const compileRemoves = [];
  const refRe = /<ProjectReference\b[^>]*\bInclude=["']([^"']+)["'][^>]*>/gi;
  for (const match of text.matchAll(refRe)) {
    const refAbs = path.resolve(path.dirname(absPath), match[1]);
    references.add(normalizePath(path.relative(repoRoot, refAbs)));
  }
  const compileRe = /<Compile\b[^>]*\b(Include|Remove)=["']([^"']+)["'][^>]*>/gi;
  for (const match of text.matchAll(compileRe)) {
    if (match[1].toLowerCase() === 'include') {
      compileIncludes.push(normalizePath(match[2]));
    } else {
      compileRemoves.push(normalizePath(match[2]));
    }
  }
  return {
    path: relPath,
    absPath,
    dir: relDir === '' ? '.' : relDir,
    absDir: path.dirname(absPath),
    rootNamespace,
    assemblyName,
    references,
    compileIncludes,
    compileRemoves,
  };
}

/**
 * @param {string} text
 * @param {string} tag
 * @returns {string | null}
 */
function tagValue(text, tag) {
  const match = text.match(new RegExp(`<${tag}>\\s*([^<]+?)\\s*</${tag}>`, 'i'));
  return match?.[1]?.trim() ?? null;
}

/**
 * @param {string} rel
 * @param {ProjectInfo[]} projects
 * @returns {ProjectInfo | null}
 */
function projectForFile(rel, projects) {
  const normalized = normalizePath(rel);
  return (
    projects
      .filter((p) => p.dir === '.' || normalized.startsWith(`${p.dir}/`))
      .sort((a, b) => b.dir.length - a.dir.length)[0] ?? null
  );
}

/**
 * @param {ProjectInfo | null} source
 * @param {ProjectInfo | null} target
 * @returns {boolean}
 */
function projectCanSee(source, target) {
  if (!source || !target || source.path === target.path) {
    return true;
  }
  return source.references.has(target.path);
}

/**
 * @param {string} rel
 * @param {ProjectInfo | null} project
 * @returns {boolean}
 */
function projectIncludesSource(rel, project) {
  if (!project) {
    return true;
  }
  const projectRel = normalizePath(path.relative(project.dir, rel));
  if (project.compileRemoves.some((pattern) => globMatches(pattern, projectRel))) {
    return false;
  }
  if (project.compileIncludes.length === 0) {
    return true;
  }
  return project.compileIncludes.some((pattern) => globMatches(pattern, projectRel));
}

/**
 * @param {string} pattern
 * @param {string} value
 * @returns {boolean}
 */
function globMatches(pattern, value) {
  const normalizedPattern = normalizePath(pattern);
  const normalizedValue = normalizePath(value);
  const doubleStar = '__DOUBLE_STAR__';
  const escaped = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, doubleStar)
    .replace(/\*/g, '[^/]*')
    .replaceAll(doubleStar, '.*');
  return new RegExp(`^${escaped}$`).test(normalizedValue);
}

/**
 * @param {string} repoRoot
 * @param {string[]} files
 * @param {ProjectInfo[]} projects
 * @returns {Map<string, Usings>}
 */
function collectGlobalUsings(repoRoot, files, projects) {
  const byProject = new Map();
  for (const project of projects) {
    byProject.set(project.path, emptyUsings());
  }
  for (const rel of files) {
    let content;
    try {
      content = readFileSync(path.join(repoRoot, rel), 'utf8');
    } catch {
      continue;
    }
    const project = projectForFile(rel, projects);
    const key = project?.path ?? '';
    if (!byProject.has(key)) {
      byProject.set(key, emptyUsings());
    }
    const global = parseUsings(maskCommentsAndStrings(content), true);
    byProject.set(key, mergeUsings(byProject.get(key), global));
  }
  return byProject;
}

/**
 * Run one batched ast-grep scan over the C# files and group type declarations
 * (name, kind, line) by file. Sourced from the tree-sitter parse tree.
 *
 * @param {string} repoRoot
 * @param {string[]} csFiles repo-relative .cs files
 * @returns {Map<string, { simpleName: string, kind: string, line: number }[]>}
 */
function extractDeclarationsByFile(repoRoot, csFiles) {
  /** @type {Map<string, { simpleName: string, kind: string, line: number }[]>} */
  const byFile = new Map(csFiles.map((file) => [file, []]));
  if (csFiles.length === 0) {
    return byFile;
  }

  const binary = resolveAstGrepBinary({
    toolkitDir: CODE_MAP_DIR,
    projectRoot: repoRoot,
  });
  try {

    const matches = runBatchedScan(
      binary,
      repoRoot,
      csFiles.map((file) => path.join(repoRoot, file)),
      ['--inline-rules', CSHARP_DECL_RULES, '--include-metadata']
    );
    const candidateSet = new Set(csFiles);
    for (const match of matches) {
      const file = normalizePath(
        path.relative(repoRoot, String(match.file ?? ''))
      );
      if (!candidateSet.has(file)) {
        continue;
      }
      const meta = /** @type {{ single?: Record<string, { text?: string }> }} */ (
        match.metaVariables
      );
      const simpleName = meta?.single?.NAME?.text;
      if (!simpleName) {
        continue;
      }
      const metadata = /** @type {{ mapKind?: string }} */ (match.metadata ?? {});
      const range = /** @type {{ start?: { line?: number } }} */ (match.range);
      byFile.get(file).push({
        simpleName,
        kind: metadata.mapKind ?? 'class',
        line: (range?.start?.line ?? 0) + 1,
      });
    }
  } catch (error) {
    log.warn('C# declaration extraction failed', { error: errorMessage(error) });
  }

  return byFile;
}

/**
 * Build namespace-qualified TypeDecls for a file from its structural
 * declarations plus the file's namespace and owning project.
 *
 * @param {{ simpleName: string, kind: string, line: number }[]} names
 * @param {string} rel
 * @param {string} namespace
 * @param {ProjectInfo | null} project
 * @returns {TypeDecl[]}
 */
function buildDeclarations(names, rel, namespace, project) {
  return names
    .map(({ simpleName, kind, line }) => ({
      simpleName,
      fullName: namespace ? `${namespace}.${simpleName}` : simpleName,
      namespace,
      kind,
      line,
      path: rel,
      project,
    }))
    .sort((a, b) => a.line - b.line || a.fullName.localeCompare(b.fullName));
}

/**
 * @param {FileInfo} info
 * @param {Map<string, TypeDecl[]>} bySimpleName
 * @param {Map<string, TypeDecl[]>} byFullName
 * @returns {TypeDecl[]}
 */
function referencedTypes(info, bySimpleName, byFullName) {
  /** @type {Map<string, TypeDecl>} */
  const refs = new Map();

  for (const fullName of info.clean.matchAll(QUALIFIED_IDENT)) {
    for (const decl of byFullName.get(fullName[0]) ?? []) {
      refs.set(decl.fullName, decl);
    }
  }

  for (const identifier of info.clean.matchAll(IDENT)) {
    const name = identifier[0];
    const alias = info.usings.aliases.get(name);
    if (alias) {
      for (const decl of resolveAlias(alias, info, bySimpleName, byFullName)) {
        refs.set(decl.fullName, decl);
      }
      continue;
    }
    for (const decl of visibleSimpleName(name, info, bySimpleName)) {
      refs.set(decl.fullName, decl);
    }
  }

  return [...refs.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/**
 * @param {string} aliasTarget
 * @param {FileInfo} info
 * @param {Map<string, TypeDecl[]>} bySimpleName
 * @param {Map<string, TypeDecl[]>} byFullName
 * @returns {TypeDecl[]}
 */
function resolveAlias(aliasTarget, info, bySimpleName, byFullName) {
  const fullMatches = byFullName.get(aliasTarget);
  if (fullMatches) {
    return fullMatches;
  }
  const simple = aliasTarget.split('.').at(-1) ?? aliasTarget;
  return visibleSimpleName(simple, info, bySimpleName).filter(
    (decl) => decl.fullName === aliasTarget || decl.namespace === aliasTarget
  );
}

/**
 * @param {string} name
 * @param {FileInfo} info
 * @param {Map<string, TypeDecl[]>} bySimpleName
 * @returns {TypeDecl[]}
 */
function visibleSimpleName(name, info, bySimpleName) {
  const candidates = bySimpleName.get(name) ?? [];
  return candidates.filter(
    (decl) =>
      decl.namespace === info.namespace || info.usings.namespaces.has(decl.namespace)
  );
}

/**
 * @param {string} clean
 * @returns {string | null}
 */
function declaredNamespace(clean) {
  return (
    clean.match(/\bnamespace\s+([A-Za-z_][A-Za-z0-9_.]*)\s*;/)?.[1] ??
    clean.match(/\bnamespace\s+([A-Za-z_][A-Za-z0-9_.]*)\s*\{/)?.[1] ??
    null
  );
}

/**
 * @param {string} rel
 * @param {ProjectInfo | null} project
 * @returns {string}
 */
function inferredNamespace(rel, project) {
  if (!project) {
    return '';
  }
  const dir = normalizePath(path.dirname(rel));
  const relDir =
    project.dir === '.'
      ? dir
      : normalizePath(path.relative(project.dir, dir));
  const suffix = relDir === '.' ? '' : relDir.split('/').filter(Boolean).join('.');
  return suffix ? `${project.rootNamespace}.${suffix}` : project.rootNamespace;
}

/**
 * @param {string} clean
 * @param {boolean} [globalOnly]
 * @returns {Usings}
 */
function parseUsings(clean, globalOnly = false) {
  const usings = emptyUsings();
  const usingRe =
    /^\s*(global\s+)?using\s+(?:(static)\s+)?(?:([A-Za-z_][A-Za-z0-9_]*)\s*=\s*)?([^;]+);/gm;
  for (const match of clean.matchAll(usingRe)) {
    const isGlobal = Boolean(match[1]);
    if (globalOnly !== isGlobal) {
      continue;
    }
    if (match[2]) {
      continue;
    }
    const alias = match[3];
    const target = match[4].trim();
    if (alias) {
      usings.aliases.set(alias, target);
    } else {
      usings.namespaces.add(target);
    }
  }
  return usings;
}

/**
 * @returns {Usings}
 */
function emptyUsings() {
  return { namespaces: new Set(), aliases: new Map() };
}

/**
 * @param {Usings} a
 * @param {Usings} b
 * @returns {Usings}
 */
function mergeUsings(a, b) {
  return {
    namespaces: new Set([...a.namespaces, ...b.namespaces]),
    aliases: new Map([...a.aliases, ...b.aliases]),
  };
}

/**
 * @template T
 * @param {Map<string, T[]>} index
 * @param {string} key
 * @param {T} value
 */
function addToIndex(index, key, value) {
  if (!index.has(key)) {
    index.set(key, []);
  }
  index.get(key).push(value);
}

/**
 * Masks comments and string/char literals with spaces so regex scans ignore
 * non-code text while keeping offsets stable for line calculations.
 * @param {string} content
 * @returns {string}
 */
function maskCommentsAndStrings(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, maskExceptNewlines)
    .replace(/\/\/[^\n\r]*/g, maskExceptNewlines)
    .replace(/@""|@"(?:""|[^"])*"/g, maskExceptNewlines)
    .replace(/"(?:\\.|[^"\\])*"/g, maskExceptNewlines)
    .replace(/'(?:\\.|[^'\\])'/g, maskExceptNewlines);
}

/**
 * @param {string} text
 * @returns {string}
 */
function maskExceptNewlines(text) {
  return text.replace(/[^\n\r]/g, ' ');
}

/**
 * @param {string} p
 * @returns {string}
 */
function normalizePath(p) {
  return p.replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? '');
}
