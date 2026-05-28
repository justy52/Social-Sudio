# 01 — Project Vision

## What Is Social Studio?

Social Studio is a **social media content creation and planning app for small businesses** that helps owners create, review, approve, and export branded social media content from a single dashboard. It combines image editing, AI-powered copywriting, and an approval workflow to reduce the friction of daily social media management.

Full white-label / multi-tenant SaaS is not part of the current build phases. Light business branding only may be added in Phase 5.

## The Problem

Small business owners (gym owners, contractors, local shops) know they need to post on social media consistently, but:

1. They don't have time to create content from scratch every day
2. They can't afford to hire a social media manager ($1,500–$5,000/mo)
3. They juggle multiple platforms with different sizing requirements
4. Generic tools like Canva + Buffer require too many steps across too many apps
5. They struggle to write compelling captions

## The Solution

Social Studio collapses the content creation pipeline into one app:

- **Upload** — Bring in photos from your phone or computer
- **Edit** — Add branded text overlays, logo, and sizing for each platform
- **Write** — AI-powered caption generator that matches your brand voice
- **Approve** — Review and approve content before it goes anywhere
- **Export** — Download ready-to-post images and copy-paste captions
- **Schedule** (Phase 3) — Calendar view with reminders for when to post
- **Publish** (Phase 4) — Direct posting to Instagram and Facebook via Meta API

## Target Users

### Primary: Justin's own businesses
- Aloha Fence (fencing company)
- Behemoth Trucking (oilfield logistics)
- Any future ventures

### Secondary: Small business clients (future roadmap)
- Local gyms, studios, and coaches
- Contractors and trade businesses
- Restaurants and retail shops

## Product Goals

### Lean MVP (Phases 1–2)
- [ ] Functional content creation pipeline: upload → edit → caption → approve → export
- [ ] AI caption generation that uses business brand voice
- [ ] Deployed and accessible from any browser
- [ ] Used actively for at least one real business (Aloha Fence)

### Useful Product (Phase 3)
- [ ] Content calendar with scheduling reminders
- [ ] "Ready to post today" queue
- [ ] Email reminders for scheduled content (optional Phase 3.5+)

### Full Product (Phase 4)
- [ ] Direct publishing to Instagram and Facebook via Meta API
- [ ] Automated scheduled publishing

### Growth (Phase 5+)
- [ ] Analytics dashboard with engagement metrics
- [ ] Reusable post templates library
- [ ] Light business branding using business colors and logo
- [ ] Portfolio-ready demo for job applications

## Scope Boundaries

### Image-first MVP
Phases 1–3 support **static images only**. The following are explicitly deferred and should NOT be built by any agent during Phases 1–3:

- Video upload or editing
- Reels or short-form video
- Audio or music overlays
- Story-specific formatting or auto-posting
- Carousel posts (multiple images in one post)

### Single-owner model for MVP
MVP supports **one user managing one or more of their own businesses**. The following are explicitly deferred:

- Team accounts or multiple users per business
- Role-based permissions (admin, editor, viewer)
- Client approval workflows (agency model)
- Billing, subscriptions, or Stripe integration
- Agency multi-tenant dashboards

## Success Metrics

- Justin actively uses Social Studio to manage content for Aloha Fence
- At least 10 posts created and exported/published through the platform
- Live URL deployed as a portfolio piece
- Codebase on GitHub demonstrating professional development practices
