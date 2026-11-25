# The redesign of deduxit's page: design guide

This guide says what the redesigned page is, where every function goes
and how each part looks and behaves, in enough detail to build it. It is
the agreed design. How it was arrived at, with the drafts that were
dropped, is in [redesign-notes.md](redesign-notes.md).

The design is drawn on 28 boards on one canvas,
https://claude.ai/artifact/ALuD29h2Z6tiLhThP1ahFM. Most boards respond:
they can be played, and what they show follows what is pressed.

| Board | Shows |
|---|---|
| D1 New | The new tab view: four logics, a box for a sequent, files, About |
| D2 Proof | A proof by hand in LK: rules, hints, the search, steps, the goal's menu |
| D3 Views | The list behind "+ view" (a drawing) |
| D4 Guide | The page with the guide on (a drawing) |
| D6 Linear | A linear proof: split, cut, Mix, Affine, the net |
| D7 Natural | Natural deduction, as a tree or as Fitch's lines |
| D8 Witness | First-order logic: typing a witness (a drawing) |
| D9 Model | A first-order countermodel |
| D10 Settings | The Settings page |
| D11 Modal | Modal logic: the system, the verdict, the countermodel |
| D12 Lambda | Lambda-terms, typed and untyped |
| D13 Ways | Every other view of a sequent: table, tableau, resolution, normal form, interpolant, model, translations |
| D14 Made | Views made from a proof: cut elimination, the lambda-term, a copy |
| D15 Drawing | Pan, zoom, fit, and how a net is drawn |
| D16 Export | The Export panel |
| D17 Pack | A course pack as a student meets it |
| D18 Teach | A course pack being made, in the Export panel |
| D19 Graph | The graph of a sequent's views |
| N1 to N8 | Eight of the boards above in a phone's window, 390 by 844 pixels |
| N9 | A proof in a phone held sideways, 844 by 390 |
| N10 | Export in a small tablet's window, 700 by 900 |

The boards were written by generators that are not part of this
repository. A copy of the generators, the boards and the three reports
this guide cites (the design review, the research on window sizes and on
keys) is in the sessions' shared notes folder, under `web-redesign/`.

Where a board and this guide disagree, the guide holds. The sizes inside
a derivation (formulas, rule names, the gaps between them) are deduxit's
own drawing and are not set here: the boards draw derivations by hand as
stand-ins.

## Who the page is for

- **Experts**, who try things out for their own research. They get done
  what they came for without distraction. Their page is the default.
- **Newcomers**, who may be solving logic homework. They turn on the
  guide, which names every control and says in one sentence what to do
  next.

## Principles

1. **One sequent, many views.** Everything the page can do with a
   sequent is a view of it: a proof in some calculus, a table, a
   tableau, a translation, a net, a model. All are reached the same way,
   by "+ view".
2. **Sequents across, views down.** The open sequents stand in the top
   row. The views of the chosen sequent stand in a rail at the left.
3. **The stage belongs to the derivation.** Controls sit at its edges.
   Nothing covers the drawing unless the visitor opened it.
4. **No words where a sign is known.** A control is a sign or a short
   name. Its full name is its hover and its accessible name. The guide
   adds the words for those who want them.
5. **One size for one kind of control**, on every page.
6. **Nothing is sent anywhere.** Proofs, settings and course packs stay
   in the browser, in a link or in a file.

## The frame

The frame is the same on every view. Sizes are CSS pixels at the
expanded width (840 pixels and wider); "Window sizes" below says what
changes in a narrower window.

| Region | Place | Size | Holds |
|---|---|---|---|
| Top row | Top, full width | 48 high; padding 16 left, 10 right; gap 12 | The word mark; one chip per open sequent; "+"; at the right the guide's "?", light or dark, Settings |
| Rail | Left, under the top row | 60 wide; cells 44 by 44, 6 apart, 10 from the top | The graph cell (44 by 30) once a sequent has two views; one cell per view; "+ view" |
| Stage | The rest | Dotted field, dots 20 apart | The derivation, centred; it pans and zooms |
| Toggles | Stage, top left, 10 from both edges | Boxes 30 high, 6 apart | The calculus of the view shown |
| Tools | Stage, top right, 10 from both edges | A column 46 wide of tools 36 by 34 | Undo, Redo, Steps; Hint, Close all and its caret; the view's switches; Export, Import |
| Zoom | Stage, lower right | One box 30 high | Zoom out, the zoom's number, zoom in, fit |
| Bottom box | Stage, bottom centre, 24 from the edge | 54 high; as wide as the stage less 48, at most 560 | The sequent as text, and Enter |
| Notes | Right above the bottom box, 8 apart | Up to the box's width | A verdict, a notice, and with the guide on one sentence of help |
| Panels | Stage, top, left of the tools | See "Panels" | Steps, the search's settings, Export |

The top row and the rail have the band colour and a hairline towards the
stage. The right edge of the top row's last button and of the tools is
the same, 10 from the window's edge.

The Settings page and the new tab view keep the top row. Settings has no
rail, no stage and no bottom box: it is one column of rows, at most 640
wide, centred. The new tab view keeps the rail (empty but for "+") and
the bottom box.

## The scale

Every size, colour and font is a token. The names below are the boards';
the page's `tokens.css` has its own names, and each value here maps to
one token there.

### Colours

