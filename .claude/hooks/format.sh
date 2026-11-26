#!/usr/bin/env bash
# PostToolUse hook: formats the file Claude just edited. Never blocks.
file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0
"$CLAUDE_PROJECT_DIR"/.claude/scripts/fix "$file" >/dev/null 2>&1 || true
