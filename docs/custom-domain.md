# Serving the app from your own domain

Firebase Hosting gives every project two free domains —
`your-project-id.web.app` and `your-project-id.firebaseapp.com` — and both work
without any of this. Point a school domain at the app when you want the URL on
a handout to be `ai.example.edu` instead of `some-project-8a3f.web.app`.

Budget about 30 minutes of work and up to 24 hours of waiting for DNS. Nothing
here is reversible in the sense that matters — you can remove a custom domain at
any time and the `.web.app` address keeps working throughout.

---

## Before you start

You need:

- **Owner or Editor** on the Firebase project.
- **DNS control** for the domain — the ability to add `A`, `AAAA`, and `TXT`
  records at your registrar or DNS host. In a school this is often someone else;
  the two records below are all you need to hand them.
- A **deployed site**. Run `npm run deploy` at least once first, so there is
  something at the far end when the domain resolves.

Decide the hostname now, because changing it later means repeating the whole
process. A subdomain (`ai.example.edu`) is easier than an apex (`example.edu`):
apex domains cannot be `CNAME`d, so they must use `A`/`AAAA` records, which is
what the instructions below assume anyway.

---

## 1. Add the domain in Firebase

```
Firebase console → Hosting → Add custom domain
```

Enter the hostname (`ai.example.edu`) and continue. Firebase offers two
choices:

- **Redirect** — send this hostname to another one. Useful for pointing
  `www.example.edu` at `example.edu`, not for serving the app.
- **Serve the site** — what you want here.

Firebase then shows a **`TXT` record** to prove you control the domain.

---

## 2. Verify ownership

Add the `TXT` record exactly as shown, at the host Firebase names:

| Type  | Host                | Value                            |
| ----- | ------------------- | -------------------------------- |
| `TXT` | `ai` (or `@`, apex) | `hosting-site=…` (copy verbatim) |

Two things that trip people up:

- **The host field is relative.** Most DNS panels want `ai`, not
  `ai.example.edu`. Entering the full name usually creates
  `ai.example.edu.example.edu`.
- **TTL does not matter yet.** Leave whatever the panel defaults to.

Firebase checks every few minutes and the console tells you when it has passed.
If it stalls for more than an hour, confirm the record is live from outside your
network:

```bash
dig +short TXT ai.example.edu
```

---

## 3. Point the domain at Firebase

Once verified, the console shows two IP addresses. Add both as `A` records for
the same host, and — if your DNS host supports IPv6, which it should — the
`AAAA` records Firebase lists alongside them.

| Type   | Host | Value                          |
| ------ | ---- | ------------------------------ |
| `A`    | `ai` | (first IP Firebase shows)      |
| `A`    | `ai` | (second IP Firebase shows)     |
| `AAAA` | `ai` | (IPv6 addresses, if offered)   |

**Do not invent these addresses or copy them from another project's
documentation.** Firebase assigns them per site and they have changed before.

Delete any pre-existing `A`, `AAAA`, or `CNAME` record for the same host first —
a stale record left in place is the single most common cause of a domain that
half works.

---

## 4. Wait for the certificate

Firebase provisions a free certificate through Let's Encrypt once the `A`
records resolve. The console shows the domain as **Pending** and then
**Connected**.

- Typical: under an hour.
- Worst case: 24 hours, and the console says so.
- Until it finishes you may see a certificate warning. That is expected and
  resolves itself; do not add a second domain to "retry".

Check progress from outside the console:

```bash
dig +short A ai.example.edu
curl -sI https://ai.example.edu | head -1
```

---

## 5. Tell Firebase Authentication about it

**This is the step that is easy to miss, and the app is broken without it.**

Firebase Auth rejects sign-in from any origin not on its allow-list, so Google
sign-in fails on the new domain with `auth/unauthorized-domain` while continuing
to work on `.web.app`. That reads as "the new domain is broken" rather than as a
configuration gap.

```
Firebase console → Authentication → Settings → Authorised domains → Add domain
```

Add `ai.example.edu`. Leave the existing entries alone — `.web.app` and
`.firebaseapp.com` are still the fallback if DNS ever goes wrong.

Email/password sign-in works without this. Google sign-in does not. Test both.

---

## 6. Check the things a new origin actually changes

The service worker, the installed-app identity, and every stored preference are
**scoped to the origin**. Moving domains means:

- **A fresh service worker registration.** The new origin has no cached shell
  until someone visits. Nothing to do — it registers on first load — but the
  first visit on the new domain is a normal online load, not an offline one.
- **A separate installed app.** Someone who installed from `.web.app` has an
  app pinned to that origin. It keeps working; it does not become the new one.
  Tell people to reinstall from the new URL.
- **Reset local preferences.** Language, theme, the teacher's class filter, the
  playground draft, and the offline mirror all live in `localStorage`, which is
  per-origin. Everyone starts from defaults on the new domain. Nothing is lost
  that matters — all of it is a preference, and none of it is work. Submissions,
  scores, and reviews live in the database and are unaffected.
- **A queued offline attempt does not travel.** If a student has work in the
  outbox on the old origin, it flushes from the old origin. Have people
  reconnect once on the old URL before you retire it.

Do a quick pass on the new domain: sign in with Google, open an exercise, run a
test prompt, and print a report to PDF.

---

## Optional: keep both, or redirect one

Firebase serves every attached domain simultaneously. Two reasonable end states:

- **Keep both.** The `.web.app` address stays as an escape hatch when the school
  DNS breaks. This is what most classrooms want.
- **Redirect the old one.** Add a redirect from the Firebase domains to the
  custom one so there is a single canonical URL. Cleaner, but it removes the
  escape hatch — do this only once the custom domain has been stable for a term.

---

## Troubleshooting

| Symptom                                             | Cause                                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Ownership never verifies                            | `TXT` host is wrong (`ai.example.edu.example.edu`), or an old `TXT` is still there  |
| Domain resolves to the wrong place                  | A leftover `A`/`CNAME` for the same host at your DNS provider                       |
| `Your connection is not private`                    | Certificate still provisioning. Wait; do not re-add the domain                      |
| Google sign-in fails, email sign-in works           | Step 5 — the domain is not in Authentication → Authorised domains                   |
| App loads but every read is denied                  | Not domain-related. Check `database.rules.json` deployed: `firebase deploy --only database` |
| Old version served after a deploy                   | A cached service worker. `firebase.json` sends `no-cache` for `/sw.js`; confirm with `curl -sI https://ai.example.edu/sw.js` |
| Works on desktop, blank on a phone                  | Usually a stale installed PWA pinned to the previous origin. Reinstall             |

---

## What this does not change

- **The Anthropic API key.** It lives in Secret Manager and is read by the Cloud
  Functions. Functions are called by SDK, not by URL, so the domain is
  irrelevant to them.
- **Database rules.** They key off `auth.uid` and the role at `/users/$uid`, not
  off an origin.
- **The functions region.** `VITE_FUNCTIONS_REGION` must still match
  `setGlobalOptions()` in `functions/src/index.ts`, on any domain.
