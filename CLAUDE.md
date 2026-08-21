# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A classroom app for teaching prompt engineering. Students work through a locked
sequence of exercises — nine built in, plus any a teacher authors; Claude
auto-scores each submission against a fixed rubric, streaming the result as it
is written; a teacher reviews every score and decides whether the student
progresses. Every attempt is kept, so students can see how their work moved
between revisions.

The built-ins are five technique drills followed by four real-world challenges:
applied briefs with a stated reader, a deadline, and a cost of getting it wrong.
Alongside them sits an ungraded playground for trying prompts, and badges
derived from approved work. The whole student-facing surface is available in
English and Spanish, and Claude writes its feedback in whichever the student
was working in.

It installs as a PWA and opens without a connection: every exercise is readable
offline and an attempt written offline is queued and sent on reconnect. It has a
light and a dark theme, driven entirely by CSS variables rather than by `dark:`
variants. Teachers can group the roster into classes, which filter their own
screens and nothing else.

Two roles, backed by Firebase Authentication:

| Role | Does |
|---|---|
| **Student** | Writes prompts, test-runs them, submits with a reflection |
| **Teacher** | Reviews Claude's scores, overrides any dimension, approves or requests a revision, and authors custom exercises. Also gets the Evaluator Console, which exposes the exact system prompt, a log of every score, and how far teachers have moved those scores |

The role lives on the user's profile record at `/users/$uid` and is written by
one Cloud Function. It is not a UI toggle, and there is no third "evaluator"
role any more — the console is a teacher route.

## The feature set, by phase

What exists and roughly when it arrived. Useful for reading the git history and
for knowing which rule below a piece of code is answering to; the rules
themselves are the authority, not this table.

| Phase | What it added | Where it lives |
|---|---|---|
| 1 | The core loop: exercises, the four-dimension rubric, structured-output grading, a teacher review queue, the locked progression | `data/rubric.ts`, `lib/evaluator-prompt.ts`, `hooks/useData.ts` |
| 2 | **Security.** The Anthropic key moved to Secret Manager and the API calls to Cloud Functions; Firebase Auth with email/password and Google; real database rules; `createProfile` as the only writer of `role` | `functions/`, `database.rules.json`, `lib/auth.ts` |
| 3 | **Learning experience.** Learning paths, difficulty badges, worked examples, tips, prompt-length budgets, streamed evaluation with a partial-JSON preview, teacher-authored custom exercises | `data/paths.ts`, `lib/partial-json.ts`, `pages/TeacherExercises.tsx` |
| 4 | **Assessment quality.** A Haiku second opinion that exists to disagree, deterministic integrity heuristics, blind scoring and the teacher-vs-Claude calibration delta, per-exercise rubric weights, the Evaluator Console | `lib/integrity.ts`, `lib/calibration.ts`, `pages/EvaluatorConsole.tsx` |
| 5 | **Analytics and reporting.** Every figure derived from `/submissions` on read, hand-rolled inline-SVG charts, learning velocity, and the printable guardian report | `lib/analytics.ts`, `components/charts.tsx`, `pages/ReportCard.tsx` |
| 6 | **Content and reach.** Four real-world challenges carrying a `scenario`, the ungraded playground behind a per-user quota, derived badges, and the full English/Spanish surface | `data/exercises.es.ts`, `lib/achievements.ts`, `lib/i18n.ts`, `pages/Playground.tsx` |
| 7 | **Platform.** Installable PWA with offline reading and a queued outbox, a CSS-variable dark theme, teacher-managed classes, and custom-domain docs | `public/sw.js`, `lib/offline.ts`, `lib/outbox.ts`, `context/ThemeContext.tsx`, `context/ClassContext.tsx` |
| — | **Quick wins.** Shaped loading skeletons, ⌘↵ / Escape shortcuts, copy-to-clipboard for feedback and transcripts, CSV export for teachers | `components/ui.tsx`, `hooks/useHotkeys.ts`, `lib/csv.ts`, `lib/feedback-text.ts` |

Three things have been true since phase 1 and are the spine of everything above:
**the model never supplies the total**, **progress and every figure derived from
it are computed on read, never stored**, and **a teacher decides**. A change that
weakens one of those is a change to the pedagogy, not to the code.

## Stack

