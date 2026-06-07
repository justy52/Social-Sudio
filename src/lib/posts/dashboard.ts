import type { PostSummary } from './client.ts';

export type DashboardMetrics = {
  draftsInProgress: number;
  postsAwaitingReview: number;
  approvedReadyToExport: number;
  scheduledThisWeek: number;
};

export type DashboardSummary = {
  metrics: DashboardMetrics;
  recentActivity: PostSummary[];
  upcomingScheduled: PostSummary[];
};

export function buildDashboardSummary(
  posts: PostSummary[],
  now = new Date(),
  timeZone?: string,
): DashboardSummary {
  const currentWeekKey = getWeekStartKey(now, timeZone);

  return {
    metrics: {
      draftsInProgress: posts.filter((post) => post.status === 'draft').length,
      postsAwaitingReview: posts.filter((post) => post.status === 'ready_for_review').length,
      approvedReadyToExport: posts.filter((post) => post.status === 'approved').length,
      scheduledThisWeek: posts.filter((post) =>
        isScheduledInWeek(post, currentWeekKey, timeZone),
      ).length,
    },
    recentActivity: [...posts]
      .sort((left, right) => compareDateDesc(left.updatedAt, right.updatedAt))
      .slice(0, 10),
    upcomingScheduled: posts
      .filter((post) => {
        const scheduledAt = readDate(post.scheduledAt);
        return post.status === 'scheduled' && scheduledAt !== null && scheduledAt >= now;
      })
      .sort((left, right) =>
        compareDateAsc(left.scheduledAt ?? '', right.scheduledAt ?? ''),
      )
      .slice(0, 5),
  };
}

function isScheduledInWeek(
  post: PostSummary,
  currentWeekKey: string,
  timeZone?: string,
) {
  const scheduledAt = readDate(post.scheduledAt);

  return (
    post.status === 'scheduled' &&
    scheduledAt !== null &&
    getWeekStartKey(scheduledAt, timeZone) === currentWeekKey
  );
}

function getWeekStartKey(value: Date, timeZone?: string) {
  const parts = getDateParts(value, timeZone);
  const weekStart = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  weekStart.setUTCDate(weekStart.getUTCDate() - parts.weekday);

  return [
    weekStart.getUTCFullYear(),
    String(weekStart.getUTCMonth() + 1).padStart(2, '0'),
    String(weekStart.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function compareDateAsc(left: string, right: string) {
  return getDateTime(left) - getDateTime(right);
}

function compareDateDesc(left: string, right: string) {
  return getDateTime(right) - getDateTime(left);
}

function getDateTime(value: string) {
  return readDate(value)?.getTime() ?? 0;
}

function readDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateParts(value: Date, timeZone?: string) {
  if (!timeZone) {
    return getLocalDateParts(value);
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(value).map((part) => [part.type, part.value]),
    );

    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      weekday: weekdayIndexes[parts.weekday ?? ''] ?? value.getDay(),
    };
  } catch {
    return getLocalDateParts(value);
  }
}

function getLocalDateParts(value: Date) {
  return {
    year: value.getFullYear(),
    month: value.getMonth() + 1,
    day: value.getDate(),
    weekday: value.getDay(),
  };
}

const weekdayIndexes: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
