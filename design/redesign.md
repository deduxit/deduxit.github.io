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
  at a goal, the next step above the bottom box, words on every button.
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
  - When the row is too narrow, it behaves as a browser's tabs do: each
    chip shrinks and cuts its sequent with an ellipsis, down to 84
    pixels; past that the row scrolls sideways. A chip's hover says its
    whole sequent. "+", the guide's switch and the menu keep their size
    and place. The first boards let the chips run under those buttons
    (the author found it).
- **Views down a rail 60 pixels wide**, each a 44-pixel cell that shows
  its calculus by the name logicians use (LK, NM, LL), or a drawing (the
  net). The net's drawing is a knotted diamond: one cell of netting, a
  knot at each corner and in the middle (the author chose it from eight).
  It reads as netting and as nodes joined by links. The first drawing, a
  small proof net of one round link over a node, looked like a light bulb
  (the author); a proof net with square links was tried in between. A
  small sign above the name says how the view's sequent was made:
  `¬¬` a negative translation, `!` the linear one. Views that depend on
  each other share a capsule (the net with its linear proof). A small
  number on a cell counts its open goals (the author; a ring stood there
  first, which said that goals were open and not how many). Past
  nine it reads "9+", as counts on a badge usually do; the author also
  thought of a plain dot and left the choice to me. The rail never widens, with the guide on or off: a view's
  full name shows when the pointer or the keyboard is on its cell.
- **The page without the guide has almost no words**: the sequents, the
  calculus names, the rule's sign. Every control has its name for screen
  readers and as a tip.
  - A tip is the control's name and nothing more, two or three words
    ("Two-sided", "Cut", "Prove apart"). The author found a tip that
    explained its control in a sentence far too wordy.
- **The guide brings the words back**: captions stand beside the goals,
  the next step stands above the bottom box, and the view's tools get
  their names.
- **The rule popover shows signs alone, guide on or off.** A rule's
  drawing, premises over a conclusion, appears while the pointer or the
  keyboard is on that rule, in a small card over the popover (the
  author). No name and no sentence: both were drawn and the author found
  them too wordy. A rule that does not apply has its reason in the same
  card, under its drawing. The card shows with the guide on or off (the
  author), so the guide does not change the popover.
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
    linear logic, drawn in D6 as a turnstile with a dot on each side,
    in the tools' own stroke, the dots level with the turnstile's bar;
    it was the text `Γ⊢Δ` and then `·⊢·` before, at the author's word).
  - Such a switch has the same box as the other tools, 36 by 34 pixels,
    its sign centred, and is pressed when on. The first boards stacked
    the sign over a small sliding track, which sat badly in the column
    (the author). With the guide on it is a track beside its name.
- **"+ view" lists what the toggles do not reach** (the author): under
  "Prove" the tableau and resolution, then the truth table, the
  translations and what is read off a proof. The sequent calculus and
  natural deduction are not in it; the toggles open them.
- **A rule's name beside its line is 19 pixels**, against 23 for the
  sequents (the author found 15 too small).
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

Enter in the bottom box of a sequent that already has steps does nothing
to the proof (the author). It shows a small dark button over the enter
button, "Reset?". A press on it takes every step back, and Redo brings
them again; any other press takes the button away. D2 and D6 play it. A
new sequent is started with "+".

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

The author has gone through D2 and found these done: closing a goal by
`ax`, undo and redo, the list of steps, the hint, "Close all" with the
search's steps marked, and the change of logic.

