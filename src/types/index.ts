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
