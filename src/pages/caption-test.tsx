import { FormEvent, useState } from 'react';
import { Check, Copy, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DraftPost, DraftPostPlatform, DraftPostStatus } from '@/types';

type CaptionTestFormState = {
  businessName: string;
  businessType: string;
  brandVoice: string;
  postGoal: string;
  mediaDescription: string;
  platform: DraftPostPlatform;
};

type CaptionDraft = {
  caption: string;
  hook: string;
  hashtags: string[];
  tone: string;
};

type CaptionGenerateResponse = {
  captions: CaptionDraft[];
};

const defaultForm: CaptionTestFormState = {
  businessName: 'Iron Backs Gym',
  businessType: 'Functional fitness gym',
  brandVoice: 'No-BS, motivating, strong, community-focused',
  postGoal: 'Promote a free trial',
  mediaDescription: 'Video of members lifting, doing sled pushes, and high-fiving after class',
  platform: 'instagram',
};

const platformOptions: { value: DraftPostPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
];

const draftStatusOptions: { value: DraftPostStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'approved', label: 'Approved' },
];

const draftStatusLabels: Record<DraftPostStatus, string> = {
  draft: 'Draft',
  needs_review: 'Needs Review',
  approved: 'Approved',
};

export function CaptionTestPage() {
  const [form, setForm] = useState<CaptionTestFormState>(defaultForm);
  const [result, setResult] = useState<CaptionGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const [draftPosts, setDraftPosts] = useState<DraftPost[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.businessName.trim() || !form.businessType.trim()) {
      setError('Business Name and Business Type are required.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setCopiedIndex(null);
    setSavedIndex(null);

    try {
      const response = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          businessType: form.businessType.trim(),
          brandVoice: form.brandVoice.trim() || undefined,
          postGoal: form.postGoal.trim() || undefined,
          mediaDescription: form.mediaDescription.trim() || undefined,
          platform: form.platform,
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(parseApiError(responseText, response.status));
      }

      const payload = parseCaptionResponse(responseText);
      setResult(payload);
    } catch (submitError) {
      setError(readError(submitError, 'Could not generate captions. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(caption: CaptionDraft, index: number) {
    const captionText = [caption.caption, caption.hashtags.join(' ')].filter(Boolean).join('\n\n');

    try {
      await navigator.clipboard.writeText(captionText);
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1800);
    } catch (copyError) {
      setError(readError(copyError, 'Could not copy this caption.'));
    }
  }

  function handleSaveDraft(caption: CaptionDraft, index: number) {
    const businessName = form.businessName.trim();
    const businessType = form.businessType.trim();

    if (!businessName || !businessType) {
      setError('Business Name and Business Type are required before saving a draft.');
      return;
    }

    const mediaDescription = form.mediaDescription.trim();
    const draftPost: DraftPost = {
      id: createDraftId(),
      businessName,
      businessType,
      platform: form.platform,
      ...(mediaDescription ? { mediaDescription } : {}),
      caption: caption.caption,
      hook: caption.hook,
      hashtags: caption.hashtags,
      tone: caption.tone,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    setDraftPosts((currentDrafts) => [draftPost, ...currentDrafts]);
    setSavedIndex(index);
    window.setTimeout(() => setSavedIndex(null), 1800);
  }

  function handleDraftStatusChange(draftId: string, status: DraftPostStatus) {
    setDraftPosts((currentDrafts) =>
      currentDrafts.map((draftPost) =>
        draftPost.id === draftId ? { ...draftPost, status } : draftPost,
      ),
    );
  }

  const captions = result?.captions ?? [];

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-medium uppercase text-muted-foreground">Internal test</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">
            Caption generation test
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Send a simple request to the isolated caption API and review the returned drafts.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Test inputs</CardTitle>
              <CardDescription>Default values are ready for a quick gym caption test.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name</Label>
                    <Input
                      id="business-name"
                      value={form.businessName}
                      onChange={(event) =>
                        setForm({ ...form, businessName: event.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business-type">Business Type</Label>
                    <Input
                      id="business-type"
                      value={form.businessType}
                      onChange={(event) =>
                        setForm({ ...form, businessType: event.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand-voice">Brand Voice</Label>
                  <Textarea
                    id="brand-voice"
                    value={form.brandVoice}
                    onChange={(event) => setForm({ ...form, brandVoice: event.target.value })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="post-goal">Post Goal</Label>
                    <Input
                      id="post-goal"
                      value={form.postGoal}
                      onChange={(event) => setForm({ ...form, postGoal: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select
                      id="platform"
                      value={form.platform}
                      onChange={(event) =>
                        setForm({ ...form, platform: event.target.value as DraftPostPlatform })
                      }
                    >
                      {platformOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="media-description">Media Description</Label>
                  <Textarea
                    id="media-description"
                    value={form.mediaDescription}
                    onChange={(event) =>
                      setForm({ ...form, mediaDescription: event.target.value })
                    }
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={isLoading}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {isLoading ? 'Generating' : 'Generate Captions'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
                Caption options
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Returned caption options appear here after submission.
              </p>
            </div>

            {isLoading ? (
              <Card>
                <CardHeader>
                  <CardTitle>Generating captions</CardTitle>
                  <CardDescription>The API is drafting options for this test post.</CardDescription>
                </CardHeader>
              </Card>
            ) : result && captions.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No captions returned</CardTitle>
                  <CardDescription>
                    The API responded successfully, but did not include any caption drafts.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : captions.length > 0 ? (
              captions.map((caption, index) => (
                <Card key={`${caption.hook}-${index}`}>
                  <CardHeader>
                    <CardTitle>{caption.hook}</CardTitle>
                    <CardDescription>Tone: {caption.tone}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="whitespace-pre-wrap text-sm leading-6">{caption.caption}</p>

                    <div className="flex flex-wrap gap-2">
                      {caption.hashtags.map((hashtag) => (
                        <span
                          key={hashtag}
                          className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                        >
                          {hashtag}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCopy(caption, index)}
                      >
                        {copiedIndex === index ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        )}
                        {copiedIndex === index ? 'Copied' : 'Copy Caption'}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveDraft(caption, index)}
                      >
                        {savedIndex === index ? (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                        )}
                        {savedIndex === index ? 'Saved' : 'Save Draft'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Ready to test</CardTitle>
                  <CardDescription>
                    Submit the form to call POST /api/ai/generate-caption.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </section>
        </div>

        <TemporaryDraftPosts
          draftPosts={draftPosts}
          onStatusChange={handleDraftStatusChange}
        />
      </div>
    </main>
  );
}

function TemporaryDraftPosts({
  draftPosts,
  onStatusChange,
}: {
  draftPosts: DraftPost[];
  onStatusChange: (draftId: string, status: DraftPostStatus) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
            Temporary draft posts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved caption drafts for this browser session.
          </p>
        </div>
        {draftPosts.length > 0 && (
          <Badge>{draftPosts.length} saved</Badge>
        )}
      </div>

      {draftPosts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No draft posts yet</CardTitle>
            <CardDescription>
              Save a generated caption to start a temporary approval workflow.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {draftPosts.map((draftPost) => (
            <Card key={draftPost.id}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{draftPost.hook}</CardTitle>
                    <CardDescription>
                      {draftPost.businessName} - {formatPlatform(draftPost.platform)}
                    </CardDescription>
                  </div>
                  <Badge>{draftStatusLabels[draftPost.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Business type
                    </p>
                    <p className="text-sm">{draftPost.businessType}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`draft-status-${draftPost.id}`}>Status</Label>
                    <Select
                      id={`draft-status-${draftPost.id}`}
                      value={draftPost.status}
                      onChange={(event) =>
                        onStatusChange(draftPost.id, event.target.value as DraftPostStatus)
                      }
                    >
                      {draftStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {draftPost.mediaDescription && (
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Media
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {draftPost.mediaDescription}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="whitespace-pre-wrap text-sm leading-6">{draftPost.caption}</p>
                  {draftPost.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {draftPost.hashtags.map((hashtag) => (
                        <span
                          key={hashtag}
                          className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                        >
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Tone: {draftPost.tone}</span>
                  <span>Created: {formatDraftDate(draftPost.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function parseCaptionResponse(responseText: string): CaptionGenerateResponse {
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error('The API returned invalid JSON.');
  }

  if (!isCaptionGenerateResponse(parsed)) {
    throw new Error('The API returned an unexpected caption response.');
  }

  return parsed;
}

function isCaptionGenerateResponse(value: unknown): value is CaptionGenerateResponse {
  if (!value || typeof value !== 'object' || !('captions' in value)) {
    return false;
  }

  const captions = (value as { captions: unknown }).captions;

  return Array.isArray(captions) && captions.every(isCaptionDraft);
}

function isCaptionDraft(value: unknown): value is CaptionDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft = value as Record<string, unknown>;

  return (
    typeof draft.caption === 'string' &&
    typeof draft.hook === 'string' &&
    typeof draft.tone === 'string' &&
    Array.isArray(draft.hashtags) &&
    draft.hashtags.every((hashtag) => typeof hashtag === 'string')
  );
}

function parseApiError(responseText: string, status: number) {
  if (!responseText) {
    return `Request failed (${status}).`;
  }

  try {
    const payload = JSON.parse(responseText) as { error?: unknown };

    if (typeof payload.error === 'string') {
      return payload.error;
    }
  } catch {
    return responseText;
  }

  return `Request failed (${status}).`;
}

function readError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function createDraftId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatPlatform(platform: DraftPostPlatform) {
  return platformOptions.find((option) => option.value === platform)?.label ?? platform;
}

function formatDraftDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
