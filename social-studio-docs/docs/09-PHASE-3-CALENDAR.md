# 09 — Phase 3: Calendar

**Goal:** Add a content calendar, scheduled post queue, and a "ready to post today" view. This gives Social Studio the feel of a real content management tool without the complexity of direct Meta API publishing.

**Depends on:** Phase 2 complete

**Estimated effort:** 1–2 sessions with Claude Code / Codex

**Scope boundary:** This phase adds scheduling UI and a calendar. It does NOT add direct social publishing or automated cron jobs. Users still export and manually post. Email reminders are optional Phase 3.5+ and should only be built after the core calendar/manual posting workflow is complete.

---

## Tasks

### 3.1 — Schedule Posts

**Add scheduling to the post approval flow:**
- After a post is approved, user can choose "Export Now" or "Schedule for Later"
- Schedule picker: date (calendar) + time (dropdown in 30-min increments)
- Time displayed in the business's configured timezone
- Scheduling sets `status: 'scheduled'` and `scheduled_at: datetime`

**Update post form and post detail:**
- Scheduled posts show the date/time with an "Unschedule" action
- Unscheduling returns the post to `approved` status

**Acceptance criteria:**
- [ ] Can schedule an approved post for a future date and time
- [ ] Scheduled date/time displayed in business timezone
- [ ] Can unschedule a post (returns to approved)
- [ ] Cannot schedule a post that hasn't been approved

---

### 3.2 — Content Calendar

**Create Calendar page** (`src/pages/calendar.tsx`):
- Monthly grid view showing posts on their scheduled dates
- Each day cell shows post thumbnails (or count if many)
- Color-coded by status: approved (green), scheduled (purple), exported (blue)
- Published posts (Phase 4) will show as well when available
- Click a post → opens post detail/edit
- Click an empty day → navigates to new post with that date pre-filled
- Navigation: prev/next month arrows, "Today" button

**"Today's Queue" sidebar or section:**
- List of posts scheduled for today
- Each shows thumbnail, caption preview, and platform size
- "Export & Post" button for each
- Clear visual: "3 posts ready for today"

**Acceptance criteria:**
- [ ] Calendar displays all scheduled posts on correct dates
- [ ] Can navigate between months
- [ ] Clicking empty day starts a new post with that date
- [ ] Clicking a post opens it for viewing/editing
- [ ] Today's queue shows what needs to be posted
- [ ] Responsive: list view fallback on mobile

---

### 3.3 — Dashboard Upgrade

**Replace placeholder dashboard with real data:**

Stats cards (top row):
- Drafts in progress
- Posts awaiting review
- Approved & ready to export
- Scheduled this week

Recent activity: last 10 posts with status and date.
Upcoming: next 5 scheduled posts with "Export" shortcut.

**Acceptance criteria:**
- [ ] Dashboard shows real metrics from database
- [ ] Stats update as posts are created/approved/exported
- [ ] Upcoming queue links to post detail

---

## Phase 3 Completion Checklist

- [ ] Posts can be scheduled for future dates
- [ ] Content calendar displays scheduled posts
- [ ] Today's queue shows what's due with "Export & Post" buttons
- [ ] Dashboard shows real stats
- [ ] All features work in production
- [ ] **Social Studio is now a daily content management tool**

---

## Task 3.5 — Email Reminders (Optional)

**Build this only after Tasks 3.1–3.3 are complete and working.** It adds value but is not required for the core calendar/manual posting workflow.

**Daily reminder email via Resend (optional Phase 3.5+):**

Create a cron endpoint `GET /api/reminders/cron`:
1. Find all posts with `status = 'scheduled'` and `scheduled_at` = today
2. Group by business
3. Send one email per business to the owner:

```
Subject: You have {count} posts ready for today

Body:
Hi {first_name},

You have {count} posts scheduled for today for {business_name}:

1. "{caption_preview}" — {platform_size}
2. "{caption_preview}" — {platform_size}

Log in to export and post them: {app_url}/calendar

— Social Studio
```

**Configure Vercel Cron** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/reminders/cron",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**Acceptance criteria:**
- [ ] Daily email lists posts scheduled for today
- [ ] Email only sent if there are posts due
- [ ] Email links to the calendar page
- [ ] Cron is protected by secret
- [ ] Works in production on Vercel
