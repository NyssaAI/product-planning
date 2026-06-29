/**
 * Group discovered modules into Node/TypeScript organizational roles so the
 * planning index can point an agent at the right module docs and the matching
 * `code-map.json` slice (filter by `moduleId`). The classification is heuristic
 * and path-driven: every module lands in exactly one role, falling back to
 * `other` when no structural signal matches.
 */

/**
 * Display order for the rendered organization view. Empty categories are
 * dropped by {@link classifyNodeOrganization}.
 * @type {ReadonlyArray<{ id: string, title: string }>}
 */
const NODE_ORGANIZATION_CATEGORIES = [
  { id: 'app-routes', title: 'App routes & pages' },
  { id: 'api-routes', title: 'API routes' },
  { id: 'feature-packages', title: 'Feature & tool packages' },
  { id: 'shared-libraries', title: 'Shared & core libraries' },
  { id: 'state-stores', title: 'State & stores' },
  { id: 'native-platform', title: 'Native & platform code' },
  { id: 'other', title: 'Other modules' },
];

/**
 * @param {{ id: string, name?: string, root?: string, httpRoutes?: unknown[], source?: string, nav?: unknown }} mod
 * @returns {string[]}
 */
function rootSegments(mod) {
  return String(mod.root ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((seg) => seg && seg !== '.');
}

/**
 * @param {string[]} segments
 * @param {readonly string[]} names
 */
function hasSegment(segments, names) {
  return segments.some((seg) => names.includes(seg.toLowerCase()));
}

const FEATURE_PACKAGE_SEGMENTS = [
  'packages',
  'features',
  'tools',
  'apps',
  'libs',
  'plugins',
];
const SHARED_SEGMENTS = ['lib', 'core', 'shared', 'common', 'utils', 'util'];
const STATE_SEGMENTS = ['store', 'stores', 'state', 'redux'];
const NATIVE_SEGMENTS = ['native', 'ios', 'android', 'platform-native'];

/**
 * Assign a single Node/TypeScript organizational role to a module. Order is
 * significant: more specific structural signals win (e.g. a workspace package
 * that also serves HTTP routes is classified as an API module).
 *
 * @param {{ id: string, name?: string, root?: string, httpRoutes?: unknown[], source?: string, nav?: unknown }} mod
 * @returns {string}
 */
function nodeOrganizationRole(mod) {
  const segments = rootSegments(mod);
  const id = String(mod.id ?? '').toLowerCase();

  if ((mod.httpRoutes?.length ?? 0) > 0 || hasSegment(segments, ['api'])) {
    return 'api-routes';
  }
  if (hasSegment(segments, ['app', 'pages', 'routes']) || Boolean(mod.nav)) {
    return 'app-routes';
  }
  if (hasSegment(segments, NATIVE_SEGMENTS)) {
    return 'native-platform';
  }
  if (hasSegment(segments, STATE_SEGMENTS) || STATE_SEGMENTS.includes(id)) {
    return 'state-stores';
  }
  if (hasSegment(segments, SHARED_SEGMENTS) || SHARED_SEGMENTS.includes(id)) {
    return 'shared-libraries';
  }
  if (mod.source === 'workspace' || hasSegment(segments, FEATURE_PACKAGE_SEGMENTS)) {
    return 'feature-packages';
  }
  return 'other';
}

/**
 * Group modules by their Node/TypeScript role in canonical display order,
 * omitting roles with no modules.
 *
 * @param {Array<{ id: string, name?: string, root?: string, httpRoutes?: unknown[], source?: string, nav?: unknown }>} modules
 * @returns {Array<{ id: string, title: string, modules: typeof modules }>}
 */
export function classifyNodeOrganization(modules) {
  /** @type {Map<string, typeof modules>} */
  const buckets = new Map();
  for (const mod of modules ?? []) {
    const role = nodeOrganizationRole(mod);
    if (!buckets.has(role)) {
      buckets.set(role, []);
    }
    buckets.get(role).push(mod);
  }

  return NODE_ORGANIZATION_CATEGORIES.filter((cat) =>
    buckets.has(cat.id)
  ).map((cat) => ({
    id: cat.id,
    title: cat.title,
    modules: buckets.get(cat.id),
  }));
}
