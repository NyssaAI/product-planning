# Initialization and migration review — 2026-10-13

R-08 (P1) is reproduced and fixed. Before the fix, six junction regressions failed: bootstrap followed external template/settings junctions, and migration followed external context/source/destination junctions. The docs junction case also demonstrated a starter config written before rejection. Migration could move an outside INDEX.md into the repository.

`bootstrap.mjs` now validates concrete destinations and configured modules before its first write and checks individual write paths again. `config.mjs` validates generator and path config locations. `migrate.mjs` preflights legacy source trees and mapped destinations, rejects directory cycles, and checks concrete move/patch paths. Existing feature documents and normal migration idempotence are preserved.

R-09 (P2): the unavailable optional project manifest is checked before any initialization write. No manifest schema was invented. The bootstrap regression asserts absence of both starter config and `.plan-product` after failure. Parent owns README clarification.

R-10 (P1), bootstrap portion: the initial correction quoted the script path as a literal bash argument, including embedded apostrophes. A copied-plugin integration test executed it through Git Bash on Windows from a directory containing `$()`, backticks, spaces, and an apostrophe. The intended script executed and neither substitution marker was created. Final integration replaced this shell form with portable executable/argument form after checking Claude's PowerShell fallback; see [F-03](2026-10-13-hook-portability.md) for the final behavior and evidence.

Validation: `node --test test/module-map/bootstrap.test.mjs test/module-map/migration-safety.test.mjs`: 17 tests, 12 passed, 5 skipped, zero failed. All directory-junction tests and the actual Git Bash hook test ran. File-symlink regressions skip only on Windows EPERM because this environment lacks file-symlink privileges; they remain runnable on Unix or suitably configured Windows. The six original junction regressions were run before the fixes and failed as expected. Parent owns integrated suite execution and shared-helper dangling-symlink hardening.

Containment checks defend against pre-existing links, not hostile concurrent filesystem replacement between validation and filesystem operations. No dependencies added; no index, commit, or push operations performed.
