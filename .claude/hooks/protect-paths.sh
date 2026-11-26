#!/usr/bin/env bash
# PreToolUse hook: blocks edits to files matching a glob in .claude/protected-paths.
set -euo pipefail

list="$CLAUDE_PROJECT_DIR/.claude/protected-paths"
[ -f "$list" ] || exit 0

file=$(jq -r '.tool_input.file_path // empty')
rel=${file#"$CLAUDE_PROJECT_DIR"/}

while IFS= read -r pattern || [ -n "$pattern" ]; do
  case "$pattern" in '' | '#'*) continue ;; esac
  # shellcheck disable=SC2053 # the pattern is a glob on purpose
  if [[ "$rel" == $pattern ]]; then
    echo "Blocked: $rel matches '$pattern' in .claude/protected-paths. Describe the change you want and ask a human to make it." >&2
    exit 2
  fi
done <"$list"
