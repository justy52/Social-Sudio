import { FormEvent, useEffect, useState } from 'react';
import { Check, Copy, Download, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { draftPostAssetStatuses, draftPostMediaTypes } from '@/types';
import type {
  BusinessProfile,
  ContentIdea,
  ContentIdeaGenerateResponse,
  DraftPost,
  DraftPostAssetStatus,
  DraftPostMediaType,
  DraftPostPlatform,
  DraftPostStatus,
  DraftTemplate,
} from '@/types';

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

type DraftEditFormState = {
  hook: string;
  caption: string;
  hashtags: string;
  tone: string;
  mediaType: DraftPostMediaType;
  assetStatus: DraftPostAssetStatus;
  mediaNotes: string;
};

type DraftStatusFilter = 'all' | DraftPostStatus;

type DraftPlatformFilter = 'all' | DraftPostPlatform;

type DraftSortOrder = 'newest' | 'oldest';

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

const defaultIdeaGoal = 'Create post ideas that promote a free trial and show the gym community.';

const draftTemplates = [
  {
    id: 'free-trial-promo',
    name: 'Free Trial Promo',
    description: 'Invite new customers to try the business with a clear, low-friction offer.',
    defaultPlatform: 'instagram',
    ideaGoal: 'Create post ideas that promote a free trial and make it easy for new people to start.',
    postGoal: 'Promote a free trial for new customers',
    mediaType: 'reel',
    mediaPrompt: 'Short clips of real people using the service, smiling, and taking the first step.',
  },
  {
    id: 'behind-the-scenes',
    name: 'Behind the Scenes',
    description: 'Show the work, prep, team energy, and daily process behind the business.',
    defaultPlatform: 'instagram',
    ideaGoal: 'Create behind-the-scenes post ideas that make the business feel real, trusted, and human.',
    postGoal: 'Show behind-the-scenes culture and daily work',
    mediaType: 'video',
    mediaPrompt: 'Candid clips of staff preparing, coaching, cleaning, setting up, or helping customers.',
  },
  {
    id: 'customer-spotlight',
    name: 'Member / Customer Spotlight',
    description: 'Celebrate a customer story, win, transformation, or milestone.',
    defaultPlatform: 'facebook',
    ideaGoal: 'Create customer spotlight ideas that celebrate progress and community without feeling scripted.',
    postGoal: 'Highlight a member or customer story',
    mediaType: 'photo',
    mediaPrompt: 'Portrait or action photo of the featured person, plus a natural moment with the team.',
  },
  {
    id: 'educational-tip',
    name: 'Educational Tip',
    description: 'Teach one useful thing that helps the audience make better decisions.',
    defaultPlatform: 'linkedin',
    ideaGoal: 'Create educational post ideas with one practical tip the audience can use right away.',
    postGoal: 'Share a useful educational tip',
    mediaType: 'carousel',
    mediaPrompt: 'Simple step-by-step visuals, a short demo, or a before-and-after explanation.',
  },
  {
    id: 'event-reminder',
    name: 'Event Reminder',
    description: 'Remind people about an upcoming class, event, deadline, or community moment.',
    defaultPlatform: 'facebook',
    ideaGoal: 'Create event reminder ideas that drive attendance and make the event feel worth showing up for.',
    postGoal: 'Remind the audience about an upcoming event',
    mediaType: 'story',
    mediaPrompt: 'Event flyer, quick host video, or photos from a previous event with clear details.',
  },
  {
    id: 'community-culture',
    name: 'Community / Culture Post',
    description: 'Show the values, people, and atmosphere that make the business different.',
    defaultPlatform: 'instagram',
    ideaGoal: 'Create community-focused post ideas that show belonging, energy, and shared values.',
    postGoal: 'Show the business community and culture',
    mediaType: 'reel',
    mediaPrompt: 'Fast cuts of people interacting, supporting each other, celebrating, or working together.',
  },
  {
    id: 'limited-time-offer',
    name: 'Limited-Time Offer',
    description: 'Create urgency around a short-term promotion without sounding pushy.',
    defaultPlatform: 'instagram',
    ideaGoal: 'Create limited-time offer ideas with urgency, clarity, and a direct call to action.',
    postGoal: 'Promote a limited-time offer',
    mediaType: 'photo',
    mediaPrompt: 'Offer graphic, product or service shot, or quick video explaining what expires and when.',
  },
  {
    id: 'testimonial-review',
    name: 'Testimonial / Review',
    description: 'Turn a review or customer quote into trust-building social proof.',
    defaultPlatform: 'linkedin',
    ideaGoal: 'Create testimonial post ideas that use social proof to build trust and encourage action.',
    postGoal: 'Share a testimonial or review',
    mediaType: 'photo',
    mediaPrompt: 'Customer quote graphic, happy customer photo, or simple video reaction from the team.',
  },
] satisfies DraftTemplate[];

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

const mediaTypeLabels: Record<DraftPostMediaType, string> = {
  photo: 'Photo',
  video: 'Video',
  reel: 'Reel',
  story: 'Story',
  carousel: 'Carousel',
  none: 'None',
};

const mediaTypeOptions = draftPostMediaTypes.map((value) => ({
  value,
  label: mediaTypeLabels[value],
}));

const assetStatusLabels: Record<DraftPostAssetStatus, string> = {
  needed: 'Needed',
  ready: 'Ready',
  attached_later: 'Attach Later',
  not_needed: 'Not Needed',
};

const assetStatusOptions = draftPostAssetStatuses.map((value) => ({
  value,
  label: assetStatusLabels[value],
}));

const assetStatusBadgeLabels: Partial<Record<DraftPostAssetStatus, string>> = {
  needed: 'Asset Needed',
  ready: 'Asset Ready',
};

const assetStatusStyles: Record<DraftPostAssetStatus, string> = {
  needed: 'border-destructive/30 bg-destructive/10 text-destructive',
  ready: 'border-primary/30 bg-primary/10 text-primary',
  attached_later: 'border-accent/30 bg-accent/10 text-accent',
  not_needed: 'border-border bg-muted text-muted-foreground',
};

const draftStatusFilterOptions: { value: DraftStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'approved', label: 'Approved / Export Ready' },
];

