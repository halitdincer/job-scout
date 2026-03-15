---
name: "Push Change"
description: Commit and push all changes from an opsx change with the change name as the commit message
category: Workflow
tags: [workflow, git, deploy]
---

Commit and push all current changes using the opsx change name.

**Input**: Optionally specify a change name (e.g., `/push-change ci-cd-auto-deploy`). If omitted, infer from conversation context or check recent archives.

**Steps**

1. **Determine the change name**

   If provided as argument, use it. Otherwise:
   - Check conversation context for a recently archived or applied change
   - If still unclear, run `ls openspec/changes/` and `ls openspec/changes/archive/` to find recent changes
   - Use **AskUserQuestion** to confirm if ambiguous

2. **Check git status**

   Run `git status` to see what's changed. If there are no changes, inform the user and stop.

3. **Check current branch**

   Run `git branch --show-current`.

   - If on `main`: create a new branch named after the change (e.g., `feat/ci-cd-auto-deploy`) and switch to it
   - If on another branch: stay on it

4. **Ask user to confirm push**

   Use **AskUserQuestion** to ask:
   > "Ready to commit and push these changes?"

   Options:
   - "Push to `<branch-name>`" — commit and push
   - "Push to `<branch-name>` and create PR" — commit, push, and create a PR to main
   - "Cancel" — do nothing

5. **Commit and push**

   - Stage all changes: `git add -A`
   - Commit with message: `<change-name>: <brief summary of changes>`
     - Use the change's `proposal.md` first line of the "What Changes" section for the summary if available
     - Otherwise use a generic summary based on git diff
   - Push: `git push -u origin <branch-name>`

6. **Create PR if requested**

   If the user chose "Push and create PR":
   - Use `gh pr create` with:
     - Title: the change name in sentence case
     - Body: summary from proposal.md if available

7. **Show result**

   Display:
   - Branch name
   - Commit hash
   - PR URL (if created)
   - Reminder: "Merging to main will trigger CI → GHCR push → K3s auto-deploy"