D2 plays the first rows and the search's part of group 3, on three
sequents: `p → q, q → r ⊢ p → r`; `p ⊢ q ∨ p`, whose disjunction has two
rules in LJ; and Peirce's law, `⊢ ((p → q) → p) → p`. Its prover is a
script of the board's own for `→`, `∧`, `∨` and `ax`, not deduxit.

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Apply a rule to a formula | Press the formula, choose in the popover | The same; the popover shows the rule's sign alone, a press applies it | Settled (D2) |
| Choose among several rules | The popover lists them; the keys 1 to 9 pick | The popover holds one button per rule, side by side, the ones that do not apply greyed among them; each shows its drawing on hover | Settled (D2); the keys not drawn |
| See the rule explained | A hint on every rule label: name, schema and a sentence | A card over the popover draws the rule, premises over conclusion, while the pointer or the keyboard is on it; no name, no sentence (the author) | Settled (D2; D4 draws the card); a touch screen has no hover, and the drawing's label in the derivation is not drawn |
| Learn that a rule does not apply | The rule is offered; applying it leaves a note at the goal, with "Other rules" | The rule is greyed in the popover and cannot be pressed; its hover card says why under its drawing (the author). On a touch screen, which has no hover, a press on the greyed rule shows the reason as a note over the goal | Settled (D2); the touch part is my addition |
| See which goals are open | The goal bar, "Open goal 1 of 2" | A dashed lapis line over each open goal; the number of open goals, small, on the view's cell in the rail, "9+" past nine; a check on the sequent once none is open | Settled (every board) |
| Go to another open goal | The keys `[` and `]`, or a press | A press on any formula of it | Settled (D2); the keys not drawn |
| Undo, redo | The bottom band | The view's tools, greyed when there is nothing to undo or redo | Settled (D2) |
| Go back to an earlier step | "Steps", a list | "Steps" opens a list beside the tools: 0 for the start, then each step by its rule and formula; a press goes back to it and Redo goes forward again | Settled (D2) |
| Be told what to do next | The hint ladder at the goal | "Hint" points at the next press from where the visitor is, and takes nothing back: a formula to press; with a formula chosen, the rule to take in the open popover; with a split or a cut open, the formulas to move and then the button that applies it. With the guide on a line over the bottom box says it in words. Where no rule leads on, a line says so and to undo | Settled (D2, D6); a witness not drawn |
| Give a witness (`∃R`, `∀L`) | A second popover | A small box in the rule's popover | Settled (D8) |
| Split the context (linear `⊗`) | A chooser under the goal, with "Passes" and "Cannot close" | The two premises the rule would make appear over the goal, dashed, with the goal's other formulas as chips inside them. A press on a chip moves it to the other premise. A button at the line's end, the rule's sign and an enter arrow, applies the rule. Every split is legal, so the button is never greyed | Settled (D6): "lgtm" |
| Cut (linear) | "Cut" beside the goal, then a chooser | "Cut" among a linear view's tools opens a small box over the goal for the cut formula. Once it reads, the two premises appear as for a split and are filled the same way; a text that is no formula is said under the box | Settled (D6): "looks fine" |
| Prove a goal apart | "Open this goal in a new tab" | Press the goal's `⊢`, then "Prove apart": the goal opens as a sequent of its own at the top, in the same calculus. Its hover says which sequent's goal it is | Settled (D2, D6) |
| Close a goal by a proof made apart | "Fill from" a finished tab | Press the goal's `⊢`: once a sequent with the goal's formulas is proved in the same calculus, a third action uses its proof. The steps it brings are grey in the drawing and marked "apart" in the list | Settled (D2, D6) |
| Have the invertible rules applied | A switch in Settings | The same switch, in the menu | Proposed |
| Use the keyboard for all of it | The keys in the Keys list | The same keys | Proposed, not drawn |

D6 plays the split and the cut, on `A ⊗ B ⊢ B ⊗ A`, with a script of the
board's own for `⊗`, `⅋`, `ax` and cut. The split is chosen in the
premises themselves, where they will stand, so no second place on the
stage has to be read. The count of open goals stands as a small number
on the view's cell in the rail. D6's toggles (Classical, Intuitionistic,
Mix, Affine) and its two-sided switch are drawn and do nothing there.

The page forbids only what is not a legal step (the author). A legal
step that leads to a goal with no proof is the visitor's to take and to
undo: the page does not grey it and does not warn. So a split of the
context is never refused for where it leads, and the current page's
"Passes" and "Cannot close" go. The first D6 greyed a split that could
not close; the author had it removed. "Hint" and "Close all" still say
when the search finds no proof of what is left.

The hint goes on from where the visitor is (the author). The first
boards' hint threw away whatever was open, a popover or a half-chosen
split, and rang the formula again. Now it reads the state:

- Nothing chosen: it rings a formula.
- A formula chosen, its popover open: it rings the rule to take, and the
  popover stays. If no rule of that formula leads to a proof, it rings
  another formula.
- A split or a cut open: it rings the formulas to move to the other
  premise, and once they stand right, the button that applies it. The
  premises are not filled for the visitor (the author: ring them). If no
  split leads to a proof,
  a line says so and the split stays open.
- A cut whose formula is not typed yet: a line says that the search does
  not use the cut.

The same holds for every rule that asks for something before it applies,
so for a witness too: the hint would point at the box and name a term.