const draftPlatformFilterOptions: { value: DraftPlatformFilter; label: string }[] = [
  { value: 'all', label: 'All Platforms' },
  ...platformOptions,
];

const draftSortOptions: { value: DraftSortOrder; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

const manualPostingChecklist = [
  'Copy caption',
  'Save/download text',
  'Open social app',
  'Paste caption',
  'Attach media manually',
  'Review and publish',
];

const storageKeys = {
  businessProfile: 'socialStudio.businessProfile.v1',
  draftPosts: 'socialStudio.draftPosts.v1',
};

export function CaptionTestPage() {
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() =>
    loadStoredBusinessProfile(),
  );
  const [form, setForm] = useState<CaptionTestFormState>(defaultForm);
  const [ideaGoal, setIdeaGoal] = useState(defaultIdeaGoal);
  const [ideaPlatform, setIdeaPlatform] = useState<DraftPostPlatform>(
    businessProfile.defaultPlatform,
  );
  const [ideaResult, setIdeaResult] = useState<ContentIdeaGenerateResponse | null>(null);
  const [ideaError, setIdeaError] = useState<string | null>(null);
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [usedIdeaTitle, setUsedIdeaTitle] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateMediaType, setSelectedTemplateMediaType] =
    useState<DraftPostMediaType | null>(null);
  const [result, setResult] = useState<CaptionGenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [copiedExportDraftId, setCopiedExportDraftId] = useState<string | null>(null);
  const [draftPosts, setDraftPosts] = useState<DraftPost[]>(() => loadStoredDraftPosts());

  useEffect(() => {
    if (isDefaultBusinessProfile(businessProfile)) {
      removeLocalStorageItem(storageKeys.businessProfile);
      return;
    }

    setLocalStorageJson(storageKeys.businessProfile, businessProfile);
  }, [businessProfile]);

  useEffect(() => {
    if (draftPosts.length === 0) {
      removeLocalStorageItem(storageKeys.draftPosts);
      return;
    }

    setLocalStorageJson(storageKeys.draftPosts, draftPosts);
  }, [draftPosts]);

  async function handleGenerateIdeas() {
    setIsGeneratingIdeas(true);
    setIdeaError(null);
    setUsedIdeaTitle(null);

    try {
      const response = await fetch('/api/ai/generate-content-ideas', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          businessName: businessProfile.businessName.trim(),
          businessType: businessProfile.businessType.trim(),
          brandVoice: businessProfile.brandVoice.trim() || undefined,
          targetAudience: businessProfile.targetAudience.trim() || undefined,
          coreServices: businessProfile.coreServices.trim() || undefined,
          primaryOffer: businessProfile.primaryOffer.trim() || undefined,
          contentStyle: businessProfile.contentStyle.trim() || undefined,
          notes: businessProfile.notes?.trim() || undefined,
          platform: ideaPlatform,
          ideaGoal: ideaGoal.trim() || undefined,
        }),
      });
      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(parseApiError(responseText, response.status));
      }

      setIdeaResult(parseContentIdeaResponse(responseText));
    } catch (generateError) {
      setIdeaError(readError(generateError, 'Could not generate content ideas.'));
    } finally {
      setIsGeneratingIdeas(false);
    }
  }

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
    const selectedTemplate = getDraftTemplateById(selectedTemplateId);
    const mediaNotes =
      removeGeneratedContext(mediaDescription) || selectedTemplate?.mediaPrompt || '';
    const draftPost: DraftPost = {
      id: createDraftId(),
      businessName,
      businessType,
      platform: form.platform,
      ...(mediaDescription ? { mediaDescription } : {}),
      mediaType: selectedTemplateMediaType ?? getDefaultMediaTypeForPlatform(form.platform),
      ...(mediaNotes ? { mediaNotes } : {}),
      assetStatus: 'needed',
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

  function handleDraftUpdate(draftId: string, input: DraftEditFormState) {
    setDraftPosts((currentDrafts) =>
      currentDrafts.map((draftPost) => {
        if (draftPost.id !== draftId) {
          return draftPost;
        }

        return {
          ...draftPost,
          hook: input.hook.trim(),
          caption: input.caption.trim(),
          hashtags: parseHashtagsInput(input.hashtags),
          tone: input.tone.trim(),
          mediaType: input.mediaType,
          assetStatus: input.assetStatus,
          mediaNotes: input.mediaNotes.trim() || undefined,
          status: draftPost.status === 'approved' ? 'needs_review' : draftPost.status,
        };
      }),
    );
  }

  function handleRemoveDraft(draftId: string) {
    setDraftPosts((currentDrafts) =>
      currentDrafts.filter((draftPost) => draftPost.id !== draftId),
    );
  }

  async function handleCopyDraft(draftPost: DraftPost) {
    const draftText = [draftPost.caption, draftPost.hashtags.join(' ')]
      .filter(Boolean)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(draftText);
      setCopiedDraftId(draftPost.id);
      setError(null);
      window.setTimeout(() => setCopiedDraftId(null), 1800);
    } catch (copyError) {
      setError(readError(copyError, 'Could not copy this draft.'));
    }
  }

  async function handleCopyExportText(draftPost: DraftPost) {
    try {
      await navigator.clipboard.writeText(buildManualExportText(draftPost));
      setCopiedExportDraftId(draftPost.id);
      setError(null);
      window.setTimeout(() => setCopiedExportDraftId(null), 1800);
    } catch (copyError) {
      setError(readError(copyError, 'Could not copy export text.'));
    }
  }

  function handleClearDrafts() {
    if (window.confirm('Clear all temporary drafts?')) {
      removeLocalStorageItem(storageKeys.draftPosts);
      setDraftPosts([]);
    }
  }

  function handleResetBusinessProfile() {
    if (window.confirm('Reset the business profile to the default Iron Backs Gym profile?')) {
      removeLocalStorageItem(storageKeys.businessProfile);
      setBusinessProfile(createDefaultBusinessProfile());
      setError(null);
    }
  }

  function handleUseProfileForCaptionInputs() {
    setForm((currentForm) => ({
      ...currentForm,
      businessName: businessProfile.businessName,
      businessType: businessProfile.businessType,
      brandVoice: businessProfile.brandVoice,
      postGoal: businessProfile.primaryOffer,
      mediaDescription: buildMediaDescriptionContext(
        currentForm.mediaDescription,
        businessProfile,
      ),
      platform: businessProfile.defaultPlatform,
    }));
    setSelectedTemplateId(null);
    setSelectedTemplateMediaType(null);
    setError(null);
  }

  function handleUseTemplateForIdeas(template: DraftTemplate) {
    setIdeaGoal(template.ideaGoal);
    setIdeaPlatform(template.defaultPlatform);
    setSelectedTemplateId(template.id);
    setSelectedTemplateMediaType(template.mediaType);
    setIdeaResult(null);
    setIdeaError(null);
    setUsedIdeaTitle(null);
  }

  function handleUseTemplateForCaption(template: DraftTemplate) {
    setForm((currentForm) => ({
      ...currentForm,
      businessName: businessProfile.businessName,
      businessType: businessProfile.businessType,
      brandVoice: businessProfile.brandVoice,
      postGoal: template.postGoal,
      mediaDescription: buildTemplateCaptionContext(
        currentForm.mediaDescription,
        businessProfile,
        template,
      ),
      platform: template.defaultPlatform,
    }));
    setSelectedTemplateId(template.id);
    setSelectedTemplateMediaType(template.mediaType);
    setError(null);
    setUsedIdeaTitle(null);
  }

  function handleUseIdeaForCaption(idea: ContentIdea) {
    setForm((currentForm) => ({
      ...currentForm,
      businessName: businessProfile.businessName,
      businessType: businessProfile.businessType,
      brandVoice: businessProfile.brandVoice,
      postGoal: idea.callToAction || idea.title,
      mediaDescription: buildIdeaCaptionContext(currentForm.mediaDescription, businessProfile, idea),
      platform: idea.platform,
    }));
    setUsedIdeaTitle(idea.title);
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
          onResetProfile={handleResetBusinessProfile}
          onUseProfile={handleUseProfileForCaptionInputs}
        />

        <DraftTemplates
          selectedTemplateId={selectedTemplateId}
          templates={draftTemplates}
          onUseForCaption={handleUseTemplateForCaption}
          onUseForIdeas={handleUseTemplateForIdeas}
        />

        <ContentIdeas
          ideaError={ideaError}
          ideaGoal={ideaGoal}
          ideaPlatform={ideaPlatform}
          ideaResult={ideaResult}
          isGeneratingIdeas={isGeneratingIdeas}
          usedIdeaTitle={usedIdeaTitle}
          onGenerateIdeas={handleGenerateIdeas}
          onIdeaGoalChange={setIdeaGoal}
          onIdeaPlatformChange={setIdeaPlatform}
          onUseIdeaForCaption={handleUseIdeaForCaption}
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
          copiedDraftId={copiedDraftId}
          copiedExportDraftId={copiedExportDraftId}
          draftPosts={draftPosts}
          summary={draftSummary}
          onClearAll={handleClearDrafts}
          onCopyDraft={handleCopyDraft}
          onCopyExportText={handleCopyExportText}
          onRemove={handleRemoveDraft}
          onStatusChange={handleDraftStatusChange}
          onUpdateDraft={handleDraftUpdate}
        />
      </div>
    </main>
  );
}

