# 12 — Deployment

## Service Setup (in order)

### 1. GitHub
```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/social-studio.git
```

`.gitignore` must include: `node_modules/`, `dist/`, `.env.local`, `.env`, `.vercel/`, `*.log`

### 2. Neon Postgres
1. Sign up at neon.tech, create project "social-studio"
2. Copy connection string → `DATABASE_URL`
3. Free tier: 0.5 GB storage, 190 compute hours/month

### 3. Clerk
1. Sign up at clerk.com, create app "Social Studio"
2. Enable email/password auth
3. Configure redirect URLs: `https://yourdomain.com/sign-in` and `http://localhost:5173/sign-in`
4. Copy publishable key → `VITE_CLERK_PUBLISHABLE_KEY`
5. Copy secret key → `CLERK_SECRET_KEY`
6. Set up webhook → `https://yourdomain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy signing secret → `CLERK_WEBHOOK_SECRET`

### 4. Vercel
1. Sign up, connect GitHub
2. Import `social-studio` repo
3. Build settings: Framework: Vite, Build: `pnpm build`, Output: `dist`
4. Add all environment variables
5. Deploy

### 5. Cloudflare (if custom domain)
1. Add domain to Cloudflare
2. DNS record: CNAME → `cname.vercel-dns.com` (proxy OFF)
3. Add domain in Vercel project settings

### 6. Additional Services (add when needed)
- **Anthropic API key** → Phase 2
- **Vercel Blob token** → Phase 2 (auto-configured in Vercel)
- **Resend API key** → optional Phase 3.5
- **Meta App ID + Secret** → Phase 4
- **Cron secret** → optional Phase 3.5 reminders and Phase 4 publishing

---

## vercel.json

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

**Add crons later as needed:**
- Phase 3.5 (optional): `{ "path": "/api/reminders/cron", "schedule": "0 8 * * *" }`
- Phase 4B: `{ "path": "/api/publish/cron", "schedule": "*/5 * * * *" }` (requires Vercel Pro)

---

## Deployment Workflow

```bash
# Development
pnpm dev

# Database migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Production (auto-deploys on push to main)
git push origin main
```

Every push to a non-main branch creates a Vercel preview deployment.

---

## Cost at Scale

| Users | Vercel | Neon | Clerk | Resend | Claude | Total |
|-------|--------|------|-------|--------|--------|-------|
| 1 | Free | Free | Free | Free | ~$5 | ~$5/mo |
| 10 | Free | Free | Free | Free | ~$15 | ~$15/mo |
| 100 | $20 | $19 | $25 | $20 | ~$50 | ~$134/mo |
