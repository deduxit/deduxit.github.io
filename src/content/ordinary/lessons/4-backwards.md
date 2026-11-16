---
lesson: 4
title: "Natural deduction, backwards"
worked: "weakening"
method: "natural"
logic: "intuitionistic"
layout: "fitch"
choices: ["→I", "→E", "∧I", "line"]
steps:
  - rule: "→I"
    reason: "The goal `a → (b → a)` is an implication: `→I` opens a subproof with the hypothesis `a`, whose goal is `b → a`."
  - rule: "→I"
    reason: "Again an implication: a second subproof inside the first, with the hypothesis `b` and the goal `a`."
  - rule: "line"
    reason: "The goal `a` is line 1, in force here, so the goal closes by it. The hypothesis `b` is never used, and the proof is still sound."
faded: 1
explain:
  after: 1
  prompt: "The hypothesis `b` is never used. Why may `→I` still discharge it?"
  answer: "`→I` concludes `B → A` from a proof of `A` under the hypothesis `B`, and a proof of `A` that does not use `B` is such a proof too. If `a` holds, `b → a` holds whatever `b` is."
hinge:
  question: "After the two `→I`, the goal `a` closed by line 1 and `b` was never cited. Is the proof finished?"
  options:
    - text: "Yes: `→I` may discharge a hypothesis its subproof did not use"
      why: "A subproof that reaches its goal without a hypothesis still proves the goal under it, and `→I` asks no more."
    - text: "No: every hypothesis must be used before its subproof closes"
      misconception: "A discharged hypothesis must be used."
      why: "`→I` asks only that the subproof reach its goal. An unused hypothesis is discharged all the same."
    - text: "No: `b` is still a goal to prove"
      misconception: "A hypothesis is a goal to prove."
      why: "A hypothesis is assumed, not proved: inside its subproof it is a line in force, never a goal."
    - text: "Yes, but only in classical logic"
      misconception: "Leaving a hypothesis unused is a classical principle."
      why: "The proof uses `→I` and a line in force, rules of NJ and NM too: `⊢ a → (b → a)` holds in minimal logic."
---
Natural deduction proves a formula from assumptions with rules for each connective: an
introduction rule builds it, an elimination rule uses it. Working backwards, you choose the
rule that builds the goal. To prove `A → B`, `→I` opens a subproof with the hypothesis `A`
and the goal `B`. Inside the subproof `A` is a line in force; once the subproof reaches its
goal, `→I` discharges `A`, and outside it `A` is no longer in force.

***

The Fitch drawing shows each subproof under its hypothesis, a bar beside its lines, and
numbers every line; the tree shows the same proof with each discharged hypothesis in
brackets and the number of the rule that discharges it.