function BusinessProfileMemory({
  profile,
  onChange,
  onResetProfile,
  onUseProfile,
}: {
  profile: BusinessProfile;
  onChange: (profile: BusinessProfile) => void;
  onResetProfile: () => void;
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
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onResetProfile}>
            Reset Profile
          </Button>
          <Button type="button" onClick={onUseProfile}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Use Profile for Caption Inputs
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Saved locally in this browser for prototype testing. Profile and drafts are not synced
            across devices and are not stored in a backend database yet.
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

function DraftTemplates({
  selectedTemplateId,
  templates,
  onUseForCaption,
  onUseForIdeas,
}: {
  selectedTemplateId: string | null;
  templates: DraftTemplate[];
  onUseForCaption: (template: DraftTemplate) => void;
  onUseForIdeas: (template: DraftTemplate) => void;
}) {
  return (
    <section className="space-y-3">
      <SectionHeading
        title="Draft Templates"
        description="Start from a common post type, then generate ideas or captions from your business profile."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id;

          return (
            <Card
              key={template.id}
              className={cn(isSelected ? 'border-primary/40' : '')}
            >
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  {isSelected && (
                    <Badge className="border-primary/30 bg-primary/10 text-primary">
                      Selected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetadataBlock
                    label="Default platform"
                    value={formatPlatform(template.defaultPlatform)}
                  />
                  <MetadataBlock
                    label="Suggested media type"
                    value={mediaTypeLabels[template.mediaType]}
                  />
                </div>

                <MetadataBlock label="Media prompt" value={template.mediaPrompt} />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onUseForIdeas(template)}
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Use for Ideas
                  </Button>
                  <Button type="button" size="sm" onClick={() => onUseForCaption(template)}>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Use for Caption
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function ContentIdeas({
  ideaError,
  ideaGoal,
  ideaPlatform,
  ideaResult,
  isGeneratingIdeas,
  usedIdeaTitle,
  onGenerateIdeas,
  onIdeaGoalChange,
  onIdeaPlatformChange,
  onUseIdeaForCaption,
}: {
  ideaError: string | null;
  ideaGoal: string;
  ideaPlatform: DraftPostPlatform;
  ideaResult: ContentIdeaGenerateResponse | null;
  isGeneratingIdeas: boolean;
  usedIdeaTitle: string | null;
  onGenerateIdeas: () => void;
  onIdeaGoalChange: (value: string) => void;
  onIdeaPlatformChange: (platform: DraftPostPlatform) => void;
  onUseIdeaForCaption: (idea: ContentIdea) => void;
}) {
  const ideas = ideaResult?.ideas ?? [];

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          title="Content Ideas"
          description="Generate post ideas from your business profile before writing captions."
        />
        <Button type="button" onClick={onGenerateIdeas} disabled={isGeneratingIdeas}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {isGeneratingIdeas ? 'Generating Ideas' : 'Generate Ideas'}
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <Label htmlFor="idea-goal">Idea Goal</Label>
              <Input
                id="idea-goal"
                value={ideaGoal}
                onChange={(event) => onIdeaGoalChange(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idea-platform">Platform</Label>
              <Select
                id="idea-platform"
                value={ideaPlatform}
                onChange={(event) =>
                  onIdeaPlatformChange(event.target.value as DraftPostPlatform)
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

          {ideaError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {ideaError}
            </div>
          )}

          {isGeneratingIdeas ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Generating ideas from the current business profile.
            </div>
          ) : ideaResult && ideas.length === 0 ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              No content ideas returned.
            </div>
          ) : ideas.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {ideas.map((idea) => (
                <Card key={`${idea.title}-${idea.platform}`}>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>{idea.title}</CardTitle>
                        <CardDescription>{idea.angle}</CardDescription>
                      </div>
                      <Badge>{formatPlatform(idea.platform)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <MetadataBlock
                      label="Suggested Caption Prompt"
                      value={idea.suggestedCaptionPrompt}
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <MetadataBlock label="Content type" value={idea.contentType} />
                      <MetadataBlock label="Call to action" value={idea.callToAction} />
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onUseIdeaForCaption(idea)}
                    >
                      {usedIdeaTitle === idea.title ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                      )}
                      {usedIdeaTitle === idea.title ? 'Idea Applied' : 'Use Idea for Caption'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Generate ideas to plan a post before creating captions.
            </div>
          )}
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
        description="Post goal, media notes, profile context, and destination platform."
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
              <Label htmlFor="media-description">Media Description / Context</Label>
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
  copiedDraftId,
  copiedExportDraftId,
  draftPosts,
  summary,
  onClearAll,
  onCopyDraft,
  onCopyExportText,
  onRemove,
  onStatusChange,
  onUpdateDraft,
}: {
  copiedDraftId: string | null;
  copiedExportDraftId: string | null;
  draftPosts: DraftPost[];
  summary: DraftSummary;
  onClearAll: () => void;
  onCopyDraft: (draftPost: DraftPost) => Promise<void>;
  onCopyExportText: (draftPost: DraftPost) => Promise<void>;
  onRemove: (draftId: string) => void;
  onStatusChange: (draftId: string, status: DraftPostStatus) => void;
  onUpdateDraft: (draftId: string, input: DraftEditFormState) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<DraftStatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<DraftPlatformFilter>('all');
  const [sortOrder, setSortOrder] = useState<DraftSortOrder>('newest');
  const visibleDraftPosts = getVisibleDraftPosts(
    draftPosts,
    statusFilter,
    platformFilter,
    sortOrder,
  );

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

      {draftPosts.length > 0 && (
        <div className="rounded-md border border-border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="draft-status-filter">Status</Label>
              <Select
                id="draft-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as DraftStatusFilter)
                }
              >
                {draftStatusFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="draft-platform-filter">Platform</Label>
              <Select
                id="draft-platform-filter"
                value={platformFilter}
                onChange={(event) =>
                  setPlatformFilter(event.target.value as DraftPlatformFilter)
                }
              >
                {draftPlatformFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="draft-sort-order">Sort</Label>
              <Select
                id="draft-sort-order"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as DraftSortOrder)}
              >
                {draftSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}

      {draftPosts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No draft posts yet</CardTitle>
            <CardDescription>Save a generated caption to start reviewing drafts.</CardDescription>
          </CardHeader>
        </Card>
      ) : visibleDraftPosts.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Showing 0 of {draftPosts.length} drafts
          </p>
          <Card>
            <CardHeader>
              <CardTitle>No drafts match these filters.</CardTitle>
              <CardDescription>Adjust filters to see saved drafts.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Showing {visibleDraftPosts.length} of {draftPosts.length} drafts
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleDraftPosts.map((draftPost) => (
              <DraftReviewCard
                key={draftPost.id}
                copiedDraftId={copiedDraftId}
                copiedExportDraftId={copiedExportDraftId}
                draftPost={draftPost}
                onCopyDraft={onCopyDraft}
                onCopyExportText={onCopyExportText}
                onRemove={onRemove}
                onStatusChange={onStatusChange}
                onUpdateDraft={onUpdateDraft}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DraftReviewCard({
  copiedDraftId,
  copiedExportDraftId,
  draftPost,
  onCopyDraft,
  onCopyExportText,
  onRemove,
  onStatusChange,
  onUpdateDraft,
}: {
  copiedDraftId: string | null;
  copiedExportDraftId: string | null;
  draftPost: DraftPost;
  onCopyDraft: (draftPost: DraftPost) => Promise<void>;
  onCopyExportText: (draftPost: DraftPost) => Promise<void>;
  onRemove: (draftId: string) => void;
  onStatusChange: (draftId: string, status: DraftPostStatus) => void;
  onUpdateDraft: (draftId: string, input: DraftEditFormState) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<DraftEditFormState>(() =>
    buildDraftEditFormState(draftPost),
  );
  const [editError, setEditError] = useState<string | null>(null);
  const [wasSaved, setWasSaved] = useState(false);
  const isApproved = draftPost.status === 'approved';
  const mediaType = getDraftMediaType(draftPost);
  const assetStatus = getDraftAssetStatus(draftPost);
  const mediaNotes = getDraftMediaNotes(draftPost);
  const assetBadgeLabel = assetStatusBadgeLabels[assetStatus];

  function handleStartEdit() {
    setEditForm(buildDraftEditFormState(draftPost));
    setEditError(null);
    setWasSaved(false);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setEditForm(buildDraftEditFormState(draftPost));
    setEditError(null);
    setIsEditing(false);
  }

  function handleSaveEdit() {
    if (!editForm.caption.trim()) {
      setEditError('Caption is required before saving changes.');
      return;
    }

    onUpdateDraft(draftPost.id, editForm);
    setEditError(null);
    setIsEditing(false);
    setWasSaved(true);
    window.setTimeout(() => setWasSaved(false), 1800);
  }

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
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Badge className={getStatusBadgeClassName(draftPost.status)}>
              {draftStatusLabels[draftPost.status]}
            </Badge>
            {assetBadgeLabel && (
              <Badge className={getAssetStatusBadgeClassName(assetStatus)}>
                {assetBadgeLabel}
              </Badge>
            )}
            {isApproved && (
              <Badge className="border-primary/30 bg-primary/10 text-primary">
                Export Ready
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetadataBlock label="Business type" value={draftPost.businessType} />
          <MetadataBlock label="Tone" value={draftPost.tone} />
          <MetadataBlock label="Media type" value={mediaTypeLabels[mediaType]} />
          <MetadataBlock label="Asset status" value={assetStatusLabels[assetStatus]} />
        </div>

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium uppercase text-muted-foreground">Media Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
            {mediaNotes || 'No media notes added yet.'}
          </p>
        </div>

        {isEditing ? (
          <div className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`draft-hook-${draftPost.id}`}>Hook</Label>
                <Input
                  id={`draft-hook-${draftPost.id}`}
                  value={editForm.hook}
                  onChange={(event) =>
                    setEditForm({ ...editForm, hook: event.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`draft-tone-${draftPost.id}`}>Tone</Label>
                <Input
                  id={`draft-tone-${draftPost.id}`}
                  value={editForm.tone}
                  onChange={(event) =>
                    setEditForm({ ...editForm, tone: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`draft-caption-${draftPost.id}`}>Caption</Label>
              <Textarea
                id={`draft-caption-${draftPost.id}`}
                value={editForm.caption}
                onChange={(event) =>
                  setEditForm({ ...editForm, caption: event.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`draft-hashtags-${draftPost.id}`}>Hashtags</Label>
              <Textarea
                id={`draft-hashtags-${draftPost.id}`}
                value={editForm.hashtags}
                onChange={(event) =>
                  setEditForm({ ...editForm, hashtags: event.target.value })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`draft-media-type-${draftPost.id}`}>Media Type</Label>
                <Select
                  id={`draft-media-type-${draftPost.id}`}
                  value={editForm.mediaType}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      mediaType: event.target.value as DraftPostMediaType,
                    })
                  }
                >
                  {mediaTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`draft-asset-status-${draftPost.id}`}>Asset Status</Label>
                <Select
                  id={`draft-asset-status-${draftPost.id}`}
                  value={editForm.assetStatus}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      assetStatus: event.target.value as DraftPostAssetStatus,
                    })
                  }
                >
                  {assetStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`draft-media-notes-${draftPost.id}`}>Media Notes</Label>
              <Textarea
                id={`draft-media-notes-${draftPost.id}`}
                value={editForm.mediaNotes}
                onChange={(event) =>
                  setEditForm({ ...editForm, mediaNotes: event.target.value })
                }
              />
            </div>

            {editError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {editError}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleSaveEdit}>
                <Check className="h-4 w-4" aria-hidden="true" />
                Save Changes
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
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
            {wasSaved && (
              <p className="text-sm font-medium text-primary">Changes saved.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!isEditing && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleStartEdit}>
                Edit Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void onCopyDraft(draftPost)}
              >
                {copiedDraftId === draftPost.id ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copiedDraftId === draftPost.id ? 'Copied' : 'Copy Draft'}
              </Button>
            </>
          )}
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

        <ManualExportPanel
          copiedExportDraftId={copiedExportDraftId}
          draftPost={draftPost}
          isApproved={isApproved}
          onCopyExportText={onCopyExportText}
        />
      </CardContent>
    </Card>
  );
}

function ManualExportPanel({
  copiedExportDraftId,
  draftPost,
  isApproved,
  onCopyExportText,
}: {
  copiedExportDraftId: string | null;
  draftPost: DraftPost;
  isApproved: boolean;
  onCopyExportText: (draftPost: DraftPost) => Promise<void>;
}) {
  if (!isApproved) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Approve this draft before export.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-primary/30 bg-primary/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-primary">Export for Manual Posting</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Copy or download the approved text, then post it manually.
          </p>
        </div>
        <Badge className="border-primary/30 bg-background text-primary">Export Ready</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void onCopyExportText(draftPost)}
        >
          {copiedExportDraftId === draftPost.id ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copiedExportDraftId === draftPost.id ? 'Copied' : 'Copy Export Text'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadDraftTextFile(draftPost)}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download .txt
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Manual Posting Checklist
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {manualPostingChecklist.map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
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

function parseContentIdeaResponse(responseText: string): ContentIdeaGenerateResponse {
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error('The API returned invalid JSON.');
  }

  if (!isContentIdeaGenerateResponse(parsed)) {
    throw new Error('The API returned an unexpected content idea response.');
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

function isContentIdeaGenerateResponse(value: unknown): value is ContentIdeaGenerateResponse {
  if (!value || typeof value !== 'object' || !('ideas' in value)) {
    return false;
  }

  const ideas = (value as { ideas: unknown }).ideas;

  return Array.isArray(ideas) && ideas.every(isContentIdea);
}

function isContentIdea(value: unknown): value is ContentIdea {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const idea = value as Record<string, unknown>;

  return (
    typeof idea.title === 'string' &&
    typeof idea.angle === 'string' &&
    typeof idea.suggestedCaptionPrompt === 'string' &&
    isDraftPostPlatform(idea.platform) &&
    typeof idea.contentType === 'string' &&
    typeof idea.callToAction === 'string'
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

function normalizeDraftPost(draftPost: DraftPost): DraftPost {
  const mediaNotes = getDraftMediaNotes(draftPost);

  return {
    ...draftPost,
    mediaType: getDraftMediaType(draftPost),
    assetStatus: getDraftAssetStatus(draftPost),
    mediaNotes: mediaNotes || undefined,
  };
}

function buildDraftEditFormState(draftPost: DraftPost): DraftEditFormState {
  return {
    hook: draftPost.hook,
    caption: draftPost.caption,
    hashtags: draftPost.hashtags.join(' '),
    tone: draftPost.tone,
    mediaType: getDraftMediaType(draftPost),
    assetStatus: getDraftAssetStatus(draftPost),
    mediaNotes: getDraftMediaNotes(draftPost),
  };
}

function parseHashtagsInput(value: string) {
  return value
    .split(/\s+/)
    .map((hashtag) => hashtag.trim())
    .filter(Boolean)
    .map((hashtag) => (hashtag.startsWith('#') ? hashtag : `#${hashtag}`));
}

function getDraftTemplateById(templateId: string | null) {
  return draftTemplates.find((template) => template.id === templateId);
}

function getDefaultMediaTypeForPlatform(platform: DraftPostPlatform): DraftPostMediaType {
  return platform === 'instagram' || platform === 'tiktok' ? 'reel' : 'photo';
}

function getDraftMediaType(draftPost: DraftPost): DraftPostMediaType {
  return draftPost.mediaType ?? 'none';
}

function getDraftAssetStatus(draftPost: DraftPost): DraftPostAssetStatus {
  return draftPost.assetStatus ?? 'needed';
}

function getDraftMediaNotes(draftPost: DraftPost) {
  return draftPost.mediaNotes?.trim() || removeGeneratedContext(draftPost.mediaDescription ?? '');
}

function getVisibleDraftPosts(
  draftPosts: DraftPost[],
  statusFilter: DraftStatusFilter,
  platformFilter: DraftPlatformFilter,
  sortOrder: DraftSortOrder,
) {
  return draftPosts
    .filter((draftPost) => matchesDraftFilters(draftPost, statusFilter, platformFilter))
    .sort((firstDraft, secondDraft) => {
      const firstTime = getDraftCreatedTime(firstDraft);
      const secondTime = getDraftCreatedTime(secondDraft);

      return sortOrder === 'newest' ? secondTime - firstTime : firstTime - secondTime;
    });
}

function matchesDraftFilters(
  draftPost: DraftPost,
  statusFilter: DraftStatusFilter,
  platformFilter: DraftPlatformFilter,
) {
  const matchesStatus = statusFilter === 'all' || draftPost.status === statusFilter;
  const matchesPlatform = platformFilter === 'all' || draftPost.platform === platformFilter;

  return matchesStatus && matchesPlatform;
}

function getDraftCreatedTime(draftPost: DraftPost) {
  const timestamp = new Date(draftPost.createdAt).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildManualExportText(draftPost: DraftPost) {
  const mediaNotes = getDraftMediaNotes(draftPost);

  return [
    `Platform: ${formatPlatform(draftPost.platform)}`,
    mediaNotes ? `Media notes: ${mediaNotes}` : '',
    draftPost.caption.trim(),
    draftPost.hashtags.join(' ').trim(),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function downloadDraftTextFile(draftPost: DraftPost) {
  if (typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([buildDraftTextFileContent(draftPost)], {
    type: 'text/plain;charset=utf-8',
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = buildDraftFileName(draftPost);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function buildDraftTextFileContent(draftPost: DraftPost) {
  const mediaNotes = getDraftMediaNotes(draftPost);

  return [
    `Business name: ${draftPost.businessName}`,
    `Platform: ${formatPlatform(draftPost.platform)}`,
    `Status: ${draftStatusLabels[draftPost.status]}`,
    `Media type: ${mediaTypeLabels[getDraftMediaType(draftPost)]}`,
    `Asset status: ${assetStatusLabels[getDraftAssetStatus(draftPost)]}`,
    `Hook: ${draftPost.hook || 'Not set'}`,
    '',
    'Caption:',
    draftPost.caption,
    '',
    'Hashtags:',
    draftPost.hashtags.join(' ') || 'Not set',
    '',
    'Media notes:',
    mediaNotes || 'Not set',
    '',
    `Tone: ${draftPost.tone || 'Not set'}`,
    `Created date: ${formatExportDate(draftPost.createdAt)}`,
    `Exported date: ${formatExportDate(new Date().toISOString())}`,
  ].join('\n');
}

function buildDraftFileName(draftPost: DraftPost) {
  const businessName = slugifyFilePart(draftPost.businessName) || 'business';

  return `${businessName}-${draftPost.platform}-draft.txt`;
}

function slugifyFilePart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function loadStoredBusinessProfile() {
  const storedValue = getLocalStorageJson(storageKeys.businessProfile);

  if (isBusinessProfile(storedValue)) {
    return storedValue;
  }

  if (storedValue !== null) {
    removeLocalStorageItem(storageKeys.businessProfile);
  }

  return createDefaultBusinessProfile();
}

function loadStoredDraftPosts() {
  const storedValue = getLocalStorageJson(storageKeys.draftPosts);

  if (isDraftPostArray(storedValue)) {
    return storedValue.map(normalizeDraftPost);
  }

  if (storedValue !== null) {
    removeLocalStorageItem(storageKeys.draftPosts);
  }

  return [];
}

function getLocalStorageJson(key: string): unknown {
  const storage = getBrowserLocalStorage();

  if (!storage) {
    return null;
  }

  const value = storage.getItem(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    removeLocalStorageItem(key);
    return null;
  }
}

function setLocalStorageJson(key: string, value: unknown) {
  const storage = getBrowserLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Prototype persistence should never block the workflow.
  }
}

function removeLocalStorageItem(key: string) {
  const storage = getBrowserLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage errors in the prototype.
  }
}

function getBrowserLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isBusinessProfile(value: unknown): value is BusinessProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.businessName === 'string' &&
    typeof value.businessType === 'string' &&
    typeof value.brandVoice === 'string' &&
    typeof value.targetAudience === 'string' &&
    typeof value.coreServices === 'string' &&
    typeof value.primaryOffer === 'string' &&
    typeof value.contentStyle === 'string' &&
    isDraftPostPlatform(value.defaultPlatform) &&
    (value.notes === undefined || typeof value.notes === 'string') &&
    typeof value.updatedAt === 'string'
  );
}

function isDraftPostArray(value: unknown): value is DraftPost[] {
  return Array.isArray(value) && value.every(isDraftPost);
}

function isDraftPost(value: unknown): value is DraftPost {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.businessName === 'string' &&
    typeof value.businessType === 'string' &&
    isDraftPostPlatform(value.platform) &&
    (value.mediaDescription === undefined || typeof value.mediaDescription === 'string') &&
    (value.mediaType === undefined || isDraftPostMediaType(value.mediaType)) &&
    (value.mediaNotes === undefined || typeof value.mediaNotes === 'string') &&
    (value.assetStatus === undefined || isDraftPostAssetStatus(value.assetStatus)) &&
    typeof value.caption === 'string' &&
    typeof value.hook === 'string' &&
    Array.isArray(value.hashtags) &&
    value.hashtags.every((hashtag) => typeof hashtag === 'string') &&
    typeof value.tone === 'string' &&
    isDraftPostStatus(value.status) &&
    typeof value.createdAt === 'string'
  );
}

function isDraftPostPlatform(value: unknown): value is DraftPostPlatform {
  return platformOptions.some((option) => option.value === value);
}

function isDraftPostStatus(value: unknown): value is DraftPostStatus {
  return draftStatusOptions.some((option) => option.value === value);
}

function isDraftPostMediaType(value: unknown): value is DraftPostMediaType {
  return mediaTypeOptions.some((option) => option.value === value);
}

function isDraftPostAssetStatus(value: unknown): value is DraftPostAssetStatus {
  return assetStatusOptions.some((option) => option.value === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function buildMediaDescriptionContext(
  currentMediaDescription: string,
  profile: BusinessProfile,
) {
  const mediaDescription = removeGeneratedContext(currentMediaDescription);
  const profileContext = buildProfileContext(profile);

  if (!profileContext) {
    return mediaDescription;
  }

  return [mediaDescription, `Profile context:\n${profileContext}`].filter(Boolean).join('\n\n');
}

function buildIdeaCaptionContext(
  currentMediaDescription: string,
  profile: BusinessProfile,
  idea: ContentIdea,
) {
  const mediaDescription = removeGeneratedContext(currentMediaDescription);
  const ideaContext = [
    `Idea title: ${idea.title}`,
    `Angle: ${idea.angle}`,
    `Suggested caption prompt: ${idea.suggestedCaptionPrompt}`,
    `Content type: ${idea.contentType}`,
  ].join('\n');
  const profileContext = buildProfileContext(profile);

  return [
    mediaDescription,
    `Idea context:\n${ideaContext}`,
    profileContext ? `Profile context:\n${profileContext}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildTemplateCaptionContext(
  currentMediaDescription: string,
  profile: BusinessProfile,
  template: DraftTemplate,
) {
  const mediaDescription = removeGeneratedContext(currentMediaDescription);
  const templateContext = [
    `Template: ${template.name}`,
    `Description: ${template.description}`,
    `Media prompt: ${template.mediaPrompt}`,
    `Suggested media type: ${mediaTypeLabels[template.mediaType]}`,
  ].join('\n');
  const profileContext = buildProfileContext(profile);

  return [
    mediaDescription,
    `Template context:\n${templateContext}`,
    profileContext ? `Profile context:\n${profileContext}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildProfileContext(profile: BusinessProfile) {
  return [
    profile.targetAudience.trim() ? `Audience: ${profile.targetAudience.trim()}` : '',
    profile.coreServices.trim() ? `Core services: ${profile.coreServices.trim()}` : '',
    profile.contentStyle.trim() ? `Content style: ${profile.contentStyle.trim()}` : '',
    profile.notes?.trim() ? `Notes: ${profile.notes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function removeGeneratedContext(value: string) {
  const markerIndex = findFirstContextMarkerIndex(value);

  if (markerIndex === -1) {
    return value.trim();
  }

  return value.slice(0, markerIndex).trim();
}

function findFirstContextMarkerIndex(value: string) {
  const indexes = ['Template context:', 'Idea context:', 'Profile context:']
    .map((marker) => value.indexOf(marker))
    .filter((index) => index >= 0);

  return indexes.length > 0 ? Math.min(...indexes) : -1;
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

function isDefaultBusinessProfile(profile: BusinessProfile) {
  const defaultProfile = createDefaultBusinessProfile();

  return (
    profile.id === defaultProfile.id &&
    profile.businessName === defaultProfile.businessName &&
    profile.businessType === defaultProfile.businessType &&
    profile.brandVoice === defaultProfile.brandVoice &&
    profile.targetAudience === defaultProfile.targetAudience &&
    profile.coreServices === defaultProfile.coreServices &&
    profile.primaryOffer === defaultProfile.primaryOffer &&
    profile.contentStyle === defaultProfile.contentStyle &&
    profile.defaultPlatform === defaultProfile.defaultPlatform &&
    (profile.notes ?? '') === (defaultProfile.notes ?? '')
  );
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

function formatExportDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

function getAssetStatusBadgeClassName(status: DraftPostAssetStatus) {
  return cn('font-semibold', assetStatusStyles[status]);
}
