# Please enter your name.

**Your name is just the beginning. The paperwork has other plans.**

A small, self-contained Bad UX competition game from the fictional Department of
Name Acquisition. Give it an invented name, speak in bureaucratic capitals,
surrender your vowels at customs, and discover that the next department is never
quite the last. Twelve departments turn a simple form into a puzzle gauntlet.
Start with exactly two names: a made-up first and last name, with 6–20 letters
total. The office
strips punctuation and collapses extra spaces: `Dr. Doofenshmirtz` becomes
`Dr Doofenshmirtz`. Later typed name answers use the same cleanup, so
`DR. DOOFENSHMIRTZ` passes the capitals department. Capitalization rules still
apply where a department explicitly requests them.
Vowel customs accepts keeping or removing Y and ignores capitalization.
The recognition grid requires exact matches to the name on file; typos, extra
words, reversed names and added punctuation are decoys.
Only four department tabs appear at once: after department four, the oldest tab
slides away as the next one arrives. The game reveals its total only on completion.

Intake shows Now serving but leaves the applicant ticket unissued. A valid name
opens a generic departmental ticket, with no time estimate or queue count on it.
Taking the ticket assigns the number exactly 30 places ahead of Now serving and
begins the reveal. The queue starts after that reveal finishes: Now serving
advances once every 10 seconds. Opening instructions, invalid intake and reading the ticket do not
use the window. Escape returns to intake without taking the ticket. Taking it
reveals and briefly pulses the counter, then clears the rest of the page and
focuses Volume’s input. Reduced motion skips the effect. The queue keeps moving in background tabs and catches up from
elapsed time on return. Finish and submit all paperwork before your number is
called, or a voided certificate replaces the form. Success and failure share
one centered certificate layout, name placement, seal frame, stamp spacing,
and restart-button position. Failure shows the missed ticket, forms filed, and
department number and name reached. The deadline is five minutes.
Warnings escalate at two minutes, one minute, thirty seconds, and the final call.
A compact queue display stays visible when the main panel scrolls away. Reduced
motion keeps the urgency colors but disables pulsing. Completion freezes the queue
and displays the elapsed run time as `m:ss.mmm`, measured from the end of the ticket reveal
to final approval. The reveal is excluded from both the queue deadline and run
time, so reduced motion provides no timing advantage. The result stays fixed until a new application;
it is not stored or uploaded. Approved and missed stamps share one CSS rule,
including the manually tuned 7px top and 20px bottom margins.
Both final certificates show how many times assistance was requested, including
intake and repeat requests in the same department. Starting a new application
clears the count. This information lives only in memory with the current run.
The introductory note gives way to scraps from past applicants at each department,
with small changes in the paper's position and tilt beneath a stationary clip.
Action footnotes sit opposite their buttons, aligned with the form's right edge
and the button's bottom edge. On narrow screens they move to a right-aligned row
below the button. The ID label and explanation stay together without wrapping.
Inputs use a subtle inset focus border. Text-entry levels autofocus the input. Other levels keep focus on the heading
without a control highlight; the first Tab goes to the primary puzzle control,
including the maze board and first editable seal cell.
Initial intake focuses the name input without scrolling past the introduction. On narrow screens the queue becomes a
compact strip and the notes sit below the form. Empty status messages collapse;
visible messages keep their text centered beside the status bar.

Every puzzle has a solution, but the queue imposes a shared deadline. Each stage offers a hint,
native buttons support Tab and Space even when text entry is “out of service,”
the application can be reset immediately, and
reduced-motion preferences are respected. There are no popups, downloads,
permissions, analytics, external assets, fonts, network calls, cookies or browser
storage. Names exist only in the current page's memory. Please use a fictional
name; closing or resetting the page discards it. Hosting infrastructure may still
record ordinary HTTP access logs.

