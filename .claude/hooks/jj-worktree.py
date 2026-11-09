#!/usr/bin/env python3
# deduxit © Fabian Lukas Grubmüller 2026
# Licensed under the EUPL
"""WorktreeCreate and WorktreeRemove: an isolated Claude Code session gets a jj workspace.

Claude Code isolates a sub-agent (`isolation: "worktree"`), a `--worktree` or
background session and a workflow agent in a git worktree under
.claude/worktrees/ by default. In this colocated jj repository that checkout
is invisible to jj: a jj command there finds the main workspace's .jj/ and acts
on its working copy. Registered for both events, this script replaces that
logic with `jj workspace add`: a workspace beside the repository, named
`wt-NAME` in a directory `<repository>-wt-NAME`, on `@-` of the workspace the
session runs in (git's HEAD, so committed work only, as Claude Code's
worktrees take). jj makes it a git worktree too, so nix sees its files.

On removal it deletes only a workspace it made, and only when its working
copy holds nothing; otherwise it exits 1 and the workspace stays, since
Claude Code's own check for uncommitted work does not apply to a workspace
this hook made. Commits made in a workspace stay in the repository after it
goes. Claude Code keeps the workspaces of sub-agents and workflow agents and
never asks to remove them; `jj-worktree.py prune`, run by hand from the
repository, removes every such workspace whose working copy is empty.

Unlike the guards, it does not fail open: a creation that goes wrong exits 1,
and Claude Code then makes no worktree at all, which is the safe outcome.
"""

import json
import os
import re
import shutil
import subprocess
import sys

PREFIX = "wt-"


def jj(*args, check=True):
    """Runs jj, its output on stderr so stdout stays the hook's answer."""
    return subprocess.run(
        ["jj", "--no-pager", "--color=never", *args],
        capture_output=True,
        text=True,
        check=check,
        stdin=subprocess.DEVNULL,
    )


def workspace_root(path):
    """The root of the jj workspace containing `path`, or None."""
    r = jj("-R", path, "--ignore-working-copy", "workspace", "root", check=False)
    return r.stdout.strip() if r.returncode == 0 else None


def copy_includes(source, target):
    """Copies the files `.worktreeinclude` names (gitignore-style globs, no
    negation) that the new workspace lacks, as Claude Code does for its own
    worktrees."""
    listing = os.path.join(source, ".worktreeinclude")
    if not os.path.isfile(listing):
        return
    import glob

    with open(listing) as f:
        patterns = [p.strip() for p in f if p.strip() and not p.startswith("#")]
    for pattern in patterns:
        for found in glob.glob(pattern.lstrip("/"), root_dir=source, recursive=True):
            src, dst = os.path.join(source, found), os.path.join(target, found)
            if os.path.isfile(src) and not os.path.exists(dst):
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)


def create(payload):
    """Makes the workspace and prints its directory."""
    name = re.sub(r"[^A-Za-z0-9._-]", "-", str(payload["name"]))
    root = workspace_root(payload.get("cwd") or os.getcwd())
    if root is None:
        sys.exit("jj-worktree: not inside a jj workspace")
    parent, base = os.path.split(os.path.realpath(root))
    target = os.path.join(parent, f"{base}-{PREFIX}{name}")
    if os.path.exists(target):
        if workspace_root(target) == target:
            print(target)  # Claude Code reopening a worktree it made before.
            return
        sys.exit(f"jj-worktree: {target} exists and is not that workspace")
    r = jj(
        "-R",
        root,
        "workspace",
        "add",
        "--name",
        PREFIX + name,
        "-r",
        "@-",
        target,
        check=False,
    )
    sys.stderr.write(r.stderr)
    if r.returncode != 0:
        sys.exit(f"jj-worktree: jj workspace add failed with exit {r.returncode}")
    copy_includes(root, target)
    print(target)


def made_here(path):
    """The workspace name if `path` is a workspace this script made."""
    base = os.path.basename(path)
    match = re.search(rf"-{PREFIX}([A-Za-z0-9._-]+)$", base)
    if not match or workspace_root(path) != path:
        return None
    return PREFIX + match.group(1)


def remove(path):
    """Removes the workspace at `path` when it is ours and empty; exit 1
    keeps it."""
    path = os.path.realpath(path)
    name = made_here(path)
    if name is None:
        sys.exit(f"jj-worktree: {path} is not a workspace this hook made; kept")
    state = jj(
        "-R",
        path,
        "log",
        "--no-graph",
        "-r",
        "@",
        "-T",
        'if(empty, "empty", change_id.short())',
        check=False,
    )
    if state.returncode != 0:
        sys.exit(f"jj-worktree: cannot read {path}; kept")
    if state.stdout.strip() != "empty":
        sys.exit(
            f"jj-worktree: {name} holds work in change {state.stdout.strip()}; kept. "
            f"Commit or abandon it, then `jj workspace remove {name}`."
        )
    r = jj("-R", path, "workspace", "remove", name, check=False)
    sys.stderr.write(r.stderr)
    if os.path.exists(path):
        sys.exit(f"jj-worktree: {path} is still there; kept")


def prune(cwd):
    """Removes this repository's hook-made workspaces whose working copy is
    empty; reports the others."""
    root = workspace_root(cwd)
    if root is None:
        sys.exit("jj-worktree: not inside a jj workspace")
    listing = jj(
        "-R", root, "--ignore-working-copy", "workspace", "list", "-T", 'name ++ "\\n"'
    ).stdout.split()
    parent, base = os.path.split(os.path.realpath(root))
    for name in listing:
        if not name.startswith(PREFIX):
            continue
        path = os.path.join(parent, f"{base}-{name}")
        if not os.path.isdir(path):
            jj("-R", root, "workspace", "forget", name, check=False)
            print(f"forgot {name}: its directory is gone")
            continue
        try:
            remove(path)
            print(f"removed {name}")
        except SystemExit as kept:
            print(kept.code)


def main():
    if sys.argv[1:] == ["prune"]:
        prune(os.getcwd())
        return
    payload = json.load(sys.stdin)
    event = payload.get("hook_event_name")
    if event == "WorktreeCreate":
        create(payload)
    elif event == "WorktreeRemove":
        remove(payload["worktree_path"])
    else:
        sys.exit(f"jj-worktree: unexpected event {event!r}")


if __name__ == "__main__":
    main()
