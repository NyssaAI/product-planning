#!/usr/bin/env bash
set -uo pipefail

# Integration test for the pre-push test gate installer (scripts/setup-test-gate.mjs).
# Mirrors test/version-hooks/run-test.sh: builds temp git repos with a local bare
# remote so a real `git push` exercises the vendored hook. Asserts allow/block,
# --no-verify bypass, env-independence, husky preservation, and idempotency.

# PLUGIN_ROOT = this worktree (so the installer vendors from here).
PLUGIN_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT"

FAILED=0
fail() {
  echo "FAIL: $*" >&2
  FAILED=1
}
pass() {
  echo "PASS: $*"
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# ----------------------------------------------------------------------------
# Helper: create a fresh git repo wired to a local bare remote, with one commit.
# Usage: make_repo <dir>
# ----------------------------------------------------------------------------
make_repo() {
  local repo="$1"
  local remote="$repo.git"
  mkdir -p "$repo"
  git init -q --bare "$remote"
  git -C "$repo" init -q
  git -C "$repo" config core.autocrlf false
  git -C "$repo" config user.email test@example.invalid
  git -C "$repo" config user.name "Test Gate Test"
  git -C "$repo" remote add origin "$remote"
  echo "hello" > "$repo/README.md"
  git -C "$repo" add .
  git -C "$repo" commit -q -m initial
  # Branch name normalization (older git defaults to master).
  git -C "$repo" branch -M main
}

write_config() {
  # write_config <repo> <command>
  cat > "$1/ai-plan.config.json" <<JSON
{ "test": { "commands": ["$2"] } }
JSON
  git -C "$1" add ai-plan.config.json
  git -C "$1" commit -q -m "config: $2"
}

# ============================================================================
# Test 1 — install wires the gate
# ============================================================================
REPO1="$TMP/repo1"
make_repo "$REPO1"

node "$PLUGIN_ROOT/scripts/setup-test-gate.mjs" "$REPO1" >/dev/null 2>&1 \
  || fail "installer exited nonzero on a fresh repo"

[[ -f "$REPO1/.githooks/test-gate.mjs" ]] || fail "install: .githooks/test-gate.mjs missing"
[[ -f "$REPO1/.githooks/detect.mjs"   ]] || fail "install: .githooks/detect.mjs missing"
[[ -f "$REPO1/.githooks/pre-push"     ]] || fail "install: .githooks/pre-push missing"
HP="$(git -C "$REPO1" config --get core.hooksPath)"
[[ "$HP" == ".githooks" ]] || fail "install: core.hooksPath is '$HP', expected .githooks"
[[ "$FAILED" -eq 0 ]] && pass "installer vendors runner + detect + pre-push and sets core.hooksPath"

# ============================================================================
# Test 2 — failing test command BLOCKS the push
# ============================================================================
write_config "$REPO1" "false"
if git -C "$REPO1" push -q origin main >/dev/null 2>&1; then
  fail "failing test command did NOT block the push"
else
  pass "failing test command blocks the push"
fi

# ============================================================================
# Test 3 — env independence: BLOCK still happens with plugin env vars UNSET
# ============================================================================
if env -u CLAUDE_PLUGIN_ROOT -u CURSOR_PLUGIN_ROOT \
    git -C "$REPO1" push -q origin main >/dev/null 2>&1; then
  fail "push succeeded with plugin env unset (vendored runner should still gate)"
else
  pass "vendored runner blocks with CLAUDE_PLUGIN_ROOT + CURSOR_PLUGIN_ROOT unset"
fi

# ============================================================================
# Test 4 — passing test command ALLOWS the push
# ============================================================================
write_config "$REPO1" "true"
if git -C "$REPO1" push -q origin main >/dev/null 2>&1; then
  pass "passing test command allows the push"
else
  fail "passing test command did NOT allow the push"
fi

# ============================================================================
# Test 5 — --no-verify bypasses a failing gate
# ============================================================================
write_config "$REPO1" "false"
if git -C "$REPO1" push -q --no-verify origin main >/dev/null 2>&1; then
  pass "git push --no-verify bypasses the gate"
else
  fail "git push --no-verify did NOT bypass the gate"
fi

# ============================================================================
# Test 6 — pre-existing husky pre-push preserved + test-gate line added
# ============================================================================
REPO2="$TMP/repo2"
make_repo "$REPO2"
mkdir -p "$REPO2/.husky"
SENTINEL="echo HUSKY-SENTINEL-PRESERVED"
cat > "$REPO2/.husky/pre-push" <<EOF
#!/usr/bin/env sh
$SENTINEL
EOF

node "$PLUGIN_ROOT/scripts/setup-test-gate.mjs" "$REPO2" >/dev/null 2>&1 \
  || fail "installer exited nonzero on husky repo"

if grep -Fq "$SENTINEL" "$REPO2/.husky/pre-push"; then
  if grep -Fq "node .githooks/test-gate.mjs" "$REPO2/.husky/pre-push"; then
    pass "husky pre-push: sentinel preserved AND test-gate line added"
  else
    fail "husky pre-push: test-gate line was not added"
  fi
else
  fail "husky pre-push: pre-existing sentinel line was lost"
fi

# ============================================================================
# Test 7 — idempotency: re-run injects the guarded line exactly once
# ============================================================================
node "$PLUGIN_ROOT/scripts/setup-test-gate.mjs" "$REPO2" >/dev/null 2>&1 \
  || fail "installer exited nonzero on idempotent re-run"
COUNT="$(grep -Fc "node .githooks/test-gate.mjs" "$REPO2/.husky/pre-push")"
if [[ "$COUNT" -eq 1 ]]; then
  pass "idempotent re-run: injected line appears exactly once (count=$COUNT)"
else
  fail "idempotent re-run: injected line appears $COUNT times (expected 1)"
fi

# ============================================================================
if [[ "$FAILED" -ne 0 ]]; then
  echo "FAIL: test-gate integration test had failures" >&2
  exit 1
fi
echo "PASS: all test-gate integration assertions passed"
