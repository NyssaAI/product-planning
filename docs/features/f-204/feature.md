---
id: F-204
phase: 2
status: planned
---

# F-204 Go Code-Map Support

## Summary

Go language support across the code-map pipeline: symbol index, endpoint index, module graph, and module docs at parity with the existing TypeScript, C#, and Python coverage.

## User Need

Teams with Go repositories get no code-map context today, so implementation planning in Go codebases falls back to broad repository summaries instead of scoped module docs, symbols, and endpoints.

## Use Cases

- [UC-001: Map a Go Repository](uc-001-map-a-go-repository.md)
- [UC-002: Verify Go Endpoint Detection](uc-002-verify-go-endpoint-detection.md)

## Scope

- A Go module-map adapter under `scripts/module-map/lib/adapters/` producing import edges and symbol ownership.
- ast-grep symbol rules for Go functions, methods, structs, and interfaces in the code-map generator.
- Endpoint extraction for `net/http` (HandleFunc/Handle/ServeMux), gin, echo, and chi route registrations, and Go MCP tool declarations.
- Module discovery from Go package directories under each `go.mod` (including `go.work` members), one derivation input per package.
- A Go stack profile so auto-detection recognizes Go repos.
- Go fixture repos and adapter tests mirroring the existing per-language test layout.

## Out of Scope

- gRPC service detection from generated bindings — deferred to a later feature.
- Indexing generated code (`*.pb.go`) and `vendor/` directories; both are skipped.
- Build-tag and conditional-compilation analysis.
- Go detectors in the `find-code-patterns` pattern library — that is a separate repo-tunable surface (`paths.patternLibrary`).
- The endpoint-index capability itself — CM-006 owns it; this feature adds Go to its supported languages.

## Inputs

- Go source files, `go.mod`, and `go.work` in the target repo.
- `plan-product.config.json` source roots and module discovery settings.
- The bundled `@ast-grep/cli` (ships the Go grammar).

## Outputs

- Go symbol and endpoint entries in the configured code-map artifact (`code-map.json`).
- Go modules with `dependsOn`/`usedBy` edges in `module-map.json` and rendered module docs.

## Acceptance

- A Go fixture repo maps end-to-end: symbols indexed, `net/http`, gin/echo/chi, and MCP endpoints detected, one module per package derived under its `go.mod`.
- `vendor/` and `*.pb.go` files do not appear in the index.
- Adapter and endpoint tests pass in the existing suite layout.
- The path contract matches `.plan-product/config.json`.

## Dependencies

- F-201 (product code map).
- Existing generator capabilities CM-001 (code map generation), CM-002 (module map generation), CM-006 (endpoint surface detection).
- External: ast-grep Go language support.
