import { useMemo, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  ImagePlus,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusinessContext } from '@/context/business-context';
import { canQueuePostExport, getQueueThumbnailUrl } from '@/lib/posts/calendar-queue';
import { getPost, listPosts, updatePost, type PostSummary } from '@/lib/posts/client';
import { buildDashboardSummary, type DashboardMetrics } from '@/lib/posts/dashboard';
import {
  applyQuickExportStatusTransitions,
  copyTextToClipboard,
  downloadImageFromUrl,
  prepareManualExport,
} from '@/lib/posts/export';
import type { PostStatus } from '@/lib/posts/status';
import { toUserFacingError } from '@/lib/user-facing-error';
import { cn } from '@/lib/utils';

const statusLabels: Record<PostStatus, string> = {
  draft: 'Draft',
  ready_for_review: 'Ready for review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  exported: 'Exported',
};

const statusStyles: Record<PostStatus, string> = {
  draft: 'border-slate-400/25 bg-slate-400/10 text-slate-200',
  ready_for_review: 'border-amber-300/30 bg-amber-400/10 text-amber-200',
  approved: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200',
  scheduled: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-200',
  exported: 'border-primary/35 bg-primary/15 text-primary',
};

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { activeBusiness, isLoading: isBusinessLoading } = useBusinessContext();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const postsQuery = useQuery({
    queryKey: ['posts', activeBusiness?.id],
    queryFn: () => listPosts(getToken, activeBusiness?.id ?? ''),
    enabled: Boolean(activeBusiness?.id),
  });
  const summary = useMemo(
    () => buildDashboardSummary(postsQuery.data ?? [], new Date(), activeBusiness?.timezone),
    [activeBusiness?.timezone, postsQuery.data],
  );

  const exportMutation = useMutation({
    mutationFn: async (post: PostSummary) => {
      const detail = await getPost(getToken, post.id);
      const prepared = prepareManualExport(detail);

      await downloadImageFromUrl(prepared.media.blobUrl, prepared.fileName);
      await copyTextToClipboard(prepared.text);

      const transitionedPost = await applyQuickExportStatusTransitions(
        detail.post.status,
        (status) => updatePost(getToken, detail.post.id, { status }),
      );

      return transitionedPost ?? detail.post;
    },
    onSuccess: async () => {
      setMessage('Image downloaded. Caption copied. Post marked exported.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['posts', activeBusiness?.id] });
    },
    onError: (mutationError) => {
      setError(readError(mutationError, 'Could not export post.'));
      setMessage(null);
    },
  });

  const isLoading = isBusinessLoading || postsQuery.isLoading;

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-lg border border-primary/15 bg-card/60 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.36)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.16),transparent_36%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.18),transparent_34%)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
              <Cpu className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Live content pipeline for {activeBusiness?.name ?? 'your business'}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Phase 3 MVP
            </Badge>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void postsQuery.refetch()}
              disabled={!activeBusiness || postsQuery.isFetching}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {(message || error) && (
        <div
          role={error ? 'alert' : 'status'}
          aria-live="polite"
          className={cn(
            'rounded-md border px-4 py-3 text-sm shadow-[0_0_28px_rgba(56,189,248,0.08)] backdrop-blur-xl',
            error
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-primary/20 bg-primary/10 text-primary',
          )}
        >
          {error ?? message}
        </div>
      )}

      {!isBusinessLoading && !activeBusiness ? (
        <DashboardEmptyState />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {buildMetricItems(summary.metrics).map((item) => {
              const Icon = item.icon;

              return (
                <Card
                  key={item.label}
                  className="group overflow-hidden border-primary/15 bg-card/70"
                >
                  <CardContent className="relative flex items-start justify-between gap-3 p-4">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-60" />
                    <div>
                      <p
                        className={cn(
                          'text-2xl font-semibold',
                          isLoading && 'text-primary/70 motion-safe:animate-pulse',
                        )}
                      >
                        {isLoading ? '-' : item.value}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                    </div>
                    <div className="rounded-md border border-primary/25 bg-primary/10 p-2 text-primary shadow-[0_0_24px_rgba(56,189,248,0.16)] transition-all duration-200 group-hover:border-primary/45 group-hover:bg-primary/15">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="space-y-3">
              <SectionHeading icon={Clock} title="Recent Activity" detail="Last 10 posts" />
              {isLoading ? (
                <LoadingPanel title="Loading activity" description="Fetching post updates." />
              ) : summary.recentActivity.length === 0 ? (
                <EmptyPanel
                  icon={FileText}
                  title="No post activity yet"
                  description="Create a draft to start building the content pipeline."
                  actionLabel="Create Draft"
                  actionTo="/posts"
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border/70 bg-card/45 shadow-[0_18px_55px_rgba(2,6,23,0.28)] backdrop-blur-xl">
                  {summary.recentActivity.map((post, index) => (
                    <ActivityRow
                      key={post.id}
                      post={post}
                      timeZone={activeBusiness?.timezone}
                      className={index > 0 ? 'border-t border-border' : undefined}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <SectionHeading
                icon={CalendarDays}
                title="Upcoming"
                detail="Next 5 scheduled posts"
              />
              {isLoading ? (
                <LoadingPanel
                  title="Loading scheduled posts"
                  description="Fetching upcoming work."
                />
              ) : summary.upcomingScheduled.length === 0 ? (
                <EmptyPanel
                  icon={CalendarDays}
                  title="No upcoming scheduled posts"
                  description="Schedule approved content from Posts."
                  actionLabel="Open Posts"
                  actionTo="/posts"
                />
              ) : (
                <div className="space-y-3">
                  {summary.upcomingScheduled.map((post) => (
                    <UpcomingPostCard
                      key={post.id}
                      post={post}
                      timeZone={activeBusiness?.timezone}
                      isExporting={exportMutation.isPending}
                      onExport={() => exportMutation.mutate(post)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function buildMetricItems(metrics: DashboardMetrics) {
  return [
    {
      label: 'Drafts in progress',
      value: metrics.draftsInProgress,
      icon: FileText,
    },
    {
      label: 'Posts awaiting review',
      value: metrics.postsAwaitingReview,
      icon: Clock,
    },
    {
      label: 'Approved and ready to export',
      value: metrics.approvedReadyToExport,
      icon: Download,
    },
    {
      label: 'Scheduled this week',
      value: metrics.scheduledThisWeek,
      icon: CalendarDays,
    },
  ];
}

function SectionHeading({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof CalendarDays;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card/45 px-3 py-2 shadow-[0_12px_38px_rgba(2,6,23,0.2)] backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 shadow-[0_0_22px_rgba(56,189,248,0.12)]">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        <h2 className="truncate text-sm font-semibold uppercase tracking-normal text-foreground">
          {title}
        </h2>
      </div>
      <span className="shrink-0 rounded-full border border-border/70 bg-secondary/55 px-2.5 py-1 text-xs text-muted-foreground">
        {detail}
      </span>
    </div>
  );
}

function ActivityRow({
  post,
  timeZone,
  className,
}: {
  post: PostSummary;
  timeZone: string | undefined;
  className?: string;
}) {
  const thumbnailUrl = getQueueThumbnailUrl(post);

  return (
    <Link
      to={`/posts?post_id=${post.id}`}
      className={cn(
        'group grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 p-3 text-card-foreground transition-all duration-200 hover:bg-primary/10 hover:shadow-[inset_3px_0_0_rgba(56,189,248,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-inset motion-reduce:transition-none',
        className,
      )}
    >
      <Thumbnail url={thumbnailUrl} size="sm" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusStyles[post.status]}>{statusLabels[post.status]}</Badge>
          <span className="text-xs text-muted-foreground">
            Updated {formatDateTime(post.updatedAt, timeZone)}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-medium">{getPostTitle(post)}</p>
      </div>
      <ExternalLink
        className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary"
        aria-hidden="true"
      />
    </Link>
  );
}

function UpcomingPostCard({
  post,
  timeZone,
  isExporting,
  onExport,
}: {
  post: PostSummary;
  timeZone: string | undefined;
  isExporting: boolean;
  onExport: () => void;
}) {
  const thumbnailUrl = getQueueThumbnailUrl(post);
  const canExport = canQueuePostExport(post);

  return (
    <Card className="overflow-hidden border-primary/15 bg-card/70">
      <CardContent className="grid gap-3 p-4 sm:grid-cols-[72px_minmax(0,1fr)]">
        <Thumbnail url={thumbnailUrl} size="md" />
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusStyles[post.status]}>{statusLabels[post.status]}</Badge>
            <span className="text-sm text-muted-foreground">
              {post.scheduledAt ? formatDateTime(post.scheduledAt, timeZone) : 'No scheduled time'}
            </span>
          </div>
          <p className="line-clamp-2 text-sm font-medium">{getPostTitle(post)}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" asChild>
              <Link to={`/posts?post_id=${post.id}`}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onExport}
              disabled={isExporting || !canExport}
              title={canExport ? undefined : 'Add an image and caption before exporting.'}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {isExporting ? 'Exporting' : 'Export'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Thumbnail({ url, size }: { url: string | null; size: 'sm' | 'md' }) {
  return (
    <div
      className={cn(
        'flex aspect-square items-center justify-center overflow-hidden rounded-md border border-primary/15 bg-secondary/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        size === 'sm' ? 'h-14 w-14' : 'h-[72px] w-[72px]',
      )}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      )}
    </div>
  );
}

function LoadingPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card className="overflow-hidden border-primary/15 bg-card/65" aria-busy="true">
      <CardHeader>
        <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 rounded-full bg-primary/15 motion-safe:animate-pulse" />
        <div className="h-2 w-2/3 rounded-full bg-violet-300/15 motion-safe:animate-pulse" />
      </CardContent>
    </Card>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
}: {
  icon: typeof CalendarDays;
  title: string;
  description: string;
  actionLabel: string;
  actionTo: string;
}) {
  return (
    <Card className="border-dashed border-primary/25 bg-card/55">
      <CardHeader>
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" asChild>
          <Link to={actionTo}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {actionLabel}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DashboardEmptyState() {
  return (
    <EmptyPanel
      icon={Send}
      title="No business selected"
      description="Add a business profile before viewing dashboard metrics."
      actionLabel="Open Settings"
      actionTo="/settings"
    />
  );
}

function getPostTitle(post: PostSummary) {
  return post.caption?.trim() || 'Untitled post';
}

function formatDateTime(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: timeZone ? 'short' : undefined,
  }).format(new Date(value));
}

function readError(error: unknown, fallback: string) {
  return toUserFacingError(error, fallback);
}
