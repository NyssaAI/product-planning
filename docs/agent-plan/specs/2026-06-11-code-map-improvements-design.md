# Code Map and Module File Improvements

**Date:** 2026-06-11
**Status:** Approved
**Target repo:** `jamaynor/dev-tools` plugin
**Depends on:** `2026-06-11-dev-tools-directory-reorganization-design.md` — paths in this spec assume the `docs/agent-plan/` layout is already in place. If implemented before the reorg, substitute `docs/ai-plan/` for `docs/agent-plan/context/`.

## Summary

Fix two compounding problems in the ai-plan system: the generated artifacts contain too little useful content for agents to act on, and even what exists is not reliably reaching agents during design and implementation sessions. The fix addresses both root causes together — richer extraction in the generation pipeline, and active context delivery through skill enforcement and automatic regeneration hooks.

## Scope

**In scope:**
- Code map enrichment: function signatures, doc-comment summaries, decorated-declaration fixes for C#, TypeScript, and Python
- Module file redesign: capability-first structure with prose descriptions, owns/does-not-own sections, and public API table with signatures
- INDEX.md and MODULE_MAP.json as routing documents with capability summaries embedded in CLAUDE.md/AGENTS.md
- Hook infrastructure: auto-regeneration on source file change (Claude Code), reliable session-start regeneration (Codex), structured error reporting
- Skill enforcement: design-spec and write-plan directly load and embed module files rather than guiding agents to do so
- Rename: `scopes/` → `modules/`, `planningScope` → `planningModule`, `preserveScope` → `preserveModule`, "scope file" → "module file" throughout

**Out of scope:**
- SQL / PostgreSQL rule set (lower-priority follow-on)
- Java Spring Boot annotation support (not needed)
- AI-in-the-loop generation (no Claude API calls from generator scripts)
- Multi-repo / monorepo overhaul (separate concern)

---

## Section 1: Code Map Enrichment

### 1.1 Signature extraction

After ast-grep identifies each symbol's file and line number, a new post-processing step reads the actual source lines starting at that line to extract the full function signature — up to the closing `)` or `:` of the declaration. This is done with a simple multi-line read (capped at 8 lines) rather than complex ast-grep metavariable changes, making it language-agnostic and easier to maintain.

New fields on each symbol entry:

```json
{
  "name": "authenticate",
  "kind": "async-function",
  "line": 42,
  "signature": "authenticate(userId: string, password: string): Promise<AuthResult>",
  "summary": "Validates credentials and returns a signed JWT on success."
}
```

Both fields are optional — absent when extraction fails rather than emitting empty strings.

### 1.2 Doc-comment summaries

For each symbol, scan backwards from its line for a leading comment block (`//`, `/*…*/`, `"""`, `#`). Extract the first sentence (up to 120 characters). Store as `summary`. File-header comments (already extracted) are unaffected.

### 1.3 C# attribute fix

Current `public class $NAME` and method rules fail when attributes precede the declaration:

```csharp
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
```

Fix: add attributed-declaration rule variants using ast-grep's node matching to handle the attribute-then-declaration pattern. Extract HTTP method attributes (`[HttpGet("path")]`, `[HttpPost]`, `[HttpPut]`, `[HttpDelete]`, `[HttpPatch]`) as route entries in the same format as the existing route extraction:

```json
{ "name": "GetUser", "kind": "public-method", "line": 18,
  "signature": "GetUser(int id): Task<IActionResult>",
  "summary": "Returns the user profile for the given id.",
  "route": { "method": "GET", "path": "api/users/{id}" },
  "attributes": ["HttpGet", "Authorize"] }
```

### 1.4 TypeScript decorator fix

Same pattern for NestJS decorators (`@Controller`, `@Get`, `@Post`, `@Injectable`, `@Module`). Add TypeScript decorator rule variants. Extract route path from `@Get('path')` / `@Post('path')` arguments.

### 1.5 Python decorator route extraction

