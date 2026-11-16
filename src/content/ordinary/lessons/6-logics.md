---
lesson: 6
title: "Classical, intuitionistic, minimal"
worked: "excluded-middle"
method: "natural"
logic: "classical"
layout: "fitch"
model: "excluded-middle-intuitionistic"
choices: ["RAA", "¬E", "¬I", "∨I₁", "∨I₂", "line"]
steps:
  - rule: "RAA"
    reason: "NK's classical rule `RAA` proves a goal by refuting its negation: assume `¬(a ∨ ¬a)` and reach `⊥`."
  - rule: "¬E"
    reason: "`⊥` follows from a formula and its negation: `¬E`, with `a ∨ ¬a` as the formula, opens the goals `¬(a ∨ ¬a)` and `a ∨ ¬a`."
  - rule: "line"
    reason: "`¬(a ∨ ¬a)` is the hypothesis, line 1, so the goal closes by it."
  - rule: "∨I₂"
    reason: "To prove `a ∨ ¬a`, prove its right disjunct, `¬a`."
  - rule: "¬I"
    reason: "To prove `¬a`, assume `a` and reach `⊥`: a subproof inside the first."
  - rule: "¬E"
    reason: "Again `⊥` from `a ∨ ¬a` and its negation."
  - rule: "line"
    reason: "The negation is line 1 again."
  - rule: "∨I₁"
    reason: "This time `a ∨ ¬a` follows from its left disjunct, `a`."
  - rule: "line"
    reason: "`a` is the inner hypothesis, line 2, and the proof is finished."
faded: 5
explain:
  after: 0
  prompt: "NJ has no `RAA`. Which step of this proof could NJ not take?"
  answer: "Only the first. Every other step is a rule of NJ, even of NM, and with them the subproof under `¬(a ∨ ¬a)` reaches `⊥`. NJ can conclude `¬¬(a ∨ ¬a)` from that by `¬I`, but not `a ∨ ¬a`: dropping the two negations is what `RAA` adds."
hinge:
  question: "In intuitionistic logic, deduxit says `⊢ a ∨ ¬a` is not valid and draws a model. What does the model show?"
  options:
    - text: "A world where neither `a` nor `¬a` holds: `a` is not true there yet, but becomes true at a later world"
      why: "`¬a` holds at a world only if `a` holds neither there nor at any later world. At the first world `a` is not true and later is, so neither disjunct holds there."
    - text: "That the search gave up"
      misconception: "No proof found means the search gave up."
      why: "deduxit's verdict is exhaustive, and the model is checked against the sequent: it refutes it."
    - text: "That `a ∨ ¬a` is false in classical logic too"
      misconception: "Not valid intuitionistically means false classically."
      why: "Every row of the truth table makes `a ∨ ¬a` true, and NK proves it. Intuitionistic logic proves less."
    - text: "That minimal logic is needed to prove it"
      misconception: "Minimal logic is stronger than intuitionistic logic."
      why: "Minimal logic drops ex falso and proves less still: `⊢ a ∨ ¬a` has no proof there either."
---
Classical logic proves `a ∨ ¬a`; intuitionistic logic (NJ, LJ) does not, and minimal logic
(NM, LM), which has no ex falso, proves less still. NK adds a classical rule to NJ, here `RAA`:
to prove `A`, refute `¬A`.

***

Where a sequent has no intuitionistic proof, deduxit draws a Kripke model: worlds ordered in
time, each with the atoms true there, an atom once true staying true at every later world.
`¬A` holds at a world when `A` holds neither there nor at any later world. A model refutes the sequent at a world
that makes its hypotheses true and its conclusion not.
