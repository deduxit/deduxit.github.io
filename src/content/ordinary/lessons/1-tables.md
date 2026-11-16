---
lesson: 1
title: "Valid, by the truth table"
worked: "affirming-consequent"
method: "table"
logic: "classical"
choices: ["holds", "falsifies"]
steps:
  - rule: "holds"
    reason: "`a` is true, so the conclusion holds: this row cannot falsify the sequent."
  - rule: "holds"
    reason: "The hypothesis `b` is false: a row falsifies the sequent only when every hypothesis is true."
  - rule: "falsifies"
    reason: "Both hypotheses are true, `a → b` because `a` is false, and the conclusion `a` is false: this row falsifies the sequent."
  - rule: "holds"
    reason: "The hypothesis `b` is false again, so not every hypothesis holds."
faded: 2
explain:
  after: 2
  prompt: "Row 3 makes `a → b` true although `a` is false. Why is that the row that matters?"
  answer: "An implication is false only when its antecedent is true and its consequent false, so with `a` false, `a → b` is true. Row 3 makes both hypotheses true and the conclusion false, and one such row is enough: the sequent is not valid."
hinge:
  question: "No row of the truth table of `a → b, a ⊢ b` falsifies it. What does that show?"
  options:
    - text: "The sequent is valid: no assignment makes both hypotheses true and `b` false"
      why: "Validity asks every row whether it makes the hypotheses true and the conclusion false, and the table lists every row."
    - text: "It is valid because some row makes all its formulas true"
      misconception: "Valid means true in some row."
      why: "One row where everything is true shows nothing: validity is about every row, and no row may falsify the sequent."
    - text: "Nothing yet: four rows are too few to decide"
      misconception: "A truth table only samples the assignments."
      why: "Two atoms have exactly four assignments, and the table lists them all, so it decides the sequent."
    - text: "Its hypotheses are true in every row"
      misconception: "Valid means its hypotheses always hold."
      why: "`a` is false in two rows. Validity does not ask how often the hypotheses hold, only that the conclusion holds whenever they all do."
---
A sequent `Γ ⊢ Δ` is valid when every assignment of true and false to its atoms that makes
every formula of `Γ` true makes some formula of `Δ` true. A row of the truth table is one
assignment. A row falsifies the sequent when it makes every hypothesis true and every formula
right of `⊢` false; the sequent is valid exactly when no row does.

***

A row that falsifies the sequent is a countermodel: it shows the sequent has no proof in
classical logic. With `n` atoms the table has `2ⁿ` rows. In a classical tab, the Table view
draws the whole table and marks each row that falsifies the sequent.