- **React 19 + TypeScript**, Vite 7, Tailwind CSS v4 (`@tailwindcss/vite`), React Router 7
- **Firebase Authentication** (email/password + Google), **Realtime Database**, **Cloud Functions v2**
- **Anthropic SDK**, called **only from Cloud Functions** — never from the browser
- **Firebase Hosting**, deployed by GitHub Actions on push to `main`

Firebase is required. There is no backend-free mode: authentication, the
database rules, and the function that holds the API key *are* the security
model. Use the emulator suite for local work.

## Commands

```bash
npm run dev        # dev server on :5173
npm run build      # tsc -b && vite build → dist/
npm run lint       # typecheck, web app + functions
npm run emulators  # auth + database + functions on localhost
npm run preview    # serve the built bundle
npm run deploy     # build + firebase deploy (hosting, functions, rules)
```

There is no test suite. `npm run lint` is a typecheck — run it before
committing, and note it now covers `functions/` too. The root `postinstall`
installs `functions/` so that typecheck works from a fresh clone.

## Layout

```
src/
├── data/
│   ├── exercises.ts    ← the nine BUILT-IN exercises, mergeExercises(),
│   │                     localizeExercise()
│   ├── exercises.es.ts ← Spanish text for those, keyed by exercise id
│   ├── playground-pairs.ts ← the A/B starter pairs for the playground
│   ├── paths.ts        ← the three learning paths and difficulty styling
│   └── rubric.ts       ← the four dimensions, weights, effectiveWeights(),
│                         and weightedTotal()
├── lib/
│   ├── evaluator-prompt.ts ← the grading prompt + schema. SHARED with functions/
│   ├── claude.ts       ← thin client for the three callables. No SDK, no key
│   ├── partial-json.ts ← reads a half-written JSON document (streaming preview)
│   ├── integrity.ts    ← anti-gaming heuristics. SHARED with functions/
│   ├── calibration.ts  ← teacher-vs-Claude delta, derived from blind scores
│   ├── analytics.ts    ← every analytics figure, derived from /submissions
│   ├── achievements.ts ← badges, derived from /submissions
│   ├── i18n.ts         ← the English and Spanish dictionaries + lookup
│   ├── csv.ts          ← CSV export. RFC 4180 quoting + formula-injection guard
│   ├── feedback-text.ts ← Claude's feedback as plain text, for the clipboard
│   ├── offline.ts      ← the localStorage read mirror (exercises, submissions)
│   ├── outbox.ts       ← attempts written offline, waiting to be sent
│   ├── pwa.ts          ← service worker registration + the update handshake
│   ├── auth.ts         ← Firebase Auth + the createProfile call
│   ├── firebase.ts     ← app/auth/db/functions handles + emulator wiring
│   └── store.ts        ← database reads and writes, scoped by role
├── hooks/
│   ├── useData.ts      ← subscriptions, useExercises(), computeProgress()
│   │                     (the locking rule), pathProgress(), useOnline()
│   ├── useOutbox.ts    ← drains the outbox when the connection returns
│   ├── useHotkeys.ts   ← ⌘↵ submits; Escape leaves only when it costs nothing
│   └── useAppUpdate.ts ← reports a parked service worker; never applies it
├── context/SessionContext.tsx  ← credential + profile = session
├── context/LocaleContext.tsx   ← the reader's language, t() and tn()
├── context/ThemeContext.tsx    ← light/dark/system → one `data-theme` attribute
├── context/ClassContext.tsx    ← which class the teacher screens are filtered to
├── components/         ← Layout, AuthShell, shared UI primitives
│   └── charts.tsx      ← inline-SVG chart primitives (no charting dependency)
├── pages/              ← one file per route
└── types/index.ts      ← every shared domain type

public/
├── sw.js               ← the service worker. Hand-written, no Workbox
├── manifest.webmanifest
└── icons/              ← SVG app icons (any + maskable)

functions/
├── src/index.ts        ← the four callables
├── src/claude.ts       ← ALL Anthropic API calls live here
└── src/guards.ts       ← auth/role checks, prior-attempt lookup

database.rules.json     ← the actual access control
docs/custom-domain.md   ← pointing a school domain at Firebase Hosting
```

## Rules that matter

### 1. The rubric is defined once, in `src/data/rubric.ts`

Default weights are Prompt Quality 40%, Understanding 30%, Execution 20%,
Growth 10%. `weightedTotal()` is the only place the final score is computed.

