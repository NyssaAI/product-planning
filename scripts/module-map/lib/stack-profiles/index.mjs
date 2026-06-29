import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createLogger } from '../logger.mjs';

const log = createLogger({ module: 'stack-profiles' });

/**
 * @typedef {object} ModuleDef
 * @property {string} id
 * @property {string} name
 * @property {string} root
 * @property {string} description
 * @property {string[]} flows
 * @property {string[]} packageDependencies
 * @property {string[]} exportEntries
 * @property {string} source
 */

/**
 * @typedef {object} StackProfile
 * @property {string} id
 * @property {number} priority
 * @property {(repoRoot: string, config: import('../config.mjs').CodeIndexerConfig) => ModuleDef[]} detect
 */

/**
 * @param {string} dir
 * @param {number} [limit]
 */
function listFilesRecursive(dir, limit = 2000) {
  /** @type {string[]} */
  const found = [];
  if (!existsSync(dir)) {
    return found;
  }
  const stack = [dir];
  while (stack.length > 0 && found.length < limit) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      const full = path.join(current, entry.name);
      if (entry.isFile()) {
        found.push(full);
      } else if (entry.isDirectory()) {
        stack.push(full);
      }
    }
  }
  return found;
}

/**
 * @param {string} repoRoot
 * @param {string} relRoot
 * @param {string} id
 * @param {string} name
 * @param {import('../config.mjs').CodeIndexerConfig} config
 * @param {'dotnet' | 'python' | 'go' | 'rust' | 'src-child'} source
 * @returns {ModuleDef}
 */
function makeModule(repoRoot, relRoot, id, name, config, source) {
  return {
    id,
    name,
    root: relRoot.replace(/\\/g, '/'),
    description: `Auto-detected module under \`${relRoot}/\`.`,
    flows: config.modules.flows[id] ?? [],
    packageDependencies: [],
    exportEntries: [],
    source,
  };
}

/** @type {StackProfile} */
const dotnetProfile = {
  id: 'dotnet',
  priority: 10,
  detect(repoRoot, config) {
    const files = listFilesRecursive(repoRoot, 500);
    const hasCsproj = files.some((f) => f.endsWith('.csproj'));
    const hasSln = files.some((f) => f.endsWith('.sln'));
    if (!hasCsproj && !hasSln) {
      log.debug('dotnet profile: no signal');
      return [];
    }

    log.info('dotnet profile matched', { hasCsproj, hasSln });
    /** @type {ModuleDef[]} */
    const modules = [];
    const seen = new Set();

    for (const file of files.filter((f) => f.endsWith('.csproj'))) {
      const relDir = path.relative(repoRoot, path.dirname(file)).replace(/\\/g, '/');
      if (!relDir || seen.has(relDir)) {
        continue;
      }
      seen.add(relDir);
      const id = path.basename(relDir).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      modules.push(makeModule(repoRoot, relDir, id, path.basename(relDir), config, 'dotnet'));
    }

    if (modules.length === 0 && existsSync(path.join(repoRoot, 'src'))) {
      for (const entry of readdirSync(path.join(repoRoot, 'src'), { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          continue;
        }
        const rel = path.join('src', entry.name).replace(/\\/g, '/');
        modules.push(makeModule(repoRoot, rel, entry.name, entry.name, config, 'dotnet'));
      }
    }

    log.debug('dotnet profile modules', { count: modules.length });
    return modules;
  },
};

/** @type {StackProfile} */
const pythonProfile = {
  id: 'python',
  priority: 20,
  detect(repoRoot, config) {
    const pyproject = path.join(repoRoot, 'pyproject.toml');
    const setupPy = path.join(repoRoot, 'setup.py');
    if (!existsSync(pyproject) && !existsSync(setupPy)) {
      log.debug('python profile: no signal');
      return [];
    }

    log.info('python profile matched');
    /** @type {ModuleDef[]} */
    const modules = [];
    const srcDir = path.join(repoRoot, 'src');
    if (existsSync(srcDir)) {
      for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) {
          continue;
        }
        const pkgPath = path.join(srcDir, entry.name, '__init__.py');
        if (!existsSync(pkgPath)) {
          continue;
        }
        const rel = path.join('src', entry.name).replace(/\\/g, '/');
        modules.push(makeModule(repoRoot, rel, entry.name, entry.name, config, 'python'));
      }
    }

    if (modules.length === 0) {
      for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'test') {
          continue;
        }
        const initPy = path.join(repoRoot, entry.name, '__init__.py');
        if (existsSync(initPy)) {
          modules.push(makeModule(repoRoot, entry.name, entry.name, entry.name, config, 'python'));
        }
      }
    }

    log.debug('python profile modules', { count: modules.length });
    return modules;
  },
};

/** @type {StackProfile} */
const goProfile = {
  id: 'go',
  priority: 30,
  detect(repoRoot, config) {
    if (!existsSync(path.join(repoRoot, 'go.mod'))) {
      log.debug('go profile: no signal');
      return [];
    }

    log.info('go profile matched');
    /** @type {ModuleDef[]} */
    const modules = [];
    const cmdDir = path.join(repoRoot, 'cmd');
    if (existsSync(cmdDir)) {
      for (const entry of readdirSync(cmdDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const rel = path.join('cmd', entry.name).replace(/\\/g, '/');
          modules.push(makeModule(repoRoot, rel, entry.name, entry.name, config, 'go'));
        }
      }
    }

    if (modules.length === 0 && existsSync(path.join(repoRoot, 'internal'))) {
      modules.push(makeModule(repoRoot, 'internal', 'internal', 'internal', config, 'go'));
    }

    log.debug('go profile modules', { count: modules.length });
    return modules;
  },
};

/** @type {StackProfile} */
const rustProfile = {
  id: 'rust',
  priority: 40,
  detect(repoRoot, config) {
    const cargoPath = path.join(repoRoot, 'Cargo.toml');
    if (!existsSync(cargoPath)) {
      log.debug('rust profile: no signal');
      return [];
    }

    log.info('rust profile matched');
    const text = readFileSync(cargoPath, 'utf8');
    /** @type {ModuleDef[]} */
    const modules = [];
    const memberRe = /^\s*members\s*=\s*\[(.*?)\]/ms;
    const match = text.match(memberRe);
    if (match) {
      const members = match[1]
        .split(',')
        .map((s) => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
      for (const member of members) {
        const id = path.basename(member);
        modules.push(makeModule(repoRoot, member, id, id, config, 'rust'));
      }
    }

    if (modules.length === 0) {
      modules.push(makeModule(repoRoot, 'src', 'src', 'src', config, 'rust'));
    }

    log.debug('rust profile modules', { count: modules.length });
    return modules;
  },
};

/** @type {StackProfile[]} */
const PROFILES = [dotnetProfile, pythonProfile, goProfile, rustProfile].sort(
  (a, b) => a.priority - b.priority
);

/**
 * @param {string} repoRoot
 * @param {import('../config.mjs').CodeIndexerConfig} config
 * @returns {ModuleDef[]}
 */
export function detectStackModules(repoRoot, config) {
  log.debug('stack profile detection start', { repoRoot });
  for (const profile of PROFILES) {
    const modules = profile.detect(repoRoot, config);
    if (modules.length > 0) {
      log.info('stack profile selected', { profile: profile.id, moduleCount: modules.length });
      return modules;
    }
  }
  log.debug('stack profile detection: no profile matched');
  return [];
}
