---
lesson: 8
title: "Proof nets"
worked: "weak-distributivity"
choices: ["⅋", "⊗", "ax"]
net: true
steps:
  - rule: "⅋"
    reason: "`⅋` puts `A⊥ ⊗ B⊥` and `C⊥` side by side. In the net it is a `⅋` link from the two to their formula, wherever the tree applies it."
  - rule: "⅋"
    reason: "The same for `A ⅋ (B ⊗ C)`: a second `⅋` link. The tree applies both first; the net keeps no order between them."
  - rule: "⊗"
    reason: "`⊗` splits the goal: `A⊥` with `A`, and `B⊥` with `C⊥` and `B ⊗ C`. The net draws no split, only a `⊗` link joining `A⊥` and `B⊥`."
  - rule: "ax"
    reason: "`⊢ A⊥, A`: in the net, an axiom link between `A⊥` and `A`."
  - rule: "⊗"
    reason: "`B ⊗ C` splits the rest: `B` with `B⊥`, `C` with `C⊥`. A second `⊗` link."
  - rule: "ax"
    reason: "`⊢ B⊥, B`: an axiom link."
  - rule: "ax"
    reason: "`⊢ C⊥, C`: the last axiom link. The net is the formulas' trees and these three links: See its net draws it."
faded: 2
explain:
  after: 2
  prompt: "The tree had to choose this split. The net has no split: where does the choice show in the net, and why does every switching of the two `⅋` links still leave a tree?"
  answer: "In the axiom links: `A⊥` meets `A` and `B⊥` meets `B`, which the split allowed by putting each atom where its dual is. Each `⊗` of the tree joined two parts that had nothing else in common, and each `⅋` joined two formulas of one part; so whichever premise of each `⅋` a switching keeps, the graph stays connected and has no cycle."
gallery:
  title: "More nets"
  act: "net"
  items:
    - problem: "essential"
      text: "An intuitionistic proof's net is Lamarche's essential net: its edges run from the hypotheses to the goal."
    - problem: "bang-bang"
      text: "Each promotion is a box: here one inside the other, the hypothesis `?A⊥` reaching in through their doors."
    - problem: "g164"
      text: "An intuitionistic proof with a promotion: its essential net draws the box around `B ⊗ A`."
hinge:
  question: "Which of these sequents has a proof net?"
  options:
    - text: "`(A ⊗ B) ⊗ C ⊢ A ⊗ (B ⊗ C)`"
      problem: "associativity-net"
      why: "Its links pair each atom with its dual, and every switching of its two `⅋` leaves a tree: the net of its proof."
    - text: "`⊢ (A ⊗ B) ⅋ (A⊥ ⊗ B⊥)`"
      problem: "switching-cycle"
      misconception: "Linking every atom to its dual makes a proof net."
      why: "The links `A`–`A⊥` and `B`–`B⊥` close a cycle through the two `⊗` links, and no switching of the `⅋` breaks it."
    - text: "`⊢ A ⅋ B, A⊥ ⅋ B⊥`"
      problem: "two-pieces"
      misconception: "A net may fall apart into pieces, each one correct."
      why: "Some switchings leave two pieces, and the condition asks for one connected tree. With Mix, which allows pieces, it has a proof."
    - text: "`A ⅋ (B ⊗ C) ⊢ (A ⅋ B) ⊗ C`"
      problem: "converse-weak"
      misconception: "A net read the other way up is a net, so the converse of weak distributivity holds too."
      why: "Its only linking leaves a cycle under some switching: weak distributivity holds one way only."
---
A proof net draws a proof without the order of its rules. Each formula is drawn as the
tree of its connectives, a link per connective, and each axiom as a link between an
atom and its dual. Two derivations that differ only in the order of independent rules
have the same net.

Not every way of linking the atoms is a proof. Danos and Regnier's test, the switching
condition, says which are: at each `⅋`, keep one of its two edges and remove the
other. For every such choice, the graph left must be connected and have no cycle.

The stage's Net tab draws the net of a finished proof in MLL, the multiplicatives, or
in MELL, the multiplicatives with `!` and `?`; each promotion `!` draws a box. In
intuitionistic mode it draws Lamarche's essential net, directed from the hypotheses to
the goal. You cannot edit a net on the page.
