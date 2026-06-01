export interface Business {
  id: string;
  userId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  industry: string | null;
  websiteUrl: string | null;
  defaultHashtags: string[] | null;
  brandVoice: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessFormValues {
  name: string;
  industry?: string;
  websiteUrl?: string;
  brandVoice?: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  timezone?: string;
}

export const draftPostPlatforms = ['instagram', 'facebook', 'tiktok', 'linkedin'] as const;

export type DraftPostPlatform = (typeof draftPostPlatforms)[number];

export type DraftPostStatus = 'draft' | 'needs_review' | 'approved';

export const draftPostMediaTypes = ['photo', 'video', 'reel', 'story', 'carousel', 'none'] as const;

export type DraftPostMediaType = (typeof draftPostMediaTypes)[number];

export const draftPostAssetStatuses = ['needed', 'ready', 'attached_later', 'not_needed'] as const;

export type DraftPostAssetStatus = (typeof draftPostAssetStatuses)[number];

export type BusinessProfile = {
  id: string;
  businessName: string;
  businessType: string;
  brandVoice: string;
  targetAudience: string;
  coreServices: string;
  primaryOffer: string;
  contentStyle: string;
  defaultPlatform: DraftPostPlatform;
  notes?: string;
  updatedAt: string;
};

export type DraftPost = {
  id: string;
  businessName: string;
  businessType: string;
  platform: DraftPostPlatform;
  mediaDescription?: string;
  mediaType?: DraftPostMediaType;
  mediaNotes?: string;
  assetStatus?: DraftPostAssetStatus;
  caption: string;
  hook: string;
  hashtags: string[];
  tone: string;
  status: DraftPostStatus;
  createdAt: string;
};

export type DraftTemplate = {
  id: string;
  name: string;
  description: string;
  defaultPlatform: DraftPostPlatform;
  ideaGoal: string;
  postGoal: string;
  mediaType: NonNullable<DraftPost['mediaType']>;
  mediaPrompt: string;
};

export type ContentIdea = {
  title: string;
  angle: string;
  suggestedCaptionPrompt: string;
  platform: DraftPostPlatform;
  contentType: string;
  callToAction: string;
};

export type ContentIdeaGenerateRequest = {
  businessName: string;
  businessType: string;
  brandVoice?: string;
  targetAudience?: string;
  coreServices?: string;
  primaryOffer?: string;
  contentStyle?: string;
  notes?: string;
  platform?: DraftPostPlatform;
  ideaGoal?: string;
};

export type ContentIdeaGenerateResponse = {
  ideas: ContentIdea[];
};
