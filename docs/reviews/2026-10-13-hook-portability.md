# F-03 P2: Portable Claude hook execution

Generated PostToolUse hooks now use exec form: `command: 'node'` with the regeneration script path as the sole `args` element. This removes the POSIX quoting assumption on Windows hosts using PowerShell.

The [Claude Code hook reference](https://code.claude.com/docs/en/hooks#exec-form-and-shell-form), checked October 13, 2026, documents shell-free argument passing on all platforms and the portable Node executable plus script pattern. This requires a modern Claude Code host supporting hook exec form; no minimum version was established and the actual Claude host was not invoked.

Validation: `node --test test/module-map/bootstrap.test.mjs` failed before the source change (4 passed, 1 failed: expected executable `node`, received the shell command). After the fix and preservation assertions, all 5 tests passed on Windows. The regression spawns the emitted executable and arguments directly, executes a fixture script beneath a path containing spaces, apostrophes, dollar substitution, and backticks, and confirms neither substitution sentinel exists. It also confirms a foreign hook survives and repeat bootstrap leaves settings byte-for-byte unchanged.

Changed source: `scripts/module-map/lib/bootstrap.mjs`. Changed regression: `test/module-map/bootstrap.test.mjs`. No dependencies added; no commit or index mutation performed.
