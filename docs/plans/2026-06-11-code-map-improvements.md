# Code Map and Module File Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use **dev-tools:execute-plan** to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two compounding problems: generated code map artifacts contain too little useful content, and even that content is not reaching agents during design and implementation sessions. Enrich the generation pipeline (signatures, doc-comments, decorated-declaration fixes), redesign module files to be capability-first, add routing documents to CLAUDE.md/AGENTS.md, and add auto-regeneration infrastructure.

**Architecture:** New post-processing lib modules for signature and comment extraction under `scripts/code-map/lib/`. New ast-grep rule variants for C#, TypeScript, and Python decorators. `render.mjs` updated for capability-first module files and enriched INDEX/MODULE_MAP. New `regen-if-source-changed.mjs` wrapper for the PostToolUse hook. Skill language shifts from guidance to instruction for L1 context loading.

**Dependency:** Paths below assume the `docs/agent-files/` layout from `2026-06-11-dev-tools-directory-reorganization-design.md` is in place. If implementing before the directory reorg, substitute `docs/ai-plan/` for `docs/agent-files/context/` and `docs/ai-plan/scopes/` for `docs/agent-files/context/modules/` throughout.

**Planning scope:** `docs/ai-plan/modules/main.md`

**Spec:** `docs/specs/2026-06-11-code-map-improvements-design.md`

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `scripts/code-map/generate-code-map.mjs` | Code map entry point | Add post-processing for signatures + comments |
| `scripts/code-map/lib/signature-extractor.mjs` | Function signature extraction | Create new module |
| `scripts/code-map/lib/comment-extractor.mjs` | Doc-comment summary extraction | Create new module |
| `scripts/code-map/rules/map-csharp-attributed-class.yml` | C# attribute fix | Create new rule |
| `scripts/code-map/rules/map-csharp-http-method.yml` | C# HTTP attribute extraction | Create new rule |
| `scripts/code-map/rules/map-ts-decorated-class.yml` | TypeScript decorator fix | Create new rule |
| `scripts/code-map/rules/map-ts-nest-route.yml` | NestJS route extraction | Create new rule |
| `scripts/code-map/rules/map-python-flask-route.yml` | Python Flask/FastAPI route extraction | Create new rule |
| `scripts/ai-plan/lib/render.mjs` | INDEX.md + module file renderer | Redesign renderModuleScope; update INDEX table |
| `scripts/ai-plan/lib/module-enrichment.mjs` | Module capability inference | Extend inferFlows for prose description + capabilities |
| `scripts/ai-plan/lib/config.mjs` | Config parsing | Add description/capabilities/doesNotOwn fields; rename preserveScope→preserveModule |
| `scripts/ai-plan/generate.mjs` | Generator entry point | Add structured result; rename scopes→modules |
| `scripts/ai-plan/lib/bootstrap.mjs` | Directory scaffolding | Rename scopes→modules path |
| `scripts/ai-plan/lib/doctor.mjs` | Validation | Update scopes→modules path |
| `scripts/ai-plan/regen-if-source-changed.mjs` | Hook wrapper | Create new script |
| `scripts/bootstrap-templates/AGENTS.md` | Codex bootstrap template | Add pre-flight checks; update paths scopes→modules |
| `skills/using-ai-plan/SKILL.md` | Planning skill | Shift guidance to instruction; rename scopes→modules |
| `skills/design-spec/SKILL.md` | Design spec skill | Add direct module file embedding at Step 1 |
| `skills/write-plan/SKILL.md` | Write plan skill | Add Planning context section with module file content |

---

### Task 1: Create `signature-extractor.mjs`

**Files:**
- Create: `scripts/code-map/lib/signature-extractor.mjs`

This new module reads source lines starting at a symbol's line number to extract the full function signature — up to the closing `)` or `:` of the declaration (capped at 8 lines). Language-agnostic.

- [ ] **Step 1: Read generate-code-map.mjs to understand the symbol data shape**

Read `scripts/code-map/generate-code-map.mjs` lines 239–262 (collectSymbols) and lines 285–332 (buildCodeMapDocument) to understand what fields each symbol entry has (`name`, `kind`, `line`, `path`).

- [ ] **Step 2: Create `signature-extractor.mjs`**

Create `scripts/code-map/lib/signature-extractor.mjs` with a single exported async function:

```javascript
import { readFileSync } from 'fs';

/**
 * Extracts the function/method/class signature starting at the given line.
 * Reads up to 8 lines and stops at the first line ending with ) { or : or => or {
 * Returns undefined if extraction fails or the line is not a declaration.
 */
export function extractSignature(filePath, lineNumber) {
  try {
    const lines = readFileSync(filePath, 'utf8').split('\n');
    const start = lineNumber - 1; // 0-indexed
    if (start < 0 || start >= lines.length) return undefined;

    const chunk = lines.slice(start, Math.min(start + 8, lines.length));
    const joined = chunk.join(' ').replace(/\s+/g, ' ').trim();

    // Extract up to the closing ) of parameters or : for Python/return type
    // Stop at { or => to exclude body
    const match = joined.match(/^([^{=>]+?(?:\)[^{=>]*?)?)\s*(?:\{|=>|$)/);
    if (!match) return undefined;

    const sig = match[1].trim();
    // Discard if it looks like a variable assignment, not a declaration
    if (/^(const|let|var)\s/.test(sig) && !/\(/.test(sig)) return undefined;
    return sig.length > 0 && sig.length < 300 ? sig : undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/code-map/lib/signature-extractor.mjs
git commit -m "feat(code-map): add signature-extractor lib module

Reads up to 8 source lines from a symbol's declaration site and extracts
the function/method signature. Language-agnostic, capped at 300 chars."
```

---

### Task 2: Create `comment-extractor.mjs`

**Files:**
- Create: `scripts/code-map/lib/comment-extractor.mjs`

