---
lesson: 1
title: "Reading a sequent"
worked: "identity"
choices: ["ax", "no rule"]
steps:
  - rule: "ax"
    reason: "The goal holds the atom `A` and its dual `A⊥`, and nothing else: the axiom closes it."
faded: 0
rewrite: "You typed `A ⊢ A`, and the stage shows `⊢ A⊥, A`: a hypothesis left of `⊢` moves to the right as its dual."
explain:
  after: 0
  prompt: "Why does the axiom close `⊢ A⊥, A` and not `⊢ A, A`? Say what `A⊥` stands for here."
  answer: "`A⊥` is the hypothesis `A` moved across `⊢`: the goal says \"from `A`, give `A`\", and the axiom passes the hypothesis on. `⊢ A, A` asks for two `A` from no hypothesis at all, and the axiom only joins an atom with its own dual."
hinge:
  question: "Which goal does the axiom close by itself?"
  options:
    - text: "`⊢ A⊥, A`"
      problem: "identity"
      why: "An atom and its dual, and nothing else."
    - text: "`⊢ A, A`"
      problem: "same-atom"
      misconception: "The axiom pairs a formula with itself."
      why: "It pairs `A` with its dual `A⊥`: two copies of `A` are no pair."
    - text: "`⊢ A⊥, A, B`"
      problem: "extra"
      misconception: "A formula nobody uses can be left over, as in classical logic."
      why: "`B` would be left over, and the axiom leaves nothing over. Later lessons meet the few rules that can drop a formula."
    - text: "`⊢ A⊥, B`"
      problem: "strangers"
      misconception: "Any atom closes with any negated atom."
      why: "The axiom needs the dual of the same atom: `B` goes with `B⊥`, not with `A⊥`."
---
A goal such as `⊢ A⊥, A` asks for a proof of its formulas together. `A⊥` is the
dual of `A`, its negation. The axiom, `ax`, closes a goal that holds an atom and its
dual, and nothing else.
