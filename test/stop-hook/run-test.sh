#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/.claude"
cat > "$TMP/.claude/ralph-loop.local.md" <<'EOF'
---
iteration: 0
max_iterations: 3
completion_promise: "DONE"
session_id: owner-session
---
Continue this prompt.
EOF

if ! printf '%s\n' '{"session_id":"other-session","transcript_path":"missing.jsonl"}' \
  | (cd "$TMP" && "$ROOT/hooks/stop-hook.sh") >"$TMP/stop-hook.out" 2>"$TMP/stop-hook.err"; then
  cat "$TMP/stop-hook.err" >&2
  fail "stop hook should ignore another session without requiring jq"
fi

[[ -f "$TMP/.claude/ralph-loop.local.md" ]] \
  || fail "stop hook removed another session's Ralph state"

cat > "$TMP/transcript.jsonl" <<'EOF'
{"message":{"role":"assistant","content":[{"type":"text","text":"Still working"}]}}
EOF

printf '%s\n' '{"session_id":"owner-session","transcript_path":"transcript.jsonl"}' \
  | (cd "$TMP" && "$ROOT/hooks/stop-hook.sh") >"$TMP/stop-hook-block.out" 2>"$TMP/stop-hook-block.err" \
  || {
    cat "$TMP/stop-hook-block.err" >&2
    fail "stop hook should block and continue the active Ralph loop"
  }

node -e "const fs=require('fs'); const out=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (out.decision !== 'block' || out.reason !== 'Continue this prompt.') process.exit(1);" "$TMP/stop-hook-block.out"

grep -Fq 'iteration: 1' "$TMP/.claude/ralph-loop.local.md" \
  || fail "stop hook did not increment the Ralph iteration"

echo "PASS: stop hook runs without jq"
