#!/usr/bin/env bash
# Stop hook: Claude can't finish while .claude/scripts/quick-check fails.
# After 3 blocks in a row in one session it lets Claude stop and tells the user,
# so a failure Claude can't fix doesn't loop forever.
set -uo pipefail

max=3
session=$(jq -r '.session_id // "unknown"' | tr -cd 'A-Za-z0-9_-')
counter="${TMPDIR:-/tmp}/claude-stop-check-${session:-unknown}"

if output=$("$CLAUDE_PROJECT_DIR"/.claude/scripts/quick-check 2>&1); then
  rm -f "$counter"
  exit 0
fi

attempt=$(($(cat "$counter" 2>/dev/null || echo 0) + 1))
if [ "$attempt" -gt "$max" ]; then
  rm -f "$counter"
  jq -n --arg m "quick-check still fails after $max attempts. Claude stopped so you can look." '{systemMessage: $m}'
  exit 0
fi

echo "$attempt" >"$counter"
printf 'quick-check failed (attempt %s of %s). Fix the cause before finishing:\n%s\n' "$attempt" "$max" "$output" >&2
exit 2
