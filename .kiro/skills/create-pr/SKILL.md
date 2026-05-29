---
name: create-pr
description: Generate a highly professional, structured, and classified Pull Request (PR) description based on git diff, status, and project specs. It formats the PR description using a standardized layout, classifying the change (e.g., Feature, Bug Fix, Refactor, etc.), detailing key changes, referencing specifications, and summarizing verification results without unnecessary checklists.
license: MIT
compatibility: Kiro, Claude Code, Antigravity
metadata:
  category: methodology
  complexity: intermediate
---

# Create Professional Pull Request Skill

This skill guides the AI agent to analyze the current workspace's Git state (status, diffs, branch, and recent commits) and author a high-impact, professional, and clutter-free Pull Request (PR) description.

---

## 🎯 Purpose & Scope

Ensure every Pull Request in this repository follows a clean, consistent, and informative structure. By focusing purely on technical details, architectural impact, and verification evidence, we completely eliminate generic, boilerplate checkboxes while ensuring crucial context is never omitted.

### PR Classifications
Every PR must be categorized into exactly one primary type:
*   `🚀 Feature` — New components, endpoints, or features.
*   `🐛 Bug Fix` — Bug resolutions or defensive fixes.
*   `♻️ Refactor` — Restructuring or cleanups with zero behavioral impact.
*   `📝 Documentation` — Markdown guides, docstrings, or structural documentation.
*   `🧪 Test` — Unit tests, integration tests, or property-based tests.
*   `⚙️ Chore` — Build, CI/CD pipelines, package upgrades, or configurations.

---

## ⚙️ How to Activate

This skill is automatically activated when:
1. The user asks to: `"generate a PR"`, `"write a pull request summary"`, `"draft a PR description"`, or `"summarize my changes for a git commit/PR"`.
2. The user executes the `/create-pr` command.

---

## 📋 Step-by-Step Agent Workflow

When this skill is activated, you must execute the following analysis before drafting the PR description:

### Step 1: Git State Retrieval
Run standard Git commands to gather full context:
*   `git branch --show-current` to identify the branch name.
*   `git status` to see list of changed/untracked files.
*   `git diff --cached` (or `git diff` if changes aren't staged yet) to inspect the actual code modifications.
*   `git log -n 5 --oneline` to see recent commit messages on the current branch.

### Step 2: Workspace Spec & Issue Alignment
*   Look for references to issues or branch names (e.g., `feat/issue-123` or `bug-456`).
*   Check the `.kiro/specs/` directory to see if the changes align with any current active feature specifications. Link them explicitly in the PR.

### Step 3: Change Analysis & Classification
*   Analyze the diff to categorize the work into the single most appropriate **PR Type**.
*   Determine key changes and identify their high-level impact on the system.

### Step 4: Verification Capture
*   Look for test files created or modified.
*   Determine how the changes were verified (e.g., test suite executions, manual testing).
*   If any tests were run during the workflow (e.g., `pytest`, `npm test`, `vitest`), make sure to capture their commands and results.

### Step 5: Draft the Description
Construct the final Pull Request description using the **Standardized PR Template** below. Fill out every section completely, removing HTML comments (`<!-- ... -->`) from the final output.

---

## 📄 Standardized PR Template

Use the following exact template structure for the output. Keep it concise, professional, and free of generic checklists:

```markdown
## 🏷️ PR Type
<!-- Keep ONLY the single most appropriate type and delete the rest -->
- `🚀 Feature` (New feature or capability)
- `🐛 Bug Fix` (Bug resolution)
- `♻️ Refactor` (Code improvement without behavioral changes)
- `📝 Documentation` (Markdown, guides, comments)
- `🧪 Test` (Unit, integration, or property-based tests)
- `⚙️ Chore` (Build, CI/CD, package manager, or config updates)

## 📌 Overview
<!-- Summarize the goal and high-level context of this pull request. What problem does it solve and why is it needed? -->

## 🔗 Related Specs / Issues
<!-- Link to any relevant files under .kiro/specs/ or issue numbers. E.g., [Spec](file:///.kiro/specs/...) or Closes #123 -->
- Specs: 
- Issues: 

## 🛠️ Key Changes
<!-- Bullet points detailing the most significant changes, architectural decisions, and logical improvements. Keep it technical and concise. -->
- 

## 🧪 Verification & Testing
<!-- Describe how these changes were tested and verified. Include exact commands executed and the outcome. -->
### Automated Tests
```bash
# Example commands run (e.g., pytest, vitest, ruff, black)
```
- **Results**: 

### Manual Verification
- 

## 📂 Scope of Changes
<!-- A clean table mapping modified key components or files to their high-level impact. -->
| File / Component | Change Type (Add/Modify/Delete) | Description of Impact |
| --- | --- | --- |
| | | |
```
