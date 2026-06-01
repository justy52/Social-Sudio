import { FormEvent, useState } from 'react';
import { Check, Copy, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { BusinessProfile, DraftPost, DraftPostPlatform, DraftPostStatus } from '@/types';

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

type DraftSummary = {
  total: number;
  needsReview: number;
  approved: number;
};

type BusinessProfileTextField =
  | 'businessName'
  | 'businessType'
  | 'brandVoice'
  | 'targetAudience'
  | 'coreServices'
  | 'primaryOffer'
  | 'contentStyle'
  | 'notes';

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

const draftStatusOptions: {
  value: DraftPostStatus;
  label: string;
  actionLabel: string;
}[] = [
  { value: 'draft', label: 'Draft', actionLabel: 'Move to Draft' },
  { value: 'needs_review', label: 'Needs Review', actionLabel: 'Mark Needs Review' },
  { value: 'approved', label: 'Approved', actionLabel: 'Mark Approved' },
];

const draftStatusLabels: Record<DraftPostStatus, string> = {
  draft: 'Draft',
  needs_review: 'Needs Review',
  approved: 'Approved',
};

const draftStatusStyles: Record<DraftPostStatus, string> = {
  draft: 'border-border bg-muted text-muted-foreground',
  needs_review: 'border-accent/30 bg-accent/10 text-accent',
  approved: 'border-primary/30 bg-primary/10 text-primary',
};

export function CaptionTestPage() {
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() =>
    createDefaultBusinessProfile(),
  );
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
      setError(null);
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
    setError(null);
    window.setTimeout(() => setSavedIndex(null), 1800);
  }

  function handleDraftStatusChange(draftId: string, status: DraftPostStatus) {
    setDraftPosts((currentDrafts) =>
      currentDrafts.map((draftPost) =>
        draftPost.id === draftId ? { ...draftPost, status } : draftPost,
      ),
    );
  }

  function handleRemoveDraft(draftId: string) {
    setDraftPosts((currentDrafts) =>
      currentDrafts.filter((draftPost) => draftPost.id !== draftId),
    );
  }

  function handleClearDrafts() {
    if (window.confirm('Clear all temporary drafts?')) {
      setDraftPosts([]);
    }
  }

  function handleUseProfileForCaptionInputs() {
    setForm((currentForm) => ({
      ...currentForm,
      businessName: businessProfile.businessName,
      businessType: businessProfile.businessType,
      brandVoice: buildBrandVoiceContext(businessProfile),
      postGoal: businessProfile.primaryOffer,
      platform: businessProfile.defaultPlatform,
    }));
    setError(null);
  }

  const captions = result?.captions ?? [];
  const draftSummary = getDraftSummary(draftPosts);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <Badge>Internal workflow</Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Caption Studio</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Generate caption drafts, save the best options, and review them before approval.
            </p>
          </div>
        </header>

        <BusinessProfileMemory
          profile={businessProfile}
          onChange={setBusinessProfile}
          onUseProfile={handleUseProfileForCaptionInputs}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
          <CaptionInputs
            error={error}
            form={form}
            isLoading={isLoading}
            onChange={setForm}
            onSubmit={handleSubmit}
          />

          <GeneratedCaptionOptions
            captions={captions}
            copiedIndex={copiedIndex}
            isLoading={isLoading}
            platform={form.platform}
            result={result}
            savedIndex={savedIndex}
            onCopy={handleCopy}
            onSaveDraft={handleSaveDraft}
          />
        </div>

        <TemporaryDraftReview
          draftPosts={draftPosts}
          summary={draftSummary}
          onClearAll={handleClearDrafts}
          onRemove={handleRemoveDraft}
          onStatusChange={handleDraftStatusChange}
        />
      </div>
    </main>
  );
}

