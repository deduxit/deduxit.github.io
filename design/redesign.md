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
- The bottom box is the one place for the sequent and the proof's actions
  (undo, redo, hint, close goal). Export, import, settings and the list of
  steps move to one menu.
- An open goal carries a dashed line where its rule will go. A solid line
  is an inference made.
- Lessons and Practice start from the "Choose a logic" view and from the
  guide, per logic.
- The guide puts each explanation beside the thing it explains: a caption
  at a goal, the rule's schema and one sentence in the rule popover, the
  next step above the bottom box, words on every button.
- The switch is labelled "Guide". "HUD" is a word from games that a
  newcomer to logic may not know.

## Three directions

Each lays the groups and views out differently and has a look of its own.
The first is drawn as a whole flow, the others as one screen in the same
state, so that they compare.

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
  net). A small sign above the name says how the view's sequent was made:
  `¬¬` a negative translation, `!` the linear one. Views that depend on
  each other share a capsule (the net with its linear proof). A ring marks
  open goals.
- **The page without the guide has almost no words**: the sequents, the
  calculus names, the rule's sign. Every control has its name for screen
  readers and as a tip.
- **The guide brings the words back**: the rail widens to 228 pixels with
  each view's name and state, the rule popover gains the rule's name,
  schema and one sentence, captions stand beside the goals, the bottom
  box's buttons get their names, and Lessons, Practice and the tour are at
  the rail's foot.
- **The search closes a goal from the goal itself**: a round button at the
  end of the open goal's dashed line, where the rule's name will stand.
- **The new tab view** has no heading and no descriptions: five symbols,
  each over a line with the logic's name, then "Open a file" and "Restore
  3 proofs". Three symbol sets are drawn to choose from: signs, small
  formulas, figures. D1 uses the figures.
- Radii: 8 to 10 for a control, 12 for a rail cell, 14 to 16 for the
  popover and the bottom box, 18 for a logic's button.

Open with the author: which symbol set; whether "?" reads as the guide's
switch; whether the search's button belongs at the goal.

## What the drawings do not show yet

- The formulas are set in a stand-in font. The page draws them with
  deduxit, in the math font chosen in Settings.
- The translations written out (the linear one above all) are examples,
  not deduxit's output.
- The keys in B (`1`, `h`, `c`, `u`, `/`) are a proposal.
- Dark for A and C, light for B, a phone's width, and the first-order
  features (witnesses, countermodels).
