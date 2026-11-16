---
lesson: 3
title: "The sequent calculus LK"
worked: "excluded-middle"
method: "sequent"
logic: "classical"
choices: ["∨R", "∨R₁", "¬R", "ax"]
steps:
  - rule: "∨R"
    reason: "The goal is a disjunction right of `⊢`. This `∨R` keeps both disjuncts there, `⊢ a, ¬a`, which says that at least one of them holds: LK has room for two formulas right of `⊢`."
  - rule: "¬R"
    reason: "`¬a` right of `⊢` becomes `a` left of it: to prove `¬a`, assume `a` and reach what is left on the right."
  - rule: "ax"
    reason: "`a ⊢ a`: one formula on both sides is the axiom, and every goal is closed."
faded: 1
explain:
  after: 0
  prompt: "LJ has no step from `⊢ a ∨ ¬a` to `⊢ a, ¬a`. Why can LK take it?"
  answer: "Several formulas right of `⊢` say that at least one of them holds. LK allows several there, so `⊢ a, ¬a` is a goal it can work on. LJ allows one: to prove `a ∨ ¬a` it must choose `a` or `¬a` (`∨R₁` or `∨R₂`), and neither `⊢ a` nor `⊢ ¬a` has a proof, so LJ has none of `⊢ a ∨ ¬a`."
hinge:
  question: "Why has LK a proof of `⊢ a ∨ ¬a`, and LJ none?"
  options:
    - text: "LK lets two formulas stand right of `⊢`, so `a` and `¬a` can both stay there until the axiom; LJ must choose one, and neither has a proof"
      why: "The difference between LK and LJ is how many formulas may stand right of `⊢`: any number in LK, one in LJ."
    - text: "Because `a ∨ ¬a` is always true, LK may skip the step that chooses"
      misconception: "A rule may be left out when its formula is true."
      why: "Every step of a proof follows a rule; truth plays no part in a step. LK's proof takes three steps, each by a rule."
    - text: "LK's rules for `∨` are other rules than LJ's"
      misconception: "LK and LJ differ in their rules for the connectives."
      why: "Gentzen gave LK and LJ the same rules for each connective; LK only lets several formulas stand right of `⊢`. With that room, even the rules that choose a disjunct prove `⊢ a ∨ ¬a` in LK, after a contraction."
    - text: "LJ's search gave up before it found the proof"
      misconception: "No proof found means the search gave up."
      why: "LJ's verdict on `⊢ a ∨ ¬a` is exhaustive: it has no proof there, and Close goal draws a countermodel that shows why."
---
A sequent `Γ ⊢ Δ` says: if every formula of `Γ` holds, at least one formula of `Δ` holds. The
sequent calculus proves one backwards. Each rule takes one connective apart, on the left of
`⊢` or on the right, and leaves simpler goals. A goal closes when one formula stands on both
sides: the axiom.

***

Gentzen's LK, for classical logic, lets any number of formulas stand right of `⊢`; his LJ,
for intuitionistic logic, at most one. That one difference decides which sequents have a
proof. On the stage, the tab's calculus mark switches between them (Classical, Intuitionistic).
