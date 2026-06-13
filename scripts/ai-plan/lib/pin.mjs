/**
 * Pin / eject support for module detection. A pin is an authoritative module
 * declaration stored in ai-plan.config.json under `modules.pinned[]`; the
 * detection core treats pinned roots as fixed and excludes them from
 * re-derivation. `pinModule` "ejects" a currently-derived module into config
 * so the user can freeze and adjust it; `unpinModule` returns it to
 * auto-derivation. Result-style returns.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createLogger } from './logger.mjs';

const log = createLogger({ module: 'pin' });

const configPath = (repoRoot) => path.join(repoRoot, 'ai-plan.config.json');

/** @param {string} repoRoot */
function readRaw(repoRoot) {
  const p = configPath(repoRoot);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}

/** @param {string} repoRoot @param {object} raw */
function writeRaw(repoRoot, raw) {
  writeFileSync(configPath(repoRoot), `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
}

/**
 * Eject a derived module into `modules.pinned[]`.
 *
 * @param {string} repoRoot
 * @param {string} moduleId
 * @param {{ id: string, name: string, root: string, description: string, capabilities?: string[], doesNotOwn?: string[] }[]} derivedModules
 * @returns {{ ok: true, pin: object } | { ok: false, error: string }}
 */
export function pinModule(repoRoot, moduleId, derivedModules) {
  const mod = derivedModules.find((m) => m.id === moduleId);
  if (!mod) {
    return { ok: false, error: `module_not_found: ${moduleId}` };
  }

  const raw = readRaw(repoRoot);
  raw.modules = raw.modules ?? {};
  raw.modules.pinned = Array.isArray(raw.modules.pinned)
    ? raw.modules.pinned
    : [];

  if (raw.modules.pinned.some((p) => p.id === mod.id || p.root === mod.root)) {
    return { ok: false, error: `already_pinned: ${moduleId}` };
  }

  const pin = {
    root: mod.root,
    id: mod.id,
    name: mod.name,
    description: mod.description,
    ...(mod.capabilities ? { capabilities: mod.capabilities } : {}),
    ...(mod.doesNotOwn ? { doesNotOwn: mod.doesNotOwn } : {}),
  };
  raw.modules.pinned.push(pin);
  writeRaw(repoRoot, raw);
  log.info('pinned module', { id: mod.id, root: mod.root });
  return { ok: true, pin };
}

/**
 * Remove a pin by id or root, returning its subtree to auto-derivation.
 *
 * @param {string} repoRoot
 * @param {string} moduleId
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function unpinModule(repoRoot, moduleId) {
  const raw = readRaw(repoRoot);
  const pinned = raw.modules?.pinned;
  if (!Array.isArray(pinned) || pinned.length === 0) {
    return { ok: false, error: 'no_pins' };
  }
  const before = pinned.length;
  raw.modules.pinned = pinned.filter(
    (p) => p.id !== moduleId && p.root !== moduleId
  );
  if (raw.modules.pinned.length === before) {
    return { ok: false, error: `not_pinned: ${moduleId}` };
  }
  writeRaw(repoRoot, raw);
  log.info('unpinned module', { id: moduleId });
  return { ok: true };
}