| Token | Light | Dark | Used for |
|---|---|---|---|
| paper | `#FFFFFF` | `#14171F` | The page, boxes, fields |
| band | `#F2F3F5` | `#1C2029` | The top row, the rail, code blocks |
| ink | `#151821` | `#ECEEF3` | Text, the bottom box's edge, a popover's edge |
| ink2 | `#4A5163` | `#A5ACBC` | Second-rank text: labels, an option not chosen |
| soft | `#5A6172` | `#969DAE` | Third-rank text |
| faint | `#8A90A0` | `#7B8394` | Inactive controls only, and a switch that is off |
| edge | `#7E8494` | `#8891A3` | The edge of a text field and a list |
| line | `#B9BECA` | `#474E60` | The edge of a toggle's box, the tools, a panel |
| hair | `#D5D8DF` | `#333949` | Hairlines between rows and regions |
| lapis | `#2456C9` | `#7AA7FF` | What is chosen; an open goal; the focus ring; links |
| deep | `#173E96` | `#A9C6FF` | A link under the pointer |
| wash | `#E8EEFB` | `#1E2C4D` | The ground of what is chosen |
| good | `#0A6B4F` | `#6FCBA4` | Proved, valid, holds |
| bad | `#B3261E` | `#FF8F85` | No proof, not valid, fails |
| dot | `#A9B2C8` | `#39404F` | The stage's dots |
| over | `#E2E5EA` | `#2A2F3B` | A control under the pointer |

Rules:
- Text is ink, ink2 or soft. Each has at least 4.5:1 on paper, band,
  wash and over in both schemes (measured; the lowest is soft on over,
  4.9:1).
- faint is 3.2:1 on paper in light. It is for inactive controls, which
  need no contrast, and never for text that says something.
- A field's edge is edge, which is at least 3:1 on paper and band
  (WCAG 2.2, 1.4.11). line is 1.9:1 and is used only where the box is
  not what tells the control: a toggle's box (the chosen cell has its
  own edge, ground and weight) and the tools (their signs tell them).
- On lapis the text is paper, in both schemes (6.5:1 and 7.5:1). White
  on the dark scheme's lapis would be 2.4:1.
- A state is never told by colour alone. Chosen is an edge, a ground and
  a heavier weight. Proved, refuted and open are a check, a cross and a
  dashed line. A false value is written with its negation sign.
- The mark's lapis in the logo is the project's identity and stays as
  the repository has it.

### Type

| Family | Used for |
|---|---|
| Gentium Book Plus, 700 | The word mark; a page's headings (Settings, a pack's title, the logics' names on the new tab view) |
| Ysabeau Office, 400, 500 and 600 | All interface text |
| The math font chosen in Settings (Euler Math at first), 400 only | Every formula, wherever it stands |
| The system's monospace | What a text export writes |

Interface sizes are four: 12, 14, 15 and 16 pixels.

| Size | Used for |
|---|---|
| 16 | A rail cell's name of one or two letters; text in a field on a touch screen |
| 15 | The body: rows, notes, buttons, tools' names with the guide on |
| 14 | A toggle's cell; a panel's labels and fields; a rail cell's longer name |
| 12 | Counts and signs on a cell, a group's heading in a list, "soon" |

Headings are 30 (a page's title) and 20 (a section, a pack's title).
Line height is 1.35 for text, 1.2 for a label of two lines, 1.05 for two
stacked signs in a cell. Weight 600 marks what is chosen and a heading
in a panel; 500 an option not chosen and a button's name; 400 the rest.
A math font is never set bold: it has no bold, and the browser would
fake one.

