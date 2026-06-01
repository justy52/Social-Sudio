import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { ApiError, handleApiError, methodNotAllowed, parseJsonBody, sendJson } from '../../src/lib/api-helpers.ts';
import { loadServerEnv } from '../../src/lib/server-env.ts';
import {
  draftPostPlatforms,
  type ContentIdeaGenerateResponse,
  type DraftPostPlatform,
} from '../../src/types/index.ts';

loadServerEnv();

const contentIdeaGenerateSchema = z
  .object({
    businessName: z.string().trim().min(1, 'Business name is required.').max(120),
    businessType: z.string().trim().min(1, 'Business type is required.').max(120),
    brandVoice: z.string().trim().max(800).optional(),
    targetAudience: z.string().trim().max(1200).optional(),
    coreServices: z.string().trim().max(1200).optional(),
    primaryOffer: z.string().trim().max(300).optional(),
    contentStyle: z.string().trim().max(800).optional(),
    notes: z.string().trim().max(1200).optional(),
    platform: z.enum(draftPostPlatforms).optional().default('instagram'),
    ideaGoal: z.string().trim().max(500).optional(),
  })
  .strict();

const contentIdeaSchema = z.object({
  title: z.string().trim().min(1).max(120),
  angle: z.string().trim().min(1).max(500),
  suggestedCaptionPrompt: z.string().trim().min(1).max(800),
  platform: z.enum(draftPostPlatforms),
  contentType: z.string().trim().min(1).max(120),
  callToAction: z.string().trim().min(1).max(200),
});

const contentIdeaGenerateResponseSchema = z.object({
  ideas: z.array(contentIdeaSchema).min(1).max(6),
});

type ContentIdeaGenerateInput = z.infer<typeof contentIdeaGenerateSchema>;

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

const openAiIdeaModel = process.env.OPENAI_IDEA_MODEL ?? 'gpt-5.4-mini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return methodNotAllowed(res, ['POST']);
    }

    const input = contentIdeaGenerateSchema.parse(parseJsonBody(req));
    const result = process.env.OPENAI_API_KEY
      ? await generateContentIdeas(input)
      : buildFallbackIdeas(input);

    return sendJson<ContentIdeaGenerateResponse>(res, 200, result);
  } catch (error) {
    return handleApiError(res, error);
  }
}

async function generateContentIdeas(
  input: ContentIdeaGenerateInput,
): Promise<ContentIdeaGenerateResponse> {
  let response: Response;

  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: openAiIdeaModel,
        instructions: buildSystemPrompt(input.platform),
        input: buildUserPrompt(input),
        max_output_tokens: 1400,
      }),
    });
  } catch {
    throw new ApiError(502, 'Content idea generation failed. Please try again.');
  }

  if (!response.ok) {
    throw new ApiError(502, 'Content idea generation failed. Please try again.');
  }

  const data = (await response.json()) as OpenAIResponse;
  const text = extractOpenAIResponseText(data);

  if (!text) {
    throw new ApiError(502, 'Content idea generation returned an empty response.');
  }

  return parseContentIdeas(text);
}

function buildSystemPrompt(platform: DraftPostPlatform) {
  return [
    'You are a practical social media strategist for small businesses.',
    `Generate concise ${platform} post ideas that can later become captions.`,
    'Return 3 to 5 distinct ideas.',
    'Each idea must be specific, useful, and easy for a business owner to execute manually.',
    'Return ONLY valid JSON with this shape: {"ideas":[{"title":"...","angle":"...","suggestedCaptionPrompt":"...","platform":"instagram","contentType":"...","callToAction":"..."}]}.',
  ].join('\n');
}

function buildUserPrompt(input: ContentIdeaGenerateInput) {
  const lines = [
    `Business name: ${input.businessName}`,
    `Business type: ${input.businessType}`,
    `Platform: ${input.platform}`,
  ];

  if (input.brandVoice) lines.push(`Brand voice: ${input.brandVoice}`);
  if (input.targetAudience) lines.push(`Target audience: ${input.targetAudience}`);
  if (input.coreServices) lines.push(`Core services: ${input.coreServices}`);
  if (input.primaryOffer) lines.push(`Primary offer: ${input.primaryOffer}`);
  if (input.contentStyle) lines.push(`Content style: ${input.contentStyle}`);
  if (input.notes) lines.push(`Notes: ${input.notes}`);
  if (input.ideaGoal) lines.push(`Idea goal: ${input.ideaGoal}`);

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

function parseContentIdeas(rawText: string): ContentIdeaGenerateResponse {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ApiError(502, 'Content idea generation returned invalid JSON.');
  }

  const result = contentIdeaGenerateResponseSchema.safeParse(parsed);

  if (!result.success) {
    throw new ApiError(502, 'Content idea generation returned an unexpected format.');
  }

  return {
    ideas: result.data.ideas.slice(0, 5),
  };
}

function buildFallbackIdeas(input: ContentIdeaGenerateInput): ContentIdeaGenerateResponse {
  const platform = input.platform;
  const offer = input.primaryOffer || input.ideaGoal || 'the next best offer';
  const businessType = input.businessType || 'local business';

  return contentIdeaGenerateResponseSchema.parse({
    ideas: [
      {
        title: `${offer} spotlight`,
        angle: `Show why ${offer.toLocaleLowerCase()} is valuable for ${input.targetAudience || 'your audience'}.`,
        suggestedCaptionPrompt: `Write a ${platform} caption that introduces ${offer}, explains who it is for, and invites people to take the next step.`,
        platform,
        contentType: 'Offer post',
        callToAction: `Claim ${offer}`,
      },
      {
        title: 'Behind the scenes community moment',
        angle: `Use a real moment from ${input.businessName} to make the ${businessType} feel human and approachable.`,
        suggestedCaptionPrompt: `Write a caption about a behind-the-scenes community moment that reflects ${input.brandVoice || 'the brand voice'}.`,
        platform,
        contentType: 'Behind the scenes',
        callToAction: 'Join the community',
      },
      {
        title: 'Service breakdown',
        angle: `Turn one core service into a simple educational post for people comparing their options.`,
        suggestedCaptionPrompt: `Write a caption that explains one service from ${input.coreServices || input.businessType}, why it matters, and how to start.`,
        platform,
        contentType: 'Educational post',
        callToAction: 'Ask a question',
      },
    ],
  });
}
