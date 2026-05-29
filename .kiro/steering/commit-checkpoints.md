---
name: commit-checkpoints
mode: always
description: Enforce frequent, atomic commits at logical checkpoints/milestones during agent development.
---

# Git Commit Checkpoints & Atomic Commits Guideline

To maintain clean repository history, enable easy rollbacks, and keep development visible, you (the AI agent) must commit your changes frequently at logical checkpoints rather than waiting to make a single massive commit at the end of the task.

---

## 🏁 Checkpoint Criteria

You must make a git commit whenever you reach any of the following logical milestones:

1.  **Infrastructure & Configuration**: Immediately after creating new directories, boilerplate project files, or adding new dependencies/configurations.
2.  **Atomic Logical Step**: After completing a single cohesive unit of work (e.g., adding a database model, creating a new service file, or finishing a single API endpoint).
3.  **Refactoring / Cleanup**: After renaming files, restructuring existing paths, or cleaning up code with no behavioral changes.
4.  **Testing**: After writing a suite of unit, integration, or property-based tests.
5.  **Task.md Progress**: Immediately upon marking a task as completed `[x]` in the active `task.md`.

---

## 🛠️ Commit Execution Rules

When making a commit, adhere to the following rules:

*   **Be Specific (No Blind `git add .`)**: Only stage the specific files relevant to the current milestone (`git add <file>`). Do not run a blind `git add .` that stages unrelated WIP changes or temp files.
*   **Conventional Commit Messages**: Use clear, descriptive, conventional commit messages:
    *   `feat: add new component palette frontend component`
    *   `fix: resolve race condition in simulation worker`
    *   `refactor: modularize llm service handlers`
    *   `test: introduce integration tests for course suggestions`
    *   `chore: update fast-check version`
*   **Verify Before Committing**: Ensure the code compiles, lints successfully, or passes basic checks before executing the commit, so that the commit history remains functional.
*   **Stay Local**: Do not push commits (`git push`) unless explicitly requested by the user. Keep commits local to the working branch.
