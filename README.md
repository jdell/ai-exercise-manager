# AI Skills Exercise Manager

A classroom app for teaching prompt engineering. Students work through five
locked exercises, Claude scores each submission against a fixed rubric in
seconds, and a teacher reviews every score before a student moves on.

<p align="center">
  <em>React 19 · TypeScript · Vite · Tailwind v4 · Firebase Auth + Realtime Database + Cloud Functions · Claude Opus 5</em>
</p>

---

## How it works

```
Student writes a prompt  →  test-runs it as often as they like  →  submits with a reflection
                                                                            │
                                            The server re-runs the prompt and scores the result
                                                                            │
                                             Teacher reviews, overrides any dimension, decides
                                                                            │
                                                        Approved  →  next exercise unlocks
```

Every call to Claude happens in a Cloud Function. The browser holds no API key,
and the score and transcript are written server-side — a student can submit a
prompt, not a result.

### The two roles

| Role | What they do |
|---|---|
| **Student** | Writes and tests prompts, submits with a written reflection, sees their score and feedback immediately |
| **Teacher** | Works a review queue, adjusts any rubric dimension with a slider, approves or sends back with a comment. Also gets the **Evaluator Console**: the exact system prompt Claude receives, every score it has produced, and how far teachers moved each one |

Roles are set at sign-up and stored on the user's profile. Creating a teacher
account requires a signing code that is checked on the server.

### The rubric

| Dimension | Weight | Measures |
|---|---:|---|
| **Prompt Quality** | 40% | Is the prompt itself well built — clear task, useful context, stated constraints, defined output shape |
| **Understanding** | 30% | Does the reflection show *why* the prompt works, not just that it did |
| **Execution** | 20% | Did the prompt actually produce what the exercise asked for when it ran |
| **Growth** | 10% | Compared to earlier attempts, did this one move forward |

Claude returns four 0–100 scores through a JSON schema; the app computes the
weighted total itself. A total of 75 or above clears the bar — but nothing counts
until a teacher approves it.

### The five exercises

1. **Clear Prompts** — say exactly what you want
2. **Role-Playing** — give the model a seat at the table
3. **JSON Output** — make output a machine can consume
4. **Multi-Step Reasoning** — decompose before you delegate
5. **Prompt Debugging** — diagnose, then repair

Each exercise ships with a brief, a task, success criteria, tips, a starter
scaffold, fixed test material (so attempts are comparable), and its own grading
guidance for the evaluator. Exercise N unlocks only when N−1 is approved.

---

## Architecture

```
Browser (Firebase Hosting)                Cloud Functions (us-central1)
┌────────────────────────┐                ┌──────────────────────────────┐
│ React SPA              │                │ createProfile      ← role gate│
│  · Firebase Auth       │  httpsCallable │ runPrompt          ← streamed │
│  · reads scoped by role│ ─────────────▶ │ evaluateSubmission ← grades   │
│  · no API key          │                │  ANTHROPIC_API_KEY (Secret Mgr)│
└───────────┬────────────┘                └───────────┬──────────────────┘
            │ rules-checked reads/writes              │ admin writes
            ▼                                         ▼
      ┌──────────────────────────────────────────────────┐
      │ Realtime Database   /users   /submissions        │
      └──────────────────────────────────────────────────┘
```

Three things follow from that shape, and they are the point of the design:

- **Students cannot fabricate a score or a transcript.** `evaluateSubmission`
  takes a submission id, reads the prompt from the database, runs it, and writes
  both `output` and `evaluation` with admin credentials. Neither field has a
  client write rule.
- **Students cannot read each other's work.** The rules let a student read
  `/submissions` only through a query filtered to their own uid.
- **The teacher role cannot be self-assigned.** `role` is writable only by
  `createProfile`, which checks a server-side signing code.

The grading prompt itself lives in `src/lib/evaluator-prompt.ts` and is compiled
into *both* the web app and the functions, so the prompt the Evaluator Console
shows you is byte-for-byte the prompt the grader receives.

---

## Setup

You need a Firebase project on the **Blaze** plan (Cloud Functions requires it)
and an Anthropic API key.

```bash
git clone https://github.com/jdell/ai-exercise-manager.git
cd ai-exercise-manager
npm install          # also installs functions/
cp .env.example .env.local
```

### 1. Create the Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
   and upgrade it to **Blaze**.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Realtime Database → Create Database.** Start in *locked mode*; the
   rules in this repo replace that in step 4.
4. **Project settings → Your apps → Web** and register an app. Copy the config
   values into `.env.local`:

   ```env
   VITE_FIREBASE_API_KEY=…
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=…
   VITE_FIREBASE_APP_ID=…
   ```

5. Put your project id in `.firebaserc`.

### 2. Set the server-side secrets

Neither of these is ever sent to a browser.

