import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { ApiError, handleApiError, methodNotAllowed, parseJsonBody, sendJson } from '../../src/lib/api-helpers.ts';
import { loadServerEnv } from '../../src/lib/server-env.ts';
import { draftPostPlatforms, type DraftPostPlatform } from '../../src/types/index.ts';

loadServerEnv();

const isolatedCaptionGenerateSchema = z
  .object({
    businessName: z.string().trim().min(1, 'Business name is required.').max(120),
    businessType: z.string().trim().min(1, 'Business type is required.').max(120),
    brandVoice: z.string().trim().max(800).optional(),
    postGoal: z.string().trim().max(300).optional(),
    mediaDescription: z.string().trim().max(1200).optional(),
    platform: z.enum(draftPostPlatforms).optional().default('instagram'),
  })
  .strict();

type IsolatedCaptionGenerateInput = z.infer<typeof isolatedCaptionGenerateSchema>;

type CaptionDraft = {
  caption: string;
  hook: string;
  hashtags: string[];
  tone: string;
};

type CaptionGenerateResponse = {
  captions: CaptionDraft[];
};

const captionDraftSchema = z.object({
  caption: z.string().trim().min(1).max(2200),
  hook: z.string().trim().min(1).max(240),
  hashtags: z.array(z.string().trim().min(1)),
  tone: z.string().trim().min(1).max(300),
});

const captionGenerateResponseSchema = z.object({
  captions: z.array(captionDraftSchema).min(1),
});

type OpenAIResponseOutputText = {
  type: 'output_text';
  text: string;
};

type OpenAIResponseMessage = {
  type: 'message';
  content?: OpenAIResponseOutputText[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: OpenAIResponseMessage[];
};

const defaultOpenAiGenerationModel = 'gpt-5.4-mini';
const openAiCaptionModel = process.env.OPENAI_CAPTION_MODEL ?? defaultOpenAiGenerationModel;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const input = isolatedCaptionGenerateSchema.parse(parseJsonBody(req));
    const result = process.env.OPENAI_API_KEY
      ? await generateIsolatedCaptions(input)
      : buildFallbackCaptions(input);

    return sendJson<CaptionGenerateResponse>(res, 200, result);
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function generateIsolatedCaptions(
  input: IsolatedCaptionGenerateInput,
): Promise<CaptionGenerateResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  let response: Response;

  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: openAiCaptionModel,
        instructions: buildSystemPrompt(input.platform),
        input: buildUserPrompt(input),
        max_output_tokens: 1400,
      }),
    });
  } catch {
    throw new ApiError(502, 'Caption generation failed. Please try again.');
  }

  if (!response.ok) {
    throw new ApiError(502, 'Caption generation failed. Please try again.');
  }

  const data = (await response.json()) as OpenAIResponse;
  const text = extractOpenAIResponseText(data);

  if (!text) {
    throw new ApiError(502, 'Caption generation returned an empty response.');
  }

  return parseCaptionDrafts(text);
}

function buildSystemPrompt(platform: DraftPostPlatform) {
  return [
    'You are a senior social media copywriter.',
    `Write ${platform} captions for a small business owner.`,
    'Return 1 to 3 distinct caption draft options.',
    'Each option must include a short hook, a polished caption, 5 to 10 relevant hashtags, and a concise tone label.',
    'Keep captions practical, specific, and ready to paste into a social post.',
    'Return ONLY valid JSON with this shape: {"captions":[{"hook":"...","caption":"...","hashtags":["#tag"],"tone":"..."}]}.',
  ].join('\n');
}

function buildUserPrompt(input: IsolatedCaptionGenerateInput) {
  const lines = [
    `Business name: ${input.businessName}`,
    `Business type: ${input.businessType}`,
    `Platform: ${input.platform}`,
  ];

  if (input.brandVoice) {
    lines.push(`Brand voice: ${input.brandVoice}`);
  }

  if (input.postGoal) {
    lines.push(`Post goal: ${input.postGoal}`);
  }

  if (input.mediaDescription) {
    lines.push(`Media description: ${input.mediaDescription}`);
  }

  return lines.join('\n');
}

function extractOpenAIResponseText(data: OpenAIResponse) {
  const text =
    data.output_text ??
    data.output
      ?.flatMap((item) => item.content ?? [])
      .filter((block): block is OpenAIResponseOutputText => block.type === 'output_text')
      .map((block) => block.text)
      .join('\n');

  return text?.trim();
}

function parseCaptionDrafts(rawText: string): CaptionGenerateResponse {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ApiError(502, 'Caption generation returned invalid JSON.');
  }

  const result = captionGenerateResponseSchema.safeParse(parsed);

  if (!result.success) {
    throw new ApiError(502, 'Caption generation returned an unexpected format.');
  }

  return {
    captions: result.data.captions
      .map((caption) => ({
        caption: caption.caption.trim(),
        hook: caption.hook.trim(),
        hashtags: normalizeHashtags(caption.hashtags),
        tone: caption.tone.trim(),
      }))
      .filter((caption) => caption.caption && caption.hook)
      .slice(0, 3),
  };
}

function normalizeHashtags(hashtags: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const hashtag of hashtags) {
    const tag = hashtag.trim().replace(/^#+/, '');

    if (!tag) {
      continue;
    }

    const formatted = `#${tag.replace(/\s+/g, '').slice(0, 79)}`;
    const key = formatted.toLocaleLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(formatted);
    }
  }

  return normalized.slice(0, 10);
}

function buildFallbackCaptions(input: IsolatedCaptionGenerateInput): CaptionGenerateResponse {
  const platform = input.platform;
  const goal = input.postGoal || 'connect with the right people';
  const businessType = input.businessType || 'local business';
  const hashtags = normalizeHashtags([
    input.businessName,
    businessType,
    platform,
    'SmallBusiness',
    'Community',
  ]);

  return captionGenerateResponseSchema.parse({
    captions: [
      {
        hook: `Ready to try ${input.businessName}?`,
        caption: [
          `${input.businessName} is built for people who want more than another ${businessType} option.`,
          input.mediaDescription
            ? `Here is the moment: ${input.mediaDescription}.`
            : 'Show up, put in the work, and feel what the community is about.',
          `If your goal is to ${goal.toLocaleLowerCase()}, this is your sign to start.`,
        ].join('\n\n'),
        hashtags,
        tone: input.brandVoice || 'Motivating and community-focused',
      },
      {
        hook: 'Your next strong step starts here.',
        caption: [
          `For anyone looking for ${businessType} support, ${input.businessName} keeps it simple: real work, real progress, real people beside you.`,
          `Take the next step and ${goal.toLocaleLowerCase()}.`,
        ].join('\n\n'),
        hashtags,
        tone: input.brandVoice || 'Clear and encouraging',
      },
    ],
  });
}
