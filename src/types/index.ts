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

export type DraftPostPlatform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin';

export type DraftPostStatus = 'draft' | 'needs_review' | 'approved';

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
  caption: string;
  hook: string;
  hashtags: string[];
  tone: string;
  status: DraftPostStatus;
  createdAt: string;
};
