# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A classroom app for teaching prompt engineering. Students work through five
locked exercises; Claude auto-scores each submission against a fixed rubric;
a teacher reviews every score and decides whether the student progresses.

Three roles, all in one SPA:

| Role | Does |
|---|---|
| **Student** | Writes prompts, test-runs them, submits with a reflection |
| **Teacher** | Reviews Claude's scores, overrides any dimension, approves or requests a revision |
| **Claude Evaluator** | The automated grader. Its console exposes the exact system prompt, a log of every score, and how far teachers have moved those scores |

## Stack

- **React 19 + TypeScript**, Vite 7, Tailwind CSS v4 (`@tailwindcss/vite`), React Router 7
- **Firebase Realtime Database** for persistence (with a localStorage fallback — see below)
- **Anthropic SDK**, called **directly from the browser**
- **Firebase Hosting**, deployed by GitHub Actions on push to `main`

## Commands

```bash
npm run dev      # dev server on :5173
npm run build    # tsc -b && vite build → dist/
npm run lint     # typecheck only (tsc -b --noEmit)
npm run preview  # serve the built bundle
npm run deploy   # build + firebase deploy (needs firebase-tools + login)
```

There is no test suite. `npm run lint` is a typecheck — run it before committing.

## Layout

```
src/
├── data/
│   ├── exercises.ts    ← the five exercises: brief, task, criteria, test input,
│   │                     and per-exercise grading guidance for the evaluator
│   └── rubric.ts       ← the four dimensions, weights, and weightedTotal()
├── lib/
│   ├── claude.ts       ← ALL Anthropic API calls live here
│   ├── firebase.ts     ← config + isFirebaseConfigured
│   ├── store.ts        ← data access; Firebase or localStorage behind one interface
│   └── node-shim.ts    ← browser stub for node:fs / node:path (see Build notes)
├── hooks/useData.ts    ← subscriptions + computeProgress() (the locking rule)
├── context/SessionContext.tsx
├── components/         ← Layout, shared UI primitives
├── pages/              ← one file per route
└── types/index.ts      ← every shared domain type
```

## Rules that matter

### 1. The rubric is defined once, in `src/data/rubric.ts`

Weights are Prompt Quality 40%, Understanding 30%, Execution 20%, Growth 10%.
`weightedTotal()` is the only place the final score is computed.

**The model never supplies the total.** It returns four 0–100 dimension scores;
the app clamps them and computes the weighted total itself. If you add a
dimension, update `RUBRIC`, the `RubricKey` type, and `EVALUATION_SCHEMA` in
`claude.ts` together — they must stay in lockstep.

### 2. Structured outputs, not prose parsing

`evaluateSubmission()` uses `output_config.format` with a `json_schema`. Do not
replace this with "return JSON" in the prompt and a regex — the schema is what
makes scores parse reliably.

Structured outputs do **not** support numeric range constraints (`minimum`,
`maximum`), which is why scores are declared as plain integers and clamped in
`clamp()` after parsing.

### 3. Model selection

`DEFAULT_MODEL` is `claude-opus-5`, overridable via `VITE_CLAUDE_MODEL`. Adaptive
thinking is on by default on this model — do not add `thinking: {type:
'disabled'}` to save tokens. On Opus 5 that risks tool calls being emitted as
plain text and `<thinking>` tags leaking into the response; lowering
`output_config.effort` is the correct cost lever. Grading runs at `effort: 'high'`,
student test runs at `'medium'`.

### 4. Always check `stop_reason` before reading content

Opus 5's safety classifiers can decline a request — that arrives as **HTTP 200**
with `stop_reason: 'refusal'`, not an exception. Both API call sites check for it
and throw `RefusalError`. Any new call site must do the same before touching
`message.content`.

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

## The storage fallback

`isFirebaseConfigured` is false when the `VITE_FIREBASE_*` variables are absent.
In that case `store.ts` serves the identical interface from localStorage, with
`BroadcastChannel` + `storage` events for cross-tab sync. The whole
student → evaluator → teacher → unlock loop works this way, which makes the app
runnable with no backend at all.

Both code paths must be kept working. When adding a store function, implement the
localStorage branch too.

Realtime Database rejects `undefined` values — `stripUndefined()` exists for that
reason. Use it on any new write path.

## Security posture — read before deploying publicly

This app is built for a trusted classroom, and two things follow from that:

1. **The Anthropic API key is client-side.** `dangerouslyAllowBrowser: true` is
   set in `claude.ts`. Keys entered in Settings live in that browser's
   localStorage and are never written to the database, but any key in use is
   visible to anyone with devtools access. For a public deployment, put a proxy
   between this app and `api.anthropic.com` and point the SDK's `baseURL` at it.
2. **`database.rules.json` is world-readable and world-writable.** There is no
   Firebase Auth. The teacher passcode is a UI gate compiled into the bundle, not
   authentication. Anyone with the database URL can read and write everything.
   Before exposing this beyond a classroom, add Firebase Auth and rewrite the
   rules against `auth.uid` and a custom claim for the teacher role.

Neither of these is an oversight to quietly fix in passing — changing them is a
design change that affects setup instructions. Raise it rather than assuming.

## Build notes

The Anthropic SDK imports `node:fs` / `node:path` for filesystem credential
resolution (`~/.config/anthropic` profiles). That path never runs here because
the client is always constructed with an explicit `apiKey`, so `vite.config.ts`
aliases those specifiers to `src/lib/node-shim.ts` — a Proxy that throws on any
access. Without the alias, every build prints a dozen "externalized for browser
compatibility" warnings.

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
