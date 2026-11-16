---
lesson: 5
title: "Natural deduction, forwards"
worked: "conjunction-swap"
method: "natural"
logic: "intuitionistic"
layout: "fitch"
choices: ["∧E₁", "∧E₂", "∧I", "line"]
steps:
  - rule: "∧E₂"
    reason: "Line 1, `a ∧ b`, is in force: `∧E₂` derives its right part, `b`, as a new line."
  - rule: "∧E₁"
    reason: "`∧E₁` derives its left part, `a`."
  - rule: "∧I"
    reason: "From the lines `b` and `a`, in that order, `∧I` derives `b ∧ a`."
  - rule: "line"
    reason: "The new line is the goal, so the goal closes by it."
faded: 2
explain:
  after: 2
  prompt: "Why does `∧I` cite `b` first and `a` second?"
  answer: "`∧I` builds a conjunction from its two parts in order: the first line it cites is the left conjunct. Citing `b` and then `a` gives `b ∧ a`, the goal; `a` and then `b` would give `a ∧ b`, which does not close it."
hinge:
  question: "A subproof derived the line `c`, and the rule that discharges its hypothesis has closed it. May a later goal cite `c`?"
  options:
    - text: "No: a line of a closed subproof is no longer in force"
      why: "`c` may depend on the subproof's hypothesis, which is discharged. Outside the subproof only what the discharging rule concluded is in force."
    - text: "Yes: any line above it may be cited"
      misconception: "Any line above may be cited."
      why: "Only lines in force may be cited: those of the goal's own subproof and of the subproofs around it, not of one that has closed."
    - text: "Only its hypothesis, which stays in force"
      misconception: "A subproof's hypothesis stays in force after it closes."
      why: "Discharging a hypothesis is what ends its force: it is the first line a closed subproof takes out of reach."
    - text: "Yes, to close a goal, but not in a forward step"
      misconception: "Closing a goal follows other rules than a forward step."
      why: "Both cite lines in force alone, and the page refuses any other line with the reason."
---
Working forwards, you derive new lines from the lines in force: an elimination rule takes a
line apart, `∧E₁` and `∧E₂` the two parts of a conjunction, `→E` the consequent of an
implication from it and its antecedent. A forward step cites lines by their numbers, and a
goal equal to a line in force closes by it.

***

Most proofs mix both directions: backwards to open the subproofs a goal needs, forwards to
use what is in force. On the page these are From the goal and From lines.
