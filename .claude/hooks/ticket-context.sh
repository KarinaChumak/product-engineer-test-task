#!/usr/bin/env bash
# SessionStart: on a ticket branch (T-04 or T-04-some-slug), print that ticket's
# section from the notes' plan.md, so it is back in context after startup, resume and compaction.
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}"
plan="claude-notes/plan.md"
plan=${plan/#\~/$HOME} # external notes live under ~/claude-notes
[ -f "$plan" ] || exit 0
branch=$(git branch --show-current 2>/dev/null || true)
[ -n "$branch" ] || exit 0

# Ticket IDs in plan.md headings: "### T-04 Title".
ids=$(sed -n 's/^### \([A-Za-z0-9._-]*\) .*/\1/p' "$plan")
match=""
for id in $ids; do
  case "$branch" in "$id" | "$id"-*) [ ${#id} -gt ${#match} ] && match=$id ;; esac
done
[ -n "$match" ] || exit 0

echo "This session is working on ticket $match (branch $branch). Its section in $plan:"
echo
awk -v id="$match" '
  /^##+ / { if (on) exit; if ($0 ~ "^### " id " ") on = 1 }
  on { print }
' "$plan"