An exercise may override those weights (`Exercise.rubricWeights`). Resolve them
through `effectiveWeights()`, which merges the overrides over the defaults and
normalises the set to sum to 1 — a teacher who types 50/30/40/5 in the builder
gets that ratio rather than an error. Never read `dim.weight` directly when an
exercise is in scope.

Each `Evaluation` records the `weights` it was scored with. Read that first and
fall back to the exercise's current weights, so an attempt graded before a
teacher reweighted the exercise still explains its own total instead of
silently disagreeing with a live recomputation.

**The model never supplies the total.** It returns four 0–100 dimension scores;
the app clamps them and computes the weighted total itself. If you add a
dimension, update `RUBRIC`, the `RubricKey` type, and `EVALUATION_SCHEMA` in
`src/lib/evaluator-prompt.ts` together — they must stay in lockstep.

### 2. Structured outputs, not prose parsing

`evaluateSubmission()` uses `output_config.format` with a `json_schema`. Do not
replace this with "return JSON" in the prompt and a regex — the schema is what
makes scores parse reliably.

It is also **streamed** (`messages.stream`), so the student watches the
evaluation arrive instead of a spinner. The deltas are fragments of one JSON
document, so the live preview goes through `parsePartialEvaluation()` in
`lib/partial-json.ts` — a deliberately lenient reader that never throws and
only reports values it has seen terminated (no half-typed score flashing 8
before 85, no partial list item). It is a preview only: the returned
`Evaluation` always comes from `JSON.parse` of the finished document. If you
add a field to `EVALUATION_SCHEMA` that the UI should preview, teach the reader
about it too.

Structured outputs do **not** support numeric range constraints (`minimum`,
`maximum`), which is why scores are declared as plain integers and clamped in
`clampScore()` after parsing.

### 2a. Two readers, and what the second one is for

`evaluateSubmission` runs the Opus grade and a Haiku second opinion concurrently
(`SECOND_OPINION_MODEL` in `functions/src/claude.ts`; set it to `''` or `off` to
disable). The second pass exists to **disagree**, not to improve accuracy — where
a fast reader and a deep one split on a dimension, the submission is genuinely
ambiguous and a teacher should read it.

Three constraints hold that call together:

- **No `output_config.effort`.** The effort parameter is rejected on Haiku 4.5
  and the request fails outright. Structured outputs *are* supported there,
  which is the part that matters.
- **No prior attempts and no worked examples.** The examples exist to pull a
  grader toward a house standard, which is exactly the anchoring a second
  opinion must avoid. `buildSecondOpinionSystemPrompt` is a separate prompt for
  this reason — do not "simplify" it back to the main one.
- **It cannot fail the grade.** The call swallows its own error and records it
  on `secondOpinion.error`. A student never loses a score because the cheap
  pass timed out.

### 2b. Integrity signals are advisory, and stay that way

`src/lib/integrity.ts` runs deterministic anti-gaming checks server-side —
prompt-vs-worked-example overlap, the brief pasted back, rubric vocabulary
quoted at the grader, exact word counts, reflections that restate the prompt.
The evaluator also returns its own `gaming` judgement through the schema.

`concern` is a sort order for teacher attention, never a grade. Nothing in
`IntegrityReport` changes a score or blocks an approval, and the UI says so
plainly. Keep it that way: the moment a flag has consequences, it becomes a
thing to game in its own right.

The detector's output is deliberately **not** shown to students and not fed back
into the evaluator. A detector whose output the student can see is a detector
they can tune against.

### 2c. Calibration is measured from blind scores only

`review.blindScores` holds what a teacher scored *before* Claude's numbers were
revealed, recorded only when they used **Score blind**. `src/lib/calibration.ts`
counts nothing else — an override typed next to Claude's number measures
anchoring, not judgement, and averaging the two would flatter the metric. The
Evaluator Console reports the blind-scored share next to the delta so a thin
sample is visible rather than implied.

Blind scores are written once and never overwritten by later adjustments.

### 3. Model selection

