import { z } from 'zod';
import { postStatuses } from './posts/status.ts';

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.string().url().optional());

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a 6-character hex color.');

export const businessCreateSchema = z.object({
  name: z.string().trim().min(2, 'Business name is required.').max(120),
  industry: z.string().trim().max(80).optional(),
  websiteUrl: optionalUrl,
  brandVoice: z.string().trim().max(800).optional(),
  primaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
  logoUrl: optionalUrl,
  timezone: z.string().trim().max(80).optional(),
});

export const businessUpdateSchema = businessCreateSchema.partial().extend({
  name: z.string().trim().min(2).max(120).optional(),
});

const postTextField = z.string().trim().max(2200);
const postNotesField = z.string().trim().max(1200);
const postHashtagsField = z.array(z.string().trim().min(1).max(80)).max(30);
const platformSizeField = z.string().trim().regex(/^\d{3,4}x\d{3,4}$/, 'Use WIDTHxHEIGHT format.');

export const postCreateSchema = z
  .object({
    business_id: z.string().uuid(),
    caption: postTextField.optional(),
    hashtags: postHashtagsField.optional(),
    platform_size: platformSizeField.optional(),
    notes: postNotesField.optional(),
    ai_generated: z.boolean().optional(),
  })
  .strict()
  .transform((input) => ({
    businessId: input.business_id,
    caption: input.caption,
    hashtags: input.hashtags,
    platformSize: input.platform_size,
    notes: input.notes,
    aiGenerated: input.ai_generated,
  }));

export const postListQuerySchema = z
  .object({
    business_id: z.string().uuid().optional(),
  })
  .passthrough()
  .transform((input) => ({
    businessId: input.business_id,
  }));

export const postIdSchema = z.string().uuid();

export const postUpdateSchema = z
  .object({
    caption: postTextField.optional(),
    hashtags: postHashtagsField.optional(),
    platform_size: platformSizeField.optional(),
    notes: postNotesField.optional(),
    ai_generated: z.boolean().optional(),
    status: z.enum(postStatuses).optional(),
  })
  .strict()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: 'At least one post field is required.',
  })
  .transform((input) => {
    const output: {
      caption?: string;
      hashtags?: string[];
      platformSize?: string;
      notes?: string;
      aiGenerated?: boolean;
      status?: (typeof postStatuses)[number];
    } = {};

    if (input.caption !== undefined) output.caption = input.caption;
    if (input.hashtags !== undefined) output.hashtags = input.hashtags;
    if (input.platform_size !== undefined) output.platformSize = input.platform_size;
    if (input.notes !== undefined) output.notes = input.notes;
    if (input.ai_generated !== undefined) output.aiGenerated = input.ai_generated;
    if (input.status !== undefined) output.status = input.status;

    return output;
  });

export const captionToneSchema = z.enum(['professional', 'casual', 'funny', 'inspirational']);

export const captionGenerateSchema = z
  .object({
    business_id: z.string().uuid(),
    prompt_context: z.string().trim().min(1, 'Prompt context is required.').max(1200),
    tone: captionToneSchema,
    include_hashtags: z.boolean(),
    image_description: z.string().trim().max(1200).optional(),
  })
  .strict()
  .transform((input) => ({
    businessId: input.business_id,
    promptContext: input.prompt_context,
    tone: input.tone,
    includeHashtags: input.include_hashtags,
    imageDescription: input.image_description,
  }));

export type BusinessCreateInput = z.infer<typeof businessCreateSchema>;
export type BusinessUpdateInput = z.infer<typeof businessUpdateSchema>;
export type CaptionGenerateInput = z.infer<typeof captionGenerateSchema>;
export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type PostListQueryInput = z.infer<typeof postListQuerySchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;
