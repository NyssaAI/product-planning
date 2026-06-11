#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

[[ -f "$ROOT/.githooks/pre-push" ]] || fail ".githooks/pre-push is missing"
grep -Fq 'scripts/bump-version.sh" --check' "$ROOT/.githooks/pre-push" \
  || fail "pre-push hook does not run version check before push"

[[ -f "$ROOT/scripts/setup-git-hooks.sh" ]] || fail "scripts/setup-git-hooks.sh is missing"
grep -Fq 'core.hooksPath .githooks' "$ROOT/scripts/setup-git-hooks.sh" \
  || fail "setup script does not install .githooks as hooksPath"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/.githooks" "$TMP/scripts" "$TMP/hooks" "$TMP/.claude-plugin" "$TMP/.cursor-plugin"
cp "$ROOT/.githooks/pre-push" "$TMP/.githooks/pre-push"
cp "$ROOT/scripts/bump-version.sh" "$TMP/scripts/bump-version.sh"
cp "$ROOT/scripts/version-files.mjs" "$TMP/scripts/version-files.mjs"
cp "$ROOT/.version-bump.json" "$TMP/.version-bump.json"

cat > "$TMP/package.json" <<'JSON'
{ "name": "dev-tools", "version": "1.0.0", "type": "module" }
JSON
cat > "$TMP/package-lock.json" <<'JSON'
{
  "name": "dev-tools",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "packages": {
    "": {
      "name": "dev-tools",
      "version": "1.0.0"
    }
  }
}
JSON
cat > "$TMP/.claude-plugin/plugin.json" <<'JSON'
{ "name": "dev-tools", "version": "1.0.0" }
JSON
cat > "$TMP/.cursor-plugin/plugin.json" <<'JSON'
{ "name": "dev-tools", "version": "1.0.0" }
JSON
cat > "$TMP/gemini-extension.json" <<'JSON'
{ "name": "dev-tools", "version": "1.0.0" }
JSON
cat > "$TMP/hooks/session-start" <<'EOF'
#!/usr/bin/env bash
echo before
EOF

git -C "$TMP" init -q
git -C "$TMP" config core.autocrlf false
git -C "$TMP" config user.email test@example.invalid
git -C "$TMP" config user.name "Version Hook Test"
git -C "$TMP" add .
git -C "$TMP" commit -q -m initial
OLD_SHA="$(git -C "$TMP" rev-parse HEAD)"

cat > "$TMP/hooks/session-start" <<'EOF'
#!/usr/bin/env bash
echo after
EOF
git -C "$TMP" add hooks/session-start
git -C "$TMP" commit -q -m "change hook without version"
NEW_SHA="$(git -C "$TMP" rev-parse HEAD)"

if printf 'refs/heads/main %s refs/heads/main %s\n' "$NEW_SHA" "$OLD_SHA" \
  | (cd "$TMP" && ./.githooks/pre-push) >/tmp/dev-tools-version-hook.out 2>/tmp/dev-tools-version-hook.err; then
  fail "pre-push hook allowed releasable changes without a version bump"
fi

grep -Fq 'without a version bump' /tmp/dev-tools-version-hook.err \
  || fail "pre-push hook failed for the wrong reason"

if printf 'refs/heads/feature %s refs/heads/feature %040d\n' "$NEW_SHA" 0 \
  | (cd "$TMP" && ./.githooks/pre-push) >/tmp/dev-tools-version-hook-new-branch.out 2>/tmp/dev-tools-version-hook-new-branch.err; then
  fail "pre-push hook allowed new-branch releasable changes without a version bump"
fi

grep -Fq 'without a version bump' /tmp/dev-tools-version-hook-new-branch.err \
  || fail "pre-push hook new-branch check failed for the wrong reason"

echo "PASS: version pre-push hook is installed before push"
