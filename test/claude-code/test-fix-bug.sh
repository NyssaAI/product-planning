#!/usr/bin/env bash
# Test: fix-bug skill
# Verifies that the orchestrator is loaded and describes log → analyze → resolve → complete
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

echo "=== Test: fix-bug skill ==="
echo ""

# Test 1: Verify skill can be loaded
echo "Test 1: Skill loading..."

output=$(run_claude "What is the fix-bug skill? Describe its key steps briefly." 30)

if assert_contains "$output" "fix-bug\|Fix Bug" "Skill is recognized"; then
    : # pass
else
    exit 1
fi

if assert_contains "$output" "log\|analyze\|resolve\|complete" "Mentions orchestrator steps"; then
    : # pass
else
    exit 1
fi

echo ""

# Test 2: Verify sub-skills are gated
echo "Test 2: Sub-skill gating..."

output=$(run_claude "In fix-bug, should users invoke fix-bug-log or fix-bug-resolve directly? What is the single entry point?" 30)

if assert_contains "$output" "fix-bug" "Single entry point is fix-bug"; then
    : # pass
else
    exit 1
fi

if assert_contains "$output" "not.*direct\|do not.*direct\|only.*fix-bug\|via fix-bug" "Sub-skills not invoked directly"; then
    : # pass
else
    exit 1
fi

echo ""

# Test 3: Verify systematic-debugging is Step 2, not a bug entry point
echo "Test 3: Analyze step uses systematic-debugging..."

output=$(run_claude "For a bug, should you invoke systematic-debugging directly or use fix-bug? What does fix-bug Step 2 do?" 30)

if assert_contains "$output" "fix-bug" "Bug work starts at fix-bug"; then
    : # pass
else
    exit 1
fi

if assert_contains "$output" "systematic-debugging\|analyze\|root.cause" "Step 2 is root-cause analysis"; then
    : # pass
else
    exit 1
fi

echo ""

# Test 4: Verify Ralph is not the bug entry point
echo "Test 4: Ralph is not the bug entry point..."

output=$(run_claude "Should you use /ralph-loop for bugs, or fix-bug? Why?" 30)

if assert_contains "$output" "fix-bug" "Bugs use fix-bug"; then
    : # pass
else
    exit 1
fi

if assert_contains "$output" "not.*ralph\|do not.*ralph\|don't.*ralph\|avoid.*ralph" "Discourages /ralph-loop for bugs"; then
    : # pass
else
    exit 1
fi

echo ""

echo "=== All fix-bug skill tests passed ==="