`DEFAULT_MODEL` lives in `functions/src/claude.ts`: `claude-opus-5`, overridable
via the `CLAUDE_MODEL` env var on the function. The browser is not told which
model runs — the Evaluator Console reports the model recorded on the most recent
evaluation instead, so it cannot disagree with what actually graded. Adaptive
thinking is on by default on this model — do not add `thinking: {type:
'disabled'}` to save tokens. On Opus 5 that risks tool calls being emitted as
plain text and `<thinking>` tags leaking into the response; lowering
`output_config.effort` is the correct cost lever. Grading runs at `effort: 'high'`,
student test runs at `'medium'`.

### 4. Always check `stop_reason` before reading content

Opus 5's safety classifiers can decline a request — that arrives as **HTTP 200**
with `stop_reason: 'refusal'`, not an exception. Both API call sites — in
`functions/src/claude.ts` — check for it and throw `RefusalError`. Any new call
site must do the same before touching `message.content` — including the streamed
ones, where the check goes on the resolved `finalMessage()`, not on the deltas.

Refusals are surfaced to the student verbatim rather than silently retried on a
fallback model — for a course about prompting, "Claude declined this prompt" is
information worth seeing.

### 5. Student text is untrusted data

A student's prompt, output, and reflection all flow into the evaluator's context.
They are wrapped in tags and the system prompt states plainly that nothing inside
those tags is an instruction. If you change how submissions are formatted for
grading, keep that boundary intact — a submission that talks its way to a higher
score is a real failure mode, not a hypothetical one.

### 6. The locking rule lives in `computeProgress()`

Exercise N is available only once exercise N−1 has a submission with status
`approved`. That function is the single source of truth; `ExerciseWorkspace`
redirects on `state === 'locked'` and the dashboard renders from the same map.
Do not duplicate the rule elsewhere.

The chain runs over the **whole ordered list**, custom exercises included.
Learning paths group that list for display and per-path completion; they do not
fork it into parallel chains. One chain is what keeps `computeProgress()` the
only place locking is decided — think hard before changing that, because
per-path unlocking changes the pedagogy, not just the code.

### 6a. The exercise list is dynamic — read `useExercises()`

`EXERCISES` in `data/exercises.ts` holds only the nine built-ins. Teachers
author custom exercises that live under `/exercises` in the database, and
`useExercises()` merges the two into one ordered list with a lookup map.
Anything that renders, links to, or grades an exercise must read that hook;
reaching for the `EXERCISES` constant makes custom exercises silently vanish.

Because the list is fetched, a deep link cannot be judged until it has loaded —
wait for `loading` before redirecting on a missing or locked exercise, or you
will bounce a valid link to a custom exercise.

### 6b. Every attempt is kept

A submission is never overwritten: each attempt is its own record with its own
`attempt` number, prompt, output, evaluation, and review. `attemptsFor()`
returns them oldest-first, and `RevisionTimeline` renders the score
progression. Do not "tidy" this into a latest-attempt-plus-history shape — the
Growth dimension, the revision timeline, and the teacher's context all read the
full series.

### 6c. Real-world challenges carry a `scenario`, and the evaluator is told it

Exercises 6–9 are applied briefs. Each has an `Exercise.scenario` — the seat the
student is sitting in, the situation, who receives the output, and what going
wrong costs — which the workspace renders above the brief and
`buildEvaluatorSystemPrompt()` injects into the grading context.

That injection is the whole point. These exercises are scored on fitness for a
stated reader, so a grader that has not been told who the reader is will reward
technique and miss the brief. They also weight Execution above the rubric
default (via `rubricWeights`), because in an applied task the question is
whether the artifact could be sent, not whether the prompt reads well.

Do not add a scenario to the first five. They are deliberately context-free: the
technique is supposed to be the only variable.

### 7. Progress is derived, never stored

There is no `/progress` node. Everything is computed from `/submissions` so the
two can't drift apart. Resist the urge to denormalise for speed until there is a
measured problem.

### 7a. Analytics are derived too, and charts are hand-rolled

`src/lib/analytics.ts` computes every number the analytics pages and the report
render, on read, from `/submissions`. Same rule as `computeProgress()` — there
is no analytics node, and denormalising one would let a dashboard drift from the
submissions it claims to summarise, silently.

Two conventions run through that file and should not be broken casually:

- **A "score" is the teacher's final score where one exists, Claude's weighted
  total otherwise.** Charting Claude's number under a label that says "score"
  misreports the class the moment a teacher overrides.
- **Divergence counts only reviews that moved a dimension.** A teacher who
  accepted Claude's score contributes agreement, not a zero-magnitude
  disagreement, and averaging those in washes the signal out.

