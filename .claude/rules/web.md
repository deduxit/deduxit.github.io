---
paths:
  - "src/**"
  - "astro.config.ts"
  - "tsconfig.json"
  - "biome.json"
  - "vitest.config.ts"
  - "playwright.config.ts"
  - "tests/**"
---

# The site's code

Versions are newer than most training data: Astro 7.3, Vite 8, TypeScript 6, Tailwind 4.3,
Solid 1.9, Vitest 5, Playwright 1.63, Biome 2.5 (package-lock.json and deduxit's nixpkgs,
2026-10-19). Check an API in `node_modules/<pkg>/**/*.d.ts` before using it from memory.
deduxit's own calls are in `.cache/deduxit-web/deduxit_web.d.ts`, and their documents in
deduxit's `plan/web/README.md` ("The bindings' API"); `src/lib/deduxit.ts` types the parts
the page reads.

## The worker and the protocol (`src/lib/protocol.ts`, `src/worker/deduxit.worker.ts`)

- **deduxit's module runs in one module worker**, created as `new Worker(new URL(…,
  import.meta.url), { type: "module" })` in `src/lib/api.ts` (Vite bundles it from that
  pattern alone). The module reads no clock and a call cannot be interrupted, so the one
  cancel is `terminate()` and a fresh worker (`Client.cancel`): every pending call
  rejects with `Cancelled`, and nothing is lost, because the module keeps nothing between
  calls and the page sends every document with every call. A worker starts with a call,
  never on its own: one that fails as it loads (a chunk gone after a redeploy) would
  otherwise be restarted in a loop; the island makes one call on mount, so the module
  loads after the first paint.
- **`render` runs in a second module**, deduxit's renderers (`deduxit_web_render.js`, 1.6
  MB at gzip), which the worker imports on the first `render` request and keeps for the next
  (`loadRenderers`): the main module every visitor waits for is 2.4 MB without it, where
  it was 3.9. A failure to load it answers that request with an error the Export panel shows,
  and the next export tries again: the module's file always, its glue only where the
  browser does not keep a failed `import()` for the worker's life (some do), else from the
  next worker on. `offline.spec.ts` holds that a session without a PNG or
  PDF export fetches neither of its files and that the first fetches each once.
- **Requests carry ids**; answers may come in any order. A call rejects with what it
  threw: deduxit's error JSON as a string, which `failure()` reads. The page branches on
  `code`, `kind` and `details.kind` and words the message itself (`src/lib/words.ts`);
  never show `message` raw where a wording exists.
- **A replay is one request** (`replay`, `play` in the worker, over `src/lib/steps.ts`), so
  one `terminate()` stops it.

## The suites (`src/lib/suites.ts`, `src/lib/ordinary.ts`)

- **A tab's calculus is a `Calculus`: a suite, a method and the suite's parameter**, as
  deduxit's `about` names them (`{suite: "linear", method: "sequent", mode}`,
  `{suite: "ordinary", method: "sequent", logic}`); `SUITES` is the registry (name, tip,
  methods, parameter, the values the page offers, the calculus a new tab starts in, the prefix
  of the suite's calls, its `term` call), `suites.test.ts` holds it to `about()`'s `suites`
  (names, prefixes, term calls, parameters, the page's values a part of deduxit's, the start deduxit's default). A new suite
  is an entry there, a variant of `Calculus`, its calls in `api.ts` and the worker's table,
  and a branch where a call is made, and a logic on the new tab view (`LOGICS` in `Frame.tsx`)
  or a toggle (`Toggles.tsx`) that offers it. Each suite has one method today; a second method
  is a field of the link (`k`) and of the shelf's calculus.
- **The ordinary suite** (deduxit's `ordinary_…` calls, LK and LJ for classical,
  intuitionistic and minimal logic) is shown through the shapes the linear stage reads:
  `asView` makes its view a `View` whose goals number their formulas left of ⊢ first, as the
  drawing's `i<n>-<p>` ids do; `ordinaryStep` turns a place back into a side and position, and
  a hint's later steps carry their `side` (each acts on the goal the one before opened). A
  rule of two premises is applied shared (G3's form, deduxit's default): the page offers no
  split in an ordinary proof. No net, no cut, no fill, no engine choice;
  the drawing and the exports are the ordinary calls', never the linear image.
- **Undo on a branch in an ordinary proof cuts the step's subtree out of the session
  document** (`retract`): it depends on deduxit's layout of an ordinary session at wire level 8,
  each history entry the goal a step expanded and a step's inferences that goal's subtree,
  appended as one block after it. The page shows or stores a retracted document only after
  `ordinary_view` (deduxit's reader, which replays every inference and the history's order)
  accepted it; a refusal leaves the session as it was and says so. A change of that layout in
  deduxit must change `retract`, and `ordinary.test.ts`'s property against the real module
  (the reader accepts every retraction, which equals deduxit's undo for the last step) is
  what catches it. Redo restores the session before each undo with its grafts' engines
  (`Proof.later`); undo keeps only the engines of grafts the session still holds
  (`keptGrafts`), so a step taken by hand where a graft was is never drawn as the search's.
- **An ordinary session tells no search's graft from a step's own structural run**, so its
  grafts are the paths the page saw the search close (`Proof.engines`), not `searchMade`.
- **An ordinary view's `inferences` follow `view.structural`**: the switch is
  `setStructural`, which asks every ordinary proof's view again and changes the setting and
  the views together; a view kept from the other setting maps the drawing's ids to the wrong
  goals.
- **A finished proof's λ-term** is the last item of the Export panel (`ExportMenu` in
  `Panels.tsx`), not a tool of its own. It is read by the suite's own call
  (`Suite.term`: `term`, `ordinary_term`), keyed on the session document so that a changed proof
  is read again; the judgement shows only while the term read is the current proof's
  (`term.loading`: Solid's resource keeps its last value while it reads again), and "copied"
  only while the judgement copied is the one shown. deduxit answers a proof without a term with
  `{"error": …}`, not a throw; the item is then off and words its `details.reason` (`noTerm` in
  `words.ts`). A new suite with terms is its `term` in the registry, nothing in the menu.
- **The exports' forms** are deduxit's `Form` in the export settings (`exportSettings` in
  `Panels.tsx`): LaTeX and Typst are fragments to paste (`styles.latex.form`,
  `styles.typst.form`: `fragment`), each followed by a "Whole document" item (`standalone`,
  the class `sub`); every Rocq file, the proof's and a refutation's, is `standalone`, so it
  has its import and compiles alone. Each item's detail names what the file needs.
- **An ordinary outcome is deduxit's of wire level 12**: `search` tagged by `method`, a session's
  goal decided through the embedding (`{"method": "embedding", "translation", "image"}`), the
  image's linear outcome nested whole. Its engine and refutation are the image's: `engineOf`
  unwraps `search.image`, and the status reads the engine there (a linear outcome keeps its own
  at the top). `reason` and `verdict` stay at the top.
- **A "not valid" goal shows its countermodel**: deduxit's `ordinary_close` and `ordinary_hint`
  give the outcome the SAT solver's Kripke model (`countermodel`, `countermodelOf`), which
  `ModelFigure` in `Stage.tsx` draws under the note by `ordinary_model_drawing` in the stage's
  font, as a picture (`role="img"`, deduxit's `<title>` and `<desc>`), with one sentence under it
  (`figcaption`); the note's sentence then points at it. The drawing's colours are the stage's
  (`.countermodel-drawing`), the model's world in the net's highlight. Its Rocq certificate is
  the Export panel's "Countermodel" (`ordinary_model_certificate`, standalone), shown for an
  ordinary proof only, greyed until a goal's close or hint found one. The figure's classes are
  `.countermodel*`. `tests/states.ts`'s ordinary walk ends on it.
- **Every way of looking at a sequent is a view of it** (`Views.tsx`, `OtherViews.tsx`; the
  guide's "+ view", boards D3, D13, D14): "+ view" (`ui.menu === "views"`) lists `entries` under
  Prove, Decide, Translate, Read off and From this proof, a faint entry with its reason (`why`,
  worded by the feedback skill's criterion: what is missing, then one action) and a check on a view
  there. `addView` adds an `Added` to `ui.added[proof]`: the view, what it was made from (`source`:
  the sequent as text for a view of the sequent, `sessionKey` of the session for one of the proof,
  CE and λ) and the sequent's text and JSON then (`sequent`). The stage draws a view from that
  snapshot, never from the proof's live sequent, so a view whose source changed (`staleOf`) shows
  its old contents in `soft` with `StaleBar` over them: "Update", or "Start again" where it has
  steps of its own (`markSteps`: a CE run, presses of the tableau by hand); its cell is dashed with
  a red "!". The views: truth table and tableau (`MethodView` with the snapshot's text), the
  tableau's "By hand" (`HandTableau.tsx`), resolution and the normal form (`Clausal.tsx`), the
  interpolant (`InterpolantPanel` in `Transforms.tsx`), the four negative translations and the
  embedding into linear logic, cut elimination and the λ-term (`Views.tsx`), a model of one's own,
  the countermodel. A view with a way of working has its toggle where the calculus toggles stand
  (`ui.ways`, `wayOf`: the tableau's Search or By hand, resolution's Search, DPLL or By hand, the
  normal form's kinds, CE's Derivation or Net); the calculus toggles show on a proof's own view
  and its net alone. Every view panel is a `ViewPanel` (`.method.view-panel`, a hidden h2 for the
  heading order, `tabindex=0` since it scrolls). The table and the tableau are of a started
  classical sequent alone (`decidable`).
- **A translation is a view of its own** (`TranslationView`, `EmbeddingView`): the translated
  sequent on a strip with "Prove it in LJ" (or LM, LL, ILL) at its end, the sign of "Prove apart",
  its words shown with the guide on; then the verdicts. A negative translation's "Prove it in" is
  the workspace's `proveTranslation` (a new chip, its line in the workspace); the embedding into
  linear logic is the library's workspace operation `ordinary.embed` (the logic's default
  embedding), shown from a scratch document of its own (`embed`, its node's `summary` the text),
  and its "Prove it in" is the workspace's `proveEmbedding`: one action, "embedding", that joins
  the tab, makes `ordinary.embed` and `linear.start` on it and opens the proof node's linear
  session as a chip linked to that node, so the graph shows it as a made sequent's chip. The
  workspace lays in no linear session (`work` is ordinary sessions'), so the node keeps the
  session it started with; Undo or Redo never reopens a linear node's tab. The interpolant's parts are toggles (part 1
  pressed, its number written before it), Craig's split at the start and again for a new sequent.
- **The normal form and resolution are views of the sequent** (`Clausal.tsx`).
  - The normal form (`ordinary_normalize`, `NormalView`): its kind is the view's toggle (`FORMS`,
    CNF first, the five first-order forms with them), the steps numbered lines from the sequent
    as typed (0), each with its law and where it acts, opening at the last
    (`ui.stepAt`, `stepShown`, `stepTo`; `stepCounts` the count each view reports), the check's
    keyword under the last; the tools' Undo steps back, "Next step" and "To the end" forward.
- **A calculus of one's own** (deduxit's `rules_…` calls, `src/lib/custom.ts`,
  `src/islands/Custom.tsx`) is the registry's suite `rules`, its parameter the rule file's
  `name` (any name of at most 64 characters: `calculusOf` takes it, the built-in names are its
  `values`). The page has no entry for it: the new tab view offers four logics, and the panel
  is reached only by proving a valid modal sequent step by step (below). Its proof keeps its
  work in `Proof.custom` (the rule file as typed, the assumptions, the session, and never
  stored its view, verdict, problem and goal), never in `Proof.session`, so no linear or
  ordinary call ever gets such a session and every code path that reads `session` sees the
  proof as not started; the stage shows `CustomPanel` in the drawing's place
  (`data-method="custom"`). The file and the assumptions are closed `<details>` in it. Once
  started: the drawing (`rules_draw`, deduxit's `<title>` and `<desc>`), the open goals, the
  steps deduxit offers for the goal chosen (`distinctSteps`: one button per text), a step that
  needs values asks for each by name (`step_needs`), "Close by a hypothesis", the tools' Undo
  (the last step: the session keeps no branches apart), and the finished derivation's check,
  "Valid in the calculus given". The session holds the rule file, so the link (`u=rules`,
  `m=` the name, `d=` the session) and the shelf (`StoredProof.custom`) keep the calculus with
  the proof; reading either back runs `rules_view`, which checks every step again. A link
  without a session restores a built-in calculus's goal, not a file of one's own.
- **Natural deduction is the ordinary suite's second method** (`Method` `"natural"`,
  `src/lib/natural.ts`, `src/islands/Natural.tsx`): the "Natural" toggle of ordinary logic's
  method (`Toggles.tsx`, beside the logic), so a visitor who never presses it sees nothing new
  (the author's rule). The proof's ordinary session still starts as before (it parses the
  sequent and holds its form); with the method natural the stage shows `NaturalView` in the
  drawing's place (`data-method="natural"`), and the tools' proof actions and their keys stand
  aside (they would act on the sequent calculus proof the stage
  does not show). The view starts a session of NK, NJ or NM (`CALCULI`, by the logic) on the
  sequent (`problemOf`: the formulas left of ⊢ the assumptions, the one right of it the goal, ⊥
  for none and the disjunction for several, said in a sentence), kept for the visit in a
  module store by the tab and its sequent, never stored or linked: the link names no method
  (`u=ordinary&m=LOGIC`), so a link of such a proof opens its sequent in the sequent calculus,
  and the shelf keeps the ordinary session with the method, the natural deduction proof begun
  afresh.
  Steps go backwards (`rules_apply`, deduxit's list as in a calculus of one's own) or forwards
  (`rules_derive`, a rule and lines cited by number), one direction shown at a time; a goal
  equal to a line in force closes by it (`rules_cite`). **One numbering**: the session numbers
  lines in the order its steps made them and the Fitch drawing top to bottom, so the view shows
  each line by its `fitch` number (`shownNumbers`) and reads typed numbers back to the
  session's (`citedLines`), refusing on the page a number no line in force is shown by; both
  drawings come from one session (`rules_draw` with `view.layout`), and Save as writes the
  drawing shown (`rules_export`).
- **Modal logic** (deduxit's `modal_…` calls, `src/lib/modal.ts`, `src/islands/Modal.tsx`) is
  the registry's suite `modal`, its parameter `system` (the fifteen names, `K` the default), the
  method `sequent` (the labelled sequent calculus). The new tab view's "Modal logic" chooses it,
  and its toggle (`Toggles.tsx`) is a chooser of the systems each named with its conditions
  (`systemWords`); a visitor who never presses it sees nothing of it (the author's rule). Its proof keeps its work in `Proof.modal` (the statement
  `modal_read` wrote, the outcome, the model being edited, the world to check at, the last
  check), never in `Proof.session`; only the sequent and the system are stored and linked
  (`u=modal&m=S4&s=…`, no `d`), and a stored or linked one is decided again when read
  (`restore`'s `submit`). The stage shows `ModalPanel` (`data-method="modal"`): before a
  decision two sentences on □, ◇ and the system and "Try []p -> [][]p"; after it the verdict
  (`verdictWords`), the system in a sentence, the drawing (`modal_draw`: the derivation as a
  tree, `.custom-drawing`, or the countermodel as a figure, `.countermodel`), and a closed
  `<details>` ("Change the model and check it", or "Check a model" for a valid sequent) with
  the model editor (`KripkeEditor`, below) and its check (`modal_evaluate`: the frame condition
  and its worlds, or holds, or the failing world with each formula's value and witness, marked
  on the editor's drawing). A change of the system is no restart warning: the tab holds no
  steps.
- **Lambda-terms** (deduxit's `lambda_…` calls, `src/lib/lambda.ts`, `src/islands/Lambda.tsx`)
  are the registry's suite `lambda`, its parameter `calculus` (`simple`, the default, `linear`,
  `affine`), the method `typing` (deduxit draws the typing derivation from the term; nobody
  builds it), which a link writes by leaving the method out (`calculusOf` takes the suite's first
  method where none is named). The new tab view's "Lambda-terms" chooses it, and its toggle
  (`Toggles.tsx`) selects the calculus; a visitor who never presses it sees nothing of it (the
  author's rule).
  The field's text is a term or a type (`isTerm`: a `λ`, a `\` that is no half of `/\` or `\/`, a
  `:`, or a pair's bracket that is no `<->`); a term is read (`lambda_read`) and checked
  (`lambda_check`), a type read (`lambda_read_type`) and its term found (`lambda_inhabit`), then
  checked so its derivation draws. An ill-typed term is the panel's verdict ("Not well typed",
  deduxit's reason), a text deduxit cannot read is the field's problem with its place. Its proof
  keeps its work in `Proof.lambda`, never in `Proof.session`; only the text and the calculus are
  stored and linked (`u=lambda&m=simple&s=…`), read again on arrival (`restore`'s `submit`). The
  stage shows `LambdaPanel` (`data-method="lambda"`): before anything is read two sentences and
  "Try" buttons (a term, and in the simple calculus a type), after it the verdict, the
  derivation (`lambda_draw`, `.custom-drawing`) and for a type "List its terms"
  (`lambda_enumerate`, `max_terms` 12, the bindings adding each term's `text`). Every call
  but the drawing's sets `lambda.types`, so a term's text shows its binders' types and reads back;
  the drawing's contexts show them. In the linear and the affine calculus every text is a term:
  terms of a type are found in the simple calculus alone. The drawing shows only while the tab
  holds a checked term (`typing`), since a resource keeps its last value when its source goes. A
  lambda tab takes no rule hints.
- **The model editor** (`src/islands/KripkeEditor.tsx`, its data, geometry and words in
  `src/lib/kripke.ts`) draws a Kripke model of either suite on an SVG canvas and changes it;
  deduxit's check of what was drawn is the only judge, so the editor sends the model as drawn
  (`kripkeJson`: the arrows as written, nothing closed; ⊥ in minimal logic alone, which no
  control sets elsewhere) and every change takes the last check and its marks away.
  - A drag from a world onto another toggles that arrow, back onto the world after leaving it
    a loop (modal logic alone: in ordinary logic every world is above itself already, and a
    loop is refused as arrows that go round), onto empty space moves the world; a press
    without moving selects it. The places are the editor's own (`layout` as deduxit draws:
    rows top to bottom from the model's world in modal logic, bottom to top by height in
    ordinary logic), kept across edits and laid out afresh only when the number of worlds
    changes from outside: an addition or removal changes the places and the model in one
    `batch`, or the effect that lays out a model from outside sees them disagree.
  - A removal renumbers the world checked at with the worlds (`onWorld`), or sets every world
    when it is that one, and hands the focus to the world selected next (its button may go
    with the second-to-last world). An answer is dropped when the model or the world checked
    at changed while deduxit checked (`modalCheck`, `ModelView`'s `check`).
  - Every drag has a control beside it (WCAG 2.5.7): the selected world's form has its atoms,
    its arrows as `label.chip` checkboxes ("World 0 sees world 1", "World 0 is below world
    1"), ⊥ in minimal logic and its removal. A world is a focusable `role="button"` whose
    name says its atoms, arrows and marks (`worldWords`); Enter or Space selects it, the arrow
    keys move it; an edit is said in the editor's `aria-live` line.
  - The boxes' words are a separate `aria-hidden` layer (`.kripke-words`, no pointer events):
    words drawn inside a button that its name does not contain in order fail axe's
    `label-content-name-mismatch` (WCAG 2.5.3), whatever `aria-hidden` says.
  - Marks are colour and a pattern or word: the failing world a thick outline and "fails
    here", a witness or a frame condition's world a dashed outline ("witness"), and the arrow
    a frame condition asks for drawn dashed (`missingArrow`; `kripke.test.ts` checks against
    deduxit that adding it meets the condition named there).
- **The model view** (`ModelCheck.tsx`, `ui.tab` `"model"`, `data-method="model"`): a
  propositional model of one's own in the drawing's place, from `ui.modelSeed` ("+ view"'s "A
  model of your own" adds one world against the started ordinary sequent as a rail cell, M).
  The check is `ordinary_model`; its `invalid_model` refusal is said as "No model of … logic"
  with deduxit's reason (`refusalWords`).
- **The countermodel view `⊭`** (board D9; `ui.tab` `"countermodel"`, `ui.counters` by proof,
  `counterOf`, `setCounter`, `data-method="countermodel"`, its cell after the proof's views in
  `cellsOf`) is one per proof, each kept while another proof's is open, and goes when its proof's sequent is typed anew
  (`root`, `sameRoot`: the arena only grows, so the same sequent keeps its root and its
  arena's prefix). The structure is checked against the sequent as text (a goal's formulas as
  deduxit writes them, or the sequent as typed), never its JSON: once a ∀R or ∃L step was
  taken anywhere in the proof, the arena holds an eigenvariable, which deduxit's reader of a
  sequent refuses. A Kripke model with growing domains (`kripke_structure`, intuitionistic
  and minimal logic) is named in the verdict but not drawn:
  - a first-order sequent's finite structure (`Structure.tsx`, `src/lib/structure.ts`): the
    elements across the grid's top with "−" under each and "+" after them, a row of dots per
    predicate (a nullary one spans the row; arity k: a row per tuple of its first k − 1
    arguments), a row of squares per constant and per function's argument tuple (the element
    it names pressed); deduxit's `ordinary_structure` checks it after every change, and the
    sequent under the grid shows each formula's value and `⊭` or `⊨`. Its undo and redo are
    the view's (the counter's `past`, `future`; the tools' Undo and Redo and Ctrl+Z on this view,
    `undoStructure`), never the proof's. The symbols are read off the sequent's JSON
    (`signatureOf`: a predicate is a symbol an atom applies, `=` none). It opens from a goal's
    note ("See the countermodel", an outcome's `structure`) or, as M, from "+ view"'s "A model
    of your own" on a first-order sequent (one element, `blank`). A goal naming an
    eigenvariable has none: no structure interprets one (deduxit's `refuted`). The toggles
    hide on this view: a structure has no calculus;
  - a propositional sequent's Kripke model (`ModelView` with the seed deduxit found), from
    `ModelFigure`'s "Change this model and check it" and the tableau by hand's "Check its
    countermodel";
  - a modal sequent's model (`ModalCountermodel`, the editor bare, its verdict and system over
    it), whose cell stands while the sequent is not valid; the modal panel keeps the drawing
    and the button that opens it. The system's toggle stays: the model must meet it.
- **Course packs** (`src/lib/pack.ts` the formats, `src/islands/Packs.tsx` the runtime,
  `PacksContext`; boards D17 and D18): a pack `{"pack": 1, "title", "search", "problems":
  [{"suite", "parameter", "sequent"}]}` is `#v=4&k=…`, packed as `d` is (`link.ts`). Nothing is
  sent anywhere: the answers are kept in the browser under `deduxit-pack:<code>` (`packCode`, 48
  bits of SHA-256 of `packText`, shown nowhere).
  - **Made in Export** (`PackForm`, the panel's entry "Course pack" under Link): a title, the
    sequents at the top (each chip's own proof, started, outside an open pack) as problems to
    tick, then "Copy the link", "Copy the embed code" (`embedCode`, the link with `&e=1`) and
    "Print", which prints the problems' sheet (`Handout`). No switch bars the search and no code
    is shown: the page writes `search: true`, and reads an earlier pack's `false` as barring
    nothing.
  - **Met by a student as one chip** (`PackChip` first in the top row's tab list: the title and
    the count done, "Week 3, 1/3", a check once all are done) **and a page** (`PackPage`, in the
    stage's place while `ui.packPage`): the problems with their calculus (`markOf`) and state (a
    check, or a dashed ring), how many are done, with the guide on one sentence. The page has no
    rail, bottom box, toggles or tools, and only the frame's keys act there. The problems' proofs
    are not chips of their own (the top row leaves out `packs.isProblem`); a press on a row
    shows the problem (`show`), a press on the chip the page. The chip is chosen while its page
    or a problem is shown; T and Shift+T take the pack as one sequent; its close (the hidden
    target, Delete, W, More's "Close this sequent") closes every problem's proof with one Undo
    (`close`, which returns the way back).
  - **The limits are the prover's** (`Limits` holds `fixed` alone, `prover.restrict`,
    `NO_LIMITS` without a pack): a started problem's sequent or calculus does not change
    (`submit`, `setCalculus`, `modalSteps`, `customFrom`, `showModalStatement` ask first and say
    the reason on the proof's banner, `.calc-fixed` in the toggles' place). The search, the
    hint, the table and the tableau, the marking and the invertible rules work as anywhere; a
    modal problem is decided on opening, so a sequent that is not valid is done at once.
  - Both a pack and a hand-in are read key by key within bounds (`readPack`, `readHandin`: no
    key of its own, a calculus the registry knows in the linear, ordinary or modal suite, at
    most `MOST_PROBLEMS`). zod is not used here: its probe of `eval` is a CSP violation.
  - **A hand-in of the page before** (`{"handin": 1, "pack", "answers"}`, `#v=4&h=…`, or a file
    imported or dropped, `isHandin` by its first key) opens as its pack with its answers
    (`arrive(pack, answers)`): each session opens on its problem, read again by deduxit as any
    session is. The page writes no hand-in and has no check view.
  - A pack opened holds the address (the linking effect writes no tab's link meanwhile), so a
    reload opens it again with its kept answers: a kept session opens as its problem (its text
    the problem's), a kept model is checked again.
- **The embed**: `&e=1` on any link sets `data-embed` on the root: no earlier visit set aside,
  the top row's new-chip button and the new tab view's actions (`.new-actions`) hidden, an "Open
  in deduxit" link, and the links the page
  writes keep `&e=1`. GitHub Pages sets no header, and a `<meta>` CSP cannot carry
  `frame-ancestors`, so any page may frame it; the page in a frame reads and keeps only its own
  partitioned storage.
- **Print** (`@media print` in `app.css`, last in the file): the light scheme whatever
  `data-theme` says, no top row, rail, tools, panel or stage controls (the selectors weigh what
  the screen's rules weigh, and come later); with Export's Course pack shown, its sheet alone
  (`.pk-handout`, `print-only`: the title, each problem and its calculus, the link), drawn at the
  body's end through a `Portal` so that it flows over pages, everything else left out.
- **The tableau by hand is built by presses** (`HandTableau.tsx`, `src/lib/hand.ts`; the guide
  drops typing a tableau): it starts with the sequent's formulas, true left of ⊢ and false right
  of it (`begin`); a press on a line expands it by its rule on every open branch below it
  (`expand`), a branch closes by itself on a formula marked both true and false (or ⊥ true, ⊤
  false), and the tableau is a function of the lines pressed (`replay`), so Undo, the tools' or
  Ctrl+Z, drops the last press (`undoPress`). After every press the tableau is written in the
  text deduxit reads (`written`: a branch starts with "- ", its lines two in, × with the two lines
  that clash, `open` under a branch every line of which is expanded) and `ordinary_tableau_review`
  judges it: closed, open (its countermodel opens in the countermodel view) or unfinished. A
  line's button is named by what it shows first (`2 F b → a: false, …`, WCAG 2.5.3).
- **vitest keeps a module cache** (`node_modules/.vitest-cache`) keyed by a file's content, the
  module's store path resolved in it: after deduxit's module changes (a lock bump, an
  `--override-input`), `rm -rf node_modules/.vitest-cache` or a unit test runs the old module.
- **Proving a modal sequent step by step**: "Prove step by step" among the tools of a valid modal
  sequent (`modalSteps`) opens a proof in a calculus given as data beside the decision, in the
  same chip (D11): the rule file `modal_calculus` gives (`G3S4`), the sequent the root of the valid
  derivation (`rootSequent`, every compound operand bracketed: the typed text read by the calculus
  would associate `∧` and `↔` otherwise, and an atom named `R` is the calculus's relation),
  started first, so a refusal is said in the modal panel and leaves it whole; then the builder of
  `Custom.tsx`. Its offered steps are backward steps; in a sequent calculus a forward step
  (deduxit's `Interactive::extend`) is the same node as the backward step at the same members,
  so the builder needs no call of its own for it.
- **A modal tab in the workspace** joins as its statement (`modal.sequent`) and its decision
  (`modal.decide`, `joinedModal`), which the page runs at once (`runNodes`): it has no work
  node, so `rowsOf` takes a tab's node as `isTabNode` (class `work`, or `modal.decide`), and
  nothing of it is in `work()`. "A copy of this proof" ("+ view", once decided) adds a
  second decision on the same statement and opens it on a new chip (`openModalNode`, which
  reads the statement above the node and decides it there). Its key is the system and the text
  (`modalOf`): the owner's change sets the given statement and runs its decision; a copy is the
  same recipe on the same statement, which the library's cache makes one record, so the copy
  follows at once and shows the new statement, decided (`followStatements`, also after Undo);
  Update on a modal row runs its decision and shows the statement above it
  (`showModalStatement`). A copy's own change unlinks it, and so does a switch of a linked tab
  into or out of modal logic (`leaveForSuite`: its node is the other suite's); Undo of either
  links the parked modal tab again and shows its statement.
- **The linear suite's calls never get an ordinary session**: the premises' trial
  (`premises`), the engine choice and the cut are kept to linear proofs; `setInvertible` calls
  `ordinary_invert_all` for an ordinary one.
- **The registry reads every linear mode deduxit's `about` lists** (the switches build six; a
  session pasted in cyclic linear logic or the Lambek calculus opens and is stored as one), and
  `parseShelf` leaves out a proof it cannot read alone, never the whole shelf.
- **The sequent field's examples** are `src/content/examples.json` (`Examples` in
  `Frame.tsx`: with the guide on and ordinary logic chosen, over the bottom box), each with deduxit's verdict in every logic,
  held by `src/content/examples.test.ts`; the file's order is the menu's.

## The step tree (`src/lib/steps.ts`)

- **The tree is read off the session document**, never kept beside it: `inferences` (a
  goal is the index of its inference, the root 0) and `history` (the goals expanded, in
  order). A link, a file or the browser's storage gives the same tree as a proof made on
  the page.
- **Goals are named by path** (the premise taken at each inference), never by number:
  deduxit numbers inferences in the order they are made, so a replay that leaves a step out
  renumbers every later one. Everything stored across a replay (the active goal, a note,
  the hint's key, the redo stack) is a path.
- **Undo per branch** retracts the step that opened the active goal and every step since
  in that step's premises (`retract`), then replays the rest from the sequent. A history
  entry whose premise was expanded without being in the history is a search's graft; it
  replays by `close` again (deterministic: one thread, bounded by work), and a graft that
  no longer closes leaves its goal open and says so. The search's inferences are drawn
  apart (`searchMade`, the class `search` on the drawing's `g#i<n>`, whose rule label is
  the next sibling text: deduxit's SVG writes it right after the conclusion). A graft the
  search no longer closes within the settings (it closed under a larger budget, "Try N
  units") replays from its own inferences as steps (the action's `graft`), so an undo
  elsewhere never reopens it; only its marking as the search's is lost.
- **With the invertible rules applied by themselves** (`Settings.invertible`), undo takes
  back the nearest step on the branch that is not one of them (`retract`'s `invertible`,
  the view's list of the inferences an invertible rule closed), with every step since: the
  visitor's last choice and the invertible steps that followed it. Taking one of those back
  alone would only see it applied again at the next step. The session does not record who
  took a step, so an invertible step the visitor took by hand is passed over too; where
  every step on the branch is invertible there is nothing to undo.
- **A replay runs without the invertible rules** (`replaying()` in `state.tsx`, for every
  `replay` and `play`, and for a start that only reads the sequent): they are in the
  session as the steps they were, and applied again after each replayed step they would
  close the goals the recorded ones expand.
- **Every replayed step must make the premises it made** (the action's `made`); one that
  does not is taken back with deduxit's `undo` and its goal reported, never kept as a
  different proof.
- **`stepOf` rebuilds a step from its inference**: the principal's position; for two
  premises that split the context, the positions in the left premise, found by aligning
  the goal with both premises (`leftOf`): a contraction gives copies one occurrence, so a
  context formula may carry the principal's subformula's occurrence and no count tells
  them apart. Premises that hold the context twice over (`&`) take no split, which deduxit
  refuses. The fast-check property in `steps.test.ts` replays random proof
  attempts against the real module; extend its sequents when a rule is added.

- **A cut replays from its formula as typed** (the action `cut`): the session document
  holds a cut's occurrence, not its text, so `actions` and `retract` take the view's `cuts`
  (each cut's inference and formula in the mode's syntax) and give a cut `{formula, left,
  made}`, `left` found by `leftOf` with one formula of each premise's own (the cut formula
  and its dual). deduxit's `start` on the session's sequent leaves its cut formulas out, so
  the replayed cut makes the same occurrences. A worked proof (`prover.worked`) passes its
  stored session's view too (below).

- **At first order** a replay compares what a step made by occurrence (`madeOf` with the
  view's `forest`, each premise sorted): a replay that leaves a step out numbers the members
  past the forest anew. It finds a step's principal and split, and a cut's split, by what the
  formulas are (`memberKeys`: occurrence and frame terms, each eigenvariable and open witness
  named by the path of the quantifier step that made it, a ∀R/∃L step for an eigenvariable
  and a ∃R/∀L step for an open witness, since the latter also takes eigenvariables as
  witnesses), never by position: the core shares an instance's member across branches, so a
  replay that leaves out the branch that made it orders the other's goal otherwise.
- **A recorded witness or cut formula names each eigenvariable by its step's path** (`{1.0}`,
  `byPath`), read as the letter that step took in the session the action is played on
  (`lettered`): eigenvariables are lettered in the order their steps are taken, so a replay
  that leaves one out letters the later ones anew, and a redo entry outlives several replays
  (a map of letters went wrong when a redo entry's own letter came to be a kept one's). Each
  quantifier step's term (the view's `opened`, `term` on the action) is compared beside what
  it made: a ∃R/∀L step must take the same witness, or be open where it was (`null`, whatever
  filled it since), a ∀R/∃L step an eigenvariable; a mismatch is undone and its goal
  reported, as a propositional one is. A cut on an instance names its body's member: its
  block starts `depth` binders before it (`occurrenceOf`).
- **A worked proof's actions are read with its session's view** (`prover.worked` in
  `state.tsx` asks `view` of the stored session): without the view's `cuts` a cut has no
  formula to replay, and without its `opened` and `forest` a witness replays open.
  `actionsOf(session)` without the view serves only for paths and the count of steps.
- **The worker loads the module once more past the HTTP cache** when the first load fails:
  Chromium sometimes fails to write the 6.9 MB module to its cache
  (`net::ERR_CACHE_WRITE_FAILURE`), which aborts the streaming compile; about one load in
  twenty in a fresh Playwright context did, and About's version line never came.

## The frame (`src/islands/Frame.tsx`, `App.tsx`)

The design guide (`design/redesign.md`, "The frame", "Window sizes", "Keys") is the spec; where a
board and the guide disagree, the guide holds.

- **A chip is a sequent: a proof and the proofs beside it** (`Proof.beside`, stored with the
  proof; `prover.chipOf`, `members`): the top row's tab list shows the proofs that are beside
  none (`role=tablist`, the arrow keys move and choose, `rove` in `Frame.tsx`), each named with its
  state ("…, 1 goal open", "proved", "refuted"). A calculus opened beside (`setCalculus`, the
  natural deduction toggle), a copy of a proof ("+ view", or a link's copy, `arrive`) and the
  labelled calculus of a modal decision join the chip as cells of its rail; a translation proved
  and a goal proved apart are chips of their own. A press on the chosen chip switches between its
  main view and its graph. Its close (`.chip-close`, an `aria-hidden` press target over the
  chip's end, shown on hover and with the focus in the chip, always beside it on a touch screen)
  the key W, and Delete on a focused chip close the chip with every proof beside it
  (`closeChip`), the notice's Undo
  putting them back where they were. A proof not yet entered (`started()` false: no session, no
  modal or lambda decision) shows **the new tab view** in the stage's place: the four logics
  (pressing one sets the proof's calculus), "Open a file", "Restore N proofs", Learn and Practice
  inactive ("Coming soon", said in a notice when pressed, since a hover follows no touch), About.
  The logics are four in a row on a stage of 51rem and more (the row and the view's padding) and
  two by two below it, a container query: the guide's medium window keeps the row, which is
  wider than its stage (departs from the design). "+" and the word mark (a plain link to `/`, taken in place) reuse an empty proof before adding
  one.
- **The toggles** (`Toggles.tsx`) stand at the stage's top left on the new tab view and on a
  proof: ordinary logic's method and logic, linear logic's logic, Mix and Affine, modal logic's
  system, lambda's use; ordinary logic's method is "Sequent", "Natural" or "Fitch" (the last two
  one natural deduction proof, drawn as a tree or as Fitch's lines: `layout` in `Natural.tsx`),
  and a net's view adds "Formulas" or "Compact" (`Settings.net`). **A change keeps the proof
  where its steps hold** (`setCalculus` starts the sequent in the new calculus without the
  invertible rules and plays the proof's steps on it, `replayOnto`); where one does not, the
  proof keeps its calculus and the new one opens as a chip beside it, and the notice names the
  step ("Step 1 does not hold in ILL, so ILL opened beside. LL keeps your proof."). No restart
  warning is left. A replayed step is the same rule at the same positions, which deduxit checks
  in the new calculus: it may make other premises there (a split in ILL), still a legal proof.
  Structural rules and two-sided are the tools' "W C" and "Two-sided"; Cut is a tool.
- **The rail's cells are views** (`cellsOf`, a `Cell` names its proof and view): the graph's
  cell first once there are two views (`G`, 44 by 30); then each proof of the chip, named by its
  calculus (LK, LL, NJ; a copy with ⧉ and joined), its net once finished (one capsule with the
  proof), the views added to it, a view made from the proof joined to it by a short line
  (`data-tied`: CE, λ, a copy), a view out of date dashed with a red "!" (`data-stale`), and its
  countermodel view. A cell's name holds what it shows ("Truth table, TT", "Glivenko's
  translation, ¬¬ Gl") and its state. A press activates the cell's proof and shows its view.
- **The graph of views** (`GraphView`, D19) is the sequent on a chip-shaped strip at the top and
  each view under the one it was made from (`Cell.from`), joined by a line with a round elbow and
  an arrow head (`.graph-elbow`), a view out of date dashed; a sequent the workspace made from a
  proof by a translation is a chip-shaped node under it (`workspace.rows()`, the line's `from`),
  a copy beside such a sequent not repeated. Each node is a button named by its badge's letters,
  its name and its state, which opens the view; "Update all" is its tool.
- **The tools** (`Tools`) are a toolbar (one stop of Tab, the arrow keys move), each with
  `aria-keyshortcuts` and its key in its hover; with the guide on (`Settings.guide`, the top row's
  "?") each shows its name. A compact window makes them a bar of Undo, Redo, Hint, Close all and
  More, the rest (`data-rare`) in More's row (`ui.more`); a short window keeps the column with
  the same split.
- **Panels** (`ui.menu`: steps, search, export, import) stand left of the
  tools; in an expanded window the stage's box shrinks so that the drawing moves aside (the
  stage refits on its resize), in a medium one a panel lies over it, in a compact one it is a
  sheet above the bar. The Settings page and the dialogs (keys, About) are `ui.menu` too. A
  sheet's close button (`.tool.sheet-close`) shows in a compact window alone; outside one it is
  `display: none`, out of the tab order, by a selector that outweighs `.tool`'s later display.
- **A compact window under 480 high** (a phone's page at 400 % zoom, 320 by 200): the app keeps
  `--size-frame-least` (30rem) of height and the page scrolls up and down, so that no row lies
  over another (WCAG 1.4.10); every other window keeps the frame to the visible height.
- **The bottom box keeps clear of the zoom group**: centred where the zoom at the stage's lower
  right leaves room, else narrower and moved left (`--box-clear`, `--box-width` in `app.css`),
  from `--size-zoom` (the zoom's width, which `Stage.tsx` measures onto the stage's region, none
  while no zoom shows) and `--size-aside` (how far a panel moved the drawing aside in an expanded
  window, which narrows the stage and moves its zoom). So no note covers the zoom either: the
  notes are the box's width. In a compact window the box is the window's width less 16 and the
  zoom stands a gap above the notes instead (`--size-bottom`, the notes and the box measured).
- **The bottom box** binds the proof's `input`; Enter submits it (a session or a sequent in
  deduxit's JSON opens), and once it reads, the box writes it in signs (`inSigns`). The notes
  above it: the box's problem (with its place marked; the box takes the bad edge), the banner, a
  verdict, a notice (`ui.notice`, with an Undo where one exists, cleared by the next change).
- **Keys** (`src/lib/keys.ts`, `keyAction`): the guide's table, a letter read by
  `KeyboardEvent.key`, nothing in a field (Escape leaves it), nothing with Alt (AltGr), nothing
  while composing; Settings' "Single keys" (`Settings.singleKeys`, on at first) turns off every
  key but those with Ctrl or Cmd. `?` and Ctrl+/ open the list, whose first row is the guide's
  switch. The zoom's keys are the stage's. W closes the chosen sequent, G opens its graph (or
  its main view from the graph), V and Shift+V move through the rail's cells across the chip's
  proofs, T and Shift+T through the chips.
- **Restore** (`App.tsx`): each visit holds a Web Lock named by its shelf key
  (`prover.shelfKey()`, held until the page closes; again after `leave()`). A plain visit (no
  fragment) with no other shelf key's lock held restores the last visit's proofs by itself;
  otherwise the new tab view offers them. Settings' "Close every sequent" is `leave()`, whose
  proofs are then the ones to restore: the notice's Undo restores them.

- **The page's start** (`App.tsx`): the app is `aria-busy` until a link has opened or a plain
  visit's proofs were restored. A plain visit restores them after the first paint, so a test that
  goes to the page again in the same browser saw the new tab view and raced the restore: the
  tests' `goto` waits for the start.
- **The Export panel** (`Export.tsx`, board D16) exports the view shown: a linear proof's net as
  a picture (its texts say to show the proof), a derivation in every format, any other view its
  proof's, the right column naming "The proof in LK". Natural deduction, a modal decision and a
  lambda-term write through their own suite's calls (`kind()`, `subject()`): natural deduction's
  session (`naturalSession` of `Natural.tsx`) through `rules_export`, with `view.layout` the tree
  or Fitch lines as shown, its pictures from that SVG; a modal outcome through `modal_export`
  (a valid one's derivation) and `modal_draw` (its derivation or countermodel as a picture); a
  checked term through `lambda_export` and `lambda_draw`. These have no Text, Session or Rocq
  (deduxit writes none), each entry saying so; their links hold the sequent or term alone.
  The tool is open wherever a proof has something to write (`exportable` in `Frame.tsx`). The entries are buttons with
  `aria-current`, under fieldsets per group; the chosen one is kept for the visit. Each setting
  is one of deduxit's `--style` options (`Settings.exports`, an `ExportLook`, stored): a
  picture's font (`Settings.font`), background (`svg.background`) and PNG scale (`png.scale`),
  the rule names (`labels` of every format), a whole LaTeX or Typst document (`form`), the text
  tree's line (`text.bar`), the Rocq lemma's name (`rocq.lemma`, sent only while Rocq reads it
  as a name: one it refuses would refuse every format's settings). A text format shows what it
  writes (a resource on the proof, the entry and the settings) before Copy or Save. Rocq writes
  the finished proof's certificate, else a refuted goal's (`certificate`, the linear outcome;
  `modelCertificate`, the ordinary countermodel), else says why not. Copy and Save say what they
  did in the notes. In a compact window the entries wrap in rows (a row that scrolls sideways
  hid entries partly, which the target-size walk failed).
- **The Settings page** (`SettingsPage` in `Panels.tsx`, board D10): sections of rows (`.st-row`,
  label left, control right or under it): Look, Search ("Defaults for" Ordinary, Linear or Modal:
  the engine where deduxit takes one, linear logic's, for the visit; the budget and the
  first-order bounds, each logic's, `Settings.search` with `setSearch`), Proving, Keys, This
  browser, About (three rows: the keys, About with its licences, the privacy page). The settings
  in force (`prover.settings()`) take the search's values of the shown proof's logic
  (`searchLogic`: natural deduction and lambda-terms are ordinary logic's); the flat values stored
  before them are every logic's start.
- **The signs are the page's own** (`Signs.tsx`, the guide's 18-unit grid, round stroke, no
  fill, class `icon icon-NAME`); no icon package is left. A new sign is a path there.
- **More's rows hold "Close this sequent"** (`more-only`, hidden in a column): a real button
  outside the chips' tab list, where a screen reader on a touch screen finds it; it closes as W
  does, the pack a problem is of included.
## The drawing and the stage (`src/islands/Stage.tsx`)

- deduxit's SVG goes in by `innerHTML`; it stays a picture (`role="img"`, its `<desc>`),
  and every formula of an open goal gets an HTML button over it, placed from the
  element `#i<n>-<p>`'s box (`view.inferences[n]` is the goal `i<n>` draws). The drawing
  is asked with `styles.svg.font_size` 30, so a formula is a 24-pixel target at 100 %.
- **Colours that carry a meaning** (the verdicts, the selection and active goal, the
  nets) stay apart from the colours seen with them under simulated protanopia,
  deuteranopia and tritanopia: `src/styles/colours.test.ts` holds the tokens to it, with
  Machado, Oliveira and Fernandes's matrices (severity 1.0, the authors' own table; their
  paper does not claim tritanopia, the matrix is used as published) on linear RGB and the
  distance in OKLab, 8 under a deficiency and 15 in full colour, by groups of colours seen
  together: a net's colours with each other and with the verdicts' and the selection's colours
  around them. Each meaning has a word, a sign or a shape beside it: a tab's state is a shape
  (`STATE_MARKS`, a check, a cross, a question mark, a dotted circle, a dashed one), a
  hint's rungs a bar or a hairline. A new colour of meaning joins a group of the test.
- **The mark's lapis is not a colour of meaning** (`--color-logo`, the lapis of `src/logo/`'s
  files, #2456c9 light and #7aa7ff dark): it is the project's identity, fixed, a token of its
  own and never `var(--color-accent)`. It stays out of `colours.test.ts`'s groups, since no
  Okabe-Ito blue of the nets can clear it and it marks nothing (WCAG agrees: SC 1.4.3 exempts
  a logotype, SC 1.4.11's Understanding treats it alike); instead the test holds it to 3:1 on
  the paper and the field in both schemes, and to the `.logo` rule alone: no other rule, token
  or component may name it, so the exemption cannot reach a colour of meaning. Decided by the
  planning session on 2026-11-09 for the author's review (it departs from the design, where
  the violet logo was paired with every colour of meaning and exempt only beside the equal
  accent).
- Colours come from CSS over the SVG's attributes (`.drawing svg text { fill: … }`), so a
  theme change needs no redraw; the exports keep deduxit's own colours. The colours that
  mean something in a net are exempt from the ink, matched by the value deduxit writes
  for its default `Style` (`#0072b2` the `⅋` edges and the essential net's input side,
  `#cc79a7` its dominator lines, `#d55e00` a witness's edges) and repainted with
  `--color-net-*` at 4.5:1 on the field: a change of deduxit's defaults fails the
  essential net's colour test rather than turning them to ink. The page's net colours are
  hues of Okabe and Ito's palette (blue for `⅋` and for the input side, which never share
  a drawing, reddish purple, vermilion), each darkened or lightened for contrast; `⅋` is also dashed, a dominator line
  dotted and the input side's edges point up, so no net colour is all that tells its kind.
  A witness is drawn only for a structure that is no proof net, which the page never
  draws (its nets are of finished proofs).
- The net is drawn as Settings' "Proof nets" says (and a net view's toggle) (`styles.svg.net`: `formulas`, every
  occurrence written, or `compact`), in the view and the net's exports alike. The stage
  fits the drawing afresh whenever what it draws changes (another proof, the tree or the
  net, the net's drawing), since the net with its formulas is far larger than the tree.
- **The net's look** is `Settings.netLook` (`styles.svg.net_look`, deduxit's `NetLook`, sent
  as its three fields by `lookJson`), stored with the other settings, each field read back as
  deduxit's default where the stored value is not one of its own (`storedLook`). Settings' "Look"
  shows it as a row "Look of a net" (deduxit, Textbook: `DEDUXIT_LOOK`, `TEXTBOOK_LOOK`, each
  pressed only while all three fields are its own) and a row per field (`LookRow`), each
  button with its tip and a line under them for a touch. The stage and the exports draw with
  it, and the stage refits when it changes (a look can add rows).
- **Every overlay of a goal stands over what it acts on** (`placeOver` in `Stage.tsx`, placed
  again once it mounts, `placeSoon`): the rule popover over its formula, the goal's menu over
  its `⊢`, a split's or a cut's premises over the goal (the cut's box over them); below where
  the stage's top leaves no room; in a compact window each is a sheet at the stage's bottom,
  above the zoom's place there (as if no note lifted it), and the zoom hides while one is open
  (`.stage:has(.pop, .premises)`): placed above a zoom lifted over a long note, the sheet came
  down on the goal's own formulas (axe's walk of a goal's reasons at a phone's width).
- **The witness's box is in the rule popover** (board D8; `Witness` in `Goal.tsx`,
  `ui.witnessing` beside `ui.selected`): a rule offered with `witness` (∃R, ∀L; one-sided ∃),
  pressed, stays pressed and opens the box beside the row: the quantifier's variable
  (`boundVariable` of the formula's text, `y =`), the term typed in the formulas' font with an
  enter button, and `$1`, which leaves the witness open; deduxit's refusal stands under the
  field (`witnessed` in the state answers it, `ordinaryRefusal`'s `witness` and `binding` in
  an ordinary proof, which take deduxit's reason as written: it may start with a symbol's
  name). Digits typed in the field pick no rule; Escape closes the box and gives the focus to
  its rule; another formula picked closes it. ∀R and ∃L take no box: deduxit names their
  eigenvariable, as the session's letters (`a`, `b`, …). An ordinary proof's rules carry
  `witness` from `ordinary_rules` and its step a `witness` (`OrdinaryStep`).
- **A proof replayed onto a goal letters its recorded witnesses** (`replayOnto` in the
  state, `lettered` of `steps.ts` with the goal's path as `base`), as `play` does: a linear
  action names an eigenvariable by its step's path (`{1.0}`), read as the letter that step took
  in the session played on; an ordinary proof's steps (`replaySteps`) carry no witness, since
  the session document holds a term's index and no text, so a witness replays open and the
  axiom that used it fills it.
- **Zoom is the stage's on the stage and the browser's everywhere else.** The stage keeps
  `touch-action: none`, so the browser makes no gesture there and the stage's pointers do:
  one on the field pans, a second finger (wherever it lands, a formula's button too) makes
  a pinch about the two fingers' midpoint (`pinch`), and ctrl with the wheel (a trackpad's
  pinch in Chromium and Firefox) zooms about the pointer; Safari's trackpad pinch arrives as
  `gesturestart`/`gesturechange`, taken only while no touch pointer is down (on iOS the
  pointers make the pinch). Nothing else on the page sets a `touch-action` or cancels ctrl
  with the wheel or ctrl with plus or minus, and the viewport allows zoom (WCAG 1.4.4):
  `tests/zoom.spec.ts` checks every element outside the stage. Chromium's own pinch needs
  the fingers to spread past its slop: the test's page pinch goes from 20 to 100 pixels
  either side (20 to 60 zoomed nothing), and CDP's `Input.synthesizePinchGesture` zooms
  nothing in this Chromium at all.
- **The buttons are laid only over the drawing of the current session** (`hostSession` in
  `Stage.tsx`): between a change of the proof or its session and the new drawing the host
  holds the old one, whose `i<n>-<p>` ids the new view may match, at a zoom fitted to another
  drawing; buttons laid there were narrower than a control (the tour's first stop opens a new
  tab: a 39-pixel button in `targets.spec.ts`, now and then).
- **The goal bar numbers the active goal among the open ones** ("Open goal 1 of 2",
  `openGoal`), while the Steps list, the formulas' accessible names and the live region keep
  deduxit's ids ("goal 3"): the bar answers "how many are left", the ids name a goal across
  steps. On a phone the bar keeps one row, "Goal N" (the same place among the open ones), the
  count being the chip's state (`phone.spec.ts` measures the row with Cut in it).
- Solid's narrowed accessor in `<Show>{(x) => …}` goes stale once its condition is false:
  read it before the handler changes what the condition reads (the goal's menu: its goal is
  read before the menu closes).

- **A split and a cut show the two premises they would make over the goal** (`PremisesView`
  in `Goal.tsx`, `ui.split`, `ui.cutting`): each dashed, the goal's formulas as chips (a press
  moves one to the other premise; in intuitionistic mode the goal's formula right of ⊢ is
  written, never moved), each premise's own formulas beside them, and at the line's end the
  button that applies the step, never greyed: every split is a legal step, and the page says
  nothing of whether a premise can still be closed (the author's correction, 2026-11-25;
  `split_passes` is no longer called). The own formulas are read off a trial that sends no
  formula to the first premise (`premises` in the state: `apply`, or `cut`, then the opened
  goals' formulas less the goal's). The cut's box (`ui.cutting`, the tools' Cut) takes the
  formula in the tab's syntax (ILL's in an intuitionistic tab); once it reads (a trial 250 ms
  after typing), the premises show; a text that is no formula or a refusal is said under the
  box (`cutProblem`), never as the goal's note. A formula's button pressed on the stage moves
  it as its chip does.
- **Cut elimination** is each proof's `elim.tree` and `elim.net`, never stored, cleared by any
  change of the session (`show`): the proof or net reached (deduxit's `cuts`/`net_cuts`
  answer, its document sent back with each call), the steps taken with the drawing each
  was taken on, and the way back. Undo keeps the state before a step; a step of "To the end"
  is taken again on undo by `eliminate` from the run's start with `cut.steps` one fewer and
  `cut.drawn_bytes` 0 (the strategy is deterministic and nothing else of a run is kept).
  The stage draws the reached proof or net (or with "Before" the drawing a step was taken
  on, its cut marked by the classes `reduced` and `acted` on deduxit's ids, a net's marks
  deduxit's own), with a `.cb` button over every cut, the strategy's next outlined
  (`next-cut`). A net's elimination draws as `draw_net` does: an intuitionistic net with
  cut links under its reading. Settings' "Elimination steps" is `cut.steps`.

- **Every reason is a line in view under its keyword, never a tip** (`Why` in `ui.tsx`, class
  `said-why`): a goal's note (a refusal, a verdict), a greyed rule's card, the stage's banner, the field's parse error, the status's verdict, a greyed export
  entry (its "Nothing to export" line in the panel's right column), a greyed engine in the
  search's settings (`.why-not`), the greyed Mix switch, and the
  greyed Net tab once pressed (`.net-why`, until Tree is pressed). Tips
  follow no touch, and a reason is what the visitor needs to act. A `Said` with `more` keeps
  its rest behind a "more" button (the saturation refutation's); the keyword is a `span.kw`,
  no longer a button. Tests read the line (`toContainText` on `.goal-note`), not `data-tip`.
- **The rule popover holds one button per rule of the formula's connective** (`RulePopover`
  in `Goal.tsx`): deduxit's `rules` lists them, and each is tried on the goal with `apply`
  (`rules` in the state; no state change, the invertible rules off, a linear split never
  tried since every split is legal, a witness tried open); a refused one is greyed
  (`aria-disabled`, still focusable) and its reason is the refusal's wording (`refusal`,
  `ordinaryRefusal`). The pointer or the focus on a rule shows its card (`role=tooltip`): the
  rule drawn, premises over conclusion (`ruleForm` of `RuleHint.tsx`, the hint tables), no name
  and no sentence; a greyed rule's card adds the reason, and a press on it keeps the card
  (`role=note`) until the next press, which is a touch screen's way to the reason. The digits
  and the arrow keys act while the popover has the focus; a digit typed on the formula's button
  before the rules arrive picks its rule then. The time from the press to the popover with its
  greyed rules is a User Timing measure, `deduxit:rules`.
- **The goal's menu at its `⊢`** (`GoalMenu` in `Goal.tsx`, `ui.goalMenu`; the `⊢`'s button is
  `.gt` over the text `⊢` of the goal's group, at least a control's size): Close goal (key C)
  with a caret for that search's settings, Prove apart (`openGoal`: a new chip whose `origin` is
  the goal), "Use its proof" once that chip's proof is finished in the same calculus
  (`apartFor`, `useApart`), and Go back on a goal marked as having no proof while the sequent
  may still have one. Its buttons show their names with the guide on. Natural deduction has a
  `?` beside the goal
  in its panel with Prove apart alone: the rules suite has no search.
- **A proof made apart closes its goal by its steps** (`useApart`, `replayOnto`): its
  sequent is the goal's as written, so the positions are the goal's; each step is applied
  again on the goal's subtree (a linear proof's actions by path; an ordinary proof's steps by
  `replaySteps` of `ordinary.ts`: the rule above each step's structural run, its formula found in
  the target goal by its id in the sequent document when both sessions share that document, and
  each premise followed to the goal the replay opened for it, never by path, since LK and LJ
  make different structural runs and keep different formulas right of ⊢), a goal the search closed there is closed by the search again, and a refusal
  or a goal left open changes nothing and says so. The goal's path is kept under `APART` in
  `engines`: the drawing greys its subtree as the search's, and the steps list marks them
  "apart". deduxit's `fill` is no longer called.
- **A goal with no proof is marked after each step** (`mark` in the state, run by an effect
  of the stage on the session; Settings' "Mark goals that have no proof", on at first): a
  search within `MARK_BUDGET` (a sixty-fourth of the tab's) on each open goal not asked before,
  the answers cached for the visit by the goal's calculus and formulas, so a step asks only of
  the goals it opened. A goal marked "none" has its line red with a cross at its end and its
  `⊢`'s name says "no proof"; a sequent whose root was marked "none" gets the verdict "No
  proof" (its chip's cross). The marking's
  time is a User Timing measure, `deduxit:mark`.
- **An open goal has a dashed lapis line over it** (`.goal-line`, two pixels on the screen at
  every zoom through `--zoom` on the world); deduxit's `⋮` over it is hidden (`.goal-dots`).
- **The formulas' buttons lie under the drawing** (`.hits` before `.drawing` in the world,
  the drawing `pointer-events: none`): a chosen formula's ground shows through the drawing's
  empty ground, under its text. Nothing on the drawing itself takes the pointer.
- **Go back** (`prover.goBack`, `wayBack` in `steps.ts`) is offered beside the verdict of a goal
  the search refuted that is not the sequent itself, unless the sequent's own verdict (kept in
  `Proof.verdict`) is that it has none. It asks each goal below, nearest first, whether it
  still has a proof: a replay without the steps above it (`retract` with that goal's child,
  no invertible skipping; in an ordinary proof `retract` of `ordinary.ts` and the reader's
  check), then one search within the budget, the kept root verdict in place of the sequent's
  search. The first goal with a proof is shown open, the steps taken back are one entry of
  `redo` (or `later`), and its note says so; none found, the note says whether the sequent
  has no proof or the budget decided nothing. A search Go back makes is never grafted. In an
  ordinary proof a goal inside a step's own run (the contraction under `¬L`, say) reopens as
  the step's goal, below it: the walk keeps each reopened goal's answer by its path, asks it
  once, and the note goes to the goal reopened, never to the path the walk asked.
## The state (`src/islands/state.tsx`)

- **A goal's formula is shown as it reads** (`shown` in `src/lib/words.ts`): in
  intuitionistic mode deduxit's `reading` (a hypothesis `A ⊸ B`), which its `text` is too, else
  the one-sided `text` in signs. The formulas' buttons are named so (`A ⊸ B, formula 2 of
  goal 1`), and the rules popover and the premises of a split write them so; a step still
  names a formula by its position.
- **An intuitionistic sequent is typed in ILL's syntax**: deduxit reads intuitionistic text
  strictly (a `~`, `^`, `par`, `|`, `?` or `bot` refused with a hint), so the page reads the
  field, a preview and an opened document with `read_as` in the proof's mode (`api.readAs`),
  never `read`, whose reading has no mode. A goal opened in a new tab is written from its
  formulas' `text` (`sequentText`), two-sided in intuitionistic mode, with no dual of a
  one-sided formula: there is none to write. `problems.test.ts` holds every intuitionistic
  problem to the strict reading and its print.
- **A tab shows its sequent as typed, in signs** (`displayed` in `src/lib/words.ts`, in
  Euler Math): `A⊥` for `~A` and `A^`, which deduxit's parser does not read, so the link
  keeps `pretty`'s text, which it does; `forall x.` and `exists x.` as `∀x.` and `∃x.`.

- **Light dismiss** (`App.tsx`, one capture `pointerdown` on the document): a press outside
  what is open closes it as Escape does: a panel or dialog (`ui.menu`, inside: `.menu`,
  `.dialog`, and any `[aria-expanded=true]` toggle but a formula's; the Settings page is a
  page and only its own button leaves it), More's row (inside: `.tools`), the goal's menu
  (inside: it and the `⊢`s), and the rule popover or a split's premises (inside: the stage's
  `.pop`, `.premises` and every formula's button, by which a rule or a side is chosen); the
  cut's box keeps the tools inside too; the tour's caption
  is inside everything. A press on the stage that closes something does nothing else: its
  `pointerdown` stops there (no pan) and its `click` is swallowed (no formula picked, no stage
  button pressed); a press on a button of the frame closes and acts. A toggle must carry
  `aria-expanded`, or its own press would close its menu before its click opens it again.
- **The first-order bounds** are Settings' "Witness depth", "Instances" and "Terms" of ordinary
  and of linear logic, each its own"
  (`search.witness_depth`, `search.instances`, `limits.terms`), deduxit's tab defaults (64,
  2¹⁶, a million) and sent only where changed, so every other call's settings read as
  before; a search they stop says so (`verdict`'s `witness_depth`, `instances`).
- **The invertible rules' switch** is Settings' "Apply invertible rules by themselves",
  after Budget (the proving behaviours), off by default, stored with the other settings;
  `json()` adds `interactive.invertible` while it is on, so `start` and `apply` apply them.
  Turning it on applies them at once to every open goal of every proof (`setInvertible`,
  deduxit's `invert_all`). An ordinary tab follows it too (LK's and LJ's invertible rules,
  deduxit's set): `ordinaryStepping(id)` adds the key to `ordinary_start` and `ordinary_apply`
  alone, `ordinary_invert_all` runs when it is turned on (and empties `later`, whose sessions
  lack those steps), and undo passes the view's `invertible` to `retract` of `ordinary.ts`
  less the goals a search grafted (the visitor's choice whatever rule the graft starts with). Its tip (`INVERTIBLE_TIP`) says what an invertible rule is and why
  applying one loses no proof; tips never follow a touch, so the line under it says what the
  page does. With the switch on, the hint points past the invertible rules: deduxit's hint
  starts after them.
- **The hint points at the next press from where the visitor is** (`pointer` in `Stage.tsx`;
  `hint` in `App.tsx` asks deduxit once per goal, `ui.ladder`): the formula to press; with that
  formula chosen, the rule to take (ringed in the popover); with its split open, the chips to
  move and then the apply button; it takes no step and nothing back. The ring is always shown;
  the words are a line over the bottom box with the guide on (and in the live region), and
  where the search finds no proof the line says so and to undo whatever the guide.
- **The guide's sentence** (`GuideLine` in `Stage.tsx`): with the guide on, one sentence over the
  bottom box says what to press next on a proof by hand, one action each; none where the hint's
  line stands.
- **The Two-sided switch** is a tool ("Two-sided", `Frame.tsx`), a setting of the tab (`Settings.twoSided`, off by default, stored with
  the others), not of the proof: it changes no session and restarts nothing. While it is on,
  `viewJson` adds `view.classical: "two"` to `json()`, the stage's `drawSettings` and the
  exports' settings, and deduxit draws the derivation two-sided as the sequent was typed
  (`~L`/`~R` where a negation was typed); a session keeps how its sequent was typed from
  `start`, so turning the switch on redraws any proof at any point.
- **One action that changes a proof at a time** (`guard`): each reads the session, waits on
  the worker and shows the answer, so a second begun meanwhile would build on a session
  the first replaces. An action asked for while one runs does nothing; the tools wait on
  `busy`, and Close all turns into Stop while a search runs.

## The workspace of linked tabs (`src/lib/workspace.ts`, `src/islands/Workspace.tsx`)

- **Nothing of it before the first link**: no document, no call. A link is made by
  "Prove it in ⟨logic⟩" on a translation's view (`proveTranslation`: the shown tab joined,
  `ordinary.translate` and `ordinary.start` on it, one action "translation", the line's check
  made at once) and by "A copy of this proof" in "+ view" (`duplicate`, one action "copy"). deduxit's design is `plan/notes/63g-design.md` (sections 12 to 15) in deduxit.
- **A linked tab is a proof node** (`ordinary.start`, class `work`) of deduxit's workspace
  document; its sequent is the node above it, given (a tab the visitor typed in) or made (a
  translation). `state.tabs` maps a tab's id to its node; `rowsOf` reads the rows, each with the
  line above it (`made` with the operation's name and the check, or `copy`), from
  `workspace_view`.
- **The document is a string handed back as it is** (`state.doc`, every answer's `workspace`):
  parsed and written again, a value's keys could come out in another order, which is another
  value to deduxit, and every result would drop.
- **The tabs' sessions are laid in before each call** (`work()`, the bindings' `work`), but for a
  node the workspace has just remade (`remade`: a restart, and the node of a tab whose sequent
  changed, which keeps the earlier session so that the change's Undo brings it back) until its
  tab shows the new session. Without that the view hands back the tab's old session.
- **A typed tab's sequent or logic changed** (an effect over the linked tabs' sessions, `seen`
  keyed by logic and sequent, `keyOf`): the tab that owns its given sequent (no line above it)
  makes one action, "sequent change" or "logic change": its given node set, its proof restarted
  and the tab's new session laid in; what was made from it is out of date. A made tab's or a
  copy's own change leaves the workspace ("unlinking", the tab parked): its line would be false,
  and a copy shares its given node with the tab it was copied from. The design's read-only field
  is not built.
- **Undo needs the sessions the tabs no longer hold**: `latest` keeps each linked tab's latest
  session of the sequent the workspace knows (steps included), laid in (`work(kept)`) before a
  change or a closing, so that their Undo brings that proof back. The bindings leave out of `work`
  a node an undo took away. After an undo or redo, a tab whose node is gone is closed if the
  workspace opened it (`opened`) or unlinked and parked (`parked`) if the visitor typed it; a
  parked tab whose node comes back is linked again after it shows the session back (the write
  runs the change's effect, which would read the tab's own sequent as a change).
- **What needs no search is made again by itself** after every action (`remake`: the instant
  derived nodes not current).
- **The page has no workspace panel**: the graph of views shows the translations it made (as
  chip-shaped nodes) and Update all; a copy it holds joins its proof's chip on a link's arrival.
- **The link** of a linked tab is version 3 (`writeWorkspaceLink`: the tab's whole linked group,
  every tab joined to it by lines either way, packed without results; `n` the shown node); past the limit the
  tab's own link. Arriving (`arrive`) reads it as a claim (`workspace_open`), opens every linked
  tab as a chip, shows the link's and says so in the proof's banner.
- `tests/workspace.spec.ts` drives each; `linking` in `tests/states.ts` puts the page in each
  state for axe and the target sizes.

## What holds the work

- **The link** (`src/lib/link.ts`): `#v=2&u=<suite>&m=<parameter>&s=<sequent>&d=<session>` in
  the fragment (a link of the first version, `#v=1&m=<mode>&…`, reads as the linear suite;
  `link.test.ts` holds both),
  the session deflate-raw and base64url, dropped past 2000 characters (Export's "This proof"
  says so). Export's entries under Link show the link and copy it with the session ("This
  proof") or without ("The sequent": an exercise, no step taken). A link whose session deduxit refuses loads the sequent and the mode, with
  "Proof not restored"; one past `UNPACKED_LIMIT` (512 KiB, read through a capped
  inflate) says so, and one whose sequent does not parse puts it in the field with the
  parse error marked, as if typed. The sequent is the field's text with the ASCII connectives as their signs (`pretty`, which `words.test.ts` holds to read as the same sequent).
  The page reads the fragment at its load, and writes it 400 ms after each change of the
  shown proof (`replaceState` in `App.tsx`, which fires no `hashchange`; `wrote` keeps the
  fragment written, so a `hashchange` to it is ignored). A link pasted into the open page,
  where only the fragment changes, is read on `hashchange` (`pasted`) and opened as a load
  would: `leave` stops the work, closes every proof and starts a new visit, so the closed
  proofs are the ones "Restore N proofs" offers on the new tab view, with those set aside
  before; a
  fragment that is no link changes nothing. The page's start and each pasted link run one
  after another (`opening`). `prover.spec.ts` sets `location.hash` for it. A test of a link's
  load opens it in a page of its own: `goto` to another fragment of the loaded page opens it
  in place, and a reload right after may race the page's own write of its link.
- **Autosave** (`src/lib/shelf.ts`, version 2: each proof's `calculus`; a shelf of version 1,
  each proof with a linear `mode`, reads as the linear suite): every visit (tab) saves its open proofs under
  `deduxit-proofs:<visit>`, each with the time, so two tabs never overwrite each other; at a
  visit's start the other visits' are gathered into `deduxit-proofs-previous` to restore (by
  itself or by "Restore N proofs"), the copy of a proof saved last winning, and work begun
  before the visitor answers overwrites nothing. A proof open already (a link's) is taken out
  of them (`prune`). Settings are `deduxit-settings`,
  the theme `deduxit-theme` (read before the first paint by `Base.astro`).
- **The browser's keys are `deduxit-*`, moved from `linlog-*`** (the prover's rename,
  2026-11-09): `deduxit-settings`, `deduxit-theme`, `deduxit-practice`,
  `deduxit-proofs:<visit>`, `deduxit-proofs-previous` and the service worker's caches
  `deduxit-site-<version>`. For one release after the move, `migrate` (`src/lib/storage.ts`),
  first in the island's body before anything reads storage, moves each `linlog-*` key's value
  to its new key (a newer value there wins) and deletes the old key; `PREPAINT` reads
  `deduxit-theme`, else `linlog-theme`, so the first paint after the move keeps a pinned
  theme; the worker's activation deletes every `linlog-site-*` cache. Then remove the three
  together. A key renamed again needs the same move; the privacy page lists the keys as they
  are. `storage.test.ts` and `prover.spec.ts` load old keys, `offline.spec.ts` an old cache.
  What else keeps the old name: this repository
  and its directory (`linlog-prover.github.io`), the prover's local checkout
  (`~/Projects/own/linlog`) and the Rocq library's old address `/rocq-linlog/`, forwarded:
  the path itself by its page, any page under it by the 404 page's script to the same name
  under `/rocq-deduxit/`, where the library's documentation forwards 0.2.0's `Linlog.X.html`.

## The Content-Security-Policy

- **A `<meta>` element, Astro's** (`security.csp` in `astro.config.ts`): Pages sets no
  header. Astro writes it at the end of `<head>` with the hashes of the inline code it
  makes (the island's runtime and its `astro-island` style), and a `<meta>` policy covers
  only what follows it: so nothing inline goes into `<head>`. The pre-paint theme script
  is the body's first element, its text `PREPAINT` (`src/lib/theme.ts`), whose hash the
  config adds, since Astro hashes no `is:inline` script.
- **What a `<meta>` policy cannot do**: `frame-ancestors`, `report-uri` and `sandbox` are
  ignored there, so the page can be framed; the worker that runs deduxit's module gets no
  policy at all (a worker's comes from its own response's headers).
- **The check reads a policy as a browser does**: the first copy of a directive wins, and
  `script-src-elem`/`style-src-elem` govern the elements where present (`governing`).
- **Checked twice**: the `csp` flake check (`modules/_checks/csp.py`) recomputes every
  inline script's and style's hash from the built HTML and fails on one the policy lacks,
  on a policy after any script or stylesheet, on a loose source or a missing
  `'wasm-unsafe-eval'`; `tests/fixtures.ts` fails any Playwright test during which the
  browser reported a violation, so every interaction runs under the policy. Import
  `test` from `./fixtures`, never from `@playwright/test`.
- **No Shiki** (`markdown.syntaxHighlight: false`): it colours code with style attributes.

## The licences served (`src/integrations/licences.ts`, the `licences` check)

- `/licenses/bundle.txt` is Vite's `build.license` (the npm packages in the bundle), plus
  Astro's notice, whose island runtime is inline in the pages where no bundle sees it;
  `/licenses/THIRD-PARTY-NOTICES.txt` the Rust crates' (deduxit-web's), `LICENSE.txt` the
  EUPL. The upload to Pages drops dot-files, so nothing is under `.vite/`.
- **Fonts live under `/fonts/`** beside `<Family>-OFL.txt`: `assetFileNames` sends them
  there, but only for what the server build emits (the stylesheet's fonts, and deduxit's
  five math fonts because `index.astro` imports their URLs and passes them to the island
  as `fonts`); Astro's client build names its own assets, so a font imported from the
  island would land in `/_astro/` and fail the build. A new family is a line of `FONTS`
  and of the check (`families` and the served licences compared with deduxit's). A licence
  that is not the OFL is served as `<Family>-LICENSE.txt` (`ofl: false`): New Computer
  Modern Math's, the GUST Font License's, with the LPPL's clause 6 notice deduxit wrote.
- **The formulas' font** is `Settings.stageFont` (a `MathFont` name, Settings' "Font of the
  formulas", default Euler Math): the stage's drawing asks deduxit for it
  (`styles.svg.font`, `drawSettings`), and `App.tsx` sets `:root[data-math-font]`, which
  `app.css` turns into `--font-math` (one token per font in `tokens.css`), so every formula
  of the page, the tabs' sequents too, follows. `font(name)` fetches a font's bytes once and
  adds them to the document under the family its file names (`MATH_FONTS[].family`, which
  deduxit's drawing asks for): Euler Math at the start, another font when it is chosen for
  the stage or an export, never before. **The exports' font** is `Settings.font`, null for
  the stage's (`exportFont`); the Export panel's Font list sets it, the stage's font
  setting it back to null; `render` gets that font's file and no other.
- **Rocq's logo is the one third-party file the repository holds** (`src/third-party/rocq/`:
  `icon-rocq-black.svg`, the path of rocq-prover.org's small logo, and `LICENSE.txt`, its source
  and the Unlicense its site releases it under). No package carries it. The build serves both
  under `/licenses/rocq/` (`licences.ts`), About lists the notice, and `RocqLogo` in `Signs.tsx`
  draws its path in the text's colour beside the Rocq export. The `licences` check takes it as
  the one image outside `logo/`, beside a notice that names the source and holds the Unlicense.
  A new third-party file needs the author's yes and the same three: notice, served, checked.
- **The service worker caches the four other math fonts when first fetched** (`LATER` in
  `sw.js`, filled by `offline.ts` by their file names, and the build fails unless there
  are four), not at install: a visitor who never chooses one never downloads it (0.4 to 1.3
  MB each), and one chosen once works offline. deduxit's renderers' module and its glue
  (`deduxit_web_render`) are in `LATER` too, two files or the build fails: a visitor who
  never exports a PNG or a PDF never downloads them (1.6 MB at gzip). Every other file is
  cached at install.

## The written content (`src/content/`, CC BY 4.0)

- **The page shows only part of the content today** (see "The tour, About"). The bullets below
  on problems, lessons, the course format and the stores describe that content and its checks,
  not a place on the page.
- **Markdown in content collections** (`src/content.config.ts`): `problems/` (the one store
  Practice and Learn drew from: a sequent, its mode, deduxit's verdict, a `level` 1 to 4, its
  `categories`, the `fragment` deduxit detects; `lesson`/`order` for a lesson's practice,
  `source`/`url` for one from the literature; a provable one's proof beside it as
  `<id>.session.json`), `tour/` (the stops in order, each with the element it points at
  and the step it performs), `texts/` (About, Practice's opening, Learn's two openings),
  `lessons/` (the written lessons) and `rules/` (the one-sided rules as schemas).
- **Rendered by `index.astro` into `<template data-written data-content="…">`** and cloned
  by the island (`Written` in `Written.tsx`), never set from strings: the content is in the
  built HTML, where `no-style-attributes`, `csp` and `licences` read it. The tour's stops, the
  examples and the rules are the island's props; no problem store is (`/problems.json` and
  `/ordinary-problems.json` are served by `src/pages/`, but the page fetches none). The
  `licence` template is the CC BY line; every page with a `data-written` element must link CC
  BY 4.0 (the `licences` check).
- **The linear suite's content lives under `src/content/linear/`** (its `problems/`,
  `lessons/` and `rules/`, with `problems.test.ts` and `lessons.test.ts`), moved there
  unchanged when the content was keyed by suite: the collections keep their names and every
  id (an id is the path under the collection's base), and `moved.test.ts` holds every moved
  file to its SHA-256 in `moved.json`, taken before the move. A deliberate edit of a linear
  lesson, problem or rule updates `moved.json` in the same commit, which then says why.
- **The course format is data** (`src/lib/course.ts`): a lesson's core every suite shares
  (`lesson`, `title`, `worked`, `choices`, `steps`, `faded`, `explain`, `hinge`, D56), and each
  suite's schemas built from it (`linearLesson` the core and the linear parts, field for field
  the schema the lessons had; `ordinaryLesson` the core, `method`, `logic`, `layout`, `model`;
  `linearProblem`, `ordinaryProblem`). `content.config.ts` reads each suite's folder with
  them, and `src/content/<suite>/lesson.schema.json` and `problem.schema.json` are their JSON
  Schemas (`z.toJSONSchema`, input side) for other tools, which `course.test.ts` holds equal;
  `DEDUXIT_WRITE_SCHEMAS=1` writes them after a schema changes on purpose.
- **The ordinary suite's store** (`src/content/ordinary/problems/`, the collection
  `ordinaryProblems`): each law of a list (identity to Dummett's law and seven fallacies) a
  valid problem in the weakest logic that proves it and a not-valid one in the strongest logic
  where it fails, so the store teaches where each logic stops; `logic`, `verdict` (`valid`,
  `not_valid`), `level`, `categories` (the connectives, and the weakest logic that proves it).
  `src/content/ordinary/problems.test.ts` holds every verdict to `ordinary_start` and
  `ordinary_close` within a hundredth of the page's budget and the categories to the sequent
  and to deduxit; the flake's `ordinary-problems` check (`modules/_checks/ordinary_problems.py`)
  holds the verdicts to `deduxit prove --logic` and every worked session beside a problem
  (`<id>.sequent.json`, `<id>.natural.json`, `<id>.tableau.json`) to `deduxit interact
  --state` and `proof`, which check every step again (`check --calculus` reads a derivation,
  not a session).
- **An ordinary lesson** (the collection `ordinaryLessons`) has a method (`sequent`, `tableau`,
  `natural` or `table`) and a worked session; `src/content/ordinary/lessons.test.ts` holds a
  step's rule to the session's history. Zod stays out of the island (`course.ts` is the content
  config's and the tests'): Zod 4 probes `new Function`, which the CSP reports.
- **Every problem is decided by the command, and checked twice**: `src/content/linear/problems.test.ts`
  (each verdict and fragment by the module, each session to its sequent, mode and a
  finished proof, the categories to the sequent's connectives and mode, no sequent twice in
  one calculus, the lessons' mix) and the flake's `problems` check
  (`modules/_checks/problems.py`), which runs deduxit's command at the pinned input over the
  whole store in one deterministic batch and `interact --state … proof` on each session: a
  problem without that evidence, or whose verdict a later deduxit changes, fails it. A
  session is written by `deduxit interact` from the steps deduxit's own hints give (`apply`
  per step, then `save` and `proof`, exit 0), so that Watch plays it step by step; a lesson's
  problem proved with a cut keeps the cut in its session (`cut`, then the hints' steps). A
  session with cuts holds its cut formulas in its sequent (`cuts`), so both checks compare
  its conclusion, the sequent `start` (Vitest) or `seq print` (the flake) gives with the cut
  formulas left out; every other session's sequent must equal the problem's exactly.
- **A problem's level is measured on its checked proof** (the hints' proof), never the
  search's effort: score = steps + 2 × the bits of choice a count of atoms does not settle +
  ½ × the bits it does, summed over the goals where no invertible rule applies (bits:
  log2 of the moves there over the moves after which the goal stays provable); levels Easy
  under 6, Moderate under 14, Hard under 30, Very hard from 30. The generators, the measure
  and its validation by agents of two strengths live outside the repository (deduxit's
  `plan/reports/43-learn-lessons.md` says where); an unprovable problem keeps the level set
  by hand, and a variant built from a measured problem (an unused hypothesis for weakening, two
  proofs side by side under Mix) takes its source's score plus one step. A new problem is
  measured the same way before it is filed.
- **Categories** are the connectives' families the sequent uses (`multiplicatives`,
  `additives`, `units`, `exponentials`, `quantifiers`), its logic (`classical`, `intuitionistic`, and
  `structural` for weakening or Mix) and `literature` for a classic with its source read in
  the work. `GROUPS` (`practice.ts`) groups them for a filter: any chosen within a group, every
  group at once, and the levels.
- **A written lesson** (`lessons/<n>-<name>.md`) is D56's sequence: its opening (the body; where it holds more than the worked proof shows, the part
  after its one thematic break `***` stands below the worked proof, `Written`'s `part`, which
  `lessons.test.ts` holds to one break with text above it: lessons 7 to 10), the worked proof (`worked`, a store problem of the same
  lesson, played from its session: `steps` holds one rule and reason per entry of the
  session's history, in its order, and `lessons.test.ts` holds them equal, so a session
  rewritten in another order fails it), the predictions among `choices`, the faded proof
  (`faded`: the steps the page plays before the student takes over), the self-explanation
  prompt after the step `explain.after`, an optional dead end (`detour`: a legal split shown
  in the split chooser, which `split_passes` must refuse), and the hinge question (one
  option without a `misconception`; an option's `problem`, when named, is provable exactly
  when the option is right, and a wrong answer that names one offers "Try <its sequent>
  yourself" before "Try the faded proof again"). Every sequent a lesson shows as a problem is a store problem
  with that lesson, so the store's checks cover it. Optional parts: `rewrite` (lesson 1: one
  sentence on how the worked sequent, typed two-sided, reads one-sided, with buttons that
  turn the Two-sided switch on and off for the visit alone, never stored (`setSettings`'s
  `visitOnly`); the lesson turns it off again at its next step and when it closes, if it
  turned it on), `attempt` (an erroneous
  example: steps with the attempt's own reasons, played by Redo from the unfinished session
  `lessons/<id>.attempt.json` on the lesson's tab, then "which step went wrong?" answered as
  the hinge is; the wrong step is the one without a misconception, and `lessons.test.ts` holds
  it to be the first after which an open goal has no proof), `gallery` (store problems of the
  lesson asked of deduxit, `ask`, the search on the root as Close runs it, or replayed with their
  net drawn, `net`), `unknown` (a sequent outside the store searched with a budget too small,
  so the visitor watches Unknown and the retry's doublings decide it; the test holds the text's
  budget to the module's answers), `net` (the finished worked proof offers its net),
  `eliminate` (the finished worked proof's cut eliminated by the stage's own cluster, on the
  derivation and on the net; its `cases` are a reason per case by deduxit's snake-case name,
  and the test holds every case deduxit takes on both views to a reason), `counts` (problems proved with a cut, their cut
  formula and inferences with it, the session's, and without, the `i<n>` ids of the drawing
  `eliminate` reaches; their practice card asks for the cut and, once the visitor's tab
  proves the problem, counts that proof's inferences beside both) and `refusal` (an
  unfinished session `lessons/<id>.refusal.json` of an unprovable store problem of the
  lesson, played by Redo with a reason per step, then the step `refused` on its one open goal,
  whose refusal is the goal's note; the test holds that deduxit refuses it). Every
  lesson problem is decided within a hundredth of the page's budget (`lessons.test.ts`): the
  store keeps no verdict a budget could change, and a lesson problem near the budget is
  replaced, not marked. Formulas in a lesson's or a rule's text
  stand between backticks and are set in the math font (`Words` in `ui.tsx`).
- **Every rule label has a hint** (`RuleHint.tsx`, the author's request of
  2026-11-09): the full name, the schema (`Schema`) and one sentence, from `hintsFor` in
  `src/lib/rules.ts`: the reference's rules (`rules/`) for the one-sided calculus and ILL, its
  own tables for classical linear logic drawn two-sided (the drawing's names; a classical
  session's steps keep the one-sided ones), Mix, affine `wk`, Lambek, LK and LJ (G3's forms).
  `rules.test.ts` holds every label deduxit draws to a hint: a new rule of deduxit gets its
  entry there and in the test. A label is hinted by `hinted(label)` (`data-rule-hint` and an
  `aria-describedby` to a hidden sentence per rule, `rule-hint-<code points>`); a press opens
  it only on an element with `data-hint-toggle` (the drawing's label buttons `.lb`, laid over
  each label as the formulas' buttons are and under them, the rules popover's `About <rule>`
  buttons), since a press on a rule of the popover acts. Hover and the keyboard's focus open it anywhere; Escape closes the hint alone; the
  pointer may rest on it (SC 1.4.13). It is no `data-tip`: tips follow no touch, the hint does.
  A drawing's label button is named "Rule ⊗, step 3": the inference `g#i<n>` is step n + 1,
  the number deduxit's `<desc>` gives it (one writer for the linear and the ordinary
  drawings), so a reader tabbing through the labels knows which inference each belongs to;
  `hints.spec.ts` holds each name to its line of the description.
- **The reference's rules** are `rules/<nn>-<name>.md` (deduxit's name, the premises and the
  conclusion as the Handbook's Table 1.4 writes them, deduxit's two-sided names from its
  `ClassicalRule` table, the lesson); the rule hints read them. The page has no reference
  today. The two-sided rules of intuitionistic linear logic (`rules/14-ill-*.md` to `32`, and
  `36-ill-cut.md` to `40`, the Handbook's Table 1.5 in deduxit's names) carry `oneSided`, the
  one-sided rule they are, in place of `twoSided`; `lessons.test.ts` holds each to a one-sided
  rule that lists its name. The
  cut and the quantifiers (`33-cut.md` to `35-exists.md`) are Table 1.4's `(cut)`, `(∀₁)` and
  `(∃₁)`; both cuts are named `cut`, and `ruleNamed` takes the two-sided one in an
  intuitionistic proof, as for every rule.
- **The hints' own tables** (`REFERENCE` in `src/lib/rules.ts`: Mix and affine weakening,
  classical linear logic drawn two-sided, the Lambek calculus, LK, LJ) hold the parts of the
  reference that no written rule has. `rules.test.ts` holds every label of every calculus to
  `inReference`, and each part to its place in the text. A new rule of deduxit gets its hint and
  a place in the reference.
- **A lesson's problems**: the problems with a `lesson` go easiest first,
  provable and unprovable mixed, never three alike in a row (`problems.test.ts`). Every lesson
  from the second has at least two provable problems at level 3 or above. Every unprovable
  problem has a lesson (the schema refuses one without), so a store of problems to offer is
  the provable ones alone.
- **A goal opens in a new chip** (`openGoal`, the goal menu's Prove apart): its formulas as
  the field reads them (`sequentText`, two-sided where they have sides, each formula as its
  reading, deduxit's `reading`, the dual of its one-sided `text` only where there is none), in
  the same calculus, the new proof's `origin` the tab and the goal's path (kept in the shelf).
  A stored graft named `tab:<sequent>` (a fill of the old page) still replays from its own
  inferences (`own` on its action, set by `actionsFor`). A tab is named by its sequent as the
  tab shows it, cut to `SHORT` characters (`short`), never by its place in the row.

## The engines (`src/lib/engines.ts`)

- An outcome names its engine (`engine`), but a classical refutation is the classical
  refuter's work (`engineOf`). The chip beside a note or a hint, the label beside a graft's
  rule (`text.engine` after the rule label, from `Proof.engines`, a goal's path to the
  engine, kept in the shelf), and the step list name it; the hover gives the source. Every
  reference in
  `texts/reference.md` was read in the work itself (2026-10-22), an open copy where the
  original is paywalled being replaced by an open work that states it; change one only from
  the work itself.
- **Settings' engine** is `search.engine` in every search's settings. Which engines take a
  sequent is asked of deduxit with the bindings as they are: `prove` forced to each engine
  with a budget of one unit refuses before it searches (`engine_refused`, with `because`)
  where the engine does not take it, the same test a search does before it starts. A forced
  engine lasts for the visit: `setSettings` stores every setting but it, and the page starts
  on Automatic (`tests/engines.spec.ts` reloads to check).

## The tour, About

- **Learn and Practice wait** for a step after the redesign: their islands left the page, their
  content stays in `src/content/` (and `src/lib/practice.ts`, `content.ts` with their tests);
  "Learn" and "Practice" are inactive buttons on the new tab view and, with the guide on, at the
  tools' end.
- **The tour** (`Tour.tsx`) runs on `ui.tour`, from the tools with the guide on: each stop's
  `act` is performed once, on the way forward, through the state's own actions; the caption
  takes the focus, says each stop in the live region, and marks what it points at with
  `data-tour-spot` (`SPOTS`: the chosen chip, the stage, a formula, the active goal's `⊢`, the
  tools). Its texts (`src/content/tour/`) are the new page's.
- **About** is a dialog from the new tab view and the Settings page: its text, deduxit's version
  from `about`, every licence the site serves (linked, `tests/about.spec.ts` fetches each) and
  the line that GitHub logs visitors' addresses, which links the privacy page. Its text links
  `/llms.txt`, the page described for AI models in the proposal's shape (an H1, a blockquote,
  then lists of links), which points to deduxit's guide on the rustdoc site rather than copying
  it; `tests/about.spec.ts` holds the link, the shape and the two guide links.
- **The privacy page** (`src/pages/privacy.astro`, at `/privacy/`) is a page of its own, linked
  from About, from the Settings page and from the 404 page. Each statement cites one of its
  numbered sources (`SOURCES`); `tests/page.spec.ts` holds the citations to the list. Astro's
  HTML compression drops a line break before an inline element: a line that ends in a word
  before a link ends in `{" "}`.

## Offline and installable (`src/offline/sw.js`, `src/integrations/offline.ts`)

- **The service worker is written by hand**: `@vite-pwa/astro` supports Astro up to 5, and
  the plugin alone never sees Astro's pages. The build fills `FILES` (every file of the
  site, the page as `/`) and `VERSION` (a hash of their contents) into `/sw.js`.
- **Its scope is the origin, its reach is the site's own files**: a worker at `/sw.js`
  cannot be scoped narrower than `/`, where the page is, and `/deduxit/` (deduxit's rustdoc and,
  under `/deduxit/manual/`, its manual, another Pages site on the origin) and `/rocq-deduxit/`
  (the Rocq library's documentation, a third) lie under it. So the fetch handler answers only the
  paths in `FILES` and navigations to `/`, and returns without `respondWith` for anything
  else; under those two (`PROJECTS` in `sw.js`) it returns first, and the Static Routing API
  (`addRoutes`, where the browser has it) sends those requests to the network before the
  worker wakes. Never cache by pattern, never add a fallback page for other navigations,
  never cache a path under them.
- **Every file is fetched past the HTTP cache when the worker installs** (`cache:
  "reload"`): Pages lets a browser keep a file ten minutes, and a new worker installed
  right after a deployment would otherwise cache the old page beside the new files
  (the reviewer's probe: unstyled, unhydrated, until the next deployment).
  `tests/serve.ts` sends Pages' `max-age=600` and a fresh `x-github-request-id` per
  response, by which `tests/offline.spec.ts` tells the two apart.
- **No `skipWaiting`**: a new worker waits until no page of the old one is open, so a page
  and the files it loads later (the module, its worker, Euler Math) come from one
  deployment; the old caches are deleted on activation: the `deduxit-site-` ones and every `linlog-site-` one, nothing else.
- **The manifest and its icons** are written by the same integration, the icons taken
  from the logo's rasters (below); `tests/offline.spec.ts` asks Chromium's installability
  over CDP, and fetches every icon the page and the manifest name, at its size.

## The mark (`src/logo/`, CC BY 4.0)

- **deduxit's mark**: the word dēdūxit in Gentium ExtraBold, its two long marks lapis
  inference lines (`<rect>` elements), and the square dē. Its source of record is outside
  this repository (`make.py` of the author's mark workshop, with its README of colours and
  measures); here the six SVGs (the word mark and the square, light, dark and one-colour) and
  `wordmark-band.svg` (no margin, 30 pixels high) are the one source. Every raster (the
  favicon's PNG, the Apple touch icon, the manifest's "any" and maskable icons at 192 and
  512, the link preview's `og.png`, GitHub's avatar and social preview) is drawn from them by
  `modules/_logo/derive.py` with nixpkgs' resvg (`modules/logo.nix`, `nix build .#logo`),
  linked at `.cache/deduxit-logo`; never draw or edit one by hand. They match the workshop's
  rasters pixel for pixel. The square's ink lies inside the maskable safe circle, so the
  maskable icons are the square to the edge, unscaled. The build copies `src/logo/` and the
  site's rasters to `/logo/` (`offline.ts`), where deduxit's README and rustdoc fetch them by
  URL: keep the paths `/logo/wordmark-*.svg`, `/logo/square-dark.svg` and
  `/logo/favicon-32.png` stable.
- **On the page the word mark is inline** (`Logo.tsx`, the 404 page's `set:html`, both from
  `wordmark-band.svg`; the top row's home link in `Frame.tsx` holds the word mark and the
  square), so the theme's tokens paint it: the letters (`path`) `--color-ink`, the long marks
  (`rect`) `--color-logo` (`.logo` in `app.css`); the drawing names itself "deduxit". Its height
  is `--size-wordmark`.
- **The dictionary line** is shown under the mark in About (`Dictionary` in `Logo.tsx`):
  **dēdūxit** [deːˈduːk.sɪt] *Latin, verb*: "it has derived", the perfect of *dēdūcō*, to lead
  down, derive. (Approved by the author, 2026-11-09; keep it word for word.)
- **Its licence**: `src/logo/LICENSE.txt` (served at `/logo/LICENSE.txt`, listed in About)
  puts every file of the mark under CC BY 4.0 and says the name and mark may not suggest the
  project's endorsement; About repeats that line. The `licences` check holds every image
  the site serves to `logo/`, beside that notice, and every logo SVG to outlined text.
  Gentium's OFL 1.1 asks nothing for an outlined logo (its condition 5 exempts a document
  created with the font, and outlines are no modified font, which the Reserved Font Names
  would bind); no font file goes with the SVGs; the notice names it anyway.
- **`tests/serve.ts` serves `tests/deduxit-docs/` at `/deduxit/` and `tests/rocq-docs/` at
  `/rocq-deduxit/`**, as Pages serves the rustdoc and the Rocq library's documentation beside
  the site, so the tests see the worker leave them alone and `/rocq-linlog/` forward.

## Styling

- **Every colour, font and size is a token** in `src/styles/tokens.css` (`@theme static`,
  `light-dark()` pairs; Tailwind's palette, fonts and type scale off), named as the design
  guide's "The scale" names them (`design/redesign.md`): `--color-paper`, `band`, `ink`,
  `ink2`, `soft`, `faint`, `edge`, `line`, `hair`, `lapis`, `deep`, `wash`, `good`, `bad`,
  `dot`, `over`. Never a raw colour outside `tokens.css`, never a `style` attribute in markup
  (the `no-style-attributes` check): placement goes through the CSSOM (`el.style.left = …`)
  in a ref or an effect.
- **Sizes are in rem** (the guide's "Window sizes"), so the browser's text size scales the page;
  `token()` in `ui.tsx` reads a rem token as pixels at the root's size. The spacing scale is the
  guide's alone (2, 4, 8, 12, 16, 24, 32, 48: `tokens.test.ts`); the frame's own offsets (10 from
  the stage's edge, 6 between cells) are `--size-inset` and `--size-gap`.
- **The guide's colours depart in one place** (for the author's review): `good` is `#075e55`
  light and `#86e2ba` dark, not `#0A6B4F` and `#6FCBA4`, since `colours.test.ts` holds the
  colours of meaning apart under simulated colour-vision deficiencies and the guide's greens met
  lapis under tritanopia (5.7) and the dark red under deuteranopia (5.0). The net colours were
  moved within their Okabe-Ito hues for the new paper. The test's groups are the new page's: the
  verdicts with lapis, the chosen formula with ink, a net's colours with the verdicts at the top
  (lapis is not among them: a net is drawn only for a finished proof, where nothing on the
  drawing is chosen). `faint` is for what cannot act, never text; `edge` (3:1) is a field's
  edge, `line` (1.9:1) a box whose signs tell it (a toggle's box, the tools, a panel).
- No `!important` (Biome's rule): reduced motion zeroes the duration tokens instead.
- **No raw value outside the tokens** (`src/styles/tokens.test.ts`): every length, colour,
  duration, weight, opacity and layer in `app.css` is a `var(--…)`; allowed bare are 0, 1,
  `1fr`, `50%`/`100%`, `100vw`/`100vh`/`100dvh`, and integers inside `calc()` as arithmetic
  over tokens (so `repeat(4, …)` is written out). The island sizes no icon (`button svg.icon`
  takes `--size-icon`) and writes no length in a string.
- **The window's classes** are the guide's: compact under 600 pixels (`(width < 600px)`),
  expanded from 840 (`(width >= 840px)`), medium between, short under 480 high
  (`(height < 480px)`), in the range syntax; `tokens.test.ts` holds every media query of
  `app.css`, `tokens.css` and the island to those three bounds and refuses `max-width`/
  `min-width`. `compact()` in `ui.tsx` is the same query as a signal. A compact window and a
  coarse pointer (`pointer: coarse`) make every target 44 pixels and a field's text 16
  (`tokens.css`); `tests/targets.spec.ts` measures every visible control in every state of
  `tests/states.ts` at 24 (desktop) and 44 (phone).
- **The controls' sizes** are the guide's "Controls": `--size-button` (a plain button, a field,
  30), `--size-toggle`/`--size-toggle-box` (24 in 30), `--size-tool` (34, 36 wide), `--size-chip`
  (34), `--size-cell` (44), `--size-enter` (38), `--size-rule` (40). Every control shares the
  states of one rule in `app.css`: `over` under the pointer, `wash` while pressed, `faint` when it
  cannot act (never an opacity), the 2-pixel lapis focus ring 2 off its edge.
- **A keyword** (`.kw`, a verdict's "Proved.") is weight 600 in its tone's colour with no box or
  wash; its word or sign says the state, never the colour alone.
- **A change of scheme fades** through the View Transitions API (`applyTheme` in `Frame.tsx`),
  0.5 s (`::view-transition` rules, `--duration-scheme`), none under reduced motion.
- **Fonts**: Ysabeau Office (400, 500, 600) for the interface, Gentium Book Plus (700) for the
  word mark's neighbours and headings, from npm (`@fontsource/*`, OFL, served beside their
  licences: `licences.ts`, `modules/_checks/licences.py`); the math fonts are deduxit's.
- **A rule label's button** grows to a control's size but stops at a formula's or a cut's button
  and halfway to the next label (`spread` in `src/lib/gap.ts`), so a label of a drawing fitted to
  a phone may be shorter than 44 pixels: `targets.spec.ts` accepts that only where it reaches a
  neighbour's button on that axis, and fails any two buttons of the drawing that overlap. A
  formula's button covers half the gap to its neighbours and is at least a control's height on
  screen, and `fitView` never zooms out below the size at which the active goal's formulas are
  a control wide (`floor`; `Hit.fixed`, the button's padding past its formula's ends).

## Tests

- **Vitest** for the logic, beside it as `*.test.ts`; `src/lib/testing.ts` loads deduxit's
  real module in Node for the step tree's tests.
- **Playwright**, one test per interaction of the island (`tests/prover.spec.ts`, and
  `tests/phone.spec.ts` at a phone's width), against the built site served as Pages
  serves it (`tests/serve.ts`). Name elements by role and accessible name; a formula's
  button is named `<formula>, formula <p> of goal <g>`.
- **axe** (`@axe-core/playwright`, `tests/accessibility.spec.ts`) runs WCAG 2.0 to 2.2 at A and
  AA and axe's best practices on every page (the prover, privacy, 404, the Rocq library's old
  address with its refresh taken out) and in every state of `tests/states.ts`, in both schemes
  at a desktop's and a phone's width; a violation fails the test, with axe's reason in the
  line. The e2e check's sources are `tests/` and the built site, so a spec imports
  nothing from `src/`. A rule label's button may be
  under 24 pixels where its neighbours are nearer in a drawing fitted to a phone (no zoom floor
  for that: declined, 2026-11-14), or lie partly under the stage's tools or a panel over the
  stage. A label's button that overlaps another button of the drawing is never
  filtered, the overlap measured by the spec itself (axe names no covering element for a target
  under 24 pixels): the labels share the gaps (`spread`, below). What axe
  leaves "incomplete" is not asserted: contrast
  over a gradient (the stage's dotted field, and every keyword's wash, which
  `colours.test.ts` holds instead), under an overlapping element, or of symbols alone.
- **Each walk of the axe spec is a test of its own, under 20 seconds here.** axe takes 1.5 to
  4 seconds a state, the page's own work under one. GitHub's runner, with the other checks
  building beside the e2e, was 1.8 to 2.9 times slower on 2026-11-15: a walk of twelve states,
  about 33 seconds here, ran past CI's 60 twice, while the 20-second walks passed. So a long
  walk is split, as `proving` and `menus` are. Time a walk with
  `playwright test tests/accessibility.spec.ts -g NAME --workers 1` on idle cores; a slow
  runner is closest with `CI=1` (60 s, the runner's budget) on one core and four workers
  (`taskset -c N`, `--workers 4 --retries 0`), where the twelve-state walk failed and its
  halves passed. Chromium's CPU throttling (`Emulation.setCPUThrottlingRate`) slowed the
  walks unevenly, and is no measure.
- **A control's visible text is in its accessible name** (SC 2.5.3): axe compares words, joins
  an element's text nodes with no space between elements and drops what stands in
  parentheses. So the parts of a control's label are separated by a space in the markup
  (`{" "}` between spans of a flex or grid button, which the layout ignores), and an
  `aria-label` repeats every word the control shows.
- **The stage measures its buttons at the scale the drawing is shown at** (`rendered()` in
  `Stage.tsx`), never at `camera().k`: the effect that lays them again after a zoom runs before
  the world's transform follows the camera, and a glide may be under way; measured at the
  camera's scale, a fitted goal's buttons on a phone lay 30 to 90 pixels off
  their formulas. The sizes a button must reach on the screen still come from `camera().k`.
- **The world's transform is a render effect** (`createRenderEffect` in `Stage.tsx`): Solid
  1.x runs the effects of one change in the order of the signal's readers, and an effect that
  ran is put last among them, so an overlay's effect, which reads the goal's place on the
  screen, came to run before the transform's and trailed the goal by a move during a drag. A
  render effect runs before every effect. `phone.spec.ts` checks after each move of a drag
  that the goal's line stands right over the goal.
- In the dev shell, `e2e` drops the host's `LD_LIBRARY_PATH`, which breaks nixpkgs'
  Chromium; a scratch script that launches Chromium needs `env -u LD_LIBRARY_PATH` too.
