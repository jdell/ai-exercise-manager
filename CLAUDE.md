# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A classroom app for teaching prompt engineering. Students work through a locked
sequence of exercises — five built in, plus any a teacher authors; Claude
auto-scores each submission against a fixed rubric, streaming the result as it
is written; a teacher reviews every score and decides whether the student
progresses. Every attempt is kept, so students can see how their work moved
between revisions.

Two roles, backed by Firebase Authentication:

| Role | Does |
|---|---|
| **Student** | Writes prompts, test-runs them, submits with a reflection |
| **Teacher** | Reviews Claude's scores, overrides any dimension, approves or requests a revision, and authors custom exercises. Also gets the Evaluator Console, which exposes the exact system prompt, a log of every score, and how far teachers have moved those scores |

The role lives on the user's profile record at `/users/$uid` and is written by
one Cloud Function. It is not a UI toggle, and there is no third "evaluator"
role any more — the console is a teacher route.

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
│   ├── exercises.ts    ← the five BUILT-IN exercises + mergeExercises()
│   ├── paths.ts        ← the three learning paths and difficulty styling
│   └── rubric.ts       ← the four dimensions, weights, effectiveWeights(),
│                         and weightedTotal()
├── lib/
│   ├── evaluator-prompt.ts ← the grading prompt + schema. SHARED with functions/
│   ├── claude.ts       ← thin client for the two callables. No SDK, no key
│   ├── partial-json.ts ← reads a half-written JSON document (streaming preview)
│   ├── analytics.ts    ← every analytics figure, derived from /submissions
│   ├── auth.ts         ← Firebase Auth + the createProfile call
│   ├── firebase.ts     ← app/auth/db/functions handles + emulator wiring
│   └── store.ts        ← database reads and writes, scoped by role
├── hooks/useData.ts    ← subscriptions, useExercises(), computeProgress()
│                         (the locking rule), pathProgress()
├── context/SessionContext.tsx  ← credential + profile = session
├── components/         ← Layout, AuthShell, shared UI primitives
│   └── charts.tsx      ← inline-SVG chart primitives (no charting dependency)
├── pages/              ← one file per route
└── types/index.ts      ← every shared domain type

functions/
├── src/index.ts        ← the three callables
├── src/claude.ts       ← ALL Anthropic API calls live here
└── src/guards.ts       ← auth/role checks, prior-attempt lookup

database.rules.json     ← the actual access control
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

`EXERCISES` in `data/exercises.ts` holds only the five built-ins. Teachers
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
rubric internals, no evaluator mechanics, and no integrity signals.

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
only — the built-in five are compiled in and must never be written there).

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
   cap. A per-uid quota is the obvious next step if this runs outside a
   classroom.
3. **`/exercises` is read-only for authenticated users and unused.** The five
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
  `PathChip`, `DifficultyBadge`, `CharCounter` rather than hand-rolling
  equivalents.
- `Exercise.maxPromptChars` is an advisory budget, surfaced by `CharCounter`.
  Going over does not block submission and the evaluator is never told about it
  — the point is to make the constraint felt while writing, not to fail a
  student on a character they cannot see.
- Comments explain *why*, not *what*. The existing comments mark constraints
  (API behaviours, Tailwind limitations, trust boundaries) — match that bar.
