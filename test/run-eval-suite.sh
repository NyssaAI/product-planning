#!/usr/bin/env bash
# Run all Claude-based skill eval suites against the local plugin checkout.
set -uo pipefail

unset ANTHROPIC_API_KEY

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOG="/tmp/dev-tools-eval-suite.log"

echo "=== dev-tools skill eval suite ===" | tee "$LOG"
echo "Started: $(date)" | tee -a "$LOG"
echo "Repository: $REPO" | tee -a "$LOG"
echo "" | tee -a "$LOG"

CC=0
ST=0
ES=0

echo "--- 1/3 claude-code (fast) ---" | tee -a "$LOG"
if (cd "$REPO/test/claude-code" && ./run-skill-tests.sh --verbose) 2>&1 | tee -a "$LOG"; then
  CC=0
else
  CC=$?
fi

echo "" | tee -a "$LOG"
echo "--- 2/3 skill-triggering ---" | tee -a "$LOG"
if (cd "$REPO/test/skill-triggering" && ./run-all.sh) 2>&1 | tee -a "$LOG"; then
  ST=0
else
  ST=$?
fi

echo "" | tee -a "$LOG"
echo "--- 3/3 explicit-skill-requests ---" | tee -a "$LOG"
if (cd "$REPO/test/explicit-skill-requests" && ./run-all.sh) 2>&1 | tee -a "$LOG"; then
  ES=0
else
  ES=$?
fi

echo "" | tee -a "$LOG"
echo "Finished: $(date)" | tee -a "$LOG"
echo "SUMMARY: claude-code=$CC skill-triggering=$ST explicit-skill-requests=$ES" | tee -a "$LOG"

if [ "$CC" -ne 0 ] || [ "$ST" -ne 0 ] || [ "$ES" -ne 0 ]; then
  exit 1
fi
