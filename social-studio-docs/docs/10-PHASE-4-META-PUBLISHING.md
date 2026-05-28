# 10 — Phase 4: Meta Publishing

**Goal:** Connect to Meta's Graph API and enable one-click publishing to Instagram and Facebook. Scheduled auto-publishing is handled separately in Phase 4B to avoid stacking too much complexity at once.

**Depends on:** Phase 3 complete. Social Studio should already be in daily use with the export workflow before investing in this phase.

**Estimated effort:** Phase 4A: 2–3 sessions. Phase 4B: 1–2 sessions.

---

## Prerequisites (Justin must complete before the agent starts)

1. **Create a Meta Developer App** at developers.facebook.com
   - App type: "Business"
   - Add products: "Facebook Login" and "Instagram Graph API"
   - Note the App ID and App Secret
2. **Have a Facebook Page** connected to an Instagram Business account
   - Personal IG accounts won't work — must be Business or Creator
3. **Set environment variables:** `META_APP_ID`, `META_APP_SECRET`

---

## Phase 4A — Connect & One-Click Publish

### 4A.1 — Meta OAuth Flow

**Create routes:**
- `GET /api/meta/auth-url?business_id=UUID` — generates Meta OAuth URL with required scopes
- `GET /api/meta/callback?code=string&state=string` — exchanges code for long-lived token (60 days), fetches user's Pages and linked IG accounts, stores in `social_accounts` table

**Add `social_accounts` table** to Drizzle schema. Generate and apply migration.

**Create Accounts page** (`src/pages/accounts.tsx`):
- "Connect Instagram & Facebook" button
- List of connected accounts with status and token expiration
- Disconnect button per account

**Acceptance criteria:**
- [ ] OAuth flow connects IG and FB accounts
- [ ] Long-lived tokens stored in database
- [ ] Accounts listed on Accounts page
- [ ] Can disconnect accounts
- [ ] Handles errors (user denies, invalid code)

### 4A.2 — One-Click Publishing

**Create route:** `POST /api/publish` — publishes a single post to target Meta accounts.

**Instagram flow:** Upload image to media container → poll status until ready → publish → store permalink.
**Facebook flow:** Upload photo to page → store post ID.

**UI additions:**
- Account selector on post form (which IG/FB accounts to target)
- "Publish Now" button on approved posts (alongside "Export")
- Publishing progress indicator (uploading → processing → published)
- Success: toast with permalink to live post
- Failure: clear error message, allow retry

**Acceptance criteria:**
- [ ] Can publish to Instagram with image + caption
- [ ] Can publish to Facebook Page with image + caption
- [ ] Post status updates to `published` with permalink
- [ ] Errors are clear and actionable
- [ ] "Publish Now" and "Export" coexist as options

### 4A.3 — Publish Notifications

**Optional email notifications via Resend after Meta publishing is reliable:**
- Success: caption preview, link to live post
- Failure: error message, link to retry in Social Studio

**Acceptance criteria:**
- [ ] Email on successful publish
- [ ] Email on failed publish
- [ ] Clean HTML email template

---

## Phase 4A Completion Checklist

- [ ] Meta OAuth connects IG and FB accounts
- [ ] Can one-click publish to Instagram and Facebook
- [ ] Email notifications for publish events
- [ ] All features work in production
- [ ] **Social Studio can now publish directly — but only manually, not on a schedule**

---

## Phase 4B — Scheduled Auto-Publishing

**Build 4B only after 4A is working reliably.** This adds automated scheduled publishing, which requires a cron job and proper error handling for unattended execution.

### 4B.1 — Token Refresh

**Daily cron to refresh Meta tokens expiring within 7 days.**
- If refresh fails, set `is_active = false` on the account
- Send email notification to the user that their account needs reconnection

### 4B.2 — Auto-Publish Cron

**Create route:** `GET /api/publish/cron` — finds posts with `status = 'scheduled'` and `scheduled_at <= now()`, publishes each via the same engine built in 4A.2.

**Requires Vercel Pro ($20/mo) for sub-daily cron, or use an external cron service (cron-job.org, Upstash QStash) to call the endpoint every 5–15 minutes.**

```json
{
  "crons": [
    { "path": "/api/publish/cron", "schedule": "*/5 * * * *" }
  ]
}
```

**Error handling:**
- Failed publishes set post status to `failed` with error message
- Failed posts don't block other scheduled posts
- Retry logic: attempt once, mark as failed, let user manually retry

**Acceptance criteria:**
- [ ] Scheduled posts auto-publish within 5–15 minutes of scheduled time
- [ ] Failed publishes don't block other posts
- [ ] Cron protected by secret header
- [ ] Token refresh runs daily
- [ ] Expired tokens trigger user notification

---

## Phase 4B Completion Checklist

- [ ] Scheduled posts auto-publish via cron
- [ ] Token refresh strategy in place
- [ ] Failed publish handling with user notification
- [ ] All features work in production
- [ ] **Social Studio now handles the full lifecycle: create → approve → schedule → auto-publish**