Scans backwards from a symbol's line for a leading comment block and extracts the first sentence (up to 120 characters) as the `summary` field.

- [ ] **Step 1: Create `comment-extractor.mjs`**

Create `scripts/code-map/lib/comment-extractor.mjs`:

```javascript
import { readFileSync } from 'fs';

/**
 * Scans backwards from lineNumber for a leading comment block.
 * Supports //, /* ... *\/, """, and # styles.
 * Returns the first sentence (up to 120 chars), or undefined if none found.
 */
export function extractDocComment(filePath, lineNumber) {
  try {
    const lines = readFileSync(filePath, 'utf8').split('\n');
    const targetIdx = lineNumber - 1; // 0-indexed
    if (targetIdx <= 0) return undefined;

    const commentLines = [];
    let i = targetIdx - 1;

    // Walk backwards collecting comment lines
    while (i >= 0 && i >= targetIdx - 20) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*') ||
          line.startsWith('#') || line.startsWith('"""') || line.startsWith("'''")) {
        // Strip comment markers
        const stripped = line
          .replace(/^\/\/+\s?/, '')
          .replace(/^\*+\s?/, '')
          .replace(/^\/\*+\s?/, '')
          .replace(/^#+\s?/, '')
          .replace(/^"{3}|'{3}/, '')
          .trim();
        if (stripped) commentLines.unshift(stripped);
        i--;
      } else if (line === '' && commentLines.length > 0) {
        break; // blank line ends the comment block
      } else {
        break;
      }
    }

    if (commentLines.length === 0) return undefined;

    const text = commentLines.join(' ').trim();
    // Extract first sentence
    const sentenceEnd = text.search(/[.!?]/);
    const sentence = sentenceEnd >= 0 ? text.slice(0, sentenceEnd + 1) : text;
    return sentence.length > 0 && sentence.length <= 120 ? sentence : sentence.slice(0, 120);
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/code-map/lib/comment-extractor.mjs
git commit -m "feat(code-map): add comment-extractor lib module

Scans backwards from a symbol's line for doc-comment blocks (//,
/* *\/, #, \"\"\") and extracts the first sentence as a summary field."
```

---

### Task 3: Wire signature and comment extraction into generate-code-map.mjs

**Files:**
- Modify: `scripts/code-map/generate-code-map.mjs`

Add calls to the new extractors after ast-grep symbol collection, adding `signature` and `summary` fields to each symbol entry.

- [ ] **Step 1: Read generate-code-map.mjs**

Read `scripts/code-map/generate-code-map.mjs` in full. Note the `buildCodeMapDocument` function (lines 285–332) and where symbol entries are assembled.

- [ ] **Step 2: Import the new extractors at the top of the file**

Add after existing imports:

```javascript
import { extractSignature } from './lib/signature-extractor.mjs';
import { extractDocComment } from './lib/comment-extractor.mjs';
```

- [ ] **Step 3: Add post-processing in buildCodeMapDocument**

In the loop that builds symbol entries (inside `buildCodeMapDocument`, where symbol objects are assembled into the output), add:

```javascript
const signature = extractSignature(symbol.path, symbol.line);
const summary = extractDocComment(symbol.path, symbol.line);
const enriched = { ...symbol };
if (signature !== undefined) enriched.signature = signature;
if (summary !== undefined) enriched.summary = summary;
```

Replace the plain `symbol` reference in the output array with `enriched`.

- [ ] **Step 4: Verify no change to existing fields**

Run the code map generator against the dev-tools repo itself:

```bash
node scripts/code-map/generate-code-map.mjs
```

Open `docs/ai-plan/CODE_MAP.json` (or new path if reorg is done). Confirm:
- Existing `name`, `kind`, `line` fields are still present
- Some entries have `signature` and/or `summary` fields
- No entries have empty string `signature` or `summary` (they should be absent, not empty)

- [ ] **Step 5: Commit**

```bash
git add scripts/code-map/generate-code-map.mjs
git commit -m "feat(code-map): wire signature and doc-comment extraction

Post-processes each ast-grep symbol hit with extractSignature and
extractDocComment. Adds optional signature and summary fields to
CODE_MAP entries when extraction succeeds."
```

---

### Task 4: Add C# attributed declaration rules

**Files:**
- Create: `scripts/code-map/rules/map-csharp-attributed-class.yml`
- Create: `scripts/code-map/rules/map-csharp-http-method.yml`

C# classes preceded by `[ApiController]`, `[Route]`, or similar attributes are not matched by the current `public class $NAME` rule. These new rules handle the attributed pattern.

- [ ] **Step 1: Read the existing C# rules**

Read `scripts/code-map/rules/map-csharp-public-class.yml` and `scripts/code-map/rules/map-csharp-public-class.yml` to understand the rule format.

- [ ] **Step 2: Create attributed class rule**

Create `scripts/code-map/rules/map-csharp-attributed-class.yml`:

```yaml
id: map-csharp-attributed-class
message: attributed public class
severity: info
language: CSharp
metadata:
  mapKind: class
rule:
  pattern: |
    [$$$ATTRS]
    public class $NAME
```

- [ ] **Step 3: Create HTTP method attribute rule**

Create `scripts/code-map/rules/map-csharp-http-method.yml`:

```yaml
id: map-csharp-http-method
message: C# HTTP method attribute
severity: info
language: CSharp
metadata:
  mapKind: http-action
rule:
  any:
    - pattern: "[HttpGet($PATH)] $$$"
    - pattern: "[HttpPost($PATH)] $$$"
    - pattern: "[HttpPut($PATH)] $$$"
    - pattern: "[HttpDelete($PATH)] $$$"
    - pattern: "[HttpPatch($PATH)] $$$"
    - pattern: "[HttpGet] $$$"
    - pattern: "[HttpPost] $$$"
    - pattern: "[HttpPut] $$$"
    - pattern: "[HttpDelete] $$$"
    - pattern: "[HttpPatch] $$$"
```

