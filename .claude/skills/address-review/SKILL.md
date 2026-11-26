---
name: address-review
description: Fix the unresolved review comments on the current branch's pull request, reply to each, and resolve the ones that were fixed. Use when the user says the PR has comments to address, or runs /address-review.
---

# Address review comments

Every unresolved thread on the PR is something to act on. Resolved threads were dismissed by the user; leave them alone.

## 1. Fetch the open threads

```bash
gh pr view --json number,url,headRefName
gh api graphql -F owner='{owner}' -F repo='{repo}' -F number=<number> -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            id isResolved isOutdated path line
            comments(first: 50) { nodes { author { login } body url createdAt } }
          }
        }
      }
    }
  }' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved | not)'
```

Also read the PR's top-level comments and review bodies (`gh pr view --comments`) written since your last push, for feedback that isn't attached to a line.

Skip a thread whose last comment is your own reply, unless someone answered after it.

## 2. Fix

Go through the threads one by one. Read the whole thread: the latest comment can change what the first one asked.

- **A change to make:** make it. If the same problem is elsewhere in the PR, fix every instance.
- **A comment ending in `#`:** fix it, then turn it into a rule as `.claude/CLAUDE.md` describes under "Feedback ending in `#`".
- **A question:** answer it. Change the code only if the answer shows it's wrong.
- **Something you disagree with:** don't change the code. Explain why in the reply, with the evidence, and leave the thread open for the user to decide.

Then run `.claude/scripts/check`, commit the fixes with messages that say what changed, and push.

## 3. Reply and resolve

For each thread, reply on the thread, starting with `🤖 Claude:`:

```bash
gh api graphql -f threadId=<id> -f body='🤖 Claude: Fixed in abc1234. The end date is now inclusive.' -f query='
  mutation($threadId: ID!, $body: String!) {
    addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $threadId, body: $body }) { comment { url } }
  }'
```

Resolve the threads you fixed or fully answered:

```bash
gh api graphql -f threadId=<id> -f query='
  mutation($threadId: ID!) { resolveReviewThread(input: { threadId: $threadId }) { thread { isResolved } } }'
```

Leave open the threads where you disagreed or need the user's answer.

## 4. Report

List what was fixed (with the commits), what was answered, and which threads are still open and why. Never merge the PR.
