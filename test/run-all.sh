#!/usr/bin/env bash
# Run dev-tools maintainer test suites from the repo root.
#
# Usage:
#   ./test/run-all.sh              # Claude fast evals (default)
#   ./test/run-all.sh --all        # Fast Claude + Node + OpenCode structure
#   ./test/run-all.sh --integration # Fast Claude + execute-plan integration
#   ./test/run-all.sh --full       # --all + integration (1–2 hours)
#
# Environment:
#   unset ANTHROPIC_API_KEY if an invalid key overrides claude.ai auth.
set -uo pipefail

unset ANTHROPIC_API_KEY

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${DEV_TOOLS_TEST_LOG:-/tmp/dev-tools-test-run.log}"

RUN_FAST=0
RUN_INTEGRATION=0
RUN_NODE=0
RUN_OPENCODE=0

usage() {
  cat <<'EOF'
Usage: test/run-all.sh [options]

Options:
  --fast          Claude fast evals only (default)
  --all           Fast Claude + design-spec-server (Node) + OpenCode structure
  --integration   Fast Claude + execute-plan integration test
  --full          --all + integration
  --node          design-spec-server npm test only
  --opencode      OpenCode structure tests only
  --help          Show this help

Suites:
  claude-code     test/claude-code/run-skill-tests.sh
  skill-trigger   test/skill-triggering/run-all.sh
  explicit        test/explicit-skill-requests/run-all.sh
  integration     test/claude-code/run-skill-tests.sh --integration
  design-spec-server  test/design-spec-server (npm test)
  opencode        test/opencode/run-tests.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --fast) RUN_FAST=1; shift ;;
    --all) RUN_FAST=1; RUN_NODE=1; RUN_OPENCODE=1; shift ;;
    --integration) RUN_FAST=1; RUN_INTEGRATION=1; shift ;;
    --full) RUN_FAST=1; RUN_NODE=1; RUN_OPENCODE=1; RUN_INTEGRATION=1; shift ;;
    --node) RUN_NODE=1; shift ;;
    --opencode) RUN_OPENCODE=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$RUN_FAST$RUN_INTEGRATION$RUN_NODE$RUN_OPENCODE" == "0000" ]]; then
  RUN_FAST=1
fi

CC=0 ST=0 ES=0 INT=0 NODE=0 OC=0

echo "=== dev-tools test run ===" | tee "$LOG"
echo "Started: $(date)" | tee -a "$LOG"
echo "Repository: $REPO" | tee -a "$LOG"
echo "" | tee -a "$LOG"

if [[ "$RUN_FAST" -eq 1 ]]; then
  echo "--- claude-code (fast) ---" | tee -a "$LOG"
  (cd "$REPO/test/claude-code" && ./run-skill-tests.sh --verbose) 2>&1 | tee -a "$LOG"
  CC=${PIPESTATUS[0]}
  echo "" | tee -a "$LOG"

  echo "--- skill-triggering ---" | tee -a "$LOG"
  (cd "$REPO/test/skill-triggering" && ./run-all.sh) 2>&1 | tee -a "$LOG"
  ST=${PIPESTATUS[0]}
  echo "" | tee -a "$LOG"

  echo "--- explicit-skill-requests ---" | tee -a "$LOG"
  (cd "$REPO/test/explicit-skill-requests" && ./run-all.sh) 2>&1 | tee -a "$LOG"
  ES=${PIPESTATUS[0]}
  echo "" | tee -a "$LOG"
fi

if [[ "$RUN_INTEGRATION" -eq 1 ]]; then
  echo "--- claude-code (integration) ---" | tee -a "$LOG"
  (cd "$REPO/test/claude-code" && ./run-skill-tests.sh --integration --verbose --timeout 1800) 2>&1 | tee -a "$LOG"
  INT=${PIPESTATUS[0]}
  echo "" | tee -a "$LOG"
fi

if [[ "$RUN_NODE" -eq 1 ]]; then
  echo "--- design-spec-server ---" | tee -a "$LOG"
  (cd "$REPO/test/design-spec-server" && npm install --no-audit --no-fund --silent && npm test) 2>&1 | tee -a "$LOG"
  NODE=${PIPESTATUS[0]}
  echo "" | tee -a "$LOG"
fi

if [[ "$RUN_OPENCODE" -eq 1 ]]; then
  echo "--- opencode (structure) ---" | tee -a "$LOG"
  (cd "$REPO/test/opencode" && ./run-tests.sh --verbose) 2>&1 | tee -a "$LOG"
  OC=${PIPESTATUS[0]}
  echo "" | tee -a "$LOG"
fi

echo "Finished: $(date)" | tee -a "$LOG"
echo "SUMMARY: claude-code=$CC skill-triggering=$ST explicit=$ES integration=$INT design-spec-server=$NODE opencode=$OC" | tee -a "$LOG"
echo "Log: $LOG" | tee -a "$LOG"

if [[ "$CC" -ne 0 || "$ST" -ne 0 || "$ES" -ne 0 || "$INT" -ne 0 || "$NODE" -ne 0 || "$OC" -ne 0 ]]; then
  exit 1
fi