- [ ] **Step 4: Test the new rules**

Run against a C# file (or the dev-tools test fixtures if any exist):

```bash
node scripts/code-map/generate-code-map.mjs
```

Confirm no parse errors in the output. If the dev-tools repo has no C# source, the rules will be loaded but produce no hits — that is correct.

- [ ] **Step 5: Commit**

```bash
git add scripts/code-map/rules/map-csharp-attributed-class.yml scripts/code-map/rules/map-csharp-http-method.yml
git commit -m "feat(code-map): add C# attributed declaration rules

Adds rule for public classes preceded by attributes ([ApiController],
[Route], etc.) and HTTP method attributes ([HttpGet], [HttpPost], etc.)
that were previously missed by the public class pattern."
```

---

### Task 5: Add TypeScript decorator rules

**Files:**
- Create: `scripts/code-map/rules/map-ts-decorated-class.yml`
- Create: `scripts/code-map/rules/map-ts-nest-route.yml`

NestJS `@Controller`, `@Injectable`, `@Module` decorated classes are not matched by the current `export class $NAME` rule.

- [ ] **Step 1: Read existing TypeScript class rule**

Read `scripts/code-map/rules/map-ts-export-class.yml` to understand the format.

- [ ] **Step 2: Create decorated class rule**

Create `scripts/code-map/rules/map-ts-decorated-class.yml`:

```yaml
id: map-ts-decorated-class
message: TypeScript decorated class
severity: info
language: TypeScript
metadata:
  mapKind: class
rule:
  pattern: |
    @$DECORATOR($$$)
    export class $NAME
```

- [ ] **Step 3: Create NestJS route rule**

Create `scripts/code-map/rules/map-ts-nest-route.yml`:

```yaml
id: map-ts-nest-route
message: NestJS route decorator
severity: info
language: TypeScript
metadata:
  mapKind: route
rule:
  any:
    - pattern: "@Get($PATH)"
    - pattern: "@Post($PATH)"
    - pattern: "@Put($PATH)"
    - pattern: "@Delete($PATH)"
    - pattern: "@Patch($PATH)"
```

- [ ] **Step 4: Verify no parse errors**

```bash
node scripts/code-map/generate-code-map.mjs
```

No errors expected (no TypeScript source in this repo).

- [ ] **Step 5: Commit**

```bash
git add scripts/code-map/rules/map-ts-decorated-class.yml scripts/code-map/rules/map-ts-nest-route.yml
git commit -m "feat(code-map): add TypeScript decorator rules for NestJS

Handles @Controller, @Injectable, @Module decorated export classes
and @Get/@Post/@Put/@Delete/@Patch route decorators."
```

---

### Task 6: Add Python decorator route extraction

**Files:**
- Create: `scripts/code-map/rules/map-python-flask-route.yml`

Flask and FastAPI routes are exclusively in decorators — the function name carries no route information. Extract `@app.route`, `@router.get`, `@router.post`, etc.

- [ ] **Step 1: Read existing Python rule**

Read `scripts/code-map/rules/map-python-def.yml` to understand the format.

- [ ] **Step 2: Create Flask/FastAPI route rule**

Create `scripts/code-map/rules/map-python-flask-route.yml`:

```yaml
id: map-python-flask-route
message: Python HTTP route decorator
severity: info
language: Python
metadata:
  mapKind: route
rule:
  any:
    - pattern: "@app.route($PATH, $$$)"
    - pattern: "@app.route($PATH)"
    - pattern: "@router.get($PATH)"
    - pattern: "@router.post($PATH)"
    - pattern: "@router.put($PATH)"
    - pattern: "@router.delete($PATH)"
    - pattern: "@router.patch($PATH)"
    - pattern: "@app.get($PATH)"
    - pattern: "@app.post($PATH)"
    - pattern: "@app.put($PATH)"
    - pattern: "@app.delete($PATH)"
    - pattern: "@app.patch($PATH)"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/code-map/rules/map-python-flask-route.yml
git commit -m "feat(code-map): add Python Flask/FastAPI route extraction

Extracts @app.route, @router.get/post/put/delete/patch decorators
as route entries. Previously, Python HTTP route information was lost
because it lives in the decorator, not the function name."
```

---

### Task 7: Redesign module file structure in `render.mjs`

**Files:**
- Modify: `scripts/ai-plan/lib/render.mjs`

The `renderModuleScope` function (lines 70–179) currently generates a generic module file. Redesign it to produce the capability-first structure from spec Section 2.1.

- [ ] **Step 1: Read render.mjs in full**

Read `scripts/ai-plan/lib/render.mjs` lines 1–198. Understand the current `renderModuleScope` structure and how the module data object is shaped.

- [ ] **Step 2: Rewrite `renderModuleScope`**

Replace the function body to produce this structure:

```markdown
# {id} — module

**What this module does:** {description prose, 2-4 sentences}

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

Where:
- `description` comes from `module.description` (manual config override) or from `inferFlows` extended output (Task 8)
- `capabilities` comes from `module.capabilities` array or inferred
- `doesNotOwn` comes from `module.doesNotOwn` array or inferred
- Public API table is populated from CODE_MAP symbols for this module that have `signature` or `summary` fields
- The structural sections (entry points, tests, configuration, HTTP routes, key symbols by file) retain their existing rendering logic

The capability sections (What this module does, Capabilities, Does not own, Public API) come FIRST before Boundaries.

- [ ] **Step 3: Verify output by running the generator**

```bash
node scripts/code-map/generate-code-map.mjs
node scripts/ai-plan/generate.mjs
```

Read the generated module file at `docs/ai-plan/modules/main.md` (or new path). Confirm:
- The capability-first sections appear before Boundaries
- Public API table is present (may be sparse for the dev-tools repo which is mostly markdown)
- No template placeholders like `{description}` remain unfilled

- [ ] **Step 4: Commit**

```bash
git add scripts/ai-plan/lib/render.mjs
git commit -m "feat(ai-plan): redesign module file to capability-first structure

