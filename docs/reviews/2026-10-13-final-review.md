# Independent integrated review — 2026-10-13

Scope: integrated working-tree changes against `dd1b395` on `fix/plugin-review-evaluations`, including new runtime tests, evaluation preparation/scenarios and generated context. This was an independent review leaf in the parent-owned review cycle; no external reviewer or nested agent was launched. Source and tests were not modified by this reviewer.

Verdict: **no retained unresolved finding** after the parent fixed F-02 and this reviewer independently verified the correction. Hosted skill-quality measurement remains blocked, as documented below.

Parent integration addendum: after this independent receipt, the Claude hook changed to documented exec form to handle Windows PowerShell fallback (F-03). A fresh Astra low worker implemented and verified that bounded correction; the parent inspected its actual diff and reran the full suite: 301 passed, eight platform skips, zero failures. See [portability evidence](2026-10-13-hook-portability.md). The rest of this receipt describes the independent review at its original scope.

## Findings

### F-02 — P2: architecture containment failures bypass JSON results

Location at review time: `scripts/module-map/generate-module-map.mjs:421`, `runArchitecture`.

The new output containment check executes outside both error-handling blocks. With a valid persisted module model and an external junction at `docs/code-map/system-architecture.md`, `--arch --json` exits 1 with empty stdout and a raw stack on stderr. The output is safely refused, but callers cannot parse the promised architecture failure result. The same area also reads existing Markdown outside the write-error handler.

Reproduction executed on this Windows host: create a scratch repository with `plan-product.config.json` containing `{}`, a `docs/code-map/module-map.json` containing `{"modules":[{"id":"safe","root":"src"}]}`, and a directory junction named `system-architecture.md` to a sibling scratch directory. Invoke `node <plugin>/scripts/module-map/generate-module-map.mjs --arch --json`. Observed exit 1, stdout `""`, and a containment exception stack.

Minimal fix: move the containment check and existing-Markdown read inside the existing `ARCH_WRITE_FAILED` handler. Add a CLI regression asserting nonzero exit, parseable JSON with `ok: false`, an empty `wrote` array, and an unchanged external sentinel. **Disposition: fixed by parent and independently verified.** The final source encloses both operations in that handler; the new CLI test exercises the reproduced junction condition and checks all those outcomes.

### F-01 — rejected after tracing the actual writer

An initial concern alleged that embedding the module table through an external `AGENTS.md` or `CLAUDE.md` file symlink would overwrite the external target. That claim was withdrawn: `writeArtifactIfChanged` writes a sibling temporary file and renames it over the local link. No external overwrite was established. This is not a retained security finding. File-symlink execution was unavailable because this host rejects creating them with EPERM.

## Independent verification

- Executed runtime-safety, migration-safety, review-discovery, Python adapter and Go adapter test files together: **45 tests, 38 passed, 0 failed, 7 skipped**. All seven skips require unavailable Windows file-symlink privileges. Directory-junction and dangling-junction tests did execute.
- After the F-02 correction, independently executed `generate-arch.test.mjs` and `command-docs.test.mjs`: **11 passed, 0 failed, 0 skipped**. Reviewed the README correction and example configuration: the legacy `sourceRoots` token is documented as ignored, with `roots` identified as the operative setting; the ignored example setting was removed. This preserves the documented contract without weakening the documentation test.
- Executed `node evals/plugin-review/prepare.mjs`: validated 30 routing cases and seven JSON-authored decision cases. Inspected the eighth fixture-backed artifact scenario materialized by the script.
- `git diff --check` reported no whitespace errors at this review point; Git emitted line-ending normalization notices.
- Inspected actual behavior assertions: traversal and junction sentinels, unchanged bootstrap/migration targets, real-shell substitution sentinels, multi-pattern discovery with ID collision handling, foreign-plugin fallback, and exact Python/Go edge sets. No retained false-pass defect was found.

## Coverage and limits

Read repository instructions, the parent review ledger, available component reports, ce-code-review guidance, and correctness/security/testing/agent-native persona references. Reviewed the actual diff and relevant callers, rather than relying only on implementer reports. Traced containment and atomic writes, module-ID validation in model building and canonical linking, bootstrap/migration preflight, hook quoting and argument handling, Python/Go structural import extraction, usage destinations, discovery and plugin identity, and agent workflow instructions.

Reviewed package inclusion rules: the new module-ID helper is under the existing shipped `scripts/` tree; no third-party dependency was added. Packed-install execution and final whole-suite/freshness evidence remain parent-owned and are not claimed by this independent receipt.

The evaluation suite is useful for natural routing and bounded decision checks, with a separate fixture-backed artifact case. Most content cases do not execute workflow mutations, so they cannot replace runtime safety tests. Hosted review, routing and content execution were blocked by service credits or model entitlement. No activation success, quality score or before/after improvement can be inferred. The component evaluation report documents that limitation and the baseline YAML transport repair.

Project-specific `../.tessl/RULES.md` was unavailable as recorded by the parent. Review coverage is risk-based, not an exhaustive claim about all language syntax, concurrency or every source line. Static containment does not eliminate concurrent filesystem replacement races.
