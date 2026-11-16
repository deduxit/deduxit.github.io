---
lesson: 2
title: "Signed tableaux"
worked: "double-negation-out"
method: "tableau"
logic: "classical"
choices: ["T¬", "F¬", "T∧", "×"]
steps:
  - rule: "T¬"
    reason: "`¬¬a` is true, so `¬a` is false: `T¬` adds `F ¬a` to the branch."
  - rule: "F¬"
    reason: "`¬a` is false, so `a` is true: `F¬` adds `T a`."
  - rule: "×"
    reason: "The branch marks `a` both true and false. No assignment does that, so the branch closes."
faded: 1
explain:
  after: 1
  prompt: "The tableau starts from `T ¬¬a` and `F a`. Why is the conclusion signed false?"
  answer: "The tableau looks for an assignment that makes every hypothesis true and the conclusion false: a countermodel. Each rule keeps the assignments that could do it. When every branch closes, none can, and the sequent is valid."
hinge:
  question: "Every formula on a branch is expanded, and the branch stays open. What does it show?"
  options:
    - text: "An assignment that makes every hypothesis true and the conclusion false: the sequent is not valid"
      why: "An open branch with every formula expanded gives a countermodel: its atoms marked `T` true, the others false."
    - text: "The tableau is unfinished: more rules would close it"
      misconception: "An open branch means the tableau is unfinished."
      why: "Once every formula on the branch is expanded and no formula is marked both true and false, no rule closes it, and the branch is a countermodel."
    - text: "Only that this order of expansions failed"
      misconception: "Another order of expansions could close every branch."
      why: "The order changes the tableau's shape, not its verdict: a sequent with a countermodel leaves an open branch in every tableau expanded to the end."
    - text: "The conclusion is false in every assignment"
      misconception: "An open branch makes the conclusion false everywhere."
      why: "An open branch names one assignment; the conclusion may hold in others."
---
A signed tableau decides a sequent by looking for a countermodel. Each hypothesis is written
true (`T`) and the conclusion false (`F`). Each rule takes a signed formula apart and keeps the
assignments that could make it so: `T (A ∧ B)` adds `T A` and `T B` to its branch, and
`T (A ∨ B)` splits the branch in two, one with `T A` and one with `T B`. A branch closes (`×`)
when it marks a formula both true and false.

***

If every branch closes, there is no countermodel and the sequent is valid. A branch that
stays open once every formula on it is expanded gives one. The worked tableau is built in the
calculus `tableau` (Your own calculus), whose rules deduxit checks at each step; the Tableau
view of a classical tab draws deduxit's own tableau of a sequent.