Module files now open with What this module does, Capabilities (owns),
Does not own, and Public API table before the Boundaries section.
Agents can understand module purpose without reading every symbol."
```

---

### Task 8: Extend `module-enrichment.mjs` for capability inference

**Files:**
- Modify: `scripts/ai-plan/lib/module-enrichment.mjs`

The `inferFlows` function (lines 171–193) currently produces basic flow descriptions. Extend it to also produce `description`, `capabilities`, and `doesNotOwn` arrays that the redesigned module file renderer uses.

- [ ] **Step 1: Read module-enrichment.mjs in full**

Read `scripts/ai-plan/lib/module-enrichment.mjs` lines 1–246. Understand the `inferFlows` function signature, inputs (module name, routes, entry points, top symbols), and current return shape.

- [ ] **Step 2: Add description and capabilities inference**

Extend the `inferFlows` function (or add a separate `inferCapabilities(module)` function alongside it) to return:

```javascript
{
  description: String,     // 2-3 sentence prose from name + routes + entry points
  capabilities: String[],  // bullet points inferred from HTTP routes and main functions
  doesNotOwn: String[],    // inferred from cross-module dependency edges (dependsOn)
  flows: String[],         // existing — unchanged
}
```

Inference logic:
- If module has HTTP routes: "Owns HTTP {METHOD} endpoints at {paths}. Handles..."
- If module has CLI entry points: "Provides CLI commands: {names}. Manages..."
- If module name contains well-known domain words (auth, user, billing, etc.): include domain-specific description
- `doesNotOwn` array: for each entry in `dependsOn`, generate "{module} concerns → {dependsOn[n]} module"
- Default description when nothing else matches: "Application module providing {module.id} functionality."

- [ ] **Step 3: Wire the new output into render.mjs**

In `render.mjs` `renderModuleScope`, read `description`, `capabilities`, and `doesNotOwn` from the enrichment result. Manual config overrides (from config.mjs) take precedence — if `module.description` is set in config, use that instead of inferred.

- [ ] **Step 4: Verify by regenerating**

```bash
node scripts/ai-plan/generate.mjs
```

Read the generated `main.md` module file. Confirm `description`, `capabilities`, and `doesNotOwn` sections have inferred content (even if sparse for this repo).

- [ ] **Step 5: Commit**

```bash
git add scripts/ai-plan/lib/module-enrichment.mjs scripts/ai-plan/lib/render.mjs
git commit -m "feat(ai-plan): infer description and capabilities in module enrichment

inferFlows now returns description (prose), capabilities (array), and
doesNotOwn (array) alongside flows. render.mjs uses these for the
capability-first module file sections."
```

---

### Task 9: Add manual override fields to config.mjs

**Files:**
- Modify: `scripts/ai-plan/lib/config.mjs`

Add parsing for `description`, `capabilities`, and `doesNotOwn` in the module entries of `ai-plan.config.json`. These manual overrides take precedence over inferred values.

- [ ] **Step 1: Read config.mjs**

Read `scripts/ai-plan/lib/config.mjs` lines 60–90 (the default config section) and the module parsing logic.

- [ ] **Step 2: Add manual override field parsing**

In the module entry normalization (where `modules.manual` array entries are parsed), add:

```javascript
{
  id: mod.id,
  description: typeof mod.description === 'string' ? mod.description : undefined,
  capabilities: Array.isArray(mod.capabilities) ? mod.capabilities : undefined,
  doesNotOwn: Array.isArray(mod.doesNotOwn) ? mod.doesNotOwn : undefined,
  // ... existing fields unchanged
}
```

- [ ] **Step 3: Rename preserveScope → preserveModule**

Find all occurrences of `preserveScope` in `config.mjs` and rename to `preserveModule`. This is a backwards-compatible rename — the old key is read as a fallback for one version, then dropped.

Add backwards-compat read:
```javascript
preserveModule: raw.modules?.preserveModule ?? raw.modules?.preserveScope ?? false,
```

- [ ] **Step 4: Verify by running doctor**

```bash
node scripts/ai-plan/generate.mjs --doctor
```

Should pass with no new errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/ai-plan/lib/config.mjs
git commit -m "feat(ai-plan): add manual module description/capabilities override support

Manual description, capabilities, and doesNotOwn arrays in ai-plan.config.json
take precedence over inferred values. Renames preserveScope→preserveModule
with backwards-compat fallback."
```

---

### Task 10: Rename scopes → modules throughout

**Files:**
- Modify: `scripts/ai-plan/lib/bootstrap.mjs` (line 112: `'docs/ai-plan/scopes'`)
- Modify: `scripts/ai-plan/lib/doctor.mjs` (any `scopes` path references)
- Modify: `scripts/ai-plan/lib/render.mjs` (any `scopes` path references)
- Modify: `scripts/ai-plan/lib/config.mjs` (any `scopes` or `planningScope` references)
- Modify: `scripts/ai-plan/generate.mjs` (directory creation and `planningScope` field)
- Modify: `skills/using-ai-plan/SKILL.md` (all `scopes/` and `planningScope` references)

This is purely a rename — no logic changes.

- [ ] **Step 1: Grep for all occurrences**

```bash
grep -rn "scopes\|planningScope\|preserveScope\|scope file\|scope-file" \
  scripts/ai-plan/ skills/using-ai-plan/ skills/design-spec/ skills/write-plan/
```

Record all file/line hits.

- [ ] **Step 2: Apply renames in scripts**

For each script file found:
- `docs/ai-plan/scopes/` → `docs/agent-files/context/modules/` (or `docs/ai-plan/modules/` if reorg not yet done)
- `planningScope` → `planningModule`
- `preserveScope` → `preserveModule` (already handled in Task 9 for config.mjs)
- "scope file" → "module file" in comments and JSDoc