Flask and FastAPI routes are exclusively in decorators — the function name carries no route information. Add Python rules to extract `@app.route('/path', methods=['GET'])`, `@router.get('/path')`, `@router.post('/path')` as route entries. The decorator argument becomes the route path; the HTTP method comes from the decorator name or `methods=` argument.

---

## Section 2: Module File Redesign

### 2.1 New structure

Module files (`docs/agent-plan/context/modules/<id>.md`) are reorganized capability-first:

```markdown
# {id} — module

**What this module does:** {2–4 sentence prose description of responsibility
and boundaries — what it owns and what it explicitly does not own.}

## Capabilities (owns)
- {capability 1}
- {capability 2}

## Does not own
- {capability} → {other-module} module

## Public API
| Symbol | Signature | Summary |
|--------|-----------|---------|
| {name} | {signature} | {summary} |

## Boundaries
| | Path |
|--|------|
| Root | `{root}` |
| Depends on | {dependsOn} |
| Used by | {usedBy} |
| Out of scope | {outOfScope} |

## Entry points
## Tests
## Configuration
## HTTP routes (if any)
## Key symbols by file
```

The structural sections (entry points, tests, configuration, HTTP routes, key symbols) are preserved unchanged. The capability sections are new and appear first.

### 2.2 Content sourcing

**Auto-generated (default):** The `inferFlows` function is extended to produce the prose description and capability bullets from the module's name, entry points, HTTP routes, and top symbols. The existing patterns (HTTP API handlers, CLI commands, application bootstrap) become starting points for richer inference.

**Manual override:** Developers add `description`, `capabilities`, and `doesNotOwn` arrays to the module entry in `ai-plan.config.json`. Manual entries take precedence over inferred ones.

```json
{
  "modules": [{
    "id": "auth",
    "description": "Owns all authentication concerns — credential validation, JWT issuance, session lifecycle, and password hashing.",
    "capabilities": ["Credential validation", "JWT signing and verification", "Session lifecycle"],
    "doesNotOwn": ["User profile data → user module", "Permission decisions → authz module"]
  }]
}
```

### 2.3 Rename

`docs/ai-plan/scopes/` → `docs/agent-plan/context/modules/`
`planningScope` field in MODULE_MAP.json → `planningModule`
`preserveScope` config flag → `preserveModule`
"scope file" → "module file" throughout all skills and documentation.

---

## Section 3: INDEX.md and MODULE_MAP as Routing Documents

### 3.1 INDEX.md module table

The module table gains `What it does` and `Owns` columns so agents can route to the correct module file without opening any module files first:

```markdown
| Module | What it does | Owns | Module file |
|--------|-------------|------|-------------|
| auth | Authentication and session lifecycle | JWT, sessions, password hashing | [modules/auth.md](./modules/auth.md) |
| user | User profiles and account management | profiles, preferences, account state | [modules/user.md](./modules/user.md) |
```

### 3.2 MODULE_MAP.json capabilities

Each module entry gains `description` and `capabilities` fields:

```json
{
  "id": "auth",
  "description": "Owns all authentication concerns.",
  "capabilities": ["JWT signing", "session lifecycle", "password hashing"],
  "planningModule": "docs/agent-plan/context/modules/auth.md"
}
```

### 3.3 CLAUDE.md / AGENTS.md embedding

When `npm run ai-plan` runs, the generator rewrites a bounded section in CLAUDE.md (and AGENTS.md if present) with the current module capability table:

```markdown
<!-- ai-plan:module-map:start -->
## Module map (auto-updated — do not edit)

| Module | What it does | Owns | Module file |
|--------|-------------|------|-------------|
| auth | Authentication and session lifecycle | JWT, sessions, password hashing | docs/agent-plan/context/modules/auth.md |
<!-- ai-plan:module-map:end -->
```

The markers allow regeneration to replace the section without touching surrounding content. This is the primary delivery mechanism — the module map is present at every session start in both Claude Code and Codex without any hook needing to fire.

---

## Section 4: Hook Infrastructure

### 4.1 Claude Code: auto-regeneration (default on)

`--write-scripts` adds a `PostToolUse` hook to project `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "node <PLUGIN_ROOT>/scripts/ai-plan/regen-if-source-changed.mjs"
      }]
    }]
  }
}
```