Letter-building activities (Recovery, Stamps and Transit) reset progress on a
wrong letter. Recovery restores every scattered piece; Stamps clears the name
and reshuffles the tray. Green salvage pieces use a matching green hover border.
Recovery omits space pieces and restores word spacing in its progress display.
Transit collects only the first name, with no space pieces. Secrecy omits spaces from its encrypted groups, and Stamps inserts
word breaks automatically. Full-name forms and exact-copy evidence retain the name’s
formatting. Archive numbers only letters, omitting spaces from both its reference
and filing-note positions. Nameplate rows
separate first and last names without space tiles; Carbon also strips spaces.

## Paper trail and messages

Every department owns a `paperwork.hold` and `paperwork.approval`, alongside its
instructions, action, footnote and past-applicant note. The shell uses those
same fields for both receipt status and the handoff after successful submission.

- The receipt always shows **Last cleared** (the previous approval) and
  **Current hold** (the current department’s requirement). Intake starts with
  nothing filed. Completion changes Current hold to Disposition: case closed.
  Archive’s approval includes the actual retrieved file number. Hints, mistakes
  and edits do not change these case records. Missing a turn marks the case void.
  Shredding resets the paperwork and queue deadline.
- Past-applicant notes provide a different personal account for each department.
- The bottom message gives immediate feedback: errors, hints, puzzle actions, or
  a specific approval and referral. Editing an answer or changing an Archive
  selection clears obsolete feedback.

| Department | Paperwork purpose |
| --- | --- |
| Intake | Register the fictional name |
| Volume | Supply the clerk’s capitalized copy |
| Customs | Obtain vowel clearance |
| Evidence | Verify three exact name copies |
| Recovery | Salvage an application from the office shredder |
| Secrecy | Unlock the confidential personnel file |
| Stamps | Stamp and file the form |
| Archive | Retrieve a misfiled application and correct its filing note |
| Transit | Recover the name from internal mail |
| Sustainability / Energy | Obtain the nameplate’s energy permit |
| Carbon | Reconcile the copier’s damaged copy |
| Approval | Make a personal seal and authorize the application |

## Files and preview

`site/` contains plain HTML, CSS, a local SVG favicon and browser JavaScript. There
are no package dependencies, build steps, package hooks or project executables.
Open `site/index.html` directly in a browser, or serve that directory with an
ordinary static file server. All asset references are relative and self-contained.

Every application has a fresh 32-bit run seed, recorded as `#seed=XXXXXXXX` in
the URL. Reopening that URL and entering the same cleaned name reproduces the
puzzles in the same game version. The URL contains no applicant name. Starting
another application, taking a new ticket, or shredding the application generates
a new seed and updates the URL; reloading the current URL replays its seed.
Malformed seed fragments are replaced with a fresh seed.

Each department derives its own random stream from the run seed, cleaned name
and department label. Recovery's paper placement and the applicant notes use
separate cosmetic streams. Hints, time spent and mistakes in earlier departments
cannot change later puzzles. Stage resets keep their original setup. The stamp
tray still reshuffles after every pick, with a reproducible sequence for the same
actions. Intake, capitalization and vowel clearance retain their fixed rules;
initials keep their letter shapes, with any required fixed cells seeded per run.
Energy always requires exactly three active circuits; the seed selects its
starting lights. Six-section nameplates have a unique solution. For comparable speedruns, use the same
URL, name and game version, and compare assistance totals alongside elapsed time.

The first four departments are intake, capitalization, vowel customs and name
recognition. Later departments recover scattered name letters, decode a reference
using the name as a codebook, stamp the name while a clerk rearranges a twelve-stamp tray,
find an original file by cross-checking clerk statements against the name,
recover the name through a maze,
request a nameplate energy permit through Sustainability, and reassemble its five
carbon strips in four operations. The last department is Self-Authorization:
solve two ink-grid puzzles for the applicant’s initials, then stamp the approval.
The completed monogram appears as a small clockwise-tilted seal at the bottom
right of the certificate, outside the main text column. This is a standalone puzzle;
no answers from earlier departments are needed.

