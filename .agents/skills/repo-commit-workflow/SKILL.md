---
name: repo-commit-workflow
description: Organize this repository's completed work into truthful, reviewable Git commits with short human-readable messages when the user asks to commit or invokes $repo-commit-workflow.
---

# Repository Commit Workflow

Use this skill only for `/Users/satviiikkk/DealFlow`.

## Workflow

1. Inspect `git status`, the complete diff, and recent commit history before staging anything.
2. Preserve unrelated user changes and never discard or overwrite work.
3. Run checks appropriate to the changed files before committing. Stop and report failures that would make a commit misleading.
4. Split the work into the smallest truthful logical commits supported by the actual diff. Do not manufacture a fixed commit count, create empty commits, or split one change artificially to inflate activity.
5. Use short human commit subjects that state what the commit contains. Do not use emoji, conventional-commit prefixes, ticket prefixes, or dash-based descriptions.
6. Use only the repository's currently configured local Git identity. Never rotate authors, impersonate contributors, backdate commits, or add co-authors who did not contribute to the committed change.
7. Never store access tokens, passwords, or account credentials in repository files, Git configuration, remotes, shell history, or skill resources.
8. Committing does not imply permission to push. Push only when the user explicitly asks, after confirming the destination remote and branch. Never force-push unless separately and explicitly authorized.
9. After committing, report the created commit hashes and subjects, remaining uncommitted files, verification results, and whether anything was pushed.

## Message examples

- Add quote pricing rules
- Build approval review flow
- Seed demo inventory
- Protect role based routes

Keep each message specific to its staged content.
