---
paths:
  - ".claude/**"
  - "CLAUDE.md"
---

# The Claude Code setup in this repo

Taken from deduxit's own (`~/Projects/own/linlog/.claude/`, whose `rules/claude-infra.md`
says why each piece is as it is) and the author's learning sites'.

| mechanism | loaded | for |
|---|---|---|
| `CLAUDE.md` | every session | what the repo is, hard rules, commands, layout |
| `.claude/rules/*.md` with `paths:` | when a matching file is read, written or edited | the conventions of one area |
| `.claude/settings.json` + `.claude/hooks/` | on the tool call | what must happen or must not, whatever Claude decides |

- **The hooks**: `block-git.py` and `block-jj-new-message.py` (PreToolUse on Bash) refuse
  git, behind every wrapper `command_line.py` knows, and `jj new -m`; `format.sh`
  (PostToolUse on Write and Edit) runs `nix fmt` on the one file written;
  `session-jj-state.sh` (SessionStart) prints `@` and `@-`. They fail open: a missing tool
  or a malformed payload exits 0.
- **`jj-worktree.py`** (WorktreeCreate and WorktreeRemove) replaces Claude Code's git
  worktrees (a sub-agent's `isolation: "worktree"`, `--worktree`, a background session, a
  workflow agent): in this colocated repository a git worktree under `.claude/worktrees/`
  is one jj does not know, and a jj command there acts on the main workspace. It makes a
  jj workspace `wt-NAME` in `../linlog-prover.github.io-wt-NAME` on `@-` of the session's
  workspace (committed work only, as git's HEAD), copies what `.worktreeinclude` names,
  and prints the directory; on removal it deletes only a workspace it made whose `@` is
  empty, since Claude Code's check for uncommitted work reads git and sees nothing there.
  Claude Code never asks to remove the workspaces of sub-agents and workflow agents: once
  their commits are taken, `.claude/hooks/jj-worktree.py prune` removes every empty one.
  Unlike the guards it fails closed: a creation that goes wrong exits 1 and Claude Code
  makes no worktree (the default would be a git worktree jj cannot see), and a removal it
  doubts keeps the workspace.
- **The `claude-hooks` check** (`modules/claude-hooks.nix`) pins every guard: the commands
  it blocks and allows, that a malformed payload passes, that `settings.json` registers it
  and that it is executable. A new guard gets its cases there in the same change. The
  worktree hook, no guard, has the `claude-worktree-hook` check instead
  (`modules/_checks/claude-worktree-hook.py`), which runs it against a throwaway
  colocated repository.
- **Permissions**: git, `npm ci`, `npx`, `npm exec` and hand edits of `LICENSE` and both
  lock files are denied; `jj git push` and every `gh` command ask.
- **Attribution**: `attribution.sessionUrl` is `false` (the author, 2026-11-03, for
  privacy), so no commit gets a `Claude-Session:` link to its claude.ai session, as in
  deduxit. 33 commits from before carry one, kept as pushed. `Co-Authored-By` stays.
- **Keep it current**: when the repo changes shape, amend `.claude/` and CLAUDE.md in the
  same change.
