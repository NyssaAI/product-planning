/**
 * Portable structured logger for code-indexer generators (no @devjoy/* deps).
 * Set LOG_LEVEL=debug or DEBUG_CODE_INDEXER=1 for full trace output.
 */

const LEVEL_RANK = /** @type {const} */ ({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
});

/**
 * @returns {'debug' | 'info' | 'warn' | 'error'}
 */
function resolveLogLevel() {
  const raw = (process.env.LOG_LEVEL ?? '').trim().toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  if (process.env.DEBUG_CODE_INDEXER === '1' || process.env.DEBUG_CODE_INDEXER === 'true') {
    return 'debug';
  }
  return 'info';
}

/**
 * @param {'debug' | 'info' | 'warn' | 'error'} level
 */
function shouldLog(level) {
  return LEVEL_RANK[level] >= LEVEL_RANK[resolveLogLevel()];
}

/**
 * @param {'debug' | 'info' | 'warn' | 'error'} level
 * @param {string} message
 * @param {Record<string, unknown>} [fields]
 */
function emit(level, message, fields = {}) {
  if (!shouldLog(level)) {
    return;
  }
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'code-indexer',
    message,
    ...fields,
  };
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stderr;
  stream.write(`${JSON.stringify(entry)}\n`);
}

/**
 * @param {Record<string, unknown>} [bindings]
 */
export function createLogger(bindings = {}) {
  /**
   * @param {'debug' | 'info' | 'warn' | 'error'} level
   * @param {string} message
   * @param {Record<string, unknown>} [fields]
   */
  function logAt(level, message, fields = {}) {
    emit(level, message, { ...bindings, ...fields });
  }

  return {
    debug(message, fields) {
      logAt('debug', message, fields);
    },
    info(message, fields) {
      logAt('info', message, fields);
    },
    warn(message, fields) {
      logAt('warn', message, fields);
    },
    error(message, fields) {
      logAt('error', message, fields);
    },
    child(extra) {
      return createLogger({ ...bindings, ...extra });
    },
  };
}

/** @type {ReturnType<typeof createLogger>} */
const log = createLogger();