```bash
npm i -g firebase-tools
firebase login

firebase functions:secrets:set ANTHROPIC_API_KEY     # from console.anthropic.com
firebase functions:secrets:set TEACHER_SIGNUP_CODE   # anything; share with staff only
```

### 3. Deploy the backend

```bash
npm run deploy       # builds the app, then deploys hosting + functions + rules
```

Or piecewise while iterating:

```bash
firebase deploy --only database   # security rules
firebase deploy --only functions  # the three callables
```

### 4. Create the first teacher account

Open the app, choose **Create an account → Teacher**, and enter the signing code
you set in step 2. Students sign up the same way without a code.

---

## Local development

The emulator suite replaces the deployed project entirely — no live data, no
real spend on anything except the Anthropic calls themselves.

```bash
# functions/.secret.local (gitignored)
ANTHROPIC_API_KEY=sk-ant-api03-…
TEACHER_SIGNUP_CODE=let-me-teach
```

```bash
npm run emulators    # auth + database + functions on localhost
VITE_USE_EMULATORS=true npm run dev
```

Set `VITE_USE_EMULATORS=true` in `.env.local` to avoid repeating it. The header
shows an **Emulators** badge whenever it is on.

Accounts created in the emulator are discarded when it stops, so sign-up is the
first thing you do each session.

---

## Deploying

### Manual

```bash
npm run deploy   # hosting + functions + database rules
```

### GitHub Actions

`.github/workflows/deploy.yml` typechecks the app *and* the functions, then
deploys **Hosting only** on every push to `main`, plus a preview channel for
pull requests. Cloud Functions and database rules are deployed manually — doing
them from CI would require a service account with Cloud Functions Admin, Secret
Manager access, and Database Admin, which is a much broader grant than hosting
needs.

Repository secrets, under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Full JSON of a service account key with the *Firebase Hosting Admin* role |
| `FIREBASE_PROJECT_ID` | Your Firebase project id |
| `VITE_FIREBASE_API_KEY` | From the web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | " |
| `VITE_FIREBASE_DATABASE_URL` | " |
| `VITE_FIREBASE_PROJECT_ID` | " |
| `VITE_FIREBASE_STORAGE_BUCKET` | " |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | " |
| `VITE_FIREBASE_APP_ID` | " |

There is deliberately no Anthropic key and no teacher passcode in that list —
neither is a client-side value any more.

---

## Security notes

The API key is server-held and the database is closed by default, so what is
left is narrower than it used to be. Read it before running this outside a
classroom:

- **The teacher signing code is a shared secret, not an invitation system.**
  Anyone who learns it can create a teacher account. It is checked server-side
  and never ships in the bundle, but rotating it does not revoke accounts it has
  already created — demote those by editing `role` under `/users` in the console.
- **`runPrompt` is authenticated but not rate-limited.** Any signed-in user can
  spend Anthropic tokens, bounded only by a 20,000-character prompt cap and the
  function's `maxInstances`. Add a per-user quota before opening sign-up widely.
- **Sign-up is open.** Anyone with the URL can create a student account. Firebase
  Auth supports email verification and domain allow-lists if you need to close
  that.

---

## Configuration reference

Every variable is documented in [`.env.example`](.env.example).

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `VITE_FIREBASE_*` | client | — | Required. Firebase web app config |
| `VITE_FUNCTIONS_REGION` | client | `us-central1` | Must match `setGlobalOptions()` in `functions/src/index.ts` |
| `VITE_USE_EMULATORS` | client | `false` | Point auth/database/functions at localhost |
| `ANTHROPIC_API_KEY` | **secret** | — | Required. Read only by the functions |
| `TEACHER_SIGNUP_CODE` | **secret** | — | Gate for creating teacher accounts |
| `CLAUDE_MODEL` | function env | `claude-opus-5` | Model used for test runs and grading |

---

## Project layout

```
src/
├── data/exercises.ts        the five exercises and their grading guidance
├── data/rubric.ts           dimensions, weights, weightedTotal()
├── lib/evaluator-prompt.ts  the grading prompt + schema — shared with functions/
├── lib/claude.ts            thin client for the callables (no SDK, no key)
├── lib/auth.ts              Firebase Auth + createProfile
├── lib/store.ts             database reads and writes, scoped by role
├── hooks/useData.ts         subscriptions and the exercise-unlock rule
├── pages/                   one file per route
└── components/              Layout, AuthShell, shared UI primitives

functions/src/
├── index.ts                 createProfile, runPrompt, evaluateSubmission
├── claude.ts                every Anthropic API call
└── guards.ts                auth and role checks

database.rules.json          the actual access control
```

`CLAUDE.md` documents the invariants — read it before making structural changes.

## Scripts

```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm run lint       # typecheck, web app + functions
npm run emulators  # local auth + database + functions
npm run preview    # serve the built bundle
npm run deploy     # build + firebase deploy
```

## Licence

MIT
