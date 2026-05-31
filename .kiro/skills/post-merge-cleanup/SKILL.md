---
name: post-merge-cleanup
description: After a branch is merged via Pull Request, safely tear down the feature branch and sync the target base branch. Verifies the PR is merged, switches to the target base branch (main or staging based on user input), fast-forwards it with the latest remote changes, deletes the merged feature branch locally and remotely, and prunes stale tracking refs. Use at the end of each PR merge to keep the local repository clean and up to date.
license: MIT
compatibility: Kiro, Claude Code, Antigravity
metadata:
  category: methodology
  complexity: intermediate
---

# Post-Merge Branch Cleanup Skill

This skill guides the AI agent through the cleanup that follows a merged Pull Request: delete the feature branch you were working on, switch to the target base branch the user specifies, and bring that base branch up to date with the remote.

---

## 🎯 Purpose & Scope

After a PR merges, the local repository is left in a stale state: the feature branch still exists locally (and possibly remotely), and the base branch is behind the remote. This skill standardizes the safe teardown so you never lose unmerged work and always land on a current base branch.

### Target Base Branch
The user provides which base branch to return to. Accept common values and map them directly:
*   `main` (default if the user is ambiguous but `main` exists)
*   `staging`
*   Any other branch name the user explicitly names

If the requested base branch does not exist locally or on the remote, stop and tell the user instead of guessing.

---

## ⚙️ How to Activate

This skill is activated when the user asks to:
1. `"clean up after the merge"`, `"delete this branch and switch to main/staging"`, or `"finish off this branch"`.
2. Reuse the post-PR-merge cleanup flow at the end of a branch's lifecycle.

The user must indicate the target base branch (e.g., "switch to staging"). If they don't, ask once, then default to `main`.

---

## 🛡️ Safety Rules (Non-Negotiable)

*   **Never delete an unmerged branch with `-D`.** Use the safe `git branch -d`, which refuses to delete branches not fully merged. If it refuses, surface that to the user and stop.
*   **Verify the merge first.** Confirm the PR is actually merged before deleting anything. If `gh` is available, check the PR state; otherwise confirm the branch is contained in the base branch.
*   **Check for uncommitted work.** Run `git status` before switching branches. If the working tree is dirty, stop and report — do not stash or discard without instruction.
*   **Fast-forward only.** Update the base branch with `git pull --ff-only`. Never create surprise merge commits. If it can't fast-forward, stop and report divergence.
*   **Do not force-push or hard-reset** as part of this flow.

---

## 📋 Step-by-Step Agent Workflow

### Step 1: Capture Current State
*   `git rev-parse --abbrev-ref HEAD` → record the feature branch name (the one to delete).
*   `git status` → ensure the working tree is clean. If not, stop and report.
*   `git remote -v` → identify the remote (usually `origin`).

### Step 2: Confirm the Merge
*   If `gh` is installed and authenticated, run:
    `gh pr view <feature-branch> --json state,mergedAt,mergeCommit,baseRefName`
    and confirm `state` is `MERGED`.
*   If `gh` is unavailable, fetch and verify the branch is merged into the base:
    `git fetch origin` then `git branch --merged origin/<base>` and confirm the feature branch appears.
*   If the PR is **not** merged, stop and tell the user. Do not delete.

### Step 3: Switch to the Target Base Branch
*   `git checkout <base>` where `<base>` is the user-provided target (`main`, `staging`, etc.).
*   Confirm the checkout succeeded before continuing.

### Step 4: Update the Base Branch
*   `git pull --ff-only origin <base>` to bring local `<base>` to the latest remote tip (including the just-merged PR).
*   If the fast-forward fails, stop and report the divergence — do not resolve it silently.

### Step 5: Delete the Feature Branch
*   Local: `git branch -d <feature-branch>` (safe delete).
*   Remote: `git push origin --delete <feature-branch>`.
    *   Many hosts auto-delete the remote branch on merge. If the remote ref is already gone, treat the resulting error as success.

### Step 6: Prune & Verify
*   `git remote prune origin` (or `git fetch --prune origin`) to drop stale remote-tracking refs.
*   `git branch -a` to confirm the feature branch is gone and you are on an up-to-date `<base>`.

---

## ✅ Completion Report

After the flow, give a short summary covering:
*   Which base branch you landed on and the commit it was updated to.
*   That the feature branch was deleted locally and remotely (or already gone remotely).
*   Any stale refs pruned.

Keep it to a few sentences. If any step was skipped or stopped (dirty tree, unmerged PR, non-fast-forward), lead with that.

---

## 🧯 Edge Cases

*   **Dirty working tree** → stop at Step 1; report uncommitted changes.
*   **PR not merged** → stop at Step 2; do not delete.
*   **Base branch can't fast-forward** → stop at Step 4; report divergence.
*   **Remote branch already deleted** → expected on auto-delete hosts; continue and note it.
*   **Branch not fully merged on safe delete** → `git branch -d` refuses; surface the warning and stop rather than forcing with `-D`.

