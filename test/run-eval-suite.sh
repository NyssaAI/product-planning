#!/usr/bin/env bash
# Backward-compatible alias for Claude fast evals.
# Prefer: test/run-all.sh [--all|--integration|--full]
exec "$(cd "$(dirname "$0")" && pwd)/run-all.sh" --fast "$@"