`src/components/charts.tsx` is inline SVG with no charting dependency. That is
load-bearing for the PDF path: a canvas-based library renders blank or
rasterised through the print pipeline.

Colour follows the form's job — one hue for magnitude, a warm/cool pair with a
neutral midpoint for polarity, accent-plus-grey for emphasis. There are
deliberately **no categorical palettes**: nothing here plots independent series
against each other, so the colourblind-safety problem is avoided rather than
mitigated. The amber pole measures 2.15:1 against white, so any mark drawn in it
carries its number as text, and every chart has a table view beside it.

### 7b. "Export as PDF" is the browser's print pipeline

The report at `/report/:studentId` is exported with `window.print()` against the
`@media print` block in `src/index.css`. No PDF library: one would add a large
dependency *and* re-implement the layout, so the export would drift from the
page. What the print rules produce **is** the artifact — anything hidden there is
absent from the file a guardian receives.

The report's audience is a parent or guardian, not the student. It carries no
rubric internals, no evaluator mechanics, and no integrity signals. It does
follow the reader's language — it is the one page that leaves the building, and
an English PDF is no use to a guardian who reads Spanish.

### 7c. Badges are derived too, and they only count approved work

`src/lib/achievements.ts` computes every badge from `/submissions` on read. No
`/achievements` node — a stored badge outlives the work that earned it, and a
teacher who withdraws an approval would leave one behind.

Two conventions:

- **A badge is earned from work a teacher approved, or from a score a teacher
  could have overridden.** Read the teacher's dimension score where one exists,
  Claude's otherwise — the same rule as `analytics.ts`.
- **Nothing measures speed, streaks, or volume.** The rubric rewards revision;
  a badge for finishing fast would quietly argue with it. "Kept at it" exists
  and is deliberately framed as effort rather than failure.

The copy lives in the i18n dictionary under `achievement.<id>.*`, not in the
module — badges read in the student's language. The module returns ids and the
variables their sentences need.

### 8. The client never says what a prompt produced

`evaluateSubmission` takes a submission id and nothing else. The function reads
the prompt from the database, runs it, writes the output, grades it, and writes
the score — all with admin credentials. The browser's test-run output is a
preview for the student, never the graded artifact.

The grade still streams back while that happens: the callable sends the
evaluator's raw JSON deltas as chunks, and the client previews them through
`partial-json.ts`. The preview is cosmetic — the Evaluation the teacher reviews
is the one the function computed and wrote.

This is what lets `database.rules.json` deny clients any write to `evaluation`
or `output`. If you ever pass the output up from the client to save a round
trip, you have handed students a text box for their own transcript and score.

### 9. Language changes what a student reads, never how they are graded

`src/lib/i18n.ts` holds both dictionaries. `EN` defines the key set and `ES` is
typed `Record<MessageKey, string>`, so a missing or misspelled Spanish key fails
`npm run lint` instead of leaking an English string into a Spanish page. Adding
a key means adding both halves — that is the feature, not friction.

Three boundaries hold this together:

1. **Exercise text is localised; the graded exercise is not.**
   `localizeExercise()` swaps the student-facing fields for display.
   `buildEvaluatorSystemPrompt()` is always handed the canonical record, because
   a translated brief is a subtly different brief and two students held to two
   different standards is what a fixed rubric exists to prevent.
2. **`testInput` is not translated.** The material *is* the problem — the
   ambiguity in the transcript, the shorthand in the clinical notes — so
   translating it would hand two students two different problems. Same reason
   the material lives server-side.
3. **Feedback language travels on the submission, not the session.**
   `Submission.locale` records what the student was working in;
   `evaluateSubmission` narrows it to `'en' | 'es'` and tells the evaluator to
   write its prose in it. Scores, bands and weights are identical either way.
   The reader's own UI language lives in `localStorage`, because a shared
   classroom machine gets switched between students all day.

Two things are deliberately still English: the teacher consoles (review queue,
analytics, evaluator console, exercise builder — staff tools, and the shared
components inside them do translate), and `RUBRIC`'s own `label`/`description`
fields in `data/rubric.ts`, which are the canonical strings the model is given.
The UI reads `rubric.<key>.label` from the dictionary instead. If you add a
dimension, add its two keys in both languages as well.

