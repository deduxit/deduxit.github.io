# deduxit © Fabian Lukas Grubmüller 2026
# Licensed under the EUPL

# The `claude-worktree-hook' check: .claude/hooks/jj-worktree.py against a
# throwaway colocated jj repository. It pins where a workspace goes and on
# which commit, that a second creation of the same name reopens it, that
# `.worktreeinclude` files are copied, that removal deletes only an empty
# workspace the hook made, and what `prune` removes and keeps.
# Usage: python3 claude-worktree-hook.py HOOK
import json
import os
import subprocess
import sys
import tempfile

failures = []


def check(name, ok, detail=""):
    # Records one case.
    print(
        ("ok   " if ok else "FAIL ")
        + name
        + (f": {detail}" if detail and not ok else "")
    )
    if not ok:
        failures.append(name)


def main():
    hook = os.path.abspath(sys.argv[1])
    tmp = os.path.realpath(tempfile.mkdtemp())
    config = os.path.join(tmp, "config.toml")
    with open(config, "w") as f:
        f.write('user.name = "Test"\nuser.email = "test@example.invalid"\n')
    env = {**os.environ, "HOME": tmp, "JJ_CONFIG": config}
    repo = os.path.join(tmp, "repo")

    def jj(*args, cwd=repo):
        return subprocess.run(
            ["jj", "--no-pager", "--color=never", *args],
            cwd=cwd,
            env=env,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()

    def run(payload, *args, cwd=repo):
        data = payload if isinstance(payload, str) else json.dumps(payload)
        r = subprocess.run(
            [sys.executable, hook, *args],
            input=data,
            cwd=cwd,
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )
        return r.returncode, r.stdout.strip().splitlines()[-1:] or [""], r.stdout

    def create(name, cwd=repo):
        return run({"hook_event_name": "WorktreeCreate", "name": name, "cwd": cwd})

    def remove(path):
        return run({"hook_event_name": "WorktreeRemove", "worktree_path": path})

    def workspaces():
        return jj("workspace", "list", "-T", 'name ++ "\\n"').split()

    jj("git", "init", "--colocate", repo, cwd=tmp)
    with open(os.path.join(repo, "a.txt"), "w") as f:
        f.write("a\n")
    with open(os.path.join(repo, ".gitignore"), "w") as f:
        f.write(".env.local\n")
    with open(os.path.join(repo, ".worktreeinclude"), "w") as f:
        f.write("# local settings\n.env.local\n")
    jj("commit", "-m", "base")
    with open(os.path.join(repo, ".env.local"), "w") as f:
        f.write("SECRET=1\n")
    with open(os.path.join(repo, "a.txt"), "w") as f:
        f.write("uncommitted\n")
    base = jj("log", "--no-graph", "-r", "@-", "-T", "commit_id")

    code, last, _ = create("bold-oak")
    target = os.path.join(tmp, "repo-wt-bold-oak")
    check("create: exit 0", code == 0)
    check("create: prints the directory last", last == [target], last)
    check("create: the workspace is named wt-NAME", "wt-bold-oak" in workspaces())
    parent = jj("log", "--no-graph", "-r", "@-", "-T", "commit_id", cwd=target)
    check("create: it sits on @- of the session's workspace", parent == base)
    with open(os.path.join(target, "a.txt")) as f:
        check("create: uncommitted work stays behind", f.read() == "a\n")
    check(
        "create: jj made it a git worktree",
        os.path.isfile(os.path.join(target, ".git")),
    )
    check(
        ".worktreeinclude: the ignored file is copied",
        os.path.isfile(os.path.join(target, ".env.local")),
    )
    code, last, _ = create("bold-oak")
    check(
        "create again: reopens the same directory", code == 0 and last == [target], last
    )
    code, _, _ = create("x", cwd=tmp)
    check("create outside a jj workspace: fails", code != 0)
    os.mkdir(os.path.join(tmp, "repo-wt-taken"))
    code, _, _ = create("taken")
    check("create over a foreign directory: fails", code != 0)
    check(
        "create over a foreign directory: leaves it",
        os.path.isdir(os.path.join(tmp, "repo-wt-taken")),
    )
    code, _, _ = run("{")
    check("malformed payload: fails", code != 0)

    code, _, _ = remove(target)
    check("remove an empty workspace: exit 0", code == 0)
    check(
        "remove an empty workspace: the directory is gone", not os.path.exists(target)
    )
    check("remove an empty workspace: jj forgot it", "wt-bold-oak" not in workspaces())

    code, last, _ = create("busy")
    busy = last[0]
    with open(os.path.join(busy, "b.txt"), "w") as f:
        f.write("work\n")
    code, _, _ = remove(busy)
    check("remove a workspace with work: exit 1", code == 1)
    check(
        "remove a workspace with work: it stays",
        os.path.isdir(busy) and "wt-busy" in workspaces(),
    )
    code, _, _ = remove(repo)
    check("remove a directory the hook did not make: exit 1", code == 1)
    check(
        "remove a directory the hook did not make: it stays",
        os.path.isdir(os.path.join(repo, ".jj")),
    )

    code, last, _ = create("idle")
    idle = last[0]
    code, _, out = run("", "prune")
    check(
        "prune: removes the empty one",
        not os.path.exists(idle) and "removed wt-idle" in out,
        out,
    )
    check(
        "prune: keeps the one with work", os.path.isdir(busy) and "wt-busy" in out, out
    )
    check("prune: leaves the default workspace", "default" in workspaces())

    if failures:
        sys.exit(f"{len(failures)} case(s) failed: {', '.join(failures)}")


if __name__ == "__main__":
    main()
