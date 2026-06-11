#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

git -C "$ROOT" config core.hooksPath .githooks
echo "Configured dev-tools git hooks: core.hooksPath .githooks"
