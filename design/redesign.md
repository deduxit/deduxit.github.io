# The page redesigned: working notes

Draft, 2026-11-24. Nothing here is settled until the author says so; each
section says how far it is.

The canvas with every drawing: https://claude.ai/artifact/ALuD29h2Z6tiLhThP1ahFM

## Users (from the author)

- **Experts**, who try things out for their own research. They must get
  done what they came for without distraction.
- **Newcomers**, who may be solving logic homework. They turn on a guide
  (the author's word: a HUD) that makes the page easier to get around.

The expert's page is the default. The guide is one switch, off at first.

## Problems with the current page (from the author)

1. The functions stand apart from each other. Getting from one to another
   is cumbersome: a table, a tableau, a translation, a normal form and a
   model each open in a different way (a view tab, a sheet from the Logic
   popover, a button in a note).
2. The page does not feel natural, and it is hard to explore.
3. Tabs are more limiting than the author intended: a tab is one proof,
   and what belongs to the same sequent is spread over sheets, popovers
   and the workspace panel.

Still to walk through together in the browser: reading a refusal, taking
a hint, following a lesson, picking a practice problem.

## What stays

- The centre stage: the derivation in the middle, a formula clicked to
  see its rules, the rule popover at the formula.
- Every function the page has now (README, "What it does").

## What the author asked for

- **One tab group per sequent or formula.**
- **Any number of tabs in a group**, each one view of that sequent, made
  on demand, each one node of deduxit's workspace graph. For a classical
  sequent S: the classical proof; natural deduction on the Kolmogorov
  translation of S; the translation T of S into linear logic; the proof
  net of T's proof, redrawn as that proof changes.
- **A new tab starts with a choice of logic** (ordinary, linear, modal,
  later fixpoint logic and others), shown as large buttons. Choosing one
  opens the stage with an input box at the bottom centre. The field at
  the top left goes.
- **New tabs and groups on demand.** Where the graph dictates a thing (the
  exact formula of a translation), editing it opens a new tab or a new
  group, whichever disturbs less.
- **Each tab fills the window** for now. Split views come later.

## Proposals in the draft, for the author to accept or drop

- Every function is a view, reached one way: "+ View" on a group lists
  what this sequent allows, under four headings (prove it; decide it;
  translate it, then prove the translation; read off). This is the answer
  to problem 1.
- The bottom box holds the sequent. (The first drafts put the proof's
  actions and then the calculus there too; the author wants only the text
  box and an enter button in it, see D.)
- An open goal carries a dashed line where its rule will go. A solid line
  is an inference made.
- Lessons and Practice start from the "Choose a logic" view and from the
  guide, per logic.
- The guide puts each explanation beside the thing it explains: a caption
  at a goal, the rule drawn in the rule popover, the next step above the
  bottom box, words on every button.
- The switch is labelled "Guide". "HUD" is a word from games that a
  newcomer to logic may not know.

## Three directions

Each lays the groups and views out differently and has a look of its own.
The first is drawn as a whole flow, the others as one screen in the same
state, so that they compare.

The author chose D below, which grew out of A. The drawings of A, B and C
are no longer on the canvas; its version history keeps them (up to version
`1795533673-ce9c`).

### A. Two shelves

Sequents on a top row, the views of the chosen sequent on a row below.

- For: the two levels are always in sight, and a view's name has room for
  what it is a view of.
- Against: 96 pixels of bands above the stage.
- Look: a printed page. Square corners, hairlines, one colour.

| Token | Light | Dark (to draw) |
| --- | --- | --- |
| page | `#FFFFFF` | `#14171F` |
| band | `#F2F3F5` | `#1C2029` |
| ink | `#151821` | `#ECEEF3` |
| ink, second | `#4A5163` | `#A5ACBC` |
| hairline | `#D5D8DF` | `#333949` |
| lapis (chosen, open goal) | `#2456C9` | `#7AA7FF` |
| lapis wash | `#E8EEFB` | `#1E2C4D` |
| good | `#0A6B4F` | `#6FCBA4` |

Type: Ysabeau Office for the page's words, Gentium Book Plus for the mark
and headings, the math font for formulas. Radius 2. What is chosen carries
a lapis line above it, as the mark's long vowels do.

### B. One row, keyboard first

One row. The chosen sequent's group is unfolded into its views; the other
groups are folded to their sequent. The bottom box is a command line.

- For: the most room for the stage; fast for someone who knows the keys.
- Against: view names must be short; a folded group hides its views.
- Look: a blackboard. Dark slate, chalk, one chalk yellow.

| Token | Dark | Light (to draw) |
| --- | --- | --- |
| board | `#16201D` | `#F4F6F3` |
| raised | `#1F2B28` | `#FFFFFF` |
| chalk | `#EDEBE3` | `#17201D` |
| chalk, second | `#A9B5B0` | `#4E5C57` |
| hairline | `#34443F` | `#CBD3CE` |
| yellow (chosen, open goal) | `#F1CF63` | `#7A5B00` |
| mark's lines | `#8FB4FF` | `#2456C9` |
| good | `#7FD1A8` | `#0A6B4F` |

Type: IBM Plex Sans, IBM Plex Mono for what is typed. Radius 6 to 8.

### C. Spine

A column on the left lists the sequents; the chosen one is unfolded into
an outline of its views, each indented under what it is made from.

- For: shows the graph as it is (the net under the linear proof under the
  linear translation); long sequents read well in a list; scales to many
  views.
- Against: 300 pixels of width, unless the column folds away.
- Look: a friendly tool. Rounded, roomy, a typeface drawn for legibility.

| Token | Light | Dark (to draw) |
| --- | --- | --- |
| stage | `#F9FAFD` | `#151924` |
| column | `#EDF0F7` | `#1B2030` |
| ink | `#1A1F2E` | `#E9ECF5` |
| ink, second | `#505870` | `#A3ABC2` |
| hairline | `#D3D8E5` | `#313851` |
| lapis (chosen, open goal) | `#2456C9` | `#7AA7FF` |
| lapis wash | `#DFE8FB` | `#1E2C4D` |
| good | `#0A6B4F` | `#6FCBA4` |

Type: Atkinson Hyperlegible Next. Radius 8 to 16.

## D. Sequents across, views down (the author's notes on A to C)

The author's notes on the first draft: the new tab view is liked, its
symbols want another round; the groups go across the top and the tabs
down the side, as symbols or abbreviations only; rounder than A; no text
that is not needed. D is A's colours and type with those changes.

- **Sequents across the top**, each a rounded chip. A check stands for
  "proved" or "valid".
- **Views down a rail 60 pixels wide**, each a 44-pixel cell that shows
  its calculus by the name logicians use (LK, NM, LL), or a drawing (the
  net). The net's drawing is a knotted diamond: one cell of netting, a
  knot at each corner and in the middle (the author chose it from eight).
  It reads as netting and as nodes joined by links. The first drawing, a
  small proof net of one round link over a node, looked like a light bulb
  (the author); a proof net with square links was tried in between. A
  small sign above the name says how the view's sequent was made:
  `¬¬` a negative translation, `!` the linear one. Views that depend on
  each other share a capsule (the net with its linear proof). A ring marks
  open goals. The rail never widens, with the guide on or off: a view's
  full name shows when the pointer or the keyboard is on its cell.
- **The page without the guide has almost no words**: the sequents, the
  calculus names, the rule's sign. Every control has its name for screen
  readers and as a tip.
- **The guide brings the words back**: the rule popover gains the rule's
  name and the rule itself, drawn as premises over a conclusion, with no
  sentence (the author: "just draw the derivation rule"; a sentence stood
  there before). Captions stand beside the goals, the next step stands
  above the bottom box, and the view's tools get their names.
- **The stage keeps the current page's dotted field**: a dot of 1.1 pixels
  in `#A9B2C8` every 20 pixels. A sequent lies on white, so no dot shows
  through a formula.
- **The view's tools** are what can be done with the view shown, as the
  current page's bottom band holds them: undo, redo, steps; hint, close
  all; the view's own switches (for LK, whether weakenings and
  contractions are drawn); export, import. The set changes with the view.
  What belongs to the page and not to a view (settings, keys, About)
  stays in the menu at the top right.
  - They are a small group that floats at the stage's top right, no taller
    than its buttons, with the dotted field around it (the author: on the
    right, and not a full bar). Each button is a drawing, with its name on
    hover.
  - With the guide on, each button has its name beside it, and Learn,
    Practice and the tour join the group.
  - Three full bars were drawn first: along the bottom, along the top and
    down the right. The author chose the right, and those drawings are
    gone from the canvas.