A goal has actions of its own, and they sit behind its `⊢` (my
proposal; the author: "make it a click on the turnstile"; on D2 and D6). The formulas of a goal are pressed for their rules;
the sign between them stands for the goal as a whole. A press on it opens
a popover like a formula's, with a drawing per action and, with the
guide on, its name: close this goal by the search, prove it apart, and,
when a proof made apart fits, use that proof. This gives a place to three
things the current page puts beside the goal as words ("Close", "Open in
a new tab", "Fill from"). The cut stays among a linear view's tools,
where the author found it fine.

A rule that does not apply is never offered as if it did (the author):
it stands greyed in the popover with its reason on hover. A refusal after
the fact is left for what the page cannot know before trying: a witness
that breaks the eigenvariable condition, a typed term or cut formula that
does not parse. Those are said in the popover where the typing happened,
as D8 notes for a witness.

For this the page must know, for a formula, every rule of the calculus
that could act on it and for each whether it applies and why not. The
session that plans deduxit checked the library's code for 0.8.0:

- No call lists the rules that do not apply, with reasons, in any suite.
- Linear logic's list goes by the formula's connective and the mode
  alone. It offers too much: `ax` without its dual in the goal, `1` in a
  goal that holds more, `!` in a context that is not all `?`. Only
  applying decides.
- Ordinary logic's list (LK, LJ, LM, first order) leaves out what the
  logic refuses and offers `ax` only where its partner stands. It offers
  too little: a rule left out comes with no reason.
- Natural deduction's list tries every rule on a copy of the session. It
  computes each refusal with its reason and then drops it.
- Trying each rule from the page works and changes nothing, since deduxit
  keeps nothing between calls. It costs one full call per rule (the
  session read and replayed, the step applied, the view built), not
  measured, growing with the proof and waiting behind a running search.
  The invertible rules must be off for such a trial.
- A refusal names its reason well enough to word it (`no_dual`,
  `not_alone`, `not_quest`, `no_partner`, `succedents`, `logic` and
  others, with their fields). Three kinds carry an English sentence the
  page can show but not reword: `binding`, `witness`, and natural
  deduction's `step_refused`.
- What can never be known before the visitor gives something: a split of
  the context (linear `⊗` and Mix, ordinary rules of two premises), a
  witness, a cut formula, and the values a natural deduction rule asks
  for. Everything else can be greyed.

Its recommendation, which I share: one call of the library per formula
that returns every candidate rule as "applies", "needs a split, a witness
or values", or "refused" with the refusal. The first two exist and the
third is computed and dropped in natural deduction. That is a wish for
deduxit. The author decided for it and had me ask that session to put
it into deduxit's future plans (2026-11-25). Until the call exists the
page can try each rule itself when a popover opens.

D2 also plays the rule for a change of logic. On the first sequent a
proof in LK replays in LJ step for step, so "Intuitionistic" renames the
view and keeps the proof. On Peirce's law the LK proof's fourth step does
not hold in LJ, so LJ opens as a view of its own beside LK, a line over
the bottom box says why, and LK keeps its proof.

### 3. Let the search help

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Close the goal worked on | "Close" beside the goal | Press the goal's `⊢`, then the check: the search closes that goal alone, or a line says it found no proof | Settled (D2, D6) |
| Close every goal | "Close all" in the bottom band | The view's tools; the search's steps carry a grey rule name in the drawing and "search" in the list of steps. What it cannot close stays open, and a line over the bottom box says so | Settled (D2) |
| Stop a search | "Stop the search" in the tool's place | "Close all" turns into "Stop" while the search runs; a line says that nothing was changed | Settled (D2, D6) |
| Get a hint, a little at a time | "Hint", three rungs at the goal | "Hint" among the tools goes on from where the visitor is: a formula, then its rule, then what a split or a cut still needs (see group 2) | Settled (D2, D6) |
| Read a verdict and its reason | A note at the goal and the tab's status | A check or a cross on the sequent and on the view's cell; a line over the bottom box for what a search found: no proof, or unknown | Settled (D2, D6, D9) |
| Search longer after "Unknown" | "Try N units" in the note | The line that says "Unknown" has "Search longer", with the doubled budget in brackets, and a caret that opens the settings of that one search (engine, budget) | Settled (D2, D6): "lgtm" |
| Go back to where a proof still exists | "Go back" beside the verdict | A goal the search shows to have no proof is marked by a red cross at the end of its dashed line, which turns red, and no words (the author). A sequent with no proof has the cross beside it at the top. The goal's `⊢` then offers "Go back", which takes back the steps since every open goal had a proof. The marking is a setting, on at first | Settled (D2, D6) |
| See a countermodel | A figure under the note | A view of its own, `⊭` | Settled (D9) |
| Change the model and check it again | The model editor in the drawing's place | In the countermodel's own view (my recommendation, the author agreed): a press on a dot flips where a predicate holds, "+" adds an element, "−" takes one away. The sequent's checks and crosses follow at once, and the sign between its sides reads `⊭` while the structure refutes the sequent and `⊨` when it no longer does. Undo and Redo are the view's tools | Settled (D9) |
| See or choose the engine | A chip by the note; Settings | For one search: the caret beside each button that searches. As a default: the Settings page, "Search", per logic | Settled (D2, D6, D10) |

The mark on a goal with no proof needs the page to ask the search about
every open goal after each step. On the boards that costs nothing. On the
page each question is a search within the budget, so the mark may come a
moment late, and a goal the budget does not decide gets no mark. The mark
forbids nothing: the step that led there was legal.

The two playable proof boards, D2 for ordinary logic and D6 for linear
logic, do the same things: a budget for the search, "Unknown" with
"Search longer", "Stop", settings for one search, the red cross on a goal
with no proof, and "Go back". On D6 the cross shows after a split of the
context that cannot close: the step was legal, and the mark says where
it led. The boards' budgets are small on purpose (4 steps on D2, 2 on D6)
so that "Unknown" can be met. That is for showing only (the author): the
page uses deduxit's normal budget and bounds as its defaults.

### 4. Choose the calculus

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Change the logic or the proof method | The Logic popover, with a restart warning | The toggles at the stage's top left; the proof stays or a view opens | Settled (D2, D6, D7) |
| Draw weakenings and contractions | A switch in the popover | A switch among the view's tools | Settled (D2) |
| Draw a classical linear proof two-sided | A switch in the popover | A switch among the view's tools | Settled (D6) |
| Prove in natural deduction, backwards or forwards | Its own panel: goals, numbered lines, two step lists | Press the goal for a rule that works backwards (`→I`, `∧I`, `hyp`); press a line in force for a rule that works forwards (`→E`, `∧E`). A rule that does not apply is greyed, with its reason on hover. "Natural" draws Gentzen's tree and "Fitch" the numbered lines: two drawings of one proof | Settled (D7): "lgtm" |
| A natural deduction goal's own actions | Beside the goal, as words | A small `?` stands where the goal's rule will be named: at the end of its dashed line in the tree, in the number's place in Fitch's lines. A press opens the same actions as `⊢` does in a sequent calculus. On a goal with no proof the `?` is a red cross | Settled (D7) |
| Decide a modal sequent | A button in the popover, then a panel | A symbol on the new tab view. The sequent is decided on Enter and again when the system changes. A countermodel is a view of its own, `⊭`, changed by pressing. Where the toggles are stand the system's name and five conditions on what a world sees; the conditions make the system, and a press on the name opens the list of the fifteen | Settled (D11): the author took my recommendation |
| Prove a valid modal sequent step by step | "Prove it step by step" under the verdict | "Prove step by step" among the tools of a valid sequent makes a view in the labelled calculus | Proposed (D11, the open goal alone) |
| Check or find a lambda-term | A button in the popover, then a panel | A symbol on the new tab view. One toggle says how often a variable may be used: "Unrestricted", "Linear", "Affine". The box takes a term, which is checked and drawn with its typing derivation, or a type, for which a term is found. "List its terms" among the tools | Settled (D12) |
| Work with untyped lambda-terms | Not there, and not in deduxit | A second toggle, "Typed" or "Untyped". An untyped term is reduced step by step, the part reduced next in lapis, with "Next step" and "To the end" as for cut elimination; a line says which simple type it would have, or that none fits | Settled as a drawing (D12); needs deduxit, asked for |
| Prove in rules of one's own | A button in the popover, then a panel | Left out, at least for now (the author) | Left out |

### 5. Look at a sequent in another way

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| See what else can be done with a sequent | Spread over tabs of the stage, the popover and four sheets | "+ view", one list | Settled (D3) |
| See a linear proof's net | The stage's Net tab | A view in one capsule with its proof | Settled (D6) |
| Truth table | A tab of the stage | A view from "+ view": the table, a red cross at each row that refutes the sequent | Proposed (D13) |
| Tableau | A tab of the stage | A view from "+ view" with a toggle, "Search" or "By hand" | Settled (D13) |
| Resolution | A sheet: Search, DPLL, By hand | A view from "+ view" with a toggle, "Search", "DPLL" or "By hand": the clauses as numbered lines, each new one with the two it came from. DPLL lists what it does line by line, indented under each atom it tries | Settled (D13) |
| Translate into another logic and prove it there | A sheet, then "Prove it in" on a new tab | A view from "+ view": the translated sequent and one button, "Prove it in LJ", which opens it as a sequent at the top. A double-negation translation is marked `¬¬` with its letters under it, Gl, Ku, GG or Ko (the author). "Prove it in" is a small outlined button at the sequent's end, the sign of "Prove apart" alone, with its words while the guide is on; the first draft's dark button under the sequent was too loud (the author) | Settled (D13, D3) |
| Interpolant | A sheet | A view from "+ view": each formula carries the number of its part and a press moves it to the other part; the interpolant and its two sequents follow | Proposed (D13) |
| Normal form | A sheet | A view from "+ view" with a toggle of five kinds: NNF, CNF, DNF, Tseitin, Plaisted–Greenbaum. It shows the steps as numbered lines, each with the law that gave it, and opens at the last; Undo steps back, "Next step" and "To the end" go forward | Settled (D13) |
| Eliminate a proof's cuts | A cluster on the stage, on the tree and on the net | A view made from the proof, "CE". "Next step" and "To the end" among its tools, Undo steps back, "Steps" lists the cases; the cut worked on next is drawn in lapis | Proposed (D14) |
| Read a finished proof as a lambda-term | The last item of Export | A view made from the proof, `λ`, with "Copy as text" | Proposed (D14) |
| Check a tableau written by hand | A button in the popover, then a text to type | "By hand" in the tableau view: a press on a line expands it, a branch closes by itself. Typing a tableau as text goes (the author) | Settled (D13) |
| Check a model of one's own | A button in the popover | A view from "+ view", "M": a press on an atom makes it true or false | Proposed (D13) |
| Work on a copy of a proof | "Duplicate this proof" | "+ view", "A copy of this proof" | Proposed (D13, D14) |
| See how the views depend on each other | The Workspace panel and its graph | The rail: a short line joins a view to the one above it that it was made from | Proposed (D13, D14) |
| See a sequent's views as a graph | "Show as graph" in the Workspace panel, from three rows | A view of the group, its cell the first in the rail and lower than a view's: the sequent and its views run downwards in the rail's order, each hanging by a rounded arrow from what it was made from. A press on a node opens the view; a view out of date is dashed, and "Update all" is among the tools | Drawn as the author asked (D19) |
| Go to a sequent's main view, or to its graph | Not there | A press on the sequent at the top opens its main view. A press on it while the main view shows opens the graph (the author) | Drawn as the author asked (D19) |
| Go to the page's start | Not there | The word mark leads to the new tab view; with one open already, to that one. It is a plain link to the site's address | Settled (every board) |
| Read what the page is | About, in the bottom band | "About" on the new tab view, beside "Learn" and "Practice", and on the Settings page | Proposed (D1, D10) |
| Bring a view up to date after its source changed | "Update", "Start again", "Check" in the panel | The view's cell gets a dashed border and a red "!"; the view is drawn faint with one button, "Update", or "Start again" when it has steps of its own. "Check" goes as a button of its own: bringing a view up to date checks it | Proposed (D14); the author has not objected to "Check" going |

### 6. Look at the drawing

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Pan and zoom, fit to the window | Drag, pinch, the wheel, `+` `−` `F`, buttons on the stage | The same gestures and keys; the buttons in one of three places | Proposed, three options (D15a, D15b, D15c) |
| Choose the font of the formulas | Settings | The menu | Proposed |
| Light or dark | Settings | The menu; dark not drawn | Open |
| Choose how a net is drawn | Settings, "Net drawing" | A toggle where the calculus toggles are, "Formulas" or "Compact", as "Natural" and "Fitch" are two drawings of one proof | Proposed (D15) |

### 7. Keep and share

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Keep the work without doing anything | Saved in the browser | The same | Unchanged |
| Save a proof in a format (LaTeX, Typst, SVG, PNG, PDF, Rocq, JSON) | Export's menu | "Export" among the view's tools; it exports the view shown | Proposed, two options (D16a, D16b) |
| Share a link, with the proof or the sequent alone | Export's menu | The same menu or panel, under "Link" | Proposed (D16a, D16b) |
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
| Hand out a set of problems | A course pack: a link, a printed handout | "Course pack" among the tools opens a panel: the title, the sequents at the top as problems to tick, whether the search may help, then the link, the embed code and the printed sheet | Proposed (D18a) |
| Work on a pack | A bar over the stage | The pack's problems among the sequents at the top, or the pack as one entry with a page that lists them | Proposed, two options (D17a, D17b) |
| Hand answers in | A link or a file | "Hand in" among the tools: how much is done, then "Copy the link" or "Save the file". A pack that bars the search greys "Hint" and "Close all" | Proposed (D17a, D17b) |
| Check answers handed in | The check view, one hand-in at a time | The hand-in opens as an entry at the top with its check as a page; "Open" puts an answer among the sequents | Proposed, two options (D18b, D18c) |

### 10. Settings and the rest

The settings are one page for the whole site (the author), D10, reached
by the button at the top row's right end, which replaces the three dots.
What is chosen is kept in the browser, as the light or dark scheme is.

| A visitor wants to | Now | New design | State |
|---|---|---|---|
| Switch between light and dark | Settings | A button in the top row, a moon in light and a sun in dark; the Settings page also has Light, Dark and System | Settled as asked (every board) |
| Choose the font of the formulas, how nets are drawn | Settings | The Settings page, "Look" | Proposed (D10) |
| Choose the search's engine, budget and bounds | Settings | The Settings page, "Search" | Proposed (D10) |
| Mark goals that have no proof, or not | Not there | The Settings page, "Proving", on at first | Proposed (D10) |
| Have the invertible rules applied | Settings | The Settings page, "Proving" | Proposed (D10) |
| Close every sequent | "Discard" on the restore bar | The Settings page, "This browser"; it can be undone | Proposed (D10, the button alone) |
| See every key; read what the page is, its licences, privacy | Keys, About, the privacy page | The Settings page, "About", as three rows that open them | Proposed (D10, the rows alone) |
| Use the page offline, install it | The service worker | The same | Unchanged |

### The boards for groups 4 to 9

All of them respond, and each stands in the canvas's second row. Where I
saw more than one good way, each way is a board of its own (the author:
implement all of them, and compare when we get there).

- **D7**, natural deduction, on `p → q, q → r ⊢ p → r`, `p ∧ q ⊢ q ∧ p`
  and `p → q ⊢ q → p`, which has no proof. In the tree an open goal shows
  its lines in force as small buttons over its dashed line. It has what
  D2 and D6 have (the author: add it if reasonable): a budget for the
  search with "Unknown" and "Search longer", "Stop", settings for one
  search, the red cross on a goal with no proof, and a goal's actions
  behind its `?`: close by search, prove apart, use a proof made apart.
  "Go back" is left out: in natural deduction no legal step turns a goal
  with a proof into one without, so there is nowhere to go back to.
- **D11**, modal logic. The box reads a sequent with `[]` and `<>`. The
  first drafts were two boards, the system from a list (a) or from five
  conditions (b: serial, reflexive, symmetric, transitive, euclidean);
  the author chose my recommendation, the conditions with the list
  behind the system's name. A condition that follows from the others
  shows as on. In the countermodel a press on an atom changes where it
  holds; a press on a world's name and then on a world adds or takes
  away an arrow. A model that breaks the system's conditions gets a line
  that says which, and the missing arrow dashed in red.
- **D12**, lambda-terms on two axes. deduxit's three calculi are all
  typed, each λ naming its variable's type, and differ in how often a
  variable may be used (the author saw that "Simply typed", the current
  page's name for one of them, fits all three). So that toggle now reads
  "Unrestricted", "Linear", "Affine". "Untyped" is a second axis the
  author asked about. deduxit has no untyped terms; the session that
  plans deduxit was asked to put them into its future plans
  (2026-11-25). The board reduces untyped terms with a script of its
  own, leftmost outermost, up to 24 steps. The author added that System
  F may be worth having too. It would be a third value of the same
  toggle; that session has it as a possibility.

The author went through this group on 2026-11-25 and found it fine.
- **D13**, the other views of a sequent, each computed for the sequent in
  the box.
- **D14**, views made from a proof: cut elimination, the λ-term and a
  copy. Undo in the proof marks the views made from it; "Close all" then
  finds a proof without a cut, and "Update" brings each view up to date.
- **D19**, the graph of a sequent's views (the author asked for it), on
  D14's proof with its three views. Two first drafts ran from left to
  right and differed in the way in: a cell of the rail, or a press on
  the sequent at the top. The author asked for one drawing that runs
  downwards like the rail, rounder arrows, a smaller cell, and for the
  press on the sequent to lead to the main view first and to the graph
  from there. D19 has both ways in.
  The graph is now on every newer board whose sequent has two views or
  more (the author missed it on D13): D11, D13, D14, D15 and D19. On D13
  a sequent made from a translation hangs under that translation, shaped
  like the entries at the top, and a press opens it. A graph of more
  than six views draws its nodes lower and closer. D2, D6 and D7, built
  before the shared frame, have it too (the author: add it). There the
  views that are only drawn, D2's two translations and D7's proof in LK,
  stand in the graph as nodes that do nothing on a press. D9 has it as
  well, so every board that responds and has two views or more has the
  graph. D3, D4 and D8, which are drawings, do not.
- **D15a, D15b and D15c**, a net moved and zoomed. The zoom's buttons
  stand at the stage's lower right (a), among the view's tools (b), or
  nowhere until the drawing has left its fitted place, when one button
  shows the zoom and fits it again (c). Dragging and the wheel work
  on all three.
- **D16a and D16b**, export. A menu whose every entry saves or copies at
  once (a), or a panel that shows what a format writes before it is
  copied or saved, with "Whole document" for LaTeX and Typst (b).
- **D17a and D17b**, a course pack for the student. Its problems stand
  among the sequents at the top after a label (a), or the pack is one
  entry at the top with a page that lists the problems and their state
  (b).
- **D18a, D18b and D18c**, the teacher's side: a pack made (a), one
  hand-in checked as a list (b), a class's hand-ins checked in one table,
  a row per hand-in and a column per problem (c). The current page checks
  one hand-in at a time; the table is my addition.

The toggles are smaller since 2026-11-25 (the author found them too big):
a toggle's box is 30 pixels high where it was 38, its type 14 pixels where
it was 16, on every board.

A proof view looks the same on every board (the author found D13's
without the controls of ordinary logic, and asked that all boards be
complete). On D13, D14, D16, D18 and D19 a proof in ordinary logic now
has the two toggles at the top left and, among its tools, "Steps",
"Hint", "Close all" with its caret and the switch for weakenings and
contractions. D15 and the linear sequent a translation opens on D13 have
the linear toggles, "Cut" and the two-sided switch. On D17 the toggles
stand in their state and cannot be changed, with the reason on hover: a
pack sets a problem's calculus.

These controls are complete as a drawing, not as a prover. On these
boards the toggles' other options lead to the boards that play them, D2
for a change of logic and D7 for natural deduction; "Steps", "Hint" and
the switches do nothing; a formula cannot be pressed for its rules.
Proving by hand is played on D2, D6 and D7.

What these boards compute themselves, with scripts of their own and not
deduxit: D11 decides by looking for a model of up to three worlds, so a
sequent that needs four is called valid there; D12 checks terms with `→`
alone and finds terms up to a depth; D13 reads `¬`, `∧`, `∨` and `→` with
up to four atoms. D14, D17 and D18 show proofs written out by hand. The
texts D16 writes (LaTeX, Typst, the session, Rocq, the links) are examples
of their kind.

Every board that responds is now pressed at random by a script, which
checks in each state it reaches that the drawing gets every value it asks
for. The first run found a fault on D2, D6 and D7: after Undo and then a
step back in "Steps", Redo brought the steps back in the wrong order. It
is fixed on all three.

I have looked at the boards for groups 4 to 9 as pictures, each in several
of its states. The pictures come from a script of mine that fills a
board's drawing with its values and from the project's headless browser,
not from the canvas, which asks my browser to sign in. What the pictures
showed and I changed: in a wide derivation a rule's name ran into the
next premise's line, so sibling premises now keep clear of it; D16b's
panel and D18a's panel covered the derivation, which now moves aside
while they are open; D11's model stood far under its sequent. The label
`¬¬` is not readable at the size of a rail cell or of the list of views,
so D13 marks the four translations by letters, Gl, Ku, GG and Ko. D3's
list still shows `¬¬`.

Once the author had signed in, I played all fifteen new boards in the
canvas itself. They draw there as in my pictures, and every control I
pressed did what it should: on D11 the list of systems and the five
conditions, a sequent typed and entered, the changes to the countermodel
and "Prove step by step"; on D12 the three calculi and a type typed in;
on D13 the list of views, a view added and the tableau by hand; on D14
cut elimination to its end, then the proof changed and the view marked
with "Start again"; on D15 the wheel, a drag and the three sets of zoom
buttons; on D16 the menu and the panel with "Whole document" and "Copy";
on D17 a goal finished and "Hand in" in both forms; on D18 the pack's
title typed, problems ticked, and answers opened from the list and from
the table.

Two things the canvas showed and I changed. A derivation wider than the
stage, as D12 draws for a long type, ran off the page; it now scrolls
sideways in its own box. D11's goal for a proof step by step now reads as
a labelled sequent, `w0 : □p ⊢ w0 : □□p`.

Not changed: the canvas played the boards 800 pixels wide, and at that
width D15a's zoom buttons lie over the bottom box and the panels of D16b
and D18a push the derivation off the stage. The boards are laid out for
1280 pixels; a narrow window is still to be designed, with the phone's
width. D18a's pack code stays the same when the pack changes; on the page
it would follow the pack.

### What goes

- The restart warning on a change of logic (the proof stays or a view
  opens).
- The Workspace panel as a place of its own (the sequents across the top
  and the rail show the same links). Its graph stays, as a view of each
  group (D19).
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

## Light and dark

Every board has both schemes and a switch in its top row (the author).
Each colour is a token with two values:

| Token | Light | Dark |
| --- | --- | --- |
| paper | `#FFFFFF` | `#14171F` |
| band | `#F2F3F5` | `#1C2029` |
| ink | `#151821` | `#ECEEF3` |
| ink, second | `#4A5163` | `#A5ACBC` |
| ink, soft | `#5A6172` | `#969DAE` |
| ink, faint (greyed) | `#8A90A0` | `#7B8394` |
| line | `#B9BECA` | `#474E60` |
| hairline | `#D5D8DF` | `#333949` |
| lapis (chosen, open goal) | `#2456C9` | `#7AA7FF` |
| lapis, deep | `#173E96` | `#A9C6FF` |
| lapis wash | `#E8EEFB` | `#1E2C4D` |
| good | `#0A6B4F` | `#6FCBA4` |
| bad | `#B3261E` | `#FF8F85` |
| the field's dots | `#A9B2C8` | `#39404F` |
| hover | `#E2E5EA` | `#2A2F3B` |

Text on lapis or on ink is the paper's colour in both schemes: white on
dark lapis in light, near-black on light lapis in dark. The author found
the colours fine, close to the current page's.

The switch fades (the author: "very smooth"): every token is a registered
colour that takes half a second to change, so all that uses it, the
dotted field and the drawings too, fades together. No fade where the
visitor asks for reduced motion. It is on every board.

A search has settings of its own (the author). Each button that searches
has a small caret beside it: "Close all" among the tools, "Close by
search" behind a goal's `⊢`, and "Search longer" on an "Unknown" line.
The caret opens a panel with the engine and the budget for that one
search, prefilled from the settings of the proof's logic. What is set
there changes that search alone, so each goal can be searched with
another engine. The Settings page keeps the defaults per logic
(Ordinary, Linear, Modal), each with its own engines; "Defaults" in the
panel leads there. D2 and D6 play the panel, each with its logic's
engines, and D10 the defaults. A board
keeps the scheme for itself where the canvas gives it no storage;
elsewhere the boards share it, as the page's tabs would.

## What the drawings do not show yet

- The boards draw a derivation themselves, as text in Euler Math. The
  page takes deduxit's own drawing, as the current page does, in the math
  font chosen in Settings, and lays its buttons over the formulas and the
  rule names. So the sizes and spacing within a derivation, the rule
  names' size among them, are the library's; the boards' 23 and 19 pixels
  only stand in for them. What the new design puts on top of the drawing
  is the page's: the dashed line over an open goal, the button on `⊢`,
  the popovers and their cards, and the premises shown while a split or a
  cut is chosen. For those premises the page can apply the step to a copy
  of the proof and take the library's drawing of it, since deduxit keeps
  nothing between calls. If the library's proportions should change, that
  is a setting of its drawing and so a wish for deduxit.
- The word mark in every board's header is the logo's own drawing
  (`src/logo/wordmark-band.svg`, 28 pixels high, its letters in the
  boards' ink). The first drafts set the word in Gentium with two drawn
  lines, which was not the mark (the author).
- The translations written out (the linear one above all) are examples,
  not deduxit's output. So is every text D16 exports.
- A self-loop in D11's countermodel is a plain ring with no arrow head.
- D15 first wrote a dual as `A⊥` on one line (the author asked why). That
  was the board's shortcut for text. The sign is now raised and smaller,
  as deduxit's own drawing sets it and as D6 already did.
- The keys in B (`1`, `h`, `c`, `u`, `/`) are a proposal.
- A phone's width.