`relativeTime()` and `formatDuration()` read the active locale from module state
rather than taking a translator, because they are called from chart data and
table cells during render. That is the only mutable module state in the app and
it exists for exactly those two functions — components must use `useLocale()`,
or they will not re-render when the language changes.

### 10. The playground is the one unbounded call, and it is quota'd

`runPlayground` takes a prompt and material the caller wrote. Every other path
is bounded by something the server chose — an exercise id resolves to material
the caller cannot supply, a submission id resolves to a prompt already in the
database — so this is the closest thing here to a general-purpose Claude proxy.

It is worth it (a course about prompting where you cannot try a prompt is a
worse course) and it is paid for with a per-user quota: 40 runs an hour, counted
by a transaction at `/rateLimits/$uid/playground`. That node has **no rule** in
`database.rules.json` and is therefore denied to every client by the root
default; only admin credentials touch it. If you add another free-form call,
claim from the same counter.

Nothing about a playground run is stored: no submission, no output, nothing a
teacher can read. An experiment that might be marked is not an experiment. The
draft in the editor survives a reload via `localStorage` and goes no further.

### 11. The theme is tokens, not variants

Dark mode is a **palette swap under `[data-theme='dark']`** in `src/index.css`.
The neutral ramp inverts, `--color-white` becomes a raised surface one step
lighter than the canvas, and every accent hue's tint steps (50–300, the fills
and borders) trade places with its text steps (700–900). A component written
against `bg-white text-ink-800` is already correct in both themes — and a new
one cannot forget to be, which is the point. `ThemeContext` sets one attribute
and does nothing else.

Four constraints hold it together:

- **The mid steps (400–600) never move.** They are the saturated fills — a
  primary button, an approved cell, a chart mark. Text on them is
  `text-onaccent`, which is always white, because `text-white` now flips with
  the surface and would land dark-on-indigo.
- **`slab`/`onslab` never move either.** The sign-in hero is the one
  deliberately dark panel; inverting it puts a near-white slab across half the
  screen of someone who chose dark.
- **`.btn-primary` and `.btn-success` take their hover from a variable.** Their
  light-mode hover step (indigo-700, emerald-700) is a *text* colour in dark
  mode, so a `hover:bg-indigo-700` utility would turn a hovered button pale.
- **The dark block is wrapped in `@media screen`.** The report at
  `/report/:studentId` is the PDF a guardian receives — it is always light,
  whatever the teacher's screen is set to. That one line is why there is no
  duplicated light palette in the print rules.

In charts, *data* colour is fixed hex (a score of 82 is the same green in both
themes and on paper) and *furniture* — grid, axis, haloes, marker rings — is
tokens. Do not blur that line.

There is a `dark:` variant registered for the cases a token swap genuinely
cannot express. Reach for it last, not first.

### 12. Offline reads, queued writes, and no offline grader

The service worker (`public/sw.js`, hand-written, no Workbox) caches the shell.
`src/lib/offline.ts` mirrors the exercise list and the reader's own submissions
to `localStorage`. Together those make the app open, and open with something in
it.

- **The mirror is a fallback, never a source.** A live snapshot always wins and
  always overwrites. Nothing is derived from the cache that is not derived the
  same way from live data.
- **Only students are mirrored.** A teacher's read is the whole class; mirroring
  it would leave every student's work in the localStorage of the machine the
  teacher last marked on. The mirror is dropped on sign-out for the same reason.
- **Nothing cross-origin and nothing but GET is ever cached.** Every call
  carrying identity or a grade — Auth, the database socket, the callables — is
  cross-origin, so the service worker's same-origin guard is what makes a cached
  score impossible rather than merely unlikely. Keep it that way.
- **A queued attempt carries the prompt and the reflection, and nothing else.**
  Rule 8 has no offline exception: the function still runs the prompt itself
  when the outbox flushes. An outbox that carried its own transcript would be
  exactly the text box for your own score that the whole design avoids.
- **The queue does not renumber.** `attempt` is fixed when the student hits
  submit, from what they could see at the time.
- **An update is offered, never applied.** Taking over a waiting worker reloads
  the page, and this app's most expensive moment is a student mid-submission
  with an unsaved prompt in a textarea.

The worker registers in production builds only — against the dev server it
would cache a shell that changes on every save.

### 13. A class is a lens, not a second progression