Department 06 is Secrecy: unlock a confidential personnel file using four
combination wheels. Each digit shifts one encrypted group of name letters;
each wheel applies its Caesar shift to its name group and every fourth letter of each
assessment sentence. The first letter uses dial 1 on line 1, dial 2 on line 2,
and so on; assignments repeat cyclically. Spaces and punctuation do not advance
the cycle. Complete sentences need all four dials. Digits wrap from 9 to 0, and each
nonempty group has exactly one correct digit. Wrong submissions reset the lock;
assistance reveals the combination. All setups use the run's Secrecy stream.
Department 07 is Stamp Duty: exactly three rows of four stamps, reshuffled
after every pick. The tray uses wooden-handled rubber stamps with ink-red letter
faces and a pressed state; it remains three rows of four on narrow screens.
Each shuffle selects up to eight distinct name letters, always including the next
required letter, and fills the twelve-stamp tray with fresh A–Z choices. Alphabet
picks may also belong to the name. Choices are uppercase and distinct, with at
least one new letter on every reshuffle; the run seed reproduces the sequence.

Archive retrieves a misfiled application from six redacted folders. Four clerks’
quoted statements refer to numbered name letters and folder numbers; the number
clue chooses even or odd with equal probability from the run seed. Four colored
clerk portraits and speech-wave marks identify the speakers. Exactly one note
is incorrect. Select the file matching three notes and flag the incorrect note.
Two numbered steps separate file selection from marking a false statement. The
review panel names the selected file; a red cross marks the chosen false note.
Hovering, focusing or selecting a statement highlights its referenced code column
and name letter without evaluating its truth for the player. Highlighted fields
have padded labels; the selected false statement uses a geometrically centered cross.
Generated truth patterns guarantee one solution. All invalid submissions show the same instruction-only feedback, without
confirming whether the file or statement selection is correct. The retrieved file
number and filing code are retained in the application’s in-memory records.

Department 10 is Sustainability (the Energy tab). Restore the applicant’s
illuminated nameplate within its circuit allowance to obtain an energy permit.
The first name occupies the first row and the last name the second, with no
space tiles. Six nonempty sections are distributed between those rows according
to name length, so even one-letter names have no blank slots. Shared circuits
toggle several sections, with exactly three circuits required for every name.
Short names keep their natural number of sections and still use six switches
with three active. The control panel draws colored wire traces between each
switch and its sections. Three switches sit above the nameplate and three below;
each circuit has a separate bus lane and pin positions, with perimeter routing
for connections to the far row. Rockers use drawn line/circle symbols. Lit sections use a restrained fill, and hover or keyboard
focus traces the connections without glow. Once three switches are active, the
others are disabled until one is released. The panel’s three indicators replace
the separate inspection readout. Carbon’s
five copier strips also omit spaces. Small corner numbers and colored edges distinguish identical
chunks; a shared seal spans the full strip backgrounds. The original sits above the output tray,
and operation buttons diagram each rearrangement. Strips animate between positions
unless reduced motion is enabled.

The maze uses 225 walkable cells with thin walls between them, generated with a
branching Prim frontier and four routes from a central mailroom. Collect the
letters of the first name in order. Matching letters are interchangeable
regardless of case, and have no ordinal labels. Each tile can be collected once.
Pickups occupy dead ends, so every remaining letter stays reachable regardless
of which matching tile was chosen. Pickups are distributed across the four
central branches. A wrong letter restores all pickups and returns to the center.
Click or tap a clear row or column to move like a rook; intermediate letters are
checked. Arrows, WASD and direction buttons travel to the next junction, turn or
uncollected letter. Collecting the last letter enables submission immediately.
The map can be enlarged on small screens.

