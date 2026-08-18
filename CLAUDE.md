# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A classroom app for teaching prompt engineering. Students work through five
locked exercises; Claude auto-scores each submission against a fixed rubric;
a teacher reviews every score and decides whether the student progresses.

Two roles, backed by Firebase Authentication:

| Role | Does |
|---|---|
| **Student** | Writes prompts, test-runs them, submits with a reflection |
| **Teacher** | Reviews Claude's scores, overrides any dimension, approves or requests a revision. Also gets the Evaluator Console, which exposes the exact system prompt, a log of every score, and how far teachers have moved those scores |

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
│   ├── exercises.ts    ← the five exercises: brief, task, criteria, test input,
│   │                     and per-exercise grading guidance for the evaluator
│   └── rubric.ts       ← the four dimensions, weights, and weightedTotal()
├── lib/
│   ├── evaluator-prompt.ts ← the grading prompt + schema. SHARED with functions/
│   ├── claude.ts       ← thin client for the two callables. No SDK, no key
│   ├── auth.ts         ← Firebase Auth + the createProfile call
│   ├── firebase.ts     ← app/auth/db/functions handles + emulator wiring
│   └── store.ts        ← database reads and writes, scoped by role
├── hooks/useData.ts    ← subscriptions + computeProgress() (the locking rule)
├── context/SessionContext.tsx  ← credential + profile = session
├── components/         ← Layout, AuthShell, shared UI primitives
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

Weights are Prompt Quality 40%, Understanding 30%, Execution 20%, Growth 10%.
`weightedTotal()` is the only place the final score is computed.

**The model never supplies the total.** It returns four 0–100 dimension scores;
the app clamps them and computes the weighted total itself. If you add a
dimension, update `RUBRIC`, the `RubricKey` type, and `EVALUATION_SCHEMA` in
`src/lib/evaluator-prompt.ts` together — they must stay in lockstep.

### 2. Structured outputs, not prose parsing

`evaluateSubmission()` uses `output_config.format` with a `json_schema`. Do not
replace this with "return JSON" in the prompt and a regex — the schema is what
makes scores parse reliably.

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
site must do the same before touching `message.content`.

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

### 7. Progress is derived, never stored

There is no `/progress` node. Everything is computed from `/submissions` so the
two can't drift apart. Resist the urge to denormalise for speed until there is a
measured problem.

### 8. The client never says what a prompt produced

`evaluateSubmission` takes a submission id and nothing else. The function reads
the prompt from the database, runs it, writes the output, grades it, and writes
the score — all with admin credentials. The browser's test-run output is a
preview for the student, never the graded artifact.

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
reason. Use it on any new write path.

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
  `RubricBreakdown`, `StatusBadge` rather than hand-rolling equivalents.
- Comments explain *why*, not *what*. The existing comments mark constraints
  (API behaviours, Tailwind limitations, trust boundaries) — match that bar.
