# Prompt Class

Assess how engineers work with AI, not just what they ship.

Prompt Class is a multi-tenant platform for evaluating AI-enabled engineers.
Teams build a library of realistic exercises, group them into sets, invite
candidates, and score each submission – the code *and* every prompt behind
it – against weighted dimensions.

*Next.js 16 · React 19 · Tailwind v4 · Supabase Auth + Postgres · Prisma 7*

## Quick start

```bash
cd prompt-class
npm install            # also runs prisma generate
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

The landing and sign-in pages work without any configuration. Signing in
needs a Supabase project and a database – see [SETUP.md](SETUP.md).

## Docs

- [SETUP.md](SETUP.md) – database, auth and first tenant
- [ROADMAP.md](ROADMAP.md) – what's built and what's next
- [CLAUDE.md](CLAUDE.md) – architecture, conventions and deployment guardrails

This app lives in `prompt-class/`. The repository root holds a separate,
older app: the Vite + Firebase classroom tool.
