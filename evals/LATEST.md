# Latest plugin evaluation

Generated from [matrix.json](matrix.json), [scenarios/product-planning/cases.json](scenarios/product-planning/cases.json), [waza/skills/plan-product/eval.yaml](waza/skills/plan-product/eval.yaml), and verified `.temp/evals/evidence/` receipts by `node evals/report.mjs generate`.
Candidate SHA-256: `9b3e94cc7dc3d00f68322d4356512fba15548e647a501200670b61e1a4f150e9`. Suite revision: `0.14.1`.

A missing or failing required row blocks release. A consistent report does not imply release readiness.

Offline deterministic gates (`npm run validate`, `npm test`, `npm run eval:prepare`, and Waza trigger checks) verify static contracts locally; native host rows require isolated execution outside `repo_root`. See [README.md](README.md) for workflow instructions.

| Suite | Harness | Platform | Configuration | Required | Latest completed result | Outcome / score | Freshness | Newer attempt / next check |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| product-planning | Codex | windows-x86_64 | default | Yes | Not run | Score unavailable | No result | Prepare isolated scenarios via npm run eval:prepare and execute routing/content cases in a fresh Codex session outside repo_root; static validation and offline Waza trigger checks pass locally. |
| product-planning | Claude Code | windows-x86_64 | default | Yes | Not run | Score unavailable | No result | Prepare isolated scenarios via npm run eval:prepare and execute routing/content cases in a fresh Claude Code session outside repo_root; static validation and offline Waza trigger checks pass locally. |
| product-planning | Claude Cowork | windows-x86_64 | default | Yes | Not run | Score unavailable | No result | Prepare isolated scenarios via npm run eval:prepare and execute routing/content cases in a fresh Claude Cowork session outside repo_root; static validation and offline Waza trigger checks pass locally. |
| product-planning | Antigravity CLI | windows-x86_64 | default | Yes | Not run | Score unavailable | No result | Prepare isolated scenarios via npm run eval:prepare and execute routing/content cases in a fresh Antigravity CLI session outside repo_root; static validation and offline Waza trigger checks pass locally. |
| product-planning | Antigravity 2.0 | windows-x86_64 | default | Yes | Not run | Score unavailable | No result | Prepare isolated scenarios via npm run eval:prepare and execute routing/content cases in a fresh Antigravity 2.0 session outside repo_root; static validation and offline Waza trigger checks pass locally. |
| product-planning | Antigravity IDE | windows-x86_64 | default | Yes | Not run | Score unavailable | No result | Prepare isolated scenarios via npm run eval:prepare and execute routing/content cases in a fresh Antigravity IDE session outside repo_root; static validation and offline Waza trigger checks pass locally. |
| product-planning | Hermes Agent | windows-x86_64 | default | Yes | Not run | Score unavailable | No result | Prepare isolated scenarios via npm run eval:prepare and execute routing/content cases in a fresh Hermes Agent session outside repo_root; static validation and offline Waza trigger checks pass locally. |
| product-planning | OpenClaw | windows-x86_64 | default | Yes | Not run | Score unavailable | No result | Prepare isolated scenarios via npm run eval:prepare and execute routing/content cases in a fresh OpenClaw session outside repo_root; static validation and offline Waza trigger checks pass locally. |
| product-planning | Cursor | windows-x86_64 | default | No | Not run | Score unavailable | No result | Prepare isolated scenarios via npm run eval:prepare and execute routing/content cases in a fresh Cursor session outside repo_root; static validation and offline Waza trigger checks pass locally. |
| product-planning | Grok Bot | windows-x86_64 | default | No | Not run | Score unavailable | No result | Prepare isolated scenarios via npm run eval:prepare and execute routing/content cases in a fresh Grok Bot session outside repo_root; static validation and offline Waza trigger checks pass locally. |
| product-planning | Muse | windows-x86_64 | default | No | Not run | Score unavailable | No result | Provisional: establish loader contract before producing or validating an artifact. |

Release acceptance: **Fail — required evidence missing, stale, or failing**.
