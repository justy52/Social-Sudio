# 02 — Tech Stack

## Overview

Every technology choice is made for one or more of these reasons:
1. **Justin already knows it** — reduces learning curve
2. **Free tier is generous** — keeps costs near zero during build
3. **AI agents work well with it** — Claude Code / Codex can generate reliable code
4. **Production-ready** — not a toy; scales if Social Studio becomes a real product

---

## Frontend

| Technology | Version | Purpose | Why This |
|-----------|---------|---------|----------|
| **React** | 18.x | UI framework | Already in use, massive ecosystem, agents generate excellent React |
| **Vite** | 5.x | Build tool / dev server | Already in use, fast HMR, simple config |
| **Tailwind CSS** | 3.x | Utility-first styling | Already in use, pairs perfectly with shadcn |
| **shadcn/ui** | latest | Component library | Already in use, copy-paste components, fully customizable |
| **React Router** | 6.x | Client-side routing | Standard for React SPAs, simple API |
| **Lucide React** | latest | Icons | Included with shadcn, consistent icon set |
| **React Hook Form** | 7.x | Form handling | Lightweight, works great with shadcn form components |
| **Zod** | 3.x | Schema validation | Pairs with React Hook Form, shared frontend + backend validation |
| **TanStack Query** | 5.x | Server state / data fetching | Caching, refetching, optimistic updates out of the box |
| **date-fns** | 3.x | Date manipulation | Lightweight, tree-shakeable, for scheduling features |

## Backend

| Technology | Purpose | Why This |
|-----------|---------|----------|
| **Vercel Serverless Functions** | API routes (in `/api/` directory) | Zero config, deploys with frontend, Node.js runtime |
| **Neon Postgres** | Primary database | Justin already using it, serverless Postgres, generous free tier |
| **Drizzle ORM** | Database queries / migrations | Type-safe, lightweight, great DX with Postgres |
| **Resend** | Optional email reminders | Justin already using it, simple API, free tier covers optional Phase 3.5+ reminders |

## Infrastructure

| Technology | Purpose | Why This |
|-----------|---------|----------|
| **Vercel** | Hosting / deployment | Justin already using it, free tier, automatic preview deploys |
| **Cloudflare** | DNS / CDN / edge caching | Justin already using it, custom domain management |
| **Vercel Blob** | Image storage | Native to Vercel, no separate S3 config needed |
| **GitHub** | Source control | Standard, CI/CD integration with Vercel |

## External APIs

| API | Purpose | Phase |
|-----|---------|-------|
| **Anthropic Claude API** | AI caption generation | Phase 2 |
| **Meta Graph API** | Instagram + Facebook publishing | Phase 4 (not MVP) |

## Auth: Clerk (Decision Made)

**Social Studio uses Clerk for authentication. This is not up for debate during the build.**

- Drop-in auth components for React
- Free tier: 10,000 MAU
- Social login, email/password, MFA
- User management dashboard
- Webhook support for syncing users to Neon
- Full white-label / multi-tenant SaaS is not part of the current build phases. Light business branding only may be added in Phase 5.

## Dev Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **TypeScript** | Type safety (required — not optional) |
| **pnpm** | Package manager (faster, stricter than npm) |

## Environment Variables

```env
# .env.local (never commit this file)

# Database
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# Auth (Clerk)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# AI (Phase 2)
ANTHROPIC_API_KEY=sk-ant-...

# Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Email (optional Phase 3.5+)
RESEND_API_KEY=re_...

# Meta (Phase 4 — not needed until then)
META_APP_ID=123456789
META_APP_SECRET=abc123...

# Cron (optional Phase 3.5+ reminders and Phase 4 publishing — not needed for MVP)
CRON_SECRET=random-secret-string
```

## Cost Estimates (Monthly at MVP)

| Service | Free Tier | Estimated Cost |
|---------|-----------|----------------|
| Vercel | 100GB bandwidth, serverless | $0 |
| Neon Postgres | 0.5 GB storage, 190 compute hrs | $0 |
| Cloudflare | Unlimited DNS, basic CDN | $0 |
| Clerk | 10,000 MAU | $0 |
| Resend | 3,000 emails/mo | $0 if optional Phase 3.5+ reminders are enabled |
| Anthropic API | Pay per token | ~$5–15/mo |
| Vercel Blob | 250MB free | $0 |
| **Total** | | **~$5–15/mo** |
