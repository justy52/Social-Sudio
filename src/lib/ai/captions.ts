import { ApiError } from '../api-helpers.ts';
import type { Business } from '../db/schema.ts';
import type { CaptionGenerateInput } from '../validation.ts';

export type CaptionTone = CaptionGenerateInput['tone'];

export interface CaptionGenerationResult {
  caption: string;
  hashtags: string[];
  alternatives: string[];
}

export interface CaptionPrompt {
  system: string;
  user: string;
}

type CaptionBusiness = Pick<Business, 'name' | 'industry' | 'brandVoice' | 'userId'>;

interface OpenAIResponseOutputText {
  type: 'output_text';
  text: string;
}

interface OpenAIResponseMessage {
  type: 'message';
  content?: OpenAIResponseOutputText[];
}

interface OpenAIResponse {
  output_text?: string;
  output?: OpenAIResponseMessage[];
}

interface GenerateCaptionOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

const openAiCaptionModel = 'gpt-5.4-mini';

export function assertOwnedBusinessForCaptions(
  business: Pick<Business, 'userId'> | null | undefined,
  userId: string,
) {
  if (!business || business.userId !== userId) {
    throw new ApiError(404, 'Business not found');
  }
}

export function buildCaptionPrompt(
  business: CaptionBusiness,
  input: Pick<
    CaptionGenerateInput,
    'promptContext' | 'tone' | 'includeHashtags' | 'imageDescription'
  >,
): CaptionPrompt {
  const industry = business.industry?.trim() || 'local';
  const brandVoice = business.brandVoice?.trim() || 'professional and approachable';
  const hashtagInstruction = input.includeHashtags
    ? 'Include 5-10 relevant hashtags in the hashtags array.'
    : 'Do not include hashtags in the caption. Return an empty hashtags array.';
  const imageLine = input.imageDescription
    ? `\nThe image shows: ${input.imageDescription}`
    : '';

  return {
    system: [
      `You are a social media copywriter for ${business.name}, a ${industry} business.`,
      `Brand voice: ${brandVoice}.`,
      `Write social media captions with a ${input.tone} tone.`,
      'Keep each caption under 2200 characters.',
      hashtagInstruction,
      'Return ONLY valid JSON with this shape: {"caption":"...","hashtags":["#tag"],"alternatives":["...","..."]}.',
    ].join('\n'),
    user: `Write a caption about: ${input.promptContext}${imageLine}`,
  };
}

export function requireOpenAIApiKey(apiKey: string | undefined) {
  if (!apiKey) {
    throw new ApiError(500, 'OPENAI_API_KEY is not configured');
  }

  return apiKey;
}

export async function generateCaption(
  business: CaptionBusiness,
  input: CaptionGenerateInput,
  options: GenerateCaptionOptions = {},
): Promise<CaptionGenerationResult> {
  const apiKey = requireOpenAIApiKey(options.apiKey ?? process.env.OPENAI_API_KEY);
  const fetchImpl = options.fetchImpl ?? fetch;
  const prompt = buildCaptionPrompt(business, input);

  let response: Response;

  try {
    response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: openAiCaptionModel,
        instructions: prompt.system,
        input: prompt.user,
        max_output_tokens: 1000,
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

  return normalizeCaptionOutput(text, input.includeHashtags);
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

export function normalizeCaptionOutput(rawText: string, includeHashtags: boolean): CaptionGenerationResult {
  const parsed = parseCaptionJson(rawText);
  const caption = normalizeCaptionText(parsed?.caption ?? rawText, includeHashtags);
  const hashtags = includeHashtags
    ? normalizeHashtags(parsed?.hashtags ?? extractHashtags(rawText))
    : [];
  const alternatives = normalizeAlternatives(parsed?.alternatives ?? [], includeHashtags);

  return { caption, hashtags, alternatives };
}

function parseCaptionJson(rawText: string) {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const output = parsed as {
      caption?: unknown;
      hashtags?: unknown;
      alternatives?: unknown;
    };

    return {
      caption: typeof output.caption === 'string' ? output.caption : undefined,
      hashtags: Array.isArray(output.hashtags)
        ? output.hashtags.filter((tag): tag is string => typeof tag === 'string')
        : undefined,
      alternatives: Array.isArray(output.alternatives)
        ? output.alternatives.filter((alternative): alternative is string => typeof alternative === 'string')
        : undefined,
    };
  } catch {
    return null;
  }
}

function normalizeCaptionText(caption: string, includeHashtags: boolean) {
  const trimmed = caption.trim();

  if (includeHashtags) {
    return trimmed;
  }

  return trimmed.replace(/(?:^|\s)#[\p{L}\p{N}_-]+/gu, '').replace(/\s{2,}/g, ' ').trim();
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

function normalizeAlternatives(alternatives: string[], includeHashtags: boolean) {
  return alternatives
    .map((alternative) => normalizeCaptionText(alternative, includeHashtags))
    .filter(Boolean)
    .slice(0, 2);
}

function extractHashtags(text: string) {
  return text.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
}
