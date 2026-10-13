---
feature: F-204
id: UC-001
status: complete
---

# UC-001 Map a Go Repository

## Actor

A coding agent (Claude Code, Codex, Cursor, or Gemini) running the `map-code` workflow, or a user invoking it directly.

## Goal

Generate complete code-map context for a Go repository: symbol index, endpoint index, module graph, and module docs.

## Starting Context

- The target repo contains Go sources with at least one `go.mod` (optionally a `go.work` with members).
- Product docs exist or explicit doc paths are configured in `.jamaynor/plan-product/config.json`.
- The plan-product plugin is installed and Node.js is available.

## Entry Route

The user invokes the `map-code` command or asks the agent to map the repo's code.

## Trigger

The user requests code-map generation for the Go repo.

## Process

```text
Agent generates Go code-map context
+-- Starting context: Go repo with go.mod and configured product docs
+-- Entry route: user invokes map-code
+-- Trigger: user asks to map the repo
+-- Step 1: resolve the plugin root and read .jamaynor/plan-product/config.json source roots
+-- Step 2: run scripts/map-code/generate.mjs from the repo root
|   +-- Scan Go sources with ast-grep symbol rules (functions, methods, structs, interfaces)
|   +-- Extract endpoints: net/http, gin, echo, chi registrations, and MCP tool declarations
|   \-- Failure path: adapter or scan failure -> warn and degrade gracefully (empty module graph)
+-- Step 3: derive modules from Go package directories under each go.mod
|   \-- Decision: vendor/ directories and *.pb.go files are skipped
+-- Step 4: render module docs and embed the module-map table in CLAUDE.md and AGENTS.md
\-- Success: code-map.json, module-map.json, and module docs include Go entries
```

## Step Details

### Step 2: Run the public generator

The public `map-code` script runs the code-map generator and then the module-map generator, exactly as for other languages. Go parity means the same artifact surface — no Go-specific output files. Mixed-language repos select one stack-graph adapter (first match wins), an existing architectural constraint: a Go+TypeScript monorepo gets import edges for only one language.

### Step 3: Package-level module discovery

Each Go package directory under a `go.mod` is a module-derivation input; `go.work` members contribute their packages the same way. Import edges between packages feed the existing `derive-modules` clustering.

## Success

Generated artifacts in the configured code-map directory include Go symbols, endpoints, and modules, and the module-map table is embedded in the agent context files.

## Failure Cases

- No `go.mod` found: Go sources are not treated as a Go module tree; the run reports what was skipped.
- ast-grep binary unavailable or the scan fails: the adapter logs a warning and returns an empty graph, matching the shared adapter convention — generation continues with what remains rather than aborting.
- Product docs missing and no doc paths configured: the workflow stops and routes the user to `plan-product` first.

## Consistency Check

- Unique coverage: This use case covers end-to-end generation for a Go repo. [UC-002](uc-002-verify-go-endpoint-detection.md) covers checking specific endpoint entries after generation.
- Closest related use cases: `UC-002` in this folder — the boundary is generate (UC-001) versus verify (UC-002).
- Contradictions: None found.

## Acceptance

- The ASCII process tree can be followed from the F-204 feature guide.
- Expected outputs are clear: Go entries in the three artifact surfaces.
- Failure cases produce clear guidance.
- The consistency check shows no unresolved duplicate coverage or contradictions.