- [ ] **Step 3: Apply renames in skills**

In `skills/using-ai-plan/SKILL.md`:
- `docs/ai-plan/scopes/<module-id>.md` → `docs/agent-files/context/modules/<module-id>.md`
- `planningScope` → `planningModule`
- "scope file" → "module file"
- "scope" → "module" where it refers to the artifact type (not the concept "scope of work")

In `skills/design-spec/SKILL.md` and `skills/write-plan/SKILL.md`: same renames where they appear.

- [ ] **Step 4: Verify no remaining old terms**

```bash
grep -rn "planningScope\|preserveScope\|docs/ai-plan/scopes" \
  scripts/ai-plan/ skills/using-ai-plan/ skills/design-spec/ skills/write-plan/
```

Should return nothing. (`docs/ai-plan/scopes` in the spec file itself is intentional — do not change specs.)

- [ ] **Step 5: Commit**

```bash
git add scripts/ai-plan/ skills/using-ai-plan/SKILL.md skills/design-spec/SKILL.md skills/write-plan/SKILL.md
git commit -m "feat(ai-plan): rename scopes→modules, planningScope→planningModule

docs/ai-plan/scopes/ is now docs/agent-files/context/modules/.
planningScope field in MODULE_MAP and config renamed to planningModule.
'scope file' terminology replaced with 'module file' throughout."
```

---

### Task 11: Enrich INDEX.md module table

**Files:**
- Modify: `scripts/ai-plan/lib/render.mjs`

The INDEX.md module table currently shows only module id and module file link. Add `What it does` and `Owns` columns so agents can route to the correct module without opening any module files first.

- [ ] **Step 1: Read render.mjs module table section**

Read `scripts/ai-plan/lib/render.mjs` lines 24–38 (the module table loop in `renderIndex`). Note the current column headers and row construction.

- [ ] **Step 2: Update the module table header**

Change:
```markdown
| Module | Module file |
|--------|-------------|
```
To:
```markdown
| Module | What it does | Owns | Module file |
|--------|-------------|------|-------------|
```

- [ ] **Step 3: Update the row construction**

In the module loop, add:
- `What it does`: `module.description` (first sentence only, truncated to 80 chars if longer) or `module.id + " module"` as fallback
- `Owns`: `module.capabilities.slice(0, 3).join(', ')` or empty string if none

- [ ] **Step 4: Regenerate and verify**

```bash
node scripts/ai-plan/generate.mjs
```

Read `docs/ai-plan/INDEX.md` (or new path). Confirm the module table has the new columns with content.

- [ ] **Step 5: Commit**

```bash
git add scripts/ai-plan/lib/render.mjs
git commit -m "feat(ai-plan): add What it does and Owns columns to INDEX.md module table

Agents can now route to the correct module from INDEX.md without
opening any module files first."
```

---

### Task 12: Add description and capabilities to MODULE_MAP.json

**Files:**
- Modify: `scripts/ai-plan/lib/render.mjs` (or wherever MODULE_MAP is assembled)

Each MODULE_MAP entry gains `description` and `capabilities` fields.

- [ ] **Step 1: Find the MODULE_MAP assembly code**

Read `scripts/ai-plan/lib/render.mjs` and any other lib file that constructs the MODULE_MAP object. Note the current entry shape.

- [ ] **Step 2: Add description and capabilities fields**

In the module entry constructor, add:

```javascript
{
  id: module.id,
  description: module.description ?? undefined,
  capabilities: module.capabilities ?? undefined,
  planningModule: `docs/agent-files/context/modules/${module.id}.md`,
  // ... existing fields
}
```