- **The new tab view** has no heading and no descriptions: four symbols,
  each over a line with the logic's name, then "Open a file" and "Restore
  3 proofs". Four symbol sets were drawn: signs, small formulas, figures,
  and a collage of four signs. The author chose the signs: ⅋ for linear
  logic (not ⊗), ∧ for ordinary logic, □ for modal logic, λ for
  lambda-terms. A fifth, ⊢ for "Your own rules", was drawn until the
  author left that function out (see "What goes").
  - Ordinary logic comes first (the author), and is the default: it has
    the focus when the view opens, so Enter chooses it. Linear logic is
    second.
  - The signs are Euler Math, thickened, and fixed (the author, "for
    now"): drawings made once from the font's outlines with a stroke of 26
    font units around them, so they stay the same when a visitor changes
    the font of the formulas in Settings. Two sheets, the symbol sets and
    the signs in each of the page's five math fonts, served the choice
    and are gone from the canvas.
- **The bottom box holds the sequent's text box and an enter button**,
  nothing else (the author). With the guide on the button also says
  "Enter".
- **The calculus is chosen by toggles** (the author asked for them, for
  ordinary and for linear logic). They are not in the bottom box (the
  author): they float at the stage's top left, across from the view's
  tools, each a small white group like them. They offer what deduxit has.
  - A calculus's name is the literature's: LK and LJ are Gentzen's and
    standard, NK and NJ are his too, LM and NM are formed like them and
    rarer; LL and ILL are standard. (CL, IL, ML and SC, ND were tried and
    dropped: papers do not use them in one fixed way.)
  - Ordinary logic has two toggles side by side, in whole words (the
    author): the proof method, "Sequent", "Natural" or "Fitch", then the
    logic, "Classical", "Intuitionistic" or "Minimal". "Fitch" is natural
    deduction drawn as Fitch's lines, which was a switch among the view's
    tools before. A cell says its whole name on hover ("Sequent
    calculus", "Natural deduction, drawn as a tree", "Intuitionistic
    logic").
  - The toggles' labels took five rounds: one grid of the six calculi;
    single letters (L, N and K, J, M); CL, IL, ML with SC, ND; "Seq",
    "Nat", "Fit" with "Cla", "Int", "Min"; and the whole words, which the
    author settled on.
  - The view's cell in the rail shows the calculus the two give, by the
    literature's name: LK for Sequent and Classical, NM for Natural and
    Minimal (the author); "Fitch" has the calculus of "Natural", so NK,
    NJ or NM. deduxit has no Hilbert calculus; one would be a fourth
    choice of method.
  - D7 draws a finished NJ proof of `p → q, q → r ⊢ p → r` as Gentzen's
    tree: "Natural" and "Intuitionistic" pressed, the rail's cell NJ
    beside the LK view, which keeps its open goal (the rule below).
  - Linear logic has one toggle, "Classical" or "Intuitionistic" (the
    author; it read LL, ILL before), and two
    rules that are each on or off: Mix and Affine (weakening). The rail's
    cell reads LL or ILL. Mix is greyed in intuitionistic linear logic, as
    on the current page. Each says its whole name on hover. D6 draws them
    over a finished proof of `A ⊗ B ⊢ B ⊗ A`.
  - With the guide on, the cells show whole words ("Sequent calculus",
    "Natural deduction", "Fitch's lines"; "Classical", "Intuitionistic",
    "Minimal") (D4).
  - **A toggle keeps the proof in its view where nothing is lost, and
    opens a view beside it otherwise** (the author). The current page's
    warning "Changing the logic restarts this proof" goes. What that
    means for each toggle, as deduxit 0.8.0 stands:
    - "Natural" and "Fitch" are one proof drawn two ways (deduxit checks one
      derivation and lays it out as a tree or as Fitch's lines), so the
      view stays. A line that Fitch's proof cites twice stands twice in
      the tree.
    - A view without steps changes in place.
    - A change of logic replays the proof's steps in the other calculus.
      If every step is accepted the view stays, which holds whenever the
      logic grows (minimal to intuitionistic to classical); if one is
      refused, a view opens beside it. To be tried in the prototype.
    - "Sequent" to "Natural" or back opens a view beside the proof, or goes to it
      if it is there. deduxit has no conversion between the two for a
      proof under way. It reads a finished LJ or LM proof as a
      lambda-term and draws that term's typing by natural deduction's
      rules, which is a drawing, not a proof to go on with; it has
      nothing for LK and NK, and nothing from natural deduction back.
    - In theory a conversion exists both ways for intuitionistic and
      minimal logic, but it is lossy: many sequent proofs, which differ
      in the order of their left rules, become one natural deduction
      proof, and a natural deduction proof with a detour (a formula
      introduced and at once eliminated) needs a cut. For classical logic
      it rewrites the proof, since LK has several formulas right of ⊢ and
      NK one. So both proofs are kept as views even if deduxit learns to
      convert (my recommendation, the author agreed); the conversion
      could then fill the new view.
  - What changes only the drawing and has no toggle is a switch among the
    view's tools: weakenings and contractions (LK), two-sided (classical
    linear logic, drawn in D6 as `Γ⊢Δ`).
- **"+ view" lists what the toggles do not reach** (the author): under
  "Prove" the tableau and resolution, then the truth table, the
  translations and what is read off a proof. The sequent calculus and
  natural deduction are not in it; the toggles open them.
- **Every sequent and rule name is set in Euler Math** (the author), the
  page's default math font, on all seven boards. The canvas loads the
  font from a copy uploaded to it (Euler Math 0.75, SIL Open Font
  License), as the page loads its own. The first drafts used Noto Sans
  Math, which the canvas could link without an upload.
- Radii: 8 to 10 for a control, 12 for a rail cell, 14 to 16 for the
  popover and the bottom box, 18 for a logic's button.

Open with the author:

- whether "?" reads as the guide's switch;
- whether the toggles sit well at the stage's top left.

## Learning in groups and views (proposal; the author: "sounds good")

Left for later (the author): Learn and Practice come back once the core
is right. Until then their buttons stay where they are and are inactive,
with the hint "Coming soon" (D1, and the view's tools on D4). The lesson
board, D5, is gone from the canvas; what it drew is described below.

The author asked how learning fits the split into sequents and views.

- The guide is a layer, not a place: it adds words to the view that is
  open and changes nothing about sequents and views.
- Hint belongs to the view's tools for everyone, as in the current page's
  bottom band. It acts on the proof in view.
- A lesson is a sequent with its own chip, marked as a lesson. Its parts
  are views in the rail: the worked proof played step by step, then the
  same proof with its last steps left to the visitor. The lesson's text
  stands in a panel beside the stage.
- A practice problem opens as a new sequent, as it does now. The check on
  its chip says "proved".
- The lists of lessons and of practice problems open from the new tab
  view (D1: "Learn" and "Practice" under the logics, after "Open a
  file" and "Restore 3 proofs", which the author ranks higher) and, with
  the guide on, from the view's tools. The button is "Learn", the
  current page's word, not "Lessons": it also leads to the tour and the
  reference, and it reads as a verb beside "Practice". The frame the
  current page puts around the window for Learn goes.
- The reference (connectives, rules as schemas) opens from the rule
  popover and from the menu.

D5 drew lesson 3 of the ordinary course, "The sequent calculus LK", at
the second step of its worked proof of `⊢ a ∨ ¬a`:

- The lesson's chip carries a small mark. Its two views share a capsule
  in the rail: the worked proof (a small triangle above LK) and the same
  proof left to finish (a small dashed line above LK).
- The lesson is played with the stage's own pieces. The question "Which
  rule comes next?" and the lesson's choices stand in the popover at the
  open goal, and the reason for a step made stands beside its line.
- A panel at the right holds only the lesson's text: its number and
  title, its four parts (Watch, Finish it, Practice, Check), the
  explanation, the step count and a link to all lessons.

## First-order logic (proposal, drawn in D8 and D9)

deduxit 0.8.0 reads first-order sequents of ordinary logic, proves them
in LK, LJ and LM with the quantifier rules, and refutes one that is not
valid by a finite structure.

- **A witness is typed in the rule's popover, at the formula** (the
  author, from two boards that drew both places). D8 draws it, on
  `∀x. (p(x) → q(x)), p(a) ⊢ ∃y. q(y)`. `∃R` and `∀L` need a term.
  With the formula chosen, the popover shows the rule and beside it a
  small box of the bottom box's kind: the bound variable and an equals
  sign as its label (`y =`), the term, and an enter button. A second
  button, `$1`, leaves the witness open, for an axiom or the search to
  fill; it says so on hover. The current page asks in a second popover
  with a sentence, a hint and three buttons (Apply, Leave open, Cancel);
  here Escape or a press outside cancels, and the guide brings the
  sentence back.
- **Not taken: the term typed in the bottom box.** The popover would
  show the rule and `$1` alone, and the bottom box would ask for the term
  in the sequent's place, its border lapis and the rule and `y =` before
  the text. It keeps one place for all typing, but the eye goes from the
  formula to the bottom of the stage and back. Its board is gone from the
  canvas.
- **A refusal of the term is said in the popover**, under the box, as the
  current page says it (the eigenvariable condition above all). Not drawn.
- **`∀R` and `∃L` need nothing typed**: deduxit names a fresh
  eigenvariable. Not drawn.
- **A countermodel is a view** (D9, on `∃x. p(x), q ⊢ ∀x. p(x)`): it
  shares a capsule with the proof view it refutes, as a net does with its
  linear proof. Its cell in the rail reads `⊭`, "does not satisfy", in
  Euler Math. The first draft read "M", which the author accepted and
  offered `⊭` beside; `⊭` is taken because M already stands for minimal
  logic in LM and NM. The sequent's chip and the LK cell carry a
  cross for "not valid" (the author agreed).
- **The view draws the structure and what it does to the sequent**: a
  table with a column per element and a row per predicate, a filled dot
  where the predicate holds and a ring where it does not; under it the
  sequent, each formula with a check or a cross for its value in the
  structure. Every formula left of ⊢ true and every one right of it false
  is what "refutes" means, shown without a sentence. Constants and
  function symbols would be further rows (`a = 0`, `f: 0 ↦ 1`).
- **Its tools** are Export and Import alone; the calculus toggles do not
  show, since a structure refutes the sequent in every logic (the author
  agreed). The current
  page's "Change this model and check it" is not drawn.

## Every function, and where it goes

What a visitor can do on the current page, by what they want, and its
place in the new design. "Settled" is drawn and agreed with the author.
"Proposed" is my proposal, drawn or not. "Open" has no place yet. The
author and I go through the groups one by one, and each group gets its
boards as we go (the author).

Boards may respond (the author asked): a board marked playable has a
Play button on the canvas, and in Play its controls work. D1 is the
first: the guide's switch, the four logics, the toggles of ordinary and
linear logic (the view's cell in the rail follows them: LK to NM, LL or
ILL), the examples, typing and Enter. A playable board is a scripted
drawing. deduxit does not run in it: nothing is parsed, proved or
refused, which is what the prototype in the real page is for.

### 1. Start

All of it plays on D1, and the author has gone through it: "the rest of
D1 is fine". The two recommendations below, on the logic a sequent opens
in and on the last visit's proofs, are agreed too.

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Start another sequent | "+" in the row of tabs | "+" after the sequents; the new tab view | Settled (D1) |
| Choose the logic | The tab's Logic popover, three of five behind buttons | Four symbols on the new tab view, ordinary logic first | Settled (D1) |
| Type a sequent | The field in each tab | In the bottom box, on the new tab view or after a logic is chosen; Enter makes the sequent the first goal and a chip at the top | Settled (D1) |
| Type with a plain keyboard | `->`, `\|-`, `forall` and the like are read; the tab shows signs | The same: on Enter the text in the box and in the chip is written in signs | Settled (D1) |
| Learn that the text is not a sequent | The field marks the place and says the problem under it | The bottom box's border turns red and a line over it says the problem, a keyword first; typing takes it away. Nothing else changes | Settled (D1); the place in the text not marked |
| Try an example | A menu beside the field | With the guide on and a logic chosen, a sentence and that logic's examples over the bottom box; a press puts one in the box | Settled (D1) |
| Open a file | Import, in the bottom band | "Open a file" on the new tab view; the file's sequent opens with its proof, and a line over the bottom box names the file. Import among a view's tools does the same | Settled (D1) |
| Drop a file on the page | A drop on the stage | Anywhere under the top row: a dashed frame says "Drop the file to open it" | Settled (D1) |
| Paste a session or a sequent as JSON | Import's panel | The bottom box takes it: Enter opens it, or says it is not deduxit's JSON | Settled (D1) |
| Get the last visit's proofs back | A bar over the stage | They come back by themselves on a plain visit. After a link or with the page open twice, "Restore 3 proofs" on the new tab view: they join the sequents at the top and the first opens | Settled (D1 draws the button's case) |
| Open a link someone sent | The page reads it and opens a tab | It opens as a sequent with its views, the linked view shown | Proposed, not drawn |

Which logic something opens in. The session that plans deduxit checked
the page's code and deduxit's wire schema for 0.8.0:

- A link always names its suite and calculus. It never needs a question.
- A session always names its calculus (a linear one its mode, an ordinary
  one its logic, a typed lambda-term its calculus). It never needs a
  question.
- A sequent does not, typed or in deduxit's JSON. Plain text shows the
  suite at most: `⊗`, `⅋` or `⊸` say linear, `□` or `◇` say modal, `λ`
  says lambda-terms. It never shows the mode, the modal system, or which
  of classical, intuitionistic and minimal logic is meant.

So the new tab view asks nothing before opening (that session's
recommendation; the author agreed). The bottom box stands on the new tab view
too. A sequent entered there opens in the suite its signs show, ordinary
logic if they show none, and in that suite's calculus chosen last. The
toggles then show the calculus and change it. A visitor who wants to
choose first presses a logic's symbol, as before. D1 plays both.

The last visit's proofs (the author left it to me, with that session's
help, and agreed to the result). The current page waits behind a bar because it cannot tell a
closed browser tab from an open one: every visit keeps its proofs under a
key of its own, and a new visit gathers what all the others left. If two
tabs each took the other's proofs, both would save copies under the same
ids and one tab's later steps would be lost without a word. Decided:

- On a plain visit the proofs come back by themselves, the first one
  open. No bar, no button.
- That needs the page to know that no other tab of it is open. Each
  visit holds a lock named by its key (the browser's Web Locks); a key
  whose lock is free belongs to a closed visit.
- "Restore 3 proofs" stays on the new tab view for the two cases where
  the page must not restore by itself: the visitor followed a link, a
  course pack or a hand-in, which opens alone; or the page is open in
  another tab. D1 draws this case, and the button's hover says so.
- "Discard" goes. "Close all" in the menu closes every sequent and can be
  undone. It serves a shared computer, where the next person should not
  meet the last person's proofs. Not drawn.
- An embedded exercise restores nothing, as now.

Decided here by the author: the first restored proof opens at once.

Not decided in this group:

- What Enter does in the bottom box of a sequent that already has a
  proof: replace that sequent, or start a new one beside it. D1 starts a
  new one.

For the rebuild, two faults of the current page that the same session
found while checking: a sequent in JSON that names its logic
(`ordinary.sequent`) is opened in the logic chosen last, not its own; and
a modal sequent in JSON is taken for an ordinary one, since the two have
the same shape.

The first D1 did nothing on Enter (the author found it). The likely
cause, not confirmed: the canvas plays a board in a frame that submits no
forms, and the box was a form. The box now listens to the Enter key and
to its button instead.

### 2. Prove by hand

D2 plays the first eight rows and the search's part of group 3, on two
sequents of implications: `p → q, q → r ⊢ p → r` and Peirce's law,
`⊢ ((p → q) → p) → p`. Its prover is a script of the board's own with
three rules (`→R`, `→L`, `ax`), not deduxit.

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Apply a rule to a formula | Press the formula, choose in the popover | The same; the popover shows the rule's sign alone, a press applies it | Settled (D2) |
| See the rule explained | A hint on every rule label | With the guide on, the popover has the rule's name beside its sign and the rule drawn under it, premises over conclusion; no sentence (the author) | Settled (D2, D4); the label's hover not drawn |
| Read why a step was refused | A note at the goal, with "Other rules" | A red-framed note over the goal: the keyword alone ("ax refused"), and the sentence with the guide on. A press elsewhere takes it away | Proposed (D2) |
| See which goals are open | The goal bar, "Open goal 1 of 2" | A dashed lapis line over each open goal; a ring on the view's cell while any is open, a check on the sequent once none is | Proposed (D2); the count not drawn |
| Go to another open goal | The keys `[` and `]`, or a press | A press on any formula of it | Proposed (D2); the keys not drawn |
| Undo, redo | The bottom band | The view's tools, greyed when there is nothing to undo or redo | Settled (D2) |
| Go back to an earlier step | "Steps", a list | "Steps" opens a list beside the tools: 0 for the start, then each step by its rule and formula; a press goes back to it and Redo goes forward again | Proposed (D2) |
| Be told what to do next | The hint ladder at the goal | "Hint" rings the formula to press; with the guide on a line over the bottom box says it in words | Proposed (D2); the ladder's later rungs not drawn |
| Give a witness (`∃R`, `∀L`) | A second popover | A small box in the rule's popover | Settled (D8) |
| Split the context (linear `⊗`) | A chooser under the goal | The same place | Open, not drawn |
| Cut (linear) | "Cut" beside the goal | A tool of a linear view, with a small box at the goal as for a witness | Open |
| Prove a goal apart | "Open this goal in a new tab" | A new sequent beside this one, linked to the goal | Open |
| Close a goal by a proof made apart | "Fill from" a finished tab | Offered at the goal when a finished sequent fits | Open |
| Have the invertible rules applied | A switch in Settings | The same switch, in the menu | Proposed |
| Use the keyboard for all of it | The keys in the Keys list | The same keys | Proposed, not drawn |

D2 also plays the rule for a change of logic. On the first sequent a
proof in LK replays in LJ step for step, so "Intuitionistic" renames the
view and keeps the proof. On Peirce's law the LK proof's fourth step does
not hold in LJ, so LJ opens as a view of its own beside LK, a line over
the bottom box says why, and LK keeps its proof.

### 3. Let the search help

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Close the goal worked on | "Close" beside the goal | Not placed: the view's tools hold "Close all" alone | Open |
| Close every goal | "Close all" in the bottom band | The view's tools; the search's steps carry a grey rule name in the drawing and "search" in the list of steps. What it cannot close stays open, and a line over the bottom box says so | Settled as a tool (D2); the rest proposed |
| Stop a search | "Stop the search" in the tool's place | The same | Proposed, not drawn |
| Get a hint, a little at a time | "Hint", three rungs at the goal | "Hint" among the tools; with the guide on, the next step stands above the bottom box | Proposed (D4); the rungs not drawn |
| Read a verdict and its reason | A note at the goal and the tab's status | A check or a cross on the sequent and on the view's cell; the reason at the goal | Proposed (D6, D9); the reason not drawn |
| Search longer after "Unknown" | "Try N units" in the note | The same, at the goal | Open |
| Go back to where a proof still exists | "Go back" beside the verdict | The same, at the goal | Open |
| See a countermodel | A figure under the note | A view of its own, `⊭` | Settled (D9) |
| Change the model and check it again | The model editor in the drawing's place | The countermodel's view, made editable | Open |
| See or choose the engine | A chip by the note; Settings | Settings in the menu; the engine named with the reason | Proposed |

### 4. Choose the calculus

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Change the logic or the proof method | The Logic popover, with a restart warning | The toggles at the stage's top left; the proof stays or a view opens | Settled (D2, D6, D7) |
| Draw weakenings and contractions | A switch in the popover | A switch among the view's tools | Settled (D2) |
| Draw a classical linear proof two-sided | A switch in the popover | A switch among the view's tools | Settled (D6) |
| Prove in natural deduction, backwards or forwards | Its own panel: goals, numbered lines, two step lists | "Natural" or "Fitch"; a proof under way not drawn | Open |
| Decide a modal sequent | A button in the popover, then a panel | A symbol on the new tab view; its fifteen systems as a chooser where the toggles are | Open |
| Check or find a lambda-term | A button in the popover, then a panel | A symbol on the new tab view; its three calculi as a toggle | Open |
| Prove in rules of one's own | A button in the popover, then a panel | Left out, at least for now (the author) | Left out |

### 5. Look at a sequent in another way

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| See what else can be done with a sequent | Spread over tabs of the stage, the popover and four sheets | "+ view", one list | Settled (D3) |
| See a linear proof's net | The stage's Net tab | A view in one capsule with its proof | Settled (D6) |
| Truth table, tableau, resolution | Two tabs of the stage and a sheet | Views from "+ view" | Settled as entries (D3); the views not drawn |
| Translate into another logic and prove it there | A sheet, then "Prove it in" on a new tab | A view from "+ view", marked with how it was made | Settled as entries (D2, D3) |
| Interpolant, normal form | Two sheets | Views from "+ view" | Settled as entries (D3) |
| Eliminate a proof's cuts | A cluster on the stage, on the tree and on the net | A view made from the proof | Open |
| Read a finished proof as a lambda-term | The last item of Export | A view under "Read off" | Open |
| Check a tableau written by hand | A button in the popover | A way of the tableau view | Open |
| Check a model of one's own | A button in the popover | "+ view" | Open |
| Work on a copy of a proof | "Duplicate this proof" | "+ view", the same calculus again | Open |
| See how the views depend on each other | The Workspace panel and its graph | The rail: a sign for how a view was made, a capsule for views that depend on each other | Proposed (D2) |
| Bring a view up to date after its source changed | "Update", "Start again", "Check" in the panel | A mark on the view's cell and one action there | Open |

### 6. Look at the drawing

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Pan and zoom, fit to the window | Drag, pinch, the wheel, `+` `−` `F`, buttons on the stage | The same gestures and keys; the buttons not placed | Open |
| Choose the font of the formulas | Settings | The menu | Proposed |
| Light or dark | Settings | The menu; dark not drawn | Open |
| Choose how a net is drawn | Settings, "Net drawing" | A switch among the net view's tools | Proposed |

### 7. Keep and share

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Keep the work without doing anything | Saved in the browser | The same | Unchanged |
| Save a proof in a format (LaTeX, Typst, SVG, PNG, PDF, Rocq, JSON) | Export's menu | "Export" among the view's tools; it exports the view shown | Proposed (D2); the menu not drawn |
| Share a link, with the proof or the sequent alone | Export's menu | The same menu | Proposed |
| Embed the page, print | A link's `e=1`; the browser's print | The same | Unchanged, not drawn |

### 8. Learn

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Have the page explain itself | Learn on: a frame, every label | The guide's switch, "?" | Settled (D4); whether "?" reads as that is open |
| Follow a lesson | Learn's panel beside the stage | Left for later; "Learn" stays as an inactive button with the hint "Coming soon" | Left for later |
| Open the lessons, practice, the tour | The bottom band | The view's tools while the guide is on; "Learn" and "Practice" inactive there, the tour works | Proposed (D4) |
| Look a rule or an engine up | Learn's Reference | Left for later, with Learn | Left for later |
| Pick a practice problem | Practice, a sheet with filters | Left for later; "Practice" stays as an inactive button with the hint "Coming soon" | Left for later |
| Take the tour | The bottom band, and a button on the empty stage | "Tour" with the guide on | Proposed |

### 9. Teach

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Hand out a set of problems | A course pack: a link, a printed handout | Not placed | Open |
| Hand answers in | A link or a file | Not placed | Open |
| Check answers handed in | The check view | Not placed | Open |

### 10. Settings and the rest

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Set the search's budget and bounds | Settings | The menu | Proposed |
| See every key | Keys | The menu | Proposed |
| Read what the page is, its licences, privacy | About, and the privacy page | The menu | Proposed |
| Use the page offline, install it | The service worker | The same | Unchanged |

### What goes

- The restart warning on a change of logic (the proof stays or a view
  opens).
- The Workspace panel and its graph as places of their own (the sequents
  across the top and the rail show the same links).
- The stage's row of view tabs, the Logic popover and the four sheets
  (all in "+ view" and the toggles).
- The bottom band (its actions are the view's tools, the rest is in the
  menu).
- **A calculus of one's own**, "at least for now" (the author): no symbol
  on the new tab view, no rule file to edit, no starters. The current
  page builds two other things on the same part of deduxit, and both
  stay: natural deduction, and proving a valid modal sequent step by
  step. A link or a stored proof of the current page that holds a
  calculus of one's own would have nowhere to open; what the page says
  then is not decided.

## What the drawings do not show yet

- The formulas are text in Euler Math. The page draws a derivation with
  deduxit, in the math font chosen in Settings.
- The word mark in every board's header is the logo's own drawing
  (`src/logo/wordmark-band.svg`, 28 pixels high, its letters in the
  boards' ink). The first drafts set the word in Gentium with two drawn
  lines, which was not the mark (the author).
- The translations written out (the linear one above all) are examples,
  not deduxit's output.
- The keys in B (`1`, `h`, `c`, `u`, `/`) are a proposal.
- Dark for D and a phone's width.
