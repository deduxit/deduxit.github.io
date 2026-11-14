---
paths:
  - ".claude/**"
  - "CLAUDE.md"
---

# The Claude Code setup in this repo

Taken from deduxit's own (`~/Projects/own/deduxit/.claude/`, whose `rules/claude-infra.md`
says why each piece is as it is) and the author's learning sites'.

| mechanism | loaded | for |
|---|---|---|
| `CLAUDE.md` | every session | what the repo is, hard rules, commands, layout |
| `.claude/rules/*.md` with `paths:` | when a matching file is read, written or edited | the conventions of one area |
| `.claude/rules/writing.md` (no `paths:`) | every session | how every text a person reads is written |
| `.claude/settings.json` + `.claude/hooks/` | on the tool call | what must happen or must not, whatever Claude decides |

- **What is the machine's**: the git and `jj new -m` guard, the snapshot before `nix`, the
  jj notes at session start, the commit signer, the worktree hook and the model pins are
  the same in every repository and for both accounts: `claude-*` commands and managed
  settings from the author's NixOS flake (`~/Projects/own/flake`, `modules/claude-code.nix`,
  which has their checks). Never copy them here. `settings.json` registers
  `claude-jj-worktree` for WorktreeCreate and WorktreeRemove, the one machine-wide hook a
  repository registers itself, so an isolated session or sub-agent works in a jj workspace
  `../linlog-prover.github.io-wt-NAME`.
- **The hook of its own**: `format.sh` (PostToolUse on Write and Edit) runs `nix fmt` on
  the one file written. It fails open: a missing tool or a malformed payload exits 0.
- **Memory**: `autoMemoryDirectory` is `~/.claude/memory/linlog-prover.github.io`, which
  both accounts share.
- **Permissions**: git (reads too, which the machine's guard allows), `npm ci`, `npx`,
  `npm exec` and hand edits of `LICENSE` and both lock files are denied; `jj git push` and
  every `gh` command ask.
- **Attribution**: `attribution.sessionUrl` is `false` (the author, 2026-11-03, for
  privacy), so no commit gets a `Claude-Session:` link to its claude.ai session, as in
  deduxit. 33 commits from before carry one, kept as pushed. `Co-Authored-By` stays.
- **Keep it current**: when the repo changes shape, amend `.claude/` and CLAUDE.md in the
  same change.