Strip undefined keys before serializing (so absent fields don't clutter the JSON).

- [ ] **Step 3: Regenerate and verify**

```bash
node scripts/ai-plan/generate.mjs
```

Read `docs/ai-plan/MODULE_MAP.json`. Confirm `description` and `capabilities` are present in entries where they were inferred or manually set.

- [ ] **Step 4: Commit**

```bash
git add scripts/ai-plan/lib/render.mjs
git commit -m "feat(ai-plan): add description and capabilities to MODULE_MAP.json

Each module entry now carries its prose description and capabilities array.
planningScope field renamed to planningModule."
```

---

### Task 13: Add CLAUDE.md/AGENTS.md module map embedding

**Files:**
- Modify: `scripts/ai-plan/lib/render.mjs` (or `generate.mjs`)

When `npm run ai-plan` runs, the generator rewrites a bounded section in CLAUDE.md (and AGENTS.md if present) with the current module capability table.

- [ ] **Step 1: Define the marker and format**

The embedded section uses these markers (must match exactly):

```
<!-- ai-plan:module-map:start -->
## Module map (auto-updated — do not edit)

| Module | What it does | Owns | Module file |
|--------|-------------|------|-------------|
| auth | ... | ... | docs/agent-files/context/modules/auth.md |
<!-- ai-plan:module-map:end -->
```

- [ ] **Step 2: Add `embedModuleMap(repoRoot, moduleTable)` function**

Add a new function (in `render.mjs` or a new `scripts/ai-plan/lib/embed.mjs`) that:

1. Reads `CLAUDE.md` at `repoRoot` if present
2. Checks for `<!-- ai-plan:module-map:start -->` marker
3. If found: replaces content between the markers with the new table
4. If not found: appends the entire marked section to the end of the file
5. Writes the file back
6. Repeats for `AGENTS.md` if present

The function must NOT touch content outside the markers.

- [ ] **Step 3: Call `embedModuleMap` from generate.mjs**

At the end of the main generation run (after all module files are written), call:

```javascript
await embedModuleMap(repoRoot, renderModuleMapTable(modules));
```

Where `renderModuleMapTable` produces the markdown table string.

- [ ] **Step 4: Test on the dev-tools repo**

```bash
node scripts/ai-plan/generate.mjs
```

Read `CLAUDE.md` in the dev-tools repo root. Confirm:
- The `ai-plan:module-map:start/end` section is present
- The module table matches what was generated
- Running again does not duplicate the section

- [ ] **Step 5: Commit**

```bash
git add scripts/ai-plan/lib/render.mjs scripts/ai-plan/generate.mjs
git commit -m "feat(ai-plan): embed module map into CLAUDE.md/AGENTS.md on regeneration

Adds <!-- ai-plan:module-map:start/end --> markers and keeps the module
capability table current in both files. Primary delivery mechanism —
present at every session start without any hook needing to fire."
```

---

### Task 14: Create `regen-if-source-changed.mjs` hook wrapper

**Files:**
- Create: `scripts/ai-plan/regen-if-source-changed.mjs`

This script is invoked by the Claude Code PostToolUse hook after every Write/Edit tool call. It checks whether the modified file is a source file, checks the opt-out flag, and spawns regeneration as a detached background process.

- [ ] **Step 1: Create the script**

Create `scripts/ai-plan/regen-if-source-changed.mjs`:

```javascript
#!/usr/bin/env node
/**
 * PostToolUse hook wrapper. Spawns ai-plan regeneration in the background
 * when a source file is modified. Exits silently when regeneration is not needed.
 *
 * Environment (set by Claude Code hook):
 *   CLAUDE_TOOL_INPUT_FILE_PATH  — the file path passed to Write/Edit
 */

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { resolve, relative } from 'path';
import { spawn } from 'child_process';

const repoRoot = process.cwd();
const modifiedFile = process.env.CLAUDE_TOOL_INPUT_FILE_PATH ?? process.env.TOOL_FILE_PATH;

// Exit silently if no file path provided
if (!modifiedFile) process.exit(0);

const absModified = resolve(modifiedFile);

// Load config
let config = {};
try {
  const configPath = resolve(repoRoot, 'ai-plan.config.json');
  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
  }
} catch { /* ignore */ }

// Check opt-out
if (config.autoRegenerate === false) process.exit(0);

// Determine source roots (default: src/, app/, lib/, or project root)
const sourceRoots = config.sourceRoots ?? ['src', 'app', 'lib', 'scripts'];
const rel = relative(repoRoot, absModified);
const isSourceFile = sourceRoots.some(r => rel.startsWith(r + '/') || rel.startsWith(r + '\\'));

if (!isSourceFile) process.exit(0);

// Resolve plugin root — try CLAUDE_PLUGIN_ROOT, fall back to two levels up from this script
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT
  ?? resolve(new URL(import.meta.url).pathname, '../../..');

const codeMapScript = resolve(pluginRoot, 'scripts/code-map/generate-code-map.mjs');
const aiPlanScript = resolve(pluginRoot, 'scripts/ai-plan/generate.mjs');
const logFile = resolve(repoRoot, 'docs/agent-files/context/.regen.log');

// Spawn detached background process
const child = spawn(
  process.execPath,
  ['-e', `
    import('${codeMapScript}').then(() => import('${aiPlanScript}')).catch(e => {
      const fs = require('fs');
      fs.appendFileSync('${logFile}', new Date().toISOString() + ' ERROR: ' + e.message + '\\n');
    });
  `],
  { detached: true, stdio: 'ignore' }
);
child.unref();

// Log the trigger
try {
  appendFileSync(logFile, new Date().toISOString() + ' REGEN triggered by ' + rel + '\n');
} catch { /* ignore */ }

process.exit(0);
```

- [ ] **Step 2: Make the script executable**

```bash
# On Windows this is not needed; on Unix:
chmod +x scripts/ai-plan/regen-if-source-changed.mjs
```

- [ ] **Step 3: Commit**

```bash
git add scripts/ai-plan/regen-if-source-changed.mjs
git commit -m "feat(ai-plan): add regen-if-source-changed.mjs hook wrapper

PostToolUse hook script that checks source root membership and opt-out
flag before spawning code map + ai-plan regeneration as a detached
background process. Logs to docs/agent-files/context/.regen.log."
```

---

### Task 15: Update `--write-scripts` to add PostToolUse hook

**Files:**
- Modify: `scripts/ai-plan/lib/bootstrap.mjs`

When `--write-scripts` runs in a consumer repo, add a PostToolUse hook entry to `.claude/settings.json`.

- [ ] **Step 1: Read bootstrap.mjs**

Read `scripts/ai-plan/lib/bootstrap.mjs` in full. Find the `mergePackageScripts` function (lines 151–182) and the `bootstrapRepo` function (lines 78–144). Understand how existing files are written.

- [ ] **Step 2: Add `writeClaudeHook(repoRoot, pluginRoot)` function**

Add a new function that:

1. Ensures `.claude/` directory exists at `repoRoot`
2. Reads `.claude/settings.json` if present; creates empty object if absent
3. Merges the PostToolUse hook entry — does not overwrite existing hooks:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "command": "node \"<PLUGIN_ROOT>/scripts/ai-plan/regen-if-source-changed.mjs\""
      }]
    }]
  }
}
```

Replace `<PLUGIN_ROOT>` with the actual `pluginRoot` path.

4. Writes the merged settings back to `.claude/settings.json`

- [ ] **Step 3: Call `writeClaudeHook` from `bootstrapRepo`**

In the `bootstrapRepo` function, after the package script merge, add:

```javascript
await writeClaudeHook(repoRoot, pluginRoot);
```

- [ ] **Step 4: Verify with a dry run**

Run `--init --write-scripts` against a temp directory and inspect the resulting `.claude/settings.json`.

- [ ] **Step 5: Commit**

```bash
git add scripts/ai-plan/lib/bootstrap.mjs
git commit -m "feat(ai-plan): add PostToolUse hook to --write-scripts bootstrap