The hook delegates to a new wrapper script `scripts/ai-plan/regen-if-source-changed.mjs` that:
1. Reads the modified file path from the hook's environment (`CLAUDE_TOOL_USE_FILE` or equivalent)
2. Checks if it falls under a configured source root — exits silently if not (e.g. docs edits, config changes do not trigger regeneration)
3. Checks `"autoRegenerate": false` in `ai-plan.config.json` — exits silently if opted out
4. Spawns `generate-code-map.mjs && generate.mjs` as a detached background process so it does not block the agent
5. Logs the run to `docs/agent-plan/context/.regen.log` for debugging

CLAUDE.md is updated with the new module map when the background process completes. Opt-out: set `"autoRegenerate": false` in `ai-plan.config.json`.

### 4.2 Codex: reliable session-start regeneration

The AGENTS.md bootstrap template is updated to:

1. Run a pre-flight check before invoking `npm run ai-plan`:
   - `@ast-grep/cli` available
   - Required doc files present (`docs/product.md`, etc.)
   - Node version sufficient
2. Emit a clear human-readable error on failure: `"ai-plan: skipped — @ast-grep/cli not found. Run: npm install"`
3. Present regeneration as a conditional startup step: "If `docs/agent-plan/context/index.md` is missing or source files are newer than the index, run `npm run ai-plan`."
4. Respect the same `"autoRegenerate": false` flag.

### 4.3 Structured generation result

`generate.mjs` returns and logs a structured result:

```json
{
  "ok": true,
  "skipped": false,
  "modules": 3,
  "warnings": ["CODE_MAP_STALE: code map is older than source files"],
  "errors": [],
  "summary": "3 modules → docs/agent-plan/context/"
}
```

Named error codes: `MISSING_DOCS`, `AST_GREP_NOT_FOUND`, `CODE_MAP_STALE`, `NO_MODULES_FOUND`. The `--doctor` command surfaces these codes directly.

---

## Section 5: Skill Enforcement

### 5.1 design-spec

Step 1 (Load project context) is updated to:

1. Check for `docs/agent-plan/context/index.md` (or legacy `docs/ai-plan/INDEX.md`)
2. If found, check staleness — if `index.md` is older than the most recently modified source file, run `npm run ai-plan` before continuing
3. Read `index.md` and embed the module capability table directly into working context — no agent discretion required
4. When the primary module is identified, read `modules/<id>.md` and embed it inline before the first clarifying question

### 5.2 write-plan

After identifying the primary module, the plan document includes a `## Planning context` section containing the module file content:

```markdown
## Planning context

**Module:** `auth` (`docs/agent-plan/context/modules/auth.md`)

**What this module does:** Owns all authentication concerns — credential
validation, JWT issuance, session lifecycle, and password hashing.

**Capabilities:** JWT signing, session lifecycle, password hashing
**Does not own:** user profile data, permission decisions
```

The context travels with the plan — `execute-plan` has it without re-fetching.

### 5.3 using-ai-plan

The skill language shifts from guidance to instruction:

- L1 instruction: "Read `modules/<id>.md` now (use the Read tool). Do not summarize or skip."
- Staleness gate: explicit instruction to run `npm run ai-plan` if index is missing or stale, before any planning step
- L3 instruction (CODE_MAP after naming symbols) remains guidance — timing is context-dependent

---

## Module scope

**Primary module:** `main` (`docs/agent-plan/context/modules/main.md`)

**Affected modules:** none (single-module plugin repo)

---

## Standards Applied

| Standard | Key constraint for this design |
|----------|-------------------------------|
| `design-patterns` | Single responsibility per lib file — signature extraction, doc-comment extraction, and decorator handling each get their own module |
| `testing-principles` | Unit tests for new extraction logic (signature parser, comment extractor, decorator rules); integration test for full pipeline end-to-end |
| `project-structure` | New modules live under `scripts/code-map/lib/` and `scripts/ai-plan/lib/`; no new top-level scripts |
