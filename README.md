# AI Skills Exercise Manager

A classroom app for teaching prompt engineering. Students work through five
locked exercises, Claude scores each submission against a fixed rubric in
seconds, and a teacher reviews every score before a student moves on.

<p align="center">
  <em>React 19 · TypeScript · Vite · Tailwind v4 · Firebase Realtime Database · Claude Opus 5</em>
</p>

---

## How it works

```
Student writes a prompt  →  test-runs it as often as they like  →  submits with a reflection
                                                                            │
                                                    Claude Evaluator scores it against the rubric
                                                                            │
                                             Teacher reviews, overrides any dimension, decides
                                                                            │
                                                        Approved  →  next exercise unlocks
```

### The three roles

| Role | What they do |
|---|---|
| **Student** | Writes and tests prompts, submits with a written reflection, sees their score and feedback immediately |
| **Teacher** | Works a review queue, adjusts any rubric dimension with a slider, approves or sends back with a comment |
| **Claude Evaluator** | The automated grader. Its console shows the exact system prompt Claude receives, every score it has produced, and how far teachers moved each one |

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

## Quick start

```bash
git clone https://github.com/jdell/ai-exercise-manager.git
cd ai-exercise-manager
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:5173. **It runs with no configuration at all** — without
Firebase credentials the app stores data in your browser (synced across tabs, so
you can drive the student and teacher sides side by side). You only need an
Anthropic API key, which you can paste into **Settings** rather than putting in a
file.

### Getting an API key

Create one at [console.anthropic.com](https://console.anthropic.com/settings/keys),
then open **Settings** in the app and paste it. It is stored in that browser's
localStorage and never written to the database.

> [!WARNING]
> This app calls the Anthropic API **directly from the browser**. Whatever key is
> in use is visible to anyone with devtools access on that machine. That is fine
> for a classroom where each person supplies their own key. For a public
> deployment, put a proxy in front of `api.anthropic.com` and point the SDK's
> `baseURL` at it.

---

## Setting up Firebase

Needed for real multi-device use — students on their laptops, the teacher on
theirs.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Build → Realtime Database → Create Database.** Start in *locked mode*; the
   rules in this repo are applied in step 5.
3. **Project settings → Your apps → Web** and register an app. Copy the config
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

4. Put your project id in `.firebaserc`.
5. Deploy the rules and hosting config:

   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only database
   ```

Settings will show **Firebase Realtime Database** as the data store once the
config is picked up.

> [!CAUTION]
> `database.rules.json` allows **public read and write**. The teacher passcode is
> a UI gate compiled into the bundle, not authentication. This is deliberate for
> a classroom on a trusted network and unsuitable for anything public — add
> Firebase Auth and rewrite the rules against `auth.uid` before exposing it.

---

## Deploying

### Manual

```bash
npm run deploy   # build + firebase deploy
```

### GitHub Actions

`.github/workflows/deploy.yml` builds and deploys to Firebase Hosting on every
push to `main`, and builds a preview channel for pull requests. Add these
repository secrets under **Settings → Secrets and variables → Actions**:

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
| `VITE_TEACHER_PASSCODE` | Passcode for the Teacher and Claude Evaluator roles |

To generate the service account key: Firebase console → **Project settings →
Service accounts → Generate new private key**, then paste the whole JSON file
contents as the secret value.

`VITE_ANTHROPIC_API_KEY` is deliberately **not** in that list. Leave it unset and
let each user supply their own key in Settings — a key added as a CI secret ends
up in the deployed JavaScript bundle.

---

## Configuration reference

Every variable is documented in [`.env.example`](.env.example). The ones you are
most likely to change:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_CLAUDE_MODEL` | `claude-opus-5` | Model used for test runs and grading |
| `VITE_TEACHER_PASSCODE` | `let-me-teach` | Gate for the Teacher / Evaluator roles |
| `VITE_ANTHROPIC_API_KEY` | *(empty)* | Optional build-time key; prefer per-user keys in Settings |

---

## Project layout

```
src/
├── data/exercises.ts   the five exercises and their grading guidance
├── data/rubric.ts      dimensions, weights, weightedTotal()
├── lib/claude.ts       every Anthropic API call
├── lib/store.ts        Firebase or localStorage behind one interface
├── hooks/useData.ts    subscriptions and the exercise-unlock rule
├── pages/              one file per route
└── components/         Layout and shared UI primitives
```

`CLAUDE.md` documents the invariants — read it before making structural changes.

## Scripts

```bash
npm run dev       # dev server
npm run build     # typecheck + production build
npm run lint      # typecheck only
npm run preview   # serve the built bundle
npm run deploy    # build + firebase deploy
```

## Licence

MIT