Right-aligned numbers (the fields of Settings, a scale's cells) use
tabular figures. A sentence of help is balanced (`text-wrap: balance`).
Running text is at most 80 characters wide.

### Spacing, corners, borders

- **Spacing** is 4, 8, 12, 16, 24, 32 or 48 pixels. Inside a control 2
  is also allowed (a toggle's box has 2 of padding, the tools are 2
  apart).
- **A nested corner** is its parent's less the border and the padding
  between them, so that both curves have one centre. The pairs in use:

  | Outside | Border | Padding | Inside |
  |---|---|---|---|
  | Tools, 15 | 1 | 4 | A tool, 10 |
  | Toggle's box, 11 | 1 | 2 | A cell, 8 |
  | Bottom box, 16 | 1 | 7 | Enter, 8 |
  | Panel, 16 | 1 | 6 | A row, 9 |
  | Capsule in the rail, 16 | 1 | 3 | A cell, 12 |

  Where nothing is nested: 8 for a field, a button and a badge, 10 for a
  chip, 12 for a rail cell and a note, 16 for a panel and a popover,
  half the height for a switch and a round button.
- **Borders** are 1 pixel. 2 pixels are for the focus ring and for the
  dashed line over an open goal. No border has a fraction of a pixel:
  1.5 is drawn as 1 on an ordinary screen and as more on a dense one.

### Controls

| Control | Size | Notes |
|---|---|---|
| Toggle | Cell 24 high, at least 30 wide, padding 8, type 14; box 30 high | The chosen cell: lapis edge, wash ground, ink text at 600. Others: ink2 at 500 |
| Switch | 28 by 16, knob 12, 2 from the edge | Off: faint. On: lapis. The knob moves in 0.15 s |
| Text field, list | 30 high, padding 9, corner 8, edge in edge, type 14 | Numbers right-aligned |
| Plain button | 30 high, padding 12, corner 8, type 15 at 500 | Primary: ink ground, paper text. Other: paper ground, 1 pixel ink edge |
| Tool, top-row button | 34 high; a tool 36 wide | No edge; over under the pointer |
| Sequent's chip | 34 high, padding 12, corner 10, between 84 and 300 wide | Its text is cut with an ellipsis |
| Rail cell | 44 by 44, corner 12 | |
| Rule's button in the popover | 40 high, at least 60 wide, type 19 in the math font | Large because it is pressed most |
| Enter | 38 by 38, corner 8, ink ground | |
| Checkbox | 18 by 18, corner 5, in a row 36 high | |

No target is under 24 by 24 pixels (WCAG 2.2, 2.5.8). The caret under
"Close all" is 36 by 24. On a touch screen every target is at least 44
by 44 (see "Window sizes").

### Icons

Icons are drawn on a grid of 18 units, with a round stroke of 1.6 and no
fill, in the text's colour. They are shown at 18 pixels, or at 16 inside
a plain button, where the stroke is 1.8 so that it stays as heavy. A
check or a cross of 14 pixels has a stroke of 2 and keeps its size
(`flex: none`) when its row is short of room.

Each entry of the Export panel has its own sign: a curve for SVG, a
framed picture for PNG, a page for PDF, TeX with its dropped E, a t for
Typst, lines for text, braces for the session, Rocq's own logo for
Rocq, a derivation, a turnstile and a box for the three links.

### Motion

- A change of scheme fades every colour in 0.5 s.
- A panel that opens moves the drawing aside in 0.2 s.
- A switch's knob moves in 0.15 s.
- With `prefers-reduced-motion: reduce` none of these is animated, and
  the stage does not glide when it fits a drawing.

## Components

### Sequent's chip

One per open sequent, in the order they were opened, in the math font.
The chosen one has a lapis edge and a wash ground. A proved sequent ends
in a green check, a refuted one in a red cross. A press shows the
sequent's main view; a press on the chosen chip switches between its
main view and the graph of its views. "+" after the last chip opens the
new tab view. Where the chips do not fit, the row scrolls sideways and
"+" stays in sight.

A course pack is one chip, with its title and its count done ("Week 3:
implication, 1/3").

### Rail cell

One per view, named by its calculus or kind in one to three letters (LK,
NJ, LL, T, TT, CE) or by a sign in the math font (λ, ⊭, a net's
diamond).

- The chosen cell has a lapis ground and paper text.
- A small number at its top right counts its open goals, "9+" past nine.
  A cross there says the view refutes the sequent.
- A view made from a translation carries the translation's sign above
  its name (¬¬ for a double-negation translation, ! for the linear one),
  12 pixels, in the math font.
- A view made from another (a net from its linear proof, a copy from its
  proof) is joined to it by a short line, or shares a capsule with it:
  one frame with a 1 pixel line edge around both cells.
- A view whose source has changed has a dashed edge and a red "!". The
  view itself is drawn faint with one button, "Update", or "Start again"
  where updating would lose steps.
- The cell's hover and accessible name say the view in full, with its
  state: "Sequent calculus, LK, 1 goal open".

"+ view", a cell with a dashed edge, opens the list of views to add,
beside the rail. The list is grouped under "Prove", "Decide",
"Translate" and "Read off". Each entry has a badge with the cell's sign
and a name. An entry the sequent does not allow is faint and says why.
An entry already there has a check.

### The graph of views

The first cell of the rail, once a sequent has two views. It draws the
views as a tree that runs downwards as the rail does: the sequent at the
top, each view under the one it was made from, joined by lines with
round elbows and an arrow head. A node has the cell's badge, the view's
name and its state in a second line. A press opens the view. A sequent
made by a translation is a node in the shape of a chip.

### Toggles

Above the stage's top left. They say which calculus the view is in and
change it.

- Ordinary logic has two: "Sequent", "Natural", "Fitch", and
  "Classical", "Intuitionistic", "Minimal".
- Linear logic has "Classical" or "Intuitionistic", and two single
  toggles, "Mix" and "Affine". A net adds "Formulas" or "Compact" for
  how it is drawn.
- Modal logic has the system's name as a button that opens the list of
  fifteen systems, and five conditions on what a world sees.
- Lambda-terms have "Typed" or "Untyped", and "Unrestricted", "Linear"
  or "Affine".

A change keeps the proof where nothing is lost. Where steps would be
lost it opens a view beside the present one, which keeps its proof. A
toggle that the view cannot take is faint and its hover says why.

### Tools

One column, in groups parted by a hairline: Undo, Redo, Steps; then
Hint, Close all, and under it a caret that opens the search's settings;
then the view's own switches (in LK "W C", whether weakenings and
contractions are drawn; in a linear proof Cut and the two-sided
drawing); then Export and Import. A view shows only the tools it has: a
table has Export and Import alone.

A tool that cannot act now is faint. With the guide on each tool shows
its name beside its sign, and the column grows to fit.

### Bottom box

A text field with a 1 pixel ink edge and Enter at its right. It holds
the chosen sequent as text and takes a new one. Signs may be typed in
ASCII (`->`, `|-`, `/\`). A text that cannot be read stays in the box,
the place of the fault is marked, and a note above says what is wrong.

### The derivation

- An inference made has a solid line with its rule's name at the right
  end.
- An open goal has a dashed lapis line, 2 pixels, where its rule will
  go. Once the search shows that a goal has no proof, the line turns red
  and ends in a cross.
- A press on a formula of an open goal opens the rule popover at the
  formula: one button per rule, side by side, the ones that do not apply
  faint among them. The pointer or the keyboard on a rule shows a card
  with the rule drawn, premises over conclusion.
- A press on a goal's turnstile opens the goal's menu: close this goal
  by the search, prove it apart as a sequent of its own, use a finished
  proof for it.
- A rule that splits the context shows both premises while the visitor
  moves formulas between them, and says whether each can still be
  closed.

### Panels

A panel opens from a tool, at the stage's top beside the tools, with a 1
pixel line edge and a corner of 16. The drawing moves aside so that the
panel does not cover it. The tool that opened it closes it, and so do
Escape and a press outside.

- **Steps** lists every step taken. A press goes back to that step.
- **The search's settings** hold the engine and the budget for this
  search, starting from Settings' values, a "Search" button, and a link
  "Defaults" to Settings.
- **Export** is 560 wide: at the left the entries under "Picture",
  "Text", "Proof" and "Link", at the right the chosen entry's settings,
  what a text format writes, and "Copy" and "Save". A picture has
  settings and no preview. The entry "Course pack" has a form in that
  place: a title, the sequents at the top as problems to tick, "Copy the
  link", "Copy the embed code" and "Print".

### Notes

A note stands above the bottom box, never on the drawing. A verdict
starts with its keyword in weight 600 ("Proved.", "No proof."). A notice
of something done ("LaTeX copied.") has no edge. With the guide on, one
sentence in ink2 says what the view is for or what to press next.

### The guide

"?" in the top row, a round button with a 1 pixel edge, turns the guide
on and off, and says which it is (`aria-pressed`). The guide adds, and takes nothing
away: the tools' names, a sentence above the bottom box, and at the end
of the tools "Learn", "Practice" (both inactive until they return) and
"Tour".

## Every function, and where it goes

Ten groups, by what a visitor wants to do. "Board" names where the design is drawn; a dash means it is decided and not drawn.

### 1. Start

| A visitor wants to | The design | Board |
|---|---|---|
| Start another sequent | "+" after the sequents; the new tab view | D1 |
| Choose the logic | Four symbols on the new tab view, ordinary logic first | D1 |
| Type a sequent | In the bottom box, on the new tab view or after a logic is chosen; Enter makes the sequent the first goal and a chip at the top | D1 |
| Type with a plain keyboard | The same: on Enter the text in the box and in the chip is written in signs | D1 |
| Learn that the text is not a sequent | The bottom box's border turns red and a line over it says the problem, a keyword first; typing takes it away. Nothing else changes | D1 |
| Try an example | With the guide on and a logic chosen, a sentence and that logic's examples over the bottom box; a press puts one in the box | D1 |
| Open a file | "Open a file" on the new tab view; the file's sequent opens with its proof, and a line over the bottom box names the file. Import among a view's tools does the same | D1 |
| Drop a file on the page | Anywhere under the top row: a dashed frame says "Drop the file to open it" | D1 |
| Paste a session or a sequent as JSON | The bottom box takes it: Enter opens it, or says it is not deduxit's JSON | D1 |
| Get the last visit's proofs back | They come back by themselves on a plain visit. After a link or with the page open twice, "Restore 3 proofs" on the new tab view: they join the sequents at the top and the first opens | D1 |
| Open a link someone sent | It opens as a sequent with its views, the linked view shown | – |

### 2. Prove by hand

| A visitor wants to | The design | Board |
|---|---|---|
| Apply a rule to a formula | The same; the popover shows the rule's sign alone, a press applies it | D2 |
| Choose among several rules | The popover holds one button per rule, side by side, the ones that do not apply greyed among them; each shows its drawing on hover | D2 |
| See the rule explained | A card over the popover draws the rule, premises over conclusion, while the pointer or the keyboard is on it; no name, no sentence | D2, D4 |
| Learn that a rule does not apply | The rule is greyed in the popover and cannot be pressed; its hover card says why under its drawing. On a touch screen, which has no hover, a press on the greyed rule shows the reason as a note over the goal | D2 |
| See which goals are open | A dashed lapis line over each open goal; the number of open goals, small, on the view's cell in the rail, "9+" past nine; a check on the sequent once none is open | every board |
| Go to another open goal | A press on any formula of it | D2 |
| Undo, redo | The view's tools, greyed when there is nothing to undo or redo | D2 |
| Go back to an earlier step | "Steps" opens a list beside the tools: 0 for the start, then each step by its rule and formula; a press goes back to it and Redo goes forward again | D2 |
| Be told what to do next | "Hint" points at the next press from where the visitor is, and takes nothing back: a formula to press; with a formula chosen, the rule to take in the open popover; with a split or a cut open, the formulas to move and then the button that applies it. With the guide on a line over the bottom box says it in words. Where no rule leads on, a line says so and to undo | D2, D6 |
| Give a witness (`∃R`, `∀L`) | A small box in the rule's popover | D8 |
| Split the context (linear `⊗`) | The two premises the rule would make appear over the goal, dashed, with the goal's other formulas as chips inside them. A press on a chip moves it to the other premise. A button at the line's end, the rule's sign and an enter arrow, applies the rule. Every split is legal, so the button is never greyed | D6 |
| Cut (linear) | "Cut" among a linear view's tools opens a small box over the goal for the cut formula. Once it reads, the two premises appear as for a split and are filled the same way; a text that is no formula is said under the box | D6 |
| Prove a goal apart | Press the goal's `⊢`, then "Prove apart": the goal opens as a sequent of its own at the top, in the same calculus. Its hover says which sequent's goal it is | D2, D6 |
| Close a goal by a proof made apart | Press the goal's `⊢`: once a sequent with the goal's formulas is proved in the same calculus, a third action uses its proof. The steps it brings are grey in the drawing and marked "apart" in the list | D2, D6 |
| Have the invertible rules applied | The same switch, on the Settings page under "Proving" | D10 |
| Use the keyboard for all of it | Every action has a key; see "Keys" | – |

### 3. Let the search help

| A visitor wants to | The design | Board |
|---|---|---|
| Close the goal worked on | Press the goal's `⊢`, then the check: the search closes that goal alone, or a line says it found no proof | D2, D6 |
| Close every goal | The view's tools; the search's steps carry a grey rule name in the drawing and "search" in the list of steps. What it cannot close stays open, and a line over the bottom box says so | D2 |
| Stop a search | "Close all" turns into "Stop" while the search runs; a line says that nothing was changed | D2, D6 |
| Get a hint, a little at a time | "Hint" among the tools goes on from where the visitor is: a formula, then its rule, then what a split or a cut still needs (see group 2) | D2, D6 |
| Read a verdict and its reason | A check or a cross on the sequent and on the view's cell; a line over the bottom box for what a search found: no proof, or unknown | D2, D6, D9 |
| Search longer after "Unknown" | The line that says "Unknown" has "Search longer", with the doubled budget in brackets, and a caret that opens the settings of that one search (engine, budget) | D2, D6 |
| Go back to where a proof still exists | A goal the search shows to have no proof is marked by a red cross at the end of its dashed line, which turns red, and no words. A sequent with no proof has the cross beside it at the top. The goal's `⊢` then offers "Go back", which takes back the steps since every open goal had a proof. The marking is a setting, on at first | D2, D6 |
| See a countermodel | A view of its own, `⊭` | D9 |
| Change the model and check it again | In the countermodel's own view: a press on a dot flips where a predicate holds, "+" adds an element, "−" takes one away. The sequent's checks and crosses follow at once, and the sign between its sides reads `⊭` while the structure refutes the sequent and `⊨` when it no longer does. Undo and Redo are the view's tools | D9 |
| See or choose the engine | For one search: the caret beside each button that searches. As a default: the Settings page, "Search", per logic | D2, D6, D10 |

### 4. Choose the calculus

| A visitor wants to | The design | Board |
|---|---|---|
| Change the logic or the proof method | The toggles at the stage's top left; the proof stays or a view opens | D2, D6, D7 |
| Draw weakenings and contractions | A switch among the view's tools | D2 |
| Draw a classical linear proof two-sided | A switch among the view's tools | D6 |
| Prove in natural deduction, backwards or forwards | Press the goal for a rule that works backwards (`→I`, `∧I`, `hyp`); press a line in force for a rule that works forwards (`→E`, `∧E`). A rule that does not apply is greyed, with its reason on hover. "Natural" draws Gentzen's tree and "Fitch" the numbered lines: two drawings of one proof | D7 |
| A natural deduction goal's own actions | A small `?` stands where the goal's rule will be named: at the end of its dashed line in the tree, in the number's place in Fitch's lines. A press opens the same actions as `⊢` does in a sequent calculus. On a goal with no proof the `?` is a red cross | D7 |
| Decide a modal sequent | A symbol on the new tab view. The sequent is decided on Enter and again when the system changes. A countermodel is a view of its own, `⊭`, changed by pressing. Where the toggles are stand the system's name and five conditions on what a world sees; the conditions make the system, and a press on the name opens the list of the fifteen | D11 |
| Prove a valid modal sequent step by step | "Prove step by step" among the tools of a valid sequent makes a view in the labelled calculus | D11 |
| Check or find a lambda-term | A symbol on the new tab view. One toggle says how often a variable may be used: "Unrestricted", "Linear", "Affine". The box takes a term, which is checked and drawn with its typing derivation, or a type, for which a term is found. "List its terms" among the tools | D12 |
| Work with untyped lambda-terms | A second toggle, "Typed" or "Untyped". An untyped term is reduced step by step, the part reduced next in lapis, with "Next step" and "To the end" as for cut elimination; a line says which simple type it would have, or that none fits | D12 |
| Prove in rules of one's own | Left out, at least for now | left out |

### 5. Look at a sequent in another way

| A visitor wants to | The design | Board |
|---|---|---|
| See what else can be done with a sequent | "+ view", one list | D3 |
| See a linear proof's net | A view in one capsule with its proof | D6 |
| Truth table | A view from "+ view": the table, a red cross at each row that refutes the sequent | D13 |
| Tableau | A view from "+ view" with a toggle, "Search" or "By hand" | D13 |
| Resolution | A view from "+ view" with a toggle, "Search", "DPLL" or "By hand": the clauses as numbered lines, each new one with the two it came from. DPLL lists what it does line by line, indented under each atom it tries | D13 |
| Translate into another logic and prove it there | A view from "+ view": the translated sequent and one button, "Prove it in LJ", which opens it as a sequent at the top. A double-negation translation is marked `¬¬` with its letters under it, Gl, Ku, GG or Ko. "Prove it in" is a small outlined button at the sequent's end, the sign of "Prove apart" alone, with its words while the guide is on; the first draft's dark button under the sequent was too loud | D3, D13 |
| Interpolant | A view from "+ view": each formula carries the number of its part and a press moves it to the other part; the interpolant and its two sequents follow | D13 |
| Normal form | A view from "+ view" with a toggle of five kinds: NNF, CNF, DNF, Tseitin, Plaisted–Greenbaum. It shows the steps as numbered lines, each with the law that gave it, and opens at the last; Undo steps back, "Next step" and "To the end" go forward | D13 |
| Eliminate a proof's cuts | A view made from the proof, "CE". "Next step" and "To the end" among its tools, Undo steps back, "Steps" lists the cases; the cut worked on next is drawn in lapis | D14 |
| Read a finished proof as a lambda-term | A view made from the proof, `λ`, with "Copy as text" | D14 |
| Check a tableau written by hand | "By hand" in the tableau view: a press on a line expands it, a branch closes by itself. Typing a tableau as text goes | D13 |
| Check a model of one's own | A view from "+ view", "M": a press on an atom makes it true or false | D13 |
| Work on a copy of a proof | "+ view", "A copy of this proof" | D13, D14 |
| See how the views depend on each other | The rail: a short line joins a view to the one above it that it was made from | D13, D14 |
| See a sequent's views as a graph | A view of the group, its cell the first in the rail and lower than a view's: the sequent and its views run downwards in the rail's order, each hanging by a rounded arrow from what it was made from. A press on a node opens the view; a view out of date is dashed, and "Update all" is among the tools | D19 |
| Go to a sequent's main view, or to its graph | A press on the sequent at the top opens its main view. A press on it while the main view shows opens the graph | D19 |
| Go to the page's start | The word mark leads to the new tab view; with one open already, to that one. It is a plain link to the site's address | every board |
| Read what the page is | "About" on the new tab view, beside "Learn" and "Practice", and on the Settings page | D1, D10 |
| Bring a view up to date after its source changed | The view's cell gets a dashed border and a red "!"; the view is drawn faint with one button, "Update", or "Start again" when it has steps of its own. "Check" goes as a button of its own: bringing a view up to date checks it | D14 |

### 6. Look at the drawing

| A visitor wants to | The design | Board |
|---|---|---|
| Pan and zoom, fit to the window | The same gestures and keys. The buttons are one group at the stage's lower right: zoom out, the zoom's number, zoom in, fit | D15 |
| Choose the font of the formulas | The Settings page, "Look" | D10 |
| Light or dark | A button in the top row; the Settings page has Light, Dark and System | every board |
| Choose how a net is drawn | A toggle where the calculus toggles are, "Formulas" or "Compact", as "Natural" and "Fitch" are two drawings of one proof | D15 |

### 7. Keep and share

| A visitor wants to | The design | Board |
|---|---|---|
| Keep the work without doing anything | The same | unchanged |
| Save a proof in a format (LaTeX, Typst, SVG, PNG, PDF, Rocq, JSON) | "Export" among the view's tools opens a panel for the view shown: the formats at its left, each with a sign of its own; at its right the chosen format's settings, what a text format writes, and "Copy" and "Save" | D16 |
| Set how an export looks | In the panel, per format: a picture's font, background and scale; the form of the rule names; a whole document for LaTeX and Typst; the text tree's line; the Rocq lemma's name | D16 |
| Share a link, with the proof or the sequent alone | The same panel, under "Link": the link is shown, with "Copy" | D16 |
| Embed the page, print | The same | unchanged |

### 8. Learn

| A visitor wants to | The design | Board |
|---|---|---|
| Have the page explain itself | The guide's switch, "?", with the hover "Guide" | D4 |
| Follow a lesson | Left for later; "Learn" stays as an inactive button with the hint "Coming soon" | later |
| Open the lessons, practice, the tour | The view's tools while the guide is on; "Learn" and "Practice" inactive there, the tour works | D4 |
| Look a rule or an engine up | Left for later, with Learn | later |
| Pick a practice problem | Left for later; "Practice" stays as an inactive button with the hint "Coming soon" | later |
| Take the tour | "Tour" with the guide on | – |

### 9. Teach

| A visitor wants to | The design | Board |
|---|---|---|
| Hand out a set of problems | "Course pack" is an entry of Export, under "Link", and nowhere else. Its form stands where a format's settings and preview stand: the title, the sequents at the top as problems to tick, then the link, the embed code and the printed sheet. A sequent need not be proved to go in | D18 |
| Work on a pack | The pack is one entry at the top, with its count done, and has a page of its own that lists the problems with their calculus and state. A press on a row opens the problem; a press on the entry goes back to the page. The page has no bottom box and no view's tools. A problem's calculus cannot be changed; "Hint" and "Close all" work as anywhere | D17 |
| Hand answers in | Left out | left out |
| Check answers handed in | Left out with handing in | left out |

### 10. Settings and the rest

| A visitor wants to | The design | Board |
|---|---|---|
| Switch between light and dark | A button in the top row, a moon in light and a sun in dark; the Settings page also has Light, Dark and System | every board |
| Choose the font of the formulas, how nets are drawn | The Settings page, "Look" | D10 |
| Choose the search's engine, budget and bounds | The Settings page, "Search"; the panel under "Close all" starts from these values, and its "Defaults" link opens this section | D10 |
| Mark goals that have no proof, or not | The Settings page, "Proving", on at first | D10 |
| Have the invertible rules applied | The Settings page, "Proving" | D10 |
| Close every sequent | The Settings page, "This browser"; it can be undone | D10 |
| See every key; read what the page is, its licences, privacy | The Settings page, "About", as three rows that open them | D10 |
| Use the page offline, install it | The same | unchanged |

## Keys

Every action has a key, and nothing needs one: the page can be used with
Tab, Enter, Space and Escape alone.

| Action | Key | Also |
|---|---|---|
| Move between formulas and controls | Tab, Shift+Tab | |
| Open a formula's rules; apply | Enter | Space |
| Pick a rule in the open popover | `1` to `9` | The arrow keys and Enter |
| Close a popover, a panel, a list | Esc | |
| Next, previous open goal | `J`, `K` | `]`, `[` |
| Undo, redo | Ctrl+Z, Ctrl+Shift+Z (Cmd on a Mac) | `U`, Shift+`U`; Ctrl+Y |
| Steps | `S` | |
| Hint | `H` | |
| Close this goal by the search; every goal | `C`; Shift+`C` | |
| Export; Import | `E`; `I` | |
| Next, previous sequent | `T`, Shift+`T` | Left and Right in the top row |
| Next, previous view | `V`, Shift+`V` | Up and Down in the rail |
| The graph of views | `G` | |
| Add a view | `A` | |
| New tab view | `N` | |
| Put the cursor in the bottom box | `/` | |
| Zoom in, out; 100 %; fit | `+` or `=`, `-`; `0`; `F` | |
| Settings | `,` | |
| The list of keys | `?` | Ctrl+/ |

Rules:
- **`?` opens the list of keys**, as it does in GitHub, Gmail, Jira,
  YouTube and Figma. The list is a dialog, and its first row is the
  guide's switch, so the key also reaches the guide. No single key turns
  the guide on: its button in the top row does.
- **Undo is Ctrl+Z**, as everywhere. `U` stays for those who know it.
- **`J` and `K` join `[` and `]`** because the brackets need AltGr on a
  German, Swiss or French keyboard, and Windows reports AltGr as Ctrl
  and Alt together, which the page ignores.
- **A single key acts only outside a text field**, and never with Ctrl,
  Alt, Meta or AltGr held, nor while a character is being composed. In a
  field, Escape leaves the field.
- **Settings, "Keys", has a switch "Single keys"**, on at first. Off,
  only the keys with Ctrl or Cmd, Tab, Enter, Space, the arrows and
  Escape act. WCAG 2.2, 2.1.4 asks for this: a single-key shortcut must
  be able to be turned off, since speech input types letters. The digits
  in the rule popover act only while the popover has the focus, which
  the same criterion allows without the switch.
- **A letter is read by the character it types** (`KeyboardEvent.key`),
  so it is the same key on every layout.
- **The keys are shown where the action is**: in each tool's hover, and
  with the guide on beside each tool's name. Each control names its key
  to assistive technology (`aria-keyshortcuts`).
- **Inside a group of controls the arrow keys move**, and Tab leaves the
  group: the top row's sequents and the rail are tab lists, the tools a
  toolbar, a toggle a group of pressed buttons, as the ARIA Authoring
  Practices describe them. The page does not set `role="application"`.
- A screen reader in browse mode takes single letters for itself. Its
  user switches to focus mode or turns "Single keys" off; every action
  remains a button.

## Window sizes

The page lays itself out by the window's size, never by the kind of
device, and follows the window as it changes.

| Class | Width |
|---|---|
| Compact | Under 600 pixels |
| Medium | 600 to 839 |
| Expanded | 840 and more |
| Short | Under 480 pixels high, at any width |

The widths are Android's and Material's window classes, whose mapping to
devices is documented: compact covers 99.96 % of phones held upright,
and a height under 480 covers 99.78 % of phones held sideways.

| Region | Compact | Medium | Expanded |
|---|---|---|---|
| Top row | The word mark becomes the square mark. The chips scroll sideways and "+" stays in sight. "?" and Settings stay; light or dark is in Settings only | As expanded | The word mark, chips, "+", three buttons |
| Views | A row under the top row, 52 high, cells 44, scrolling sideways. A capsule lies on its side | The rail | The rail |
| Stage | The window's full width | As expanded | As drawn |
| Toggles | At the stage's top left, one box per line where they do not fit side by side; cells 36 high | As expanded, wrapping | One line |
| Tools | A bar along the bottom, 52 high: Undo, Redo, Hint, Close all, "More". "More" opens the other tools in a second row above | The column | The column |
| Bottom box | Above the bar, the window's width less 16, 48 high, type 16 | As expanded | Centred, at most 560 wide |
| Panel, popover, list of views | A sheet over the stage's lower part, the window's width less 16, ending above the bar, scrolling inside | Lies over the stage; the drawing is not moved | Beside the tools; the drawing moves aside |
| Export | The entries are one row that scrolls sideways; the chosen entry's settings and text under it | As expanded | Two columns |
| Settings | One column, 16 from the edges. A control that does not fit beside its label goes under it. Fields 44 high | As expanded | At most 640 wide, centred |
| New tab view | The four logics two by two; the buttons wrap; the box at the bottom | As expanded | Four in a row |

In a short window the frame is the medium one, with three changes: the
rail scrolls, the tools show Undo, Redo, Hint, Close all and "More", and
the bottom box moves to the lower left.

Rules at every size:
- **The stage may scroll in two directions; nothing else does.** A
  derivation is a diagram, which WCAG 2.2, 1.4.10 excepts from reflow.
  Everything around it fits a window 320 pixels wide, which is also a
  window of 1280 at 400 % zoom.
- **A touch screen gets larger targets.** Where the pointer is coarse
  (`pointer: coarse`), every target is at least 44 by 44 pixels: a
  toggle's cell is 36 high in a box of 44, a tool 44 by 44, a field 44
  high. The compact layout always has these sizes.
- **Text in a field is at least 16 pixels on a touch screen.** iOS zooms
  into a field with smaller text when it takes the focus.
- **Pan and zoom never need two fingers or a drag.** The zoom's buttons
  and the keys do the same (WCAG 2.2, 2.5.1 and 2.5.7).
- **A hover is never the only way to a name or a reason.** A touch has
  no hover. The guide shows the names, and a reason why a control is
  inactive is said in a note when the control is pressed.
- **A sheet has a close button**, and Escape and a press outside close
  it too.
- **The page's height is the visible height** (`100dvh`), so the bar and
  the bottom box stay above the browser's own bars, and they keep clear
  of a phone's rounded corners and home bar
  (`env(safe-area-inset-bottom)`). With the screen keyboard open the
  bottom box stays above it (`interactive-widget=resizes-content`).
- **Neither orientation is locked.**
- **Sizes are in rem**, so the browser's text size scales the page. No
  size follows the window's width alone.
- **A panel and the tools size themselves by the stage**, with container
  queries; the frame's classes are media queries.
- **A wide screen** gives the stage the room. Settings, the new tab view
  and a panel keep their widths.
- **With forced colours** (`forced-colors: active`) every edge is a real
  border, since grounds and shadows are dropped.

To test: 320, 360, 599 and 600, 839 and 840, 1024, 1280, 1440 and 1920
pixels wide; 390 high sideways; zoom of 200 % and 400 %; the text
spacing of WCAG 1.4.12; a touch screen with a mouse attached.

The boards N1 to N10 show these layouts. On the boards a sheet has no
close button (the tool that opened it closes it), and the drawing is not
fitted to a narrow stage: it keeps its size and runs out of sight. The
page fits it, down to the size at which a formula is still wide enough
to press.

## Accessibility

The page meets WCAG 2.2 at level AA. What the design fixes:

- **Contrast**: text 4.5:1, the edges and states of controls 3:1, in
  both schemes ("Colours").
- **Targets**: 24 pixels at least, 44 on a touch screen ("Controls",
  "Window sizes").
- **Focus**: every control shows a 2 pixel lapis ring, 2 pixels off its
  edge, when the keyboard reaches it (`:focus-visible`). A sheet or a
  panel never hides the control that has the focus.
- **Names**: a control that shows only a sign has its full name as its
  accessible name and its hover. The name starts with what the control
  shows, so that speech input can say it.
- **States in words**: a chip, a cell and a goal say their state in
  their name ("proved", "1 goal open", "refuted").
- **The drawing** is a picture with deduxit's description; the formulas
  that can be pressed are buttons laid over it.
- **Keys**: "Keys".
- **Motion**: "Motion".
- **Reflow, zoom, orientation, touch**: "Window sizes".

## Light and dark

Every colour is a token with two values ("Colours"). The page follows
the system's scheme until the visitor chooses "Light" or "Dark" in
Settings or presses the top row's button, a moon in light and a sun in
dark. The choice is kept in the browser and read before the first paint.

## What goes, and what waits

Gone from the current page:
- the restart warning on a change of logic: the proof stays, or a view
  opens;
- the Workspace panel as a place of its own: the top row and the rail
  show the same links, and its graph is a view;
- the stage's row of view tabs, the Logic popover and its four sheets:
  all are in "+ view" and the toggles;
- the bottom band: its actions are the view's tools, the rest is in
  Settings;
- handing answers in, and the view that checks them;
- a course pack's switch that bars the search, and a pack's code;
- a calculus of one's own, for now. Natural deduction and proving a
  valid modal sequent step by step, which the current page builds on the
  same part of deduxit, stay.

Waiting until the new design is on the main page: Learn and Practice.
Until then "Learn" and "Practice" are inactive buttons with the hover
"Coming soon", on the new tab view and at the end of the tools with the
guide on.

## What the page needs from elsewhere

- **Untyped lambda-terms** are not in deduxit: reading an untyped term,
  the linear and affine checks, reduction step by step with a bound, and
  the principal simple type. Until deduxit has them, "Untyped" is
  inactive.
- **The exports' settings** (a picture's font, background and scale, the
  form of the rule names, a whole document, the text tree's line, the
  Rocq lemma's name) are deduxit's `--style` options. The current page
  passes on only the font and a PDF's date; the new one passes each
  setting the panel shows.
- **The derivation's proportions** are deduxit's. A wish to change them
  is a wish for deduxit's drawing.
- **Rocq's logo** is the project's small mark, the bird alone
  (`icon-rocq-black.svg` from `rocq-id/logos/SVG` in
  github.com/rocq-prover/rocq-prover.org), which its site releases under
  the Unlicense. The site serves the file with its attribution, beside
  the other licences. It is drawn in the text's colour, as every sign
  is. It is the one third-party file this repository holds.

## Not drawn, or not checked

Decided, and left to the building:
- opening a link someone sent: it opens as a sequent with its views, the
  linked view shown;
- in first-order logic, the refusal of a typed witness (said in the
  popover, under the field), `∀R` and `∃L` (nothing is typed: deduxit
  names the variable), and changing a countermodel;
- undoing "Close all" on the Settings page;
- the tour;
- the list of keys as a dialog, and the "Keys" rows of Settings;
- a sheet's close button;
- the states under the pointer and while pressed. A control under the
  pointer takes the over ground; pressed, it takes wash.

Not checked on the boards:
- the focus ring as drawn (its rule is there);
- the last line of help sentences, and the baseline where the serif, the
  sans and the math font share a line;
- the narrow boards in a real phone's browser: they were looked at in
  rendered pictures and on the canvas;
- D3, D4 and D8 are drawings and do not respond, and on D13 to D19 some
  of a proof view's tools are drawn and do nothing.

## Building it in this repository

- The tokens go to `src/styles/tokens.css`, each with its light and dark
  value. `edge` is new. `src/styles/colours.test.ts` gets the pairs of
  "Colours".
- The page has one breakpoint today, 640 pixels. It becomes the three
  classes of "Window sizes"; the test that holds the breakpoint equal
  everywhere is changed with it.
- The two control heights of today (`--size-control` and
  `--size-control-small`) become the sizes of "Controls". The 44 pixels
  under the phone's media query stay, now under the compact class and
  `pointer: coarse`.
- The boards set their styles inline and their responsive rules with
  `!important`. The page does neither: it has no `style` attribute, and
  its rules are classes in `app.css`.
- Every interaction gets a Playwright test, and every new state a step
  in the walks of `tests/states.ts`, which the target-size and axe specs
  walk.
- The current page's keys list, `KEYS` in `BottomBand.tsx`, is replaced
  by the table in "Keys".

## Sources

Read for this guide on 2026-11-25:
- WCAG 2.2, Understanding pages: 1.4.3 Contrast, 1.4.10 Reflow, 1.4.11
  Non-text Contrast, 1.4.12 Text Spacing, 1.4.4 Resize Text, 1.3.4
  Orientation, 2.1.4 Character Key Shortcuts, 2.5.1 Pointer Gestures,
  2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum), 2.5.5 Target
  Size (Enhanced), 1.4.13 Content on Hover or Focus, 1.4.8 Visual
  Presentation (https://www.w3.org/WAI/WCAG22/Understanding/).
- Android Developers, "Use window size classes" and "Build adaptive
  navigation" (https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes).
- web.dev, "Learn Responsive Design", and "The large, small, and dynamic
  viewport units" (https://web.dev/learn/design,
  https://web.dev/blog/viewport-units).
- MDN on container queries, `clamp()`, `env()`, `pointer`,
  `forced-colors`, `prefers-reduced-motion`, `text-wrap-style`
  (https://developer.mozilla.org/en-US/docs/Web/CSS).
- Chrome for Developers, "Viewport resize behavior"
  (https://developer.chrome.com/blog/viewport-resize-behavior).
- W3C, ARIA Authoring Practices Guide, "Developing a Keyboard Interface"
  and the Tabs and Toolbar patterns (https://www.w3.org/WAI/ARIA/apg/).
- Nielsen Norman Group, "Touch Targets on Touchscreens" and "Tooltip
  Guidelines" (https://www.nngroup.com/articles/touch-target-size/,
  https://www.nngroup.com/articles/tooltip-guidelines/).
- Apple, Human Interface Guidelines, the table of control sizes
  (28 by 28 points on a Mac, 44 by 44 on an iPhone).
- U.S. Web Design System, Typography
  (https://designsystem.digital.gov/components/typography/).
- Butterick's Practical Typography, "Line spacing"
  (https://practicaltypography.com/line-spacing.html).
- CSS-Tricks, "16px or Larger Text Prevents iOS Form Zoom"
  (https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/).

Not read, so not relied on: Material Design 3's own pages (they did not
load), IBM Carbon and the GOV.UK Design System (downloaded, not read
through).
