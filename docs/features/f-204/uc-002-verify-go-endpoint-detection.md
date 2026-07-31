---
feature: F-204
id: UC-002
status: complete
---

# UC-002 Verify Go Endpoint Detection

## Actor

A developer (or an agent on their behalf) validating that a Go repo's routes and tools are indexed.

## Goal

Confirm that registered HTTP routes and MCP tools in the Go repo appear in the generated endpoint index.

## Starting Context

- `map-code` has already run on the Go repo (see [UC-001](uc-001-map-a-go-repository.md)).
- The endpoint index exists in the configured code-map directory.

## Entry Route

The developer opens the generated code-map artifacts, or asks the agent to check endpoint coverage — typically after adding or changing a route.

## Trigger

A specific route or MCP tool needs confirmation that it is indexed.

## Process

```text
Developer confirms Go endpoints are indexed
+-- Starting context: generated code-map artifacts exist for the Go repo
+-- Entry route: open the artifacts or ask the agent to check
+-- Trigger: a route or MCP tool needs verification
+-- Step 1: locate the endpoint index in the configured code-map directory
+-- Step 2: find the expected entries by path, method, or tool name
|   +-- net/http HandleFunc/Handle and ServeMux registrations
|   +-- gin, echo, and chi route registrations
|   \-- MCP tool declarations
+-- Step 3: entry missing -> check staleness and framework support
|   +-- Decision: artifacts stale -> rerun map-code and re-check
|   \-- Decision: framework unsupported or route built dynamically -> record a detector gap
+-- Step 4: entry present but path looks wrong -> check for router-group wrappers
|   \-- Decision: route registered inside Group/Route/Mount -> sub-path with confidence medium is expected, not a gap
\-- Success: expected endpoints are present, or the gap is recorded
```

## Step Details

### Step 3: Missing-entry triage

Staleness is the common cause — regenerate first. If the entry is still missing, distinguish deferred surfaces (gRPC is out of scope for F-204) and dynamically constructed routes (not statically detectable) from genuine detector gaps worth filing.

### Step 4: Present-with-wrong-path triage

Group prefixes resolve file-scoped only. A route registered through a same-file `Group` binding carries its full path at confidence `high`; routes inside chi `Route`/`Mount` closures or cross-file groups appear with their sub-path at confidence `medium`. A medium-confidence sub-path entry is expected behavior, not a detector gap.

## Success

Every expected route and MCP tool is either present in the endpoint index or explicitly recorded as a detector gap or out-of-scope surface.

## Failure Cases

- Stale artifacts: source changed after the last `map-code` run — regenerate.
- Unsupported surface: gRPC registrations are deferred; dynamic route construction is not statically detectable.
- Missing index: `map-code` has not run — route to UC-001 first.

## Consistency Check

- Unique coverage: This use case covers post-generation verification of endpoint entries. [UC-001](uc-001-map-a-go-repository.md) covers generating the artifacts.
- Closest related use cases: `UC-001` in this folder — the boundary is generate (UC-001) versus verify (UC-002).
- Contradictions: None found.

## Acceptance

- The ASCII process tree can be followed from the F-204 feature guide.
- Expected outputs are clear: confirmed entries or a recorded gap.
- Failure cases produce clear guidance.
- The consistency check shows no unresolved duplicate coverage or contradictions.
