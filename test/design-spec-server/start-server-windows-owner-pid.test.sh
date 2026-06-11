#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/fake-bin"
cat > "$TMP/fake-bin/node" <<'FAKENODE'
#!/usr/bin/env bash
echo "CAPTURED_OWNER_PID=${VISUAL_COMPANION_OWNER_PID:-__UNSET__}"
exit 0
FAKENODE
chmod +x "$TMP/fake-bin/node"

captured=$(
  PATH="$TMP/fake-bin:/usr/bin:/bin" \
  MSYSTEM=MINGW64 \
  "$ROOT/skills/design-spec/scripts/start-server.sh" \
    --project-dir "$TMP/session" \
    --foreground
)

owner_pid_value=$(echo "$captured" | grep "CAPTURED_OWNER_PID=" | head -1 | sed 's/CAPTURED_OWNER_PID=//')

[[ "$owner_pid_value" == "" || "$owner_pid_value" == "__UNSET__" ]] \
  || fail "expected empty VISUAL_COMPANION_OWNER_PID on Windows/MSYS, got '$owner_pid_value'"

echo "PASS: start-server clears owner PID on Windows/MSYS"