--init --write-scripts now writes .claude/settings.json with a
PostToolUse hook that triggers regen-if-source-changed.mjs on
Write and Edit tool calls. Opt-out via autoRegenerate:false in config."
```

---

### Task 16: Update AGENTS.md bootstrap template for Codex pre-flight

**Files:**
- Modify: `scripts/bootstrap-templates/AGENTS.md`

Update the Codex bootstrap template to add pre-flight checks before invoking `npm run ai-plan`, present regeneration as conditional, and respect the opt-out flag.

- [ ] **Step 1: Read the current AGENTS.md template**

Read `scripts/bootstrap-templates/AGENTS.md` in full.

- [ ] **Step 2: Replace the Regenerate section**

Replace the current unconditional `npm run ai-plan` instruction with:

```markdown
## Regenerate (conditional startup step)

Before any planning session, check whether the context index is current:

1. Pre-flight: verify `@ast-grep/cli` is available — `node -e "require('@ast-grep/napi')"`. If it fails, skip regeneration and note: *"ai-plan: skipped — @ast-grep/cli not found. Run: npm install in dev-tools plugin."*
2. Check node version: requires Node 18+. If not met, skip and note.
3. Check required docs: `docs/product.md`, `docs/roadmap.md`, `docs/tech-stack.md` must exist.
4. If `"autoRegenerate": false` in `ai-plan.config.json`, skip entirely.
5. If `docs/agent-files/context/index.md` is missing OR any source file under `src/` is newer than `index.md`, run:

From project root:
​```bash
npm run ai-plan
​```

Otherwise, the index is current — skip regeneration.

**Failure output:** If regeneration fails, emit the structured error: `ai-plan: <MISSING_DOCS|AST_GREP_NOT_FOUND|NO_MODULES_FOUND> — <message>`. Do not abort the session; proceed with whatever context is available.
```

- [ ] **Step 3: Update path references in the Workflow artifacts section**

- `docs/ai-plan/scopes/<module>.md` → `docs/agent-files/context/modules/<module>.md`
- `docs/ai-plan/INDEX.md` → `docs/agent-files/context/index.md`

- [ ] **Step 4: Commit**

```bash
git add scripts/bootstrap-templates/AGENTS.md
git commit -m "feat(bootstrap): add Codex pre-flight checks to AGENTS.md template

Regeneration is now conditional (missing or stale index, not always-run).
Pre-flight checks for @ast-grep/cli, Node version, and required docs.
Structured error codes on failure. Respects autoRegenerate:false."
```

---

### Task 17: Add structured result to `generate.mjs`

**Files:**
- Modify: `scripts/ai-plan/generate.mjs`

The generator currently logs freeform text. Add a structured result object that is both returned and printed as JSON when `--json` flag is passed.

- [ ] **Step 1: Read generate.mjs**

Read `scripts/ai-plan/generate.mjs` in full. Note how the main generation function returns and how errors are currently surfaced.

- [ ] **Step 2: Define the result shape**

The structured result is:

```javascript
{
  ok: Boolean,
  skipped: Boolean,
  modules: Number,
  warnings: String[],  // named codes: CODE_MAP_STALE, MISSING_DOCS, etc.
  errors: String[],    // named codes: AST_GREP_NOT_FOUND, NO_MODULES_FOUND, etc.
  summary: String      // human-readable one-liner
}
```

- [ ] **Step 3: Thread the result through the generation pipeline**

Accumulate warnings and errors during generation (currently thrown or logged). Return the structured result from the main run function.

In the CLI entry point:
- Default: print `summary` to stdout
- With `--json` flag: print the full JSON to stdout
- `--doctor` command: surface `errors` and `warnings` with codes

- [ ] **Step 4: Commit**

```bash
git add scripts/ai-plan/generate.mjs
git commit -m "feat(ai-plan): add structured result to generator

Returns {ok, skipped, modules, warnings, errors, summary} from generation.
Named error codes: MISSING_DOCS, AST_GREP_NOT_FOUND, CODE_MAP_STALE,
NO_MODULES_FOUND. --json flag for machine-readable output."
```

---

### Task 18: Update `design-spec` skill for direct module file embedding

**Files:**
- Modify: `skills/design-spec/SKILL.md`

Step 1 (Load project context) is updated to directly embed the module capability table and the primary module file, rather than guiding agents to do so.

- [ ] **Step 1: Read design-spec/SKILL.md**

Read `skills/design-spec/SKILL.md` in full. Note Step 1 (checklist item 1, lines 59–69) and the Single module focus section.

- [ ] **Step 2: Update Step 1 context-loading language**

Replace the existing Step 1 ai-plan loading instruction with:

```
1. **Load input and explore project context** — if starting from a backlog item, read its detail file; check files, docs, recent commits; read `docs/roadmap.md` when implementing a roadmap item.

   **Load planning context (when repo has source code):**
   1. Check for `docs/agent-files/context/index.md` (or legacy `docs/ai-plan/INDEX.md`)
   2. If missing: run `npm run ai-plan` now before continuing — do not skip
   3. If present: check staleness — if `index.md` is older than the most recently modified source file, run `npm run ai-plan` before continuing
   4. Read `index.md` now (use the Read tool). Do not summarize or skip.
   5. Embed the module capability table from `index.md` directly into working context
   6. Identify the primary module from the table. When the primary module is identified, read `docs/agent-files/context/modules/<id>.md` now (use the Read tool). Do not defer.
```

- [ ] **Step 3: Update the Single module focus section**

In the "Single module focus" section, update the module file path references:
- `docs/ai-plan/INDEX.md` → `docs/agent-files/context/index.md`
- `docs/ai-plan/scopes/{module-id}.md` → `docs/agent-files/context/modules/{module-id}.md`
- `docs/ai-plan/MODULE_MAP.json` → `docs/agent-files/context/module-map.json`
- `planningScope` → `planningModule` in the spec template snippet

- [ ] **Step 4: Verify no remaining old paths**

```bash
grep -n "docs/ai-plan\|planningScope" skills/design-spec/SKILL.md
```

Should return nothing.

- [ ] **Step 5: Commit**

```bash
git add skills/design-spec/SKILL.md
git commit -m "feat(design-spec): enforce direct module file loading at Step 1