Recognition tiles, loose letters, combination locks, stamp trays, archive records, maze
layouts and carbon arrangements vary between applications. The name supplies the
encrypted file; the name and run seed determine the switchboard damage. Hints supply answers or an exact next step.
Mistakes affect only the current department; local undo/restart controls are
available where appropriate. The last screen is a certificate within the page,
not a downloadable document. “Shred application” clears the current application.

### Source organization and checks

- `site/app.js`: navigation, the sliding four-tab window, receipts and reset.
- `site/departments.js`: department content, controls, validation and hints.
- `site/rules.js`: pure name transformations, puzzle generation and solvers.
- `site/style.css`: shared office design and responsive page layout.
- `site/puzzles.css`: puzzle controls and tab animations.

Scripts load in order with `defer`; no module server is needed for `file://`
previews. Name content is inserted with `textContent`, never HTML. Unicode
graphemes stay together when letters are scattered or reversed.

Authored headings, notes, instructions and messages are editable copy, not test
fixtures. Tests check state changes, generated puzzle answers and interactions
without duplicating that wording.

Run the dependency-free rule checks with `node --test tests/rules.test.cjs`.
They verify name normalization, complete stamp trays and uniquely solvable archive deductions, the switchboard's
unique solution, copier solvability, and name-lock solvability. An independent solver
checks 200 maze layouts with later pickups treated as walls, alongside reset,
repeated-letter, Unicode and corridor-topology checks. Seeded generation checks
verify replay, variation and independent department streams without ambient randomness.

The optional browser suite requires an existing Playwright installation and its
browser binaries; it adds no runtime dependencies. Run
`node --test tests/challenge.browser.cjs`, or set `PLAYWRIGHT_MODULE` to an absolute
path to an installed `playwright` or `@playwright/test` package. It exercises all
twelve departments in Chromium and a narrow touchscreen layout, including
failure/retry paths, actual out-of-order maze resets, punctuation-insensitive
name answers, keyboard controls, tab shifting, hints and shredding. The same suite
checks replay URLs, zero and malformed seeds, fresh seeds after restart, and
actual department setups against their seeded generators. Use `--seed-only` for
just replay-link checks or `--queue-only` for just queue checks. It also
checks the fixed queue gap, exact deadline boundaries, escalating warnings,
background catch-up, timeout/restart and completion freeze; changing notes with a stationary clip; empty
and populated messages, focus styling, and mobile overflow. Set
`TEST_BROWSERS=chromium,firefox,webkit` to check additional installed engines.

## Publish to a Badux installation

1. Sign in to your chosen Badux installation and install its GitHub App on this
   public repository. This repository does not contain a Badux hostname or deploy
   secret.
2. Connect the repository and its `main` branch to a project in that installation.
   Project creation must be open. An owner may optionally enter an open collection.
3. Push a change to `main`. The maintained `.github/workflows/badux.yml` workflow
   checks that `site/index.html` is a nonempty regular file and uploads `site/` as
   the `badux-site` artifact. Badux validates it and publishes eligible updates
   automatically. A workflow artifact alone does not prove deployment; an
   installation and a connected project are required.

The workflow is copied from Badux's maintained plain-static template. It uses
immutable action revisions, a read-only repository token, checkout without
persisted credentials, and cancellation of superseded same-branch runs. There are
no platform secrets or registry commands. Keep the workflow aligned with the
installation's supported template when upgrading.

This is a competition fixture, not a real public service or a request for personal
information. “Approved” means only that you finished a browser game.

The approval seal consists of two 5×7 ink grids. Row and column clues count
consecutive filled squares, with at least one blank between runs. Latin initials
use an authored stencil alphabet; other initials are rasterized from the browser’s
font. A deterministic set of fixed squares is added only when simple row/column
deduction stalls, guaranteeing a unique solution without guessing. Players can
tap, paint by dragging, mark blanks, undo, reset or request a next-cell hint.
Blank squares do not all need explicit crosses. The final certificate renders
the player’s completed seal as a local SVG; nothing is uploaded or saved.
