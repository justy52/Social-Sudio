# 07 — Phase 1: Foundation

**Goal:** Establish the project scaffold, authentication, database, and base layout so all subsequent phases have real infrastructure to build on.

**Estimated effort:** 2–3 sessions with Claude Code / Codex

---

## Prerequisites

- [ ] Run the Pre-Build Audit from `06-CURRENT-STATE.md` and save as `AUDIT.md`
- [ ] Create a GitHub repository
- [ ] Create accounts:
  - [ ] Vercel (vercel.com)
  - [ ] Neon (neon.tech) — create a Postgres database
  - [ ] Clerk (clerk.com) — create an application

---

## Tasks

### 1.1 — Project Configuration

Add TypeScript (if not already configured), missing dependencies, and path aliases.

```bash
pnpm add react-router-dom @tanstack/react-query @clerk/clerk-react
pnpm add drizzle-orm @neondatabase/serverless zod react-hook-form @hookform/resolvers date-fns
pnpm add -D typescript @types/react @types/react-dom drizzle-kit
```

Configure `@` path alias in `vite.config.ts`. Create `.env.example` with all env vars (no real values).

**Acceptance criteria:**
- [ ] `pnpm dev` runs without errors
- [ ] TypeScript compiles with no errors
- [ ] Path aliases working (`@/components/...`)

### 1.2 — Database Setup

Create `drizzle.config.ts`, `src/lib/db/schema.ts` (users + businesses tables only), and `src/lib/db/index.ts` (Neon connection). Generate and run the initial migration.

**Acceptance criteria:**
- [ ] Schema defines `users` and `businesses` tables
- [ ] Migration applied to Neon
- [ ] `drizzle-kit studio` shows tables

### 1.3 — Authentication (Clerk)

Wrap `<App>` in `<ClerkProvider>`. Create sign-in/sign-up pages. Protect all routes. Add `<UserButton>` to header. Create Clerk webhook (`api/webhooks/clerk.ts`) to sync users to Neon.

**Acceptance criteria:**
- [ ] Can sign up and sign in
- [ ] User created in Neon on sign-up
- [ ] Protected routes redirect to sign-in
- [ ] Sign out works

### 1.4 — Base Layout & Routing

Create app shell with sidebar navigation: Dashboard, Posts, Calendar (placeholder), Settings. Top header with business name and Clerk UserButton. Responsive (sidebar → hamburger on mobile). Create React Router config with placeholder pages for each route.

**Acceptance criteria:**
- [ ] Sidebar navigation works on desktop and mobile
- [ ] All routes render placeholder pages
- [ ] Active route highlighted in sidebar
- [ ] Responsive at 375px and 1440px

### 1.5 — Business Setup Flow

After first sign-in, if user has no businesses, show a setup form: business name (required), industry (dropdown), website URL, brand voice (textarea), primary color picker. Create API routes: `GET/POST /api/businesses`. Store active business in React Context.

**Acceptance criteria:**
- [ ] New user sees setup form after first sign-in
- [ ] Business created in Neon with correct user association
- [ ] Business name appears in header
- [ ] Settings page allows editing business details

### 1.6 — Initial Deployment

Connect GitHub repo to Vercel. Set environment variables. Configure `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

Configure Cloudflare DNS if using a custom domain.

**Acceptance criteria:**
- [ ] App deploys to Vercel on `git push`
- [ ] Auth works in production
- [ ] Database operations work in production
- [ ] Preview deploys work for branches

---

## Phase 1 Completion Checklist

- [ ] TypeScript configured, no compile errors
- [ ] Neon database with `users` and `businesses` tables
- [ ] Clerk auth working (sign up, sign in, sign out, protected routes)
- [ ] User sync webhook operational
- [ ] App shell with sidebar, header, responsive layout
- [ ] Business creation flow working
- [ ] Deployed to Vercel with production URL
- [ ] GitHub repo with clean commit history
