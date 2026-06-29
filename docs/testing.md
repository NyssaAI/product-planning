# Testing dev-tools

Maintainer-only: everything under `test/` validates the ai-plan / code-map generators and is
**not** installed with dev-tools from the marketplace.

Index: [README.md](README.md)

## Test suite

Plain Node.js test files (`node:test`), no external runner:

```
test/
├── ai-plan/                     # generator config, bootstrap, index/node organization, module rendering
├── ai-plan-adapters/            # language adapters (C#, TypeScript, Python), module edges/ownership
├── ai-plan-endpoints.test.mjs   # HTTP / MCP endpoint extraction
└── code-map/                    # symbol extractors, endpoints, module links
```

`test/ai-plan-adapters/fixtures/` holds multi-language sample sub-repos used as test data.

## Running

From the repo root, with Node 18+:

```bash
node --test \
  test/ai-plan/*.test.mjs \
  test/ai-plan-adapters/*.test.mjs \
  test/ai-plan-endpoints.test.mjs \
  test/code-map/*.test.mjs
```

All tests are self-contained — no Claude Code, API keys, or network required.
