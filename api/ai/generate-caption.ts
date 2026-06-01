import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { ApiError, handleApiError, methodNotAllowed, parseJsonBody, sendJson } from '../../src/lib/api-helpers.ts';
import { loadServerEnv } from '../../src/lib/server-env.ts';

loadServerEnv();

const platforms = ['instagram', 'facebook', 'tiktok', 'linkedin'] as const;

const isolatedCaptionGenerateSchema = z
  .object({
    businessName: z.string().trim().min(1, 'Business name is required.').max(120),
    businessType: z.string().trim().min(1, 'Business type is required.').max(120),
    brandVoice: z.string().trim().max(800).optional(),
    postGoal: z.string().trim().max(300).optional(),
    mediaDescription: z.string().trim().max(1200).optional(),
    platform: z.enum(platforms).optional().default('instagram'),
  })
  .strict();

type CaptionPlatform = (typeof platforms)[number];

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

const openAiCaptionModel = 'gpt-5.4-mini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const input = isolatedCaptionGenerateSchema.parse(parseJsonBody(req));
    const result = await generateIsolatedCaptions(input);

    return sendJson<CaptionGenerateResponse>(res, 200, result);
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function generateIsolatedCaptions(
  input: IsolatedCaptionGenerateInput,
): Promise<CaptionGenerateResponse> {
  const apiKey = requireOpenAIApiKey(process.env.OPENAI_API_KEY);
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

function requireOpenAIApiKey(apiKey: string | undefined) {
  if (!apiKey) {
    throw new ApiError(500, 'OPENAI_API_KEY is not configured');
  }

  return apiKey;
}

function buildSystemPrompt(platform: CaptionPlatform) {
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

  if (!isCaptionGenerateResponse(parsed)) {
    throw new ApiError(502, 'Caption generation returned an unexpected format.');
  }

  return {
    captions: parsed.captions
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

function normalizeHashtags(hashtags: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const hashtag of hashtags) {
    const tag = hashtag.trim().replace(/^#+/, '');

    if (!tag) {
      continue;
    }

    const formatted = `#${tag.replace(/\s+/g, '')}`;
    const key = formatted.toLocaleLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(formatted);
    }
  }

  return normalized.slice(0, 10);
}