Classes live at `/classes/$classId` with membership as a `students` set, and
`ClassContext` applies the selection to the teacher screens: the review queue,
class progress, and analytics. Every filter there removes rows from a view;
none of them changes a number.

That is the whole constraint. `computeProgress()` is still the only place
locking is decided and it still runs over one ordered exercise list for
everyone; `analytics.ts` still derives from `/submissions` by the same
functions, applied to a smaller set. The moment a class carries its own
exercises or its own passing score, three derived modules each grow a "which
class" parameter and the single source of truth becomes several.

Two smaller decisions worth keeping:

- **Membership lives on the class, not on the profile.** The profile rules let a
  student write their own record, so a `classId` there is something a student
  could set for themselves.
- **Any teacher may edit any class.** It matches how reviews already work — every
  teacher can read and review every submission — and it is what a covering
  teacher needs on the day the class's owner is off sick.

Students never see a class, and `/classes` is denied to them by the rules.

### 14. Shortcuts and exports never destroy work

Two small features that are easy to get wrong in the same way.

**Keyboard shortcuts** (`hooks/useHotkeys.ts`):

- ⌘/Ctrl+Enter submits, never plain Enter. Submitting writes an attempt, spends
  tokens grading it, and puts the result in a teacher's queue; a shortcut that
  fired on a stray keypress would manufacture attempts nobody meant to make.
  It is always bound to the same condition as the button it mirrors.
- **Escape leaves only when leaving costs nothing.** In a text field it blurs
  and stops. Otherwise it navigates, unless the page says it is holding unsaved
  work — a typed prompt, a typed review comment. None of that survives
  unmounting, so the shortcut is deliberately inert on the pages that are
  editors and live on the pages that are views. `<KeyHint>` names the keys so
  the asymmetry is discoverable rather than mysterious.

**CSV export** (`lib/csv.ts`):

- **Cells are neutralised against formula injection.** A prompt or a reflection
  is untrusted student text, and a cell beginning `= + - @` is executed by
  Excel and Sheets on open. Quoting does not help — the formula is parsed after
  the CSV is — so a leading apostrophe is prepended, which spreadsheets read as
  "literal" and strip from the display.
- **An export contains exactly what is on screen**, class lens and filters
  applied. An export button that quietly dumped everything would contradict the
  page it sits on.
- **The produced output and the integrity report are not exported.** The output
  makes the file unreadable in a spreadsheet, and the integrity flags mean
  nothing outside the review screen that explains them — a "concern: 62" column
  read next to a name in a staff meeting is exactly the accusation rule 2b says
  it is not.
- The score column follows `analytics.ts`: the teacher's final score where one
  exists, Claude's otherwise, with Claude's total in its own column so an
  override is visible rather than silent.

Skeletons are **shaped** — a card where a card is coming, ragged lines where
prose is coming. A single full-height grey rectangle tells the reader only that
something is happening. They live in `components/ui.tsx`; do not hand-roll
another `animate-pulse` block.

## Authentication and authorisation

Three layers, in order of authority:

1. **`database.rules.json`** is the real boundary. Unauthenticated requests get
   nothing. A student can read `/submissions` only through a query filtered to
   their own uid (`query.orderByChild === 'studentId' && query.equalTo ===
   auth.uid`), can create exactly one shape of record — their own, `status:
   'evaluating'`, empty `output`, no `evaluation`, no `review` — and can never
   write it again. A teacher can read everything and write `status`, `review`,
   and `updatedAt`. `evaluation` and `output` have no client write rule at all.
2. **`createProfile`** is the only writer of `role`. Teacher sign-up presents a
   code checked against the `TEACHER_SIGNUP_CODE` secret, which never reaches
   the browser. Every rule that says "teacher" reads
   `root.child('users').child(auth.uid).child('role')`, so the role is
   trustworthy precisely because clients cannot write that field.

   It is deliberately provider-agnostic: email/password and Google both land
   there, and the only difference is that a typed display name wins over the
   one on the ID token. Its early return for an existing profile is what makes
   Google safe — a returning user never reaches the teacher-code check, so
   re-running the popup with `role: 'teacher'` cannot promote anyone.
3. **`Protected` in `App.tsx`** is convenience only. It keeps the wrong role
   from staring at a page of denied reads; it stops nobody.

