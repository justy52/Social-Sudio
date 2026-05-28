# Social Studio — Build Plan

A comprehensive planning document set for building Social Studio, a social media content creation and planning app for small businesses.

## How to Use These Docs

These documents are designed to be consumed by both **humans** (Justin) and **AI coding agents** (Claude Code, Codex). Each phase is self-contained with clear acceptance criteria, file paths, and implementation notes.

**For Justin:** Read through the Vision, Tech Stack, and UI/UX Plan docs first to confirm the direction. Then review each phase to make sure the scope feels right before handing off to an agent.

**For AI Agents:** Start with `docs/13-AGENT-INSTRUCTIONS.md` for execution rules and conventions. Then execute phases sequentially — each phase builds on the previous one. Do not skip ahead. Validate acceptance criteria before moving to the next phase.

## Document Index

| # | Document | Purpose |
|---|----------|---------|
| 01 | [Project Vision](docs/01-PROJECT-VISION.md) | What Social Studio is, who it's for, and the product goals |
| 02 | [Tech Stack](docs/02-TECH-STACK.md) | Every technology choice and why |
| 03 | [Database Schema](docs/03-DATABASE-SCHEMA.md) | Database schema, relationships, and migrations |
| 04 | [API Design](docs/04-API-DESIGN.md) | Internal API routes and external integration specs |
| 05 | [UI/UX Plan](docs/05-UI-UX-PLAN.md) | App structure, folder layout, component hierarchy |
| 06 | [Current State](docs/06-CURRENT-STATE.md) | What already exists in the codebase |
| 07 | [Phase 1 — Foundation](docs/07-PHASE-1-FOUNDATION.md) | Project scaffold, auth, base layout, routing |
| 08 | [Phase 2 — Content MVP](docs/08-PHASE-2-CONTENT-MVP.md) | Post creation, basic editor, AI captions, export |
| 09 | [Phase 3 — Calendar](docs/09-PHASE-3-CALENDAR.md) | Content calendar and manual posting queue |
| 10 | [Phase 4 — Meta Publishing](docs/10-PHASE-4-META-PUBLISHING.md) | Direct Instagram/Facebook posting via API |
| 11 | [Phase 5 — Polish](docs/11-PHASE-5-POLISH.md) | Dashboards, templates, light business branding, polish |
| 12 | [Deployment](docs/12-DEPLOYMENT.md) | Vercel, Cloudflare, Neon Postgres, optional Resend setup |
| 13 | [Agent Instructions](docs/13-AGENT-INSTRUCTIONS.md) | Execution rules for Claude Code / Codex |

## Quick Reference

- **Repo name:** `social-studio`
- **Stack:** React 18 + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Vercel Serverless Functions (Node.js) in `/api/` directory
- **Database:** Neon Postgres via Drizzle ORM
- **Auth:** Clerk
- **Deployment:** Vercel + Cloudflare DNS
- **Email:** Resend — optional Phase 3.5+
- **AI:** Anthropic Claude API (caption generation)
- **Social APIs:** Meta Graph API — Instagram/Facebook (Phase 4, not MVP)

## Scope Guardrails

**MVP (Phases 1–3) is a branded content draft machine.** It helps you create better posts faster, approve them, and manually post them. No direct social API publishing is needed for the app to be useful.

**Phase 4+ adds automation.** Direct publishing, analytics, templates, and advanced features come after the core creation workflow is proven useful. Email reminders are optional and should only be built after the core calendar/manual posting workflow is complete.

**Explicitly NOT in scope for Phases 1–5 (but on the future roadmap):**
- Phase 6: Market Intelligence — future roadmap only
- Phase 7: Ad Campaign Assistant — future roadmap only

**Explicitly NOT in scope for any planned phase:**
- Video editing, reels, or audio/music
- Story-specific export or automated story posting
- Team accounts, roles, or client approval workflows
- Billing / Stripe / subscription management
- Agency multi-tenant workflows
- Full white-label / multi-tenant SaaS is not part of the current build phases. Light business branding only may be added in Phase 5.
- TikTok / X / LinkedIn integration
- Mobile native app (responsive web only)
