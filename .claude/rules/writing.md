# Writing for people

A copy of deduxit's rule of the same name, the author's standing
instruction (2026-11-09); a change to the four rules belongs in both
repositories. Here it applies to every text a person reads:
- the page's labels, buttons, tips, messages, errors and hints, in the
  island (`src/islands/`) and in `src/lib/` (`words.ts` above all);
- the written content (`src/content/`): Learn's lessons and reference,
  the tour, the rules' sentences, the problems' bodies, the examples'
  notes, About and Practice's opening;
- the other pages (`src/pages/`: the privacy notice, the 404 page,
  `/llms.txt`);
- README;
- every comment and doc comment of the code, the tests and the flake.

A reader is a student or a teacher learning or checking a proof on the
page, a logician exporting one, or someone reading the code to change
it.

It does not apply to `.claude/` and CLAUDE.md (notes for sessions).

## The four rules

1. **Concise, plain language.**
   - Short sentences, one idea each, in the active voice.
   - Common words; a logic term only where the reader needs it, said
     what it means at its first use or linked to where that is said.
   - Say what a thing does for the reader before how it works.
   - Cut every sentence that doesn't help the reader do or understand
     something.
2. **Self-contained.**
   - The text never refers to how the project was made or is being
     built: no step numbers, sessions, plans, decision numbers,
     reviewers, panels or "this session".
   - Three exceptions: the AI disclaimer (README, the Rocq library's
     README and opam description, `CITATION.cff`), the `plan/` files
     themselves, and the manual's list of what exists and what is
     planned (`docs/src/status.md`).
   - Code comments say why, or what the code cannot; history goes to the
     changelog and jj.
3. **Written for someone using it.**
   - Start from what the reader wants to do: the library in a program,
     the command in a terminal or a script, the web page to learn or to
     check a proof. Give the shortest complete way to do exactly that,
     with an example that runs.
   - Keep the four kinds of documentation apart (Diátaxis):
     - tutorials, which teach by doing;
     - how-to guides, for one task each;
     - reference, which is complete and dry;
     - explanation, of the ideas behind the design.
   - For teaching text, and for the web page above all, use the
     education plugin's skills (`claude-education-skills-library`) as
     references:
     - `cognitive-load-analyser`: one new thing at a time, no split
       attention, no redundant restating;
     - `worked-example-fading-designer`: a worked example first, then
       practice with less help;
     - `text-complexity-analyser` and `vocabulary-tiering-tool`: words
       and terms;
     - `explicit-instruction-sequence-builder`: the order of a lesson;
     - `ai-feedback-design-principles`: the hints and messages the
       page gives.
   - **API changes go to the author.** If changing the library's API,
     the command or the page would let people get what they want more
     easily, without real harm to other uses, don't make the change.
     Ask the author through the planning session, with a recommendation
     of the most idiomatic, current practice.
4. **Legible.**
   - The aim is text that is easy to read, not text that hides that a
     model helped write it. So avoid the patterns Wikipedia's "Signs of
     AI writing" lists that make text harder to follow:
     - **Say "is" and "has".** Not "serves as", "stands as",
       "features", "boasts", "refers to".
     - **No inflated words:** "crucial", "pivotal", "key" as filler,
       "landscape", "testament", "delve", "underscore", "showcase",
       "intricate", "foster", "leverage", "seamless", "robust".
     - **No negative parallelisms** ("not just X but Y", "it's not X,
       it's Y", "Y rather than X" as a flourish): say what the thing
       is.
     - **No reflexive triads.** Three adjectives or three phrases where
       one is meant.
     - **No trailing "-ing" clauses of commentary**
       ("…, highlighting its flexibility").
     - **No vague attribution** ("experts agree"): cite the source or
       drop the claim.
     - **No filler addressed to the reader:** "it's important to note",
       "it's worth mentioning", "in summary", "I hope this helps",
       "let me know", and no corrective framing ("should not be
       confused with") unless the confusion is real and common.
     - **Markup:**
       - sentence-case headings;
       - bold only for the few words a reader must find;
       - no emoji;
       - straight quotes;
       - no list of bold-headed bullets where two sentences of prose
         read better.
   - Read the text once as its reader would, and fix what makes them
     stop.

The page's text was reworked to these rules on 2026-11-09 (deduxit's
step 54w). New or changed text follows them.
