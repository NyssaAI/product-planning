#!/usr/bin/env bash
# Test: execute-plan skill
# Verifies that the orchestrator is loaded and describes verify → run → finish
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/test-helpers.sh"

echo "=== Test: execute-plan skill ==="
echo ""

# Test 1: Verify skill can be loaded
echo "Test 1: Skill loading..."

output=$(run_claude "What is the execute-plan skill? Describe its key steps briefly." 30)

if assert_contains "$output" "execute-plan\|Execute Plan" "Skill is recognized"; then
    : # pass
else
    exit 1
fi

if assert_contains "$output" "verify\|run\|finish\|worktree\|PR\|pull request" "Mentions orchestrator steps"; then
    : # pass
else
    exit 1
fi

echo ""

# Test 2: Verify sub-skills are gated
echo "Test 2: Sub-skill gating..."

output=$(run_claude "In execute-plan, should users invoke execute-plan-run or execute-plan-finish directly? What is the single entry point?" 30)

if assert_contains "$output" "execute-plan" "Single entry point is execute-plan"; then
    : # pass
else
    exit 1
fi

if assert_contains "$output" "not.*direct\|do not.*direct\|only.*execute-plan\|via execute-plan" "Sub-skills not invoked directly"; then
    : # pass
else
    exit 1
fi

echo ""

# Test 3: Verify run mode default (execute-plan-run)
echo "Test 3: Default run mode..."

output=$(run_claude "In execute-plan Step 2, what is the default run skill when subagents are available?" 30)

if assert_contains "$output" "execute-plan-run" "Default is execute-plan-run"; then
    : # pass
else
    exit 1
fi

echo ""

# Test 4: Verify worktree requirement
echo "Test 4: Worktree requirement..."

output=$(run_claude "What must execute-plan Step 1 verify before running tasks?" 30)

if assert_contains "$output" "using-git-worktrees\|worktree\|feature.*branch" "Mentions worktree requirement"; then
    : # pass
else
    exit 1
fi

echo ""

echo "=== All execute-plan skill tests passed ==="