Step 1 now gives imperative instructions to read index.md and the primary
module file now (not optionally, not when needed). Staleness gate added.
Agents no longer have discretion to skip the module context load."
```

---

### Task 19: Update `write-plan` skill for Planning context section

**Files:**
- Modify: `skills/write-plan/SKILL.md`

After identifying the primary module, the plan document includes a `## Planning context` section containing the key module file facts.

- [ ] **Step 1: Read write-plan/SKILL.md**

Read `skills/write-plan/SKILL.md` in full. Note the plan document header template (lines 83–108), particularly where `**Planning scope:**` is currently set (line 104).

- [ ] **Step 2: Update the AI Plan Context section (lines 35–46)**

Replace the existing L1 scope loading guidance with:

```markdown
## AI Plan Context

**Read the module file now** (do not defer):

1. Read `docs/agent-files/context/index.md` — identify the primary module
2. Read `docs/agent-files/context/modules/<id>.md` now (Read tool). Do not summarize or skip.
3. If `index.md` is missing: run `npm run ai-plan` in the project repo before continuing.

**Never** inject all module files or the full code-map.json during planning.
```

- [ ] **Step 3: Update the plan document header template**

Replace the `**Planning scope:**` line with a `## Planning context` section that embeds key module facts:

```markdown
**Planning module:** `{module-id}` (`docs/agent-files/context/modules/{module-id}.md`)

## Planning context

**Module:** `{module-id}`

**What this module does:** {description — first 2 sentences from module file}

**Capabilities:** {capabilities list, comma-separated}
**Does not own:** {doesNotOwn list, comma-separated}
```

This section is written into every plan document so `execute-plan` has the module context without re-fetching.

- [ ] **Step 4: Commit**

```bash
git add skills/write-plan/SKILL.md
git commit -m "feat(write-plan): add Planning context section to plan documents

Module description, capabilities, and doesNotOwn facts are embedded
into the plan header. execute-plan inherits this context without
needing to re-fetch module files."
```

---

### Task 20: Update `using-ai-plan` skill language to instruction

**Files:**
- Modify: `skills/using-ai-plan/SKILL.md`

Shift the skill language from guidance ("should read", "consider injecting") to instruction ("Read now", "Do not defer").

- [ ] **Step 1: Read using-ai-plan/SKILL.md**

Read `skills/using-ai-plan/SKILL.md` in full. Note the Progressive Disclosure table (lines 10–50) and the "Pick a Module Scope" section.

- [ ] **Step 2: Update Progressive Disclosure table**

Change the L1 row from:
```
| L1 | **One** `docs/ai-plan/scopes/<module-id>.md` | **During write-plan** — pick module from INDEX |
```
To:
```
| L1 | **One** `docs/agent-files/context/modules/<module-id>.md` | **During write-plan** — Read the module file now (Read tool). Do not defer or summarize. |
```

- [ ] **Step 3: Update the "Pick a Module Scope" section**

Rename to "Pick a Module File". Change instructions from "read that scope file" to "Read `docs/agent-files/context/modules/<id>.md` now (use the Read tool). Do not summarize or skip."

Add staleness gate instruction:

```markdown
**Staleness gate:** If `docs/agent-files/context/index.md` is missing or any source file under the project root is newer than `index.md`, run `npm run ai-plan` before any planning step. Do not proceed with stale context.
```

- [ ] **Step 4: Update the plan header template snippet**

Change `**Planning scope:**` to `**Planning module:**` and update the path.

- [ ] **Step 5: Verify no old paths or terms remain**

```bash
grep -n "docs/ai-plan\|scopes/\|planningScope\|scope file" skills/using-ai-plan/SKILL.md
```

Should return nothing.

- [ ] **Step 6: Commit**

```bash
git add skills/using-ai-plan/SKILL.md
git commit -m "feat(using-ai-plan): shift L1 from guidance to instruction

L1 instruction now says 'Read the module file now (Read tool). Do not defer.'
Staleness gate added as explicit instruction. Scopes renamed to modules.
Matches the direct-embedding behavior added to design-spec and write-plan."
```

---

### Task 21: Final verification

**Files:**
- Read: generated artifacts for spot-check

- [ ] **Step 1: Full regeneration pipeline**

```bash
node scripts/code-map/generate-code-map.mjs
node scripts/ai-plan/generate.mjs
```

Confirm:
- No errors or warnings
- `CODE_MAP.json` entries have `signature` and/or `summary` fields on at least some entries
- `docs/ai-plan/modules/main.md` (or new path) has capability-first sections
- `INDEX.md` module table has `What it does` and `Owns` columns
- `MODULE_MAP.json` has `description` and `capabilities` on module entries
- `CLAUDE.md` has the `<!-- ai-plan:module-map:start/end -->` embedded section

- [ ] **Step 2: Verify doctor passes**

```bash
node scripts/ai-plan/generate.mjs --doctor
```

Should pass with no errors.

- [ ] **Step 3: Grep for remaining old terms**

```bash
grep -rn "planningScope\|preserveScope\|docs/ai-plan/scopes\|scope file" \
  scripts/ skills/
```

Investigate and fix any remaining hits (except spec files which are intentional).

- [ ] **Step 4: Verify git log**

```bash
git log --oneline
```

Should show one commit per task (20 commits), each matching the spec changes.

- [ ] **Step 5: Verify .claude/settings.json hook entry**

Read `.claude/settings.json` (if it exists in the dev-tools repo after running --write-scripts against it). Confirm the PostToolUse hook entry is present.

- [ ] **Step 6: Final commit if any cleanup needed**

```bash
git add -p
git commit -m "fix(code-map-improvements): remaining cleanup

Addresses any stale references or minor issues found during final verification."
```