function BusinessProfileMemory({
  profile,
  onChange,
  onUseProfile,
}: {
  profile: BusinessProfile;
  onChange: (profile: BusinessProfile) => void;
  onUseProfile: () => void;
}) {
  function handleTextChange(field: BusinessProfileTextField, value: string) {
    onChange({
      ...profile,
      [field]: value,
      updatedAt: new Date().toISOString(),
    });
  }

  function handlePlatformChange(platform: DraftPostPlatform) {
    onChange({
      ...profile,
      defaultPlatform: platform,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          title="Business Profile / Brand Memory"
          description="Reusable brand context for caption generation inputs."
        />
        <Button type="button" onClick={onUseProfile}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Use Profile for Caption Inputs
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            This profile is temporary and will reset on refresh until database storage is added.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-business-name">Business Name</Label>
              <Input
                id="profile-business-name"
                value={profile.businessName}
                onChange={(event) => handleTextChange('businessName', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-business-type">Business Type</Label>
              <Input
                id="profile-business-type"
                value={profile.businessType}
                onChange={(event) => handleTextChange('businessType', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-brand-voice">Brand Voice</Label>
              <Textarea
                id="profile-brand-voice"
                value={profile.brandVoice}
                onChange={(event) => handleTextChange('brandVoice', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-target-audience">Target Audience</Label>
              <Textarea
                id="profile-target-audience"
                value={profile.targetAudience}
                onChange={(event) => handleTextChange('targetAudience', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-core-services">Core Services</Label>
              <Textarea
                id="profile-core-services"
                value={profile.coreServices}
                onChange={(event) => handleTextChange('coreServices', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-content-style">Content Style</Label>
              <Textarea
                id="profile-content-style"
                value={profile.contentStyle}
                onChange={(event) => handleTextChange('contentStyle', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-primary-offer">Primary Offer</Label>
              <Input
                id="profile-primary-offer"
                value={profile.primaryOffer}
                onChange={(event) => handleTextChange('primaryOffer', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-default-platform">Default Platform</Label>
              <Select
                id="profile-default-platform"
                value={profile.defaultPlatform}
                onChange={(event) =>
                  handlePlatformChange(event.target.value as DraftPostPlatform)
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
            <Label htmlFor="profile-notes">Notes</Label>
            <Textarea
              id="profile-notes"
              value={profile.notes ?? ''}
              onChange={(event) => handleTextChange('notes', event.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Updated {formatDraftDate(profile.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

function CaptionInputs({
  error,
  form,
  isLoading,
  onChange,
  onSubmit,
}: {
  error: string | null;
  form: CaptionTestFormState;
  isLoading: boolean;
  onChange: (form: CaptionTestFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="space-y-3">
      <SectionHeading
        title="Caption Inputs"
        description="Business context, post goal, media notes, and destination platform."
      />

      <Card>
        <CardContent className="p-5">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business-name">Business Name</Label>
                <Input
                  id="business-name"
                  value={form.businessName}
                  onChange={(event) => onChange({ ...form, businessName: event.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-type">Business Type</Label>
                <Input
                  id="business-type"
                  value={form.businessType}
                  onChange={(event) => onChange({ ...form, businessType: event.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand-voice">Brand Voice</Label>
              <Textarea
                id="brand-voice"
                value={form.brandVoice}
                onChange={(event) => onChange({ ...form, brandVoice: event.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="post-goal">Post Goal</Label>
                <Input
                  id="post-goal"
                  value={form.postGoal}
                  onChange={(event) => onChange({ ...form, postGoal: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  id="platform"
                  value={form.platform}
                  onChange={(event) =>
                    onChange({ ...form, platform: event.target.value as DraftPostPlatform })
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
                onChange={(event) => onChange({ ...form, mediaDescription: event.target.value })}
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
    </section>
  );
}

function GeneratedCaptionOptions({
  captions,
  copiedIndex,
  isLoading,
  platform,
  result,
  savedIndex,
  onCopy,
  onSaveDraft,
}: {
  captions: CaptionDraft[];
  copiedIndex: number | null;
  isLoading: boolean;
  platform: DraftPostPlatform;
  result: CaptionGenerateResponse | null;
  savedIndex: number | null;
  onCopy: (caption: CaptionDraft, index: number) => Promise<void>;
  onSaveDraft: (caption: CaptionDraft, index: number) => void;
}) {
  return (
    <section className="space-y-3">
      <SectionHeading
        title="Generated Caption Options"
        description="AI-generated drafts for review before they become approved posts."
      />

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Generating captions</CardTitle>
            <CardDescription>The API is drafting options for this post.</CardDescription>
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
        <div className="space-y-3">
          {captions.map((caption, index) => (
            <Card key={`${caption.hook}-${index}`}>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{caption.hook}</CardTitle>
                    <CardDescription>Tone: {caption.tone}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{formatPlatform(platform)}</Badge>
                    <Badge className="border-accent/30 bg-accent/10 text-accent">
                      AI draft
                    </Badge>
                    <Badge className="border-border bg-background text-muted-foreground">
                      Needs review
                    </Badge>
                  </div>
                </div>
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
                    onClick={() => void onCopy(caption, index)}
                  >
                    {copiedIndex === index ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                    {copiedIndex === index ? 'Copied' : 'Copy Caption'}
                  </Button>

                  <Button type="button" size="sm" onClick={() => onSaveDraft(caption, index)}>
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
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Ready to generate</CardTitle>
            <CardDescription>Submit caption inputs to create AI draft options.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </section>
  );
}

function TemporaryDraftReview({
  draftPosts,
  summary,
  onClearAll,
  onRemove,
  onStatusChange,
}: {
  draftPosts: DraftPost[];
  summary: DraftSummary;
  onClearAll: () => void;
  onRemove: (draftId: string) => void;
  onStatusChange: (draftId: string, status: DraftPostStatus) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          title="Temporary Draft Review"
          description="Frontend-only saved drafts for this browser session."
        />
        {draftPosts.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={onClearAll}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear All Drafts
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat label="Total temporary drafts" value={summary.total} />
        <SummaryStat label="Needs review" value={summary.needsReview} />
        <SummaryStat label="Approved" value={summary.approved} />
      </div>

      {draftPosts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No draft posts yet</CardTitle>
            <CardDescription>Save a generated caption to start reviewing drafts.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {draftPosts.map((draftPost) => (
            <DraftReviewCard
              key={draftPost.id}
              draftPost={draftPost}
              onRemove={onRemove}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DraftReviewCard({
  draftPost,
  onRemove,
  onStatusChange,
}: {
  draftPost: DraftPost;
  onRemove: (draftId: string) => void;
  onStatusChange: (draftId: string, status: DraftPostStatus) => void;
}) {
  return (
    <Card className={cn('overflow-hidden', getDraftCardClassName(draftPost.status))}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{draftPost.hook}</CardTitle>
            <CardDescription>
              {draftPost.businessName} - {formatPlatform(draftPost.platform)}
            </CardDescription>
          </div>
          <Badge className={getStatusBadgeClassName(draftPost.status)}>
            {draftStatusLabels[draftPost.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetadataBlock label="Business type" value={draftPost.businessType} />
          <MetadataBlock label="Tone" value={draftPost.tone} />
        </div>

        {draftPost.mediaDescription && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Media</p>
            <p className="mt-1 text-sm text-muted-foreground">{draftPost.mediaDescription}</p>
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

        <div className="flex flex-wrap gap-2">
          {draftStatusOptions.map((option) => {
            const isCurrentStatus = option.value === draftPost.status;

            return (
              <Button
                key={option.value}
                type="button"
                variant={isCurrentStatus ? 'default' : 'outline'}
                size="sm"
                onClick={() => onStatusChange(draftPost.id, option.value)}
              >
                {isCurrentStatus && <Check className="h-4 w-4" aria-hidden="true" />}
                {option.actionLabel}
              </Button>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(draftPost.id)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Created {formatDraftDate(draftPost.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-2xl font-semibold tracking-normal">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase text-muted-foreground">{label}</p>
    </div>
  );
}

function MetadataBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
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

function createDefaultBusinessProfile(): BusinessProfile {
  return {
    id: 'iron-backs-gym-profile',
    businessName: 'Iron Backs Gym',
    businessType: 'Functional fitness gym',
    brandVoice: 'No-BS, motivating, strong, community-focused',
    targetAudience:
      'Adults in Heber City who want strength, conditioning, accountability, and a supportive gym community',
    coreServices:
      'Everyday Athlete classes, open gym, personal training, nutrition coaching, youth programs',
    primaryOffer: 'Free trial for new members',
    contentStyle: 'Short, energetic, clear call-to-action, community-focused',
    defaultPlatform: 'instagram',
    notes: 'Avoid CrossFit terminology. Emphasize functional fitness, strength, grit, and community.',
    updatedAt: new Date().toISOString(),
  };
}

function buildBrandVoiceContext(profile: BusinessProfile) {
  return [
    profile.brandVoice.trim(),
    profile.targetAudience.trim() ? `Target audience: ${profile.targetAudience.trim()}` : '',
    profile.coreServices.trim() ? `Core services: ${profile.coreServices.trim()}` : '',
    profile.contentStyle.trim() ? `Content style: ${profile.contentStyle.trim()}` : '',
    profile.notes?.trim() ? `Notes: ${profile.notes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
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

function getDraftSummary(draftPosts: DraftPost[]): DraftSummary {
  return draftPosts.reduce<DraftSummary>(
    (summary, draftPost) => ({
      total: summary.total + 1,
      needsReview: summary.needsReview + (draftPost.status === 'needs_review' ? 1 : 0),
      approved: summary.approved + (draftPost.status === 'approved' ? 1 : 0),
    }),
    { total: 0, needsReview: 0, approved: 0 },
  );
}

function getDraftCardClassName(status: DraftPostStatus) {
  if (status === 'approved') {
    return 'border-primary/30';
  }

  if (status === 'needs_review') {
    return 'border-accent/30';
  }

  return '';
}

function getStatusBadgeClassName(status: DraftPostStatus) {
  return cn('font-semibold', draftStatusStyles[status]);
}