Because reads are role-shaped, `store.ts` builds a *different query* per role
rather than fetching everything and filtering. Getting that wrong is a
permission error, not a wider result set — do not "simplify" it back.

Realtime Database rejects `undefined` values — `stripUndefined()` exists for that
reason, and it recurses into nested objects because exercise records carry them
(rubric weight overrides). Use it on any new write path.

Database nodes: `/students`, `/submissions`, `/exercises` (custom exercises
only — the built-in nine are compiled in and must never be written there),
`/classes` (teacher-only, read and write; students are denied it entirely), and
`/rateLimits` (playground quota counters, written only by the function; it has
no rule at all, so the root default denies every client).

## Security posture

Phase 2 closed the two holes that used to be documented here: the API key is no
longer client-side, and the database is no longer world-readable. What remains
worth knowing:

1. **The teacher signing code is a shared secret, not an invitation system.**
   Anyone who learns it can create a teacher account. It is checked server-side
   so it cannot be read out of the bundle, but rotating it does not revoke the
   accounts it already created. Demote those by editing `role` in the console.
2. **`runPrompt` is authenticated but not rate-limited.** Any signed-in user can
   spend tokens, bounded only by `maxInstances` and the 20k-character prompt
   cap. It is survivable because the caller can only run one of the exercises;
   a per-uid quota is still the obvious next step outside a classroom, and
   `claimPlaygroundRun()` is the pattern to copy.
3. **`runPlayground` takes arbitrary text, and is quota'd for it.** 40 runs per
   user per rolling hour, 8k characters of prompt and 8k of material, enforced
   server-side. It is the widest surface in the app; do not widen it further
   without moving the counter with it. See rule 10.
4. **`/exercises` is read-only for authenticated users and unused.** The built-in
   exercises ship in the bundle (`src/data/exercises.ts`); the node exists so
   that a mirrored copy could never be written by a client.

## Build notes

**Shared modules.** `functions/tsconfig.json` sets `rootDir` to the repo root
and compiles `src/types`, `src/data`, and `src/lib/evaluator-prompt.ts` alongside
`functions/src`. That is why the emitted entry point is
`lib/functions/src/index.js` and why `functions/package.json` points `main`
there. A second copy of the rubric or the grading prompt would drift within a
release — do not create one.

The `node:fs` / `node:path` Vite aliases and `src/lib/node-shim.ts` are gone with
the browser-side Anthropic SDK. If a build starts warning about externalized
node builtins again, something has pulled the SDK back into the client bundle.

**Tailwind v4:** `@apply` can only reference real utilities, not other custom
classes. `.btn-primary` cannot `@apply btn`. The shared button base is applied to
all variants via a grouped selector in `src/index.css` — keep them in sync when
adding a variant.

## Conventions

- Domain types go in `src/types/index.ts`; import them with `import type`.
- Prefer deriving state in `useData.ts` over adding fields to stored records.
- UI primitives live in `components/ui.tsx`. Reuse `Panel`, `Alert`, `ScoreRing`,
  `RubricBreakdown`, `StatusBadge`, `RevisionTimeline`, `LiveEvaluation`,
  `PathChip`, `DifficultyBadge`, `CharCounter`, `AchievementGrid`,
  `LanguagePicker`, `ThemeToggle`, `ThemePicker`, `ClassPicker`,
  `ClassScopeNote`, `CopyButton`, `KeyHint`, and the `Skeleton*` family rather
  than hand-rolling equivalents.
- Everything stored in `localStorage` is a *preference or a draft*, never work
  that matters, and every key is namespaced `aiskills.*`: the language, the
  theme, the teacher's class filter, the playground draft, the offline read
  mirror, and the outbox. The one exception proves the rule — an outbox entry is
  real work, which is why it is queued rather than discarded and why sign-out
  clears the mirror but not the queue.
- No user-visible string is written inline in a student-facing component. Add a
  key to both dictionaries in `lib/i18n.ts` and read it through `useLocale()`.
  Plurals go through `tn()` and its `.one` / `.other` variants.
- `Exercise.maxPromptChars` is an advisory budget, surfaced by `CharCounter`.
  Going over does not block submission and the evaluator is never told about it
  — the point is to make the constraint felt while writing, not to fail a
  student on a character they cannot see.
- Comments explain *why*, not *what*. The existing comments mark constraints
  (API behaviours, Tailwind limitations, trust boundaries) — match that bar.
