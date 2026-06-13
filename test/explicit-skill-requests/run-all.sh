#!/usr/bin/env bash
# Run all explicit skill request tests
# Usage: ./run-all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPTS_DIR="$SCRIPT_DIR/prompts"

echo "=== Running All Explicit Skill Request Tests ==="
echo ""

PASSED=0
FAILED=0
RESULTS=""

# Test: execute-plan, please
echo ">>> Test 1: execute-plan-please"
if "$SCRIPT_DIR/run-test.sh" "execute-plan" "$PROMPTS_DIR/execute-plan-please.txt"; then
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\nPASS: execute-plan-please"
else
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\nFAIL: execute-plan-please"
fi
echo ""

# Test: please use design-spec
echo ">>> Test 2: please-use-design-spec"
if "$SCRIPT_DIR/run-test.sh" "design-spec" "$PROMPTS_DIR/please-use-design-spec.txt"; then
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\nPASS: please-use-design-spec"
else
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\nFAIL: please-use-design-spec"
fi
echo ""

# Test: mid-conversation execute plan
echo ">>> Test 3: mid-conversation-execute-plan"
if "$SCRIPT_DIR/run-test.sh" "execute-plan" "$PROMPTS_DIR/mid-conversation-execute-plan.txt"; then
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\nPASS: mid-conversation-execute-plan"
else
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\nFAIL: mid-conversation-execute-plan"
fi
echo ""

# Test: fix-bug, please
echo ">>> Test 4: fix-bug-please"
if "$SCRIPT_DIR/run-test.sh" "fix-bug" "$PROMPTS_DIR/fix-bug-please.txt"; then
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\nPASS: fix-bug-please"
else
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\nFAIL: fix-bug-please"
fi
echo ""

# Test: add-backlog, please
echo ">>> Test 5: add-backlog-please"
if "$SCRIPT_DIR/run-test.sh" "add-backlog" "$PROMPTS_DIR/add-backlog-please.txt"; then
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\nPASS: add-backlog-please"
else
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\nFAIL: add-backlog-please"
fi
echo ""

# Test: add-bug, please
echo ">>> Test 6: add-bug-please"
if "$SCRIPT_DIR/run-test.sh" "add-bug" "$PROMPTS_DIR/add-bug-please.txt"; then
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\nPASS: add-bug-please"
else
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\nFAIL: add-bug-please"
fi
echo ""

# Test: plan-product, please
echo ">>> Test 7: plan-product-please"
if "$SCRIPT_DIR/run-test.sh" "plan-product" "$PROMPTS_DIR/plan-product-please.txt"; then
    PASSED=$((PASSED + 1))
    RESULTS="$RESULTS\nPASS: plan-product-please"
else
    FAILED=$((FAILED + 1))
    RESULTS="$RESULTS\nFAIL: plan-product-please"
fi
echo ""

echo "=== Summary ==="
echo -e "$RESULTS"
echo ""
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Total: $((PASSED + FAILED))"

if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
