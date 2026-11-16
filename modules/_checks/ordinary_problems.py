# deduxit © Fabian Lukas Grubmüller 2026
# Licensed under the EUPL

# The ordinary suite's store against deduxit's command at the flake's pinned input:
# every problem's verdict in its logic is the one `deduxit prove --logic` gives
# (exit 0 valid, 1 not valid), and every session beside a problem, a worked
# proof in the sequent calculus, by natural deduction or as a tableau
# (`<id>.sequent.json`, `<id>.natural.json`, `<id>.tableau.json`), is a
# finished proof that `deduxit interact --state` resumes, checking every step
# again, and whose `proof` the command accepts (exit 0). A problem whose
# verdict a later deduxit changes fails the check, which names it.
# Usage: python3 ordinary_problems.py PROBLEMS_DIR DEDUXIT
import json
import pathlib
import subprocess
import sys

VERDICT = {"valid": 0, "not_valid": 1}


def front_matter(path):
    # `key: value` lines between two `---`, each value a JSON string, a number
    # or a [list].
    lines = path.read_text(encoding="utf-8").split("\n")
    assert lines[0] == "---", f"{path.name}: no front matter"
    meta = {}
    for line in lines[1 : lines.index("---", 1)]:
        key, value = line.split(": ", 1)
        meta[key] = json.loads(value) if value[0] in '"0123456789' else value
    return meta


def main(store, deduxit):
    wrong = []
    problems = sorted(pathlib.Path(store).glob("*.md"))
    for path in problems:
        meta = front_matter(path)
        decided = subprocess.run(
            [deduxit, "prove", "--logic", meta["logic"], "--quiet", "--timeout", "20s"]
            + [meta["sequent"]],
            capture_output=True,
            check=False,
        ).returncode
        if decided != VERDICT[meta["verdict"]]:
            wrong.append(f"{path.stem}: {meta['verdict']}, the command exits {decided}")
    sessions = sorted(
        path
        for kind in ("sequent", "natural", "tableau")
        for path in pathlib.Path(store).glob(f"*.{kind}.json")
    )
    for path in sessions:
        proved = subprocess.run(
            [deduxit, "interact", "--state", str(path)],
            input=b"proof\n",
            capture_output=True,
            check=False,
        ).returncode
        if proved != 0:
            wrong.append(f"{path.name}: `interact --state` and `proof` exit {proved}")
    if wrong:
        sys.exit("\n".join(wrong))
    print(
        f"{len(problems)} problems and {len(sessions)} sessions as deduxit decides them"
    )


if __name__ == "__main__":
    main(*sys.argv[1:])
