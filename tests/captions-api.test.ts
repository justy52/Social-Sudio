import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../src/lib/api-helpers.ts';
import {
  assertOwnedBusinessForCaptions,
  buildCaptionPrompt,
  generateCaption,
  normalizeCaptionOutput,
  requireAnthropicApiKey,
} from '../src/lib/ai/captions.ts';
import { captionGenerateSchema } from '../src/lib/validation.ts';

const business = {
  name: 'Aloha Fence',
  industry: 'fencing',
  brandVoice: 'friendly, practical, and trustworthy',
  userId: 'user_1',
};

test('caption generation validates the required request body', () => {
  const input = captionGenerateSchema.parse({
    business_id: '11111111-1111-4111-8111-111111111111',
    prompt_context: 'New cedar fence installation in Heber City',
    tone: 'professional',
    include_hashtags: true,
    image_description: 'A finished cedar fence beside a mountain home',
  });

  assert.equal(input.businessId, '11111111-1111-4111-8111-111111111111');
  assert.equal(input.promptContext, 'New cedar fence installation in Heber City');
  assert.equal(input.includeHashtags, true);
  assert.equal(input.imageDescription, 'A finished cedar fence beside a mountain home');
});

test('caption generation rejects invalid body fields', () => {
  assert.throws(() =>
    captionGenerateSchema.parse({
      business_id: 'not-a-uuid',
      prompt_context: '',
      tone: 'snarky',
      include_hashtags: 'yes',
    }),
  );

  assert.throws(() =>
    captionGenerateSchema.parse({
      business_id: '11111111-1111-4111-8111-111111111111',
      prompt_context: 'Launch day',
      tone: 'casual',
      include_hashtags: false,
      api_key: 'client-secret',
    }),
  );
});

test('caption helper requires an owned business context', () => {
  assert.doesNotThrow(() => assertOwnedBusinessForCaptions(business, 'user_1'));
  assert.throws(() => assertOwnedBusinessForCaptions(business, 'user_2'), ApiError);
  assert.throws(() => assertOwnedBusinessForCaptions(null, 'user_1'), ApiError);
});

test('caption prompt includes brand context, tone, hashtags, and image context', () => {
  const prompt = buildCaptionPrompt(business, {
    promptContext: 'New cedar fence installation in Heber City',
    tone: 'inspirational',
    includeHashtags: true,
    imageDescription: 'A warm cedar fence at sunset',
  });

  assert.match(prompt.system, /Aloha Fence/);
  assert.match(prompt.system, /fencing/);
  assert.match(prompt.system, /friendly, practical, and trustworthy/);
  assert.match(prompt.system, /inspirational tone/);
  assert.match(prompt.system, /Include 5-10 relevant hashtags/);
  assert.match(prompt.user, /New cedar fence installation in Heber City/);
  assert.match(prompt.user, /The image shows: A warm cedar fence at sunset/);
});

test('caption prompt falls back to a safe brand voice and omits image context when absent', () => {
  const prompt = buildCaptionPrompt(
    { ...business, industry: null, brandVoice: null },
    {
      promptContext: 'Spring maintenance tips',
      tone: 'casual',
      includeHashtags: false,
      imageDescription: undefined,
    },
  );

  assert.match(prompt.system, /a local business/);
  assert.match(prompt.system, /professional and approachable/);
  assert.match(prompt.system, /Return an empty hashtags array/);
  assert.doesNotMatch(prompt.user, /The image shows:/);
});

test('caption normalization handles JSON responses and hashtag cleanup', () => {
  const output = normalizeCaptionOutput(
    JSON.stringify({
      caption: 'Fresh cedar, clean lines, and a yard ready for summer.',
      hashtags: ['Fence Life', '#HeberCity', '#hebercity', ''],
      alternatives: ['A sturdy cedar upgrade for a beautiful backyard.', 'Built for privacy and curb appeal.'],
    }),
    true,
  );

  assert.deepEqual(output, {
    caption: 'Fresh cedar, clean lines, and a yard ready for summer.',
    hashtags: ['#FenceLife', '#HeberCity'],
    alternatives: ['A sturdy cedar upgrade for a beautiful backyard.', 'Built for privacy and curb appeal.'],
  });
});

test('caption normalization strips hashtags when they are disabled', () => {
  const output = normalizeCaptionOutput(
    JSON.stringify({
      caption: 'Fresh cedar, clean lines. #FenceLife #HeberCity',
      hashtags: ['#FenceLife'],
      alternatives: ['Privacy looks good from here. #FenceLife'],
    }),
    false,
  );

  assert.deepEqual(output, {
    caption: 'Fresh cedar, clean lines.',
    hashtags: [],
    alternatives: ['Privacy looks good from here.'],
  });
});

test('missing Anthropic API key returns a clear server-side error', () => {
  assert.throws(() => requireAnthropicApiKey(undefined), /ANTHROPIC_API_KEY/);
});

test('generateCaption normalizes Claude responses without exposing the API key', async () => {
  const seenHeaders: Record<string, string> = {};
  const result = await generateCaption(
    business,
    captionGenerateSchema.parse({
      business_id: '11111111-1111-4111-8111-111111111111',
      prompt_context: 'New cedar fence installation in Heber City',
      tone: 'professional',
      include_hashtags: true,
    }),
    {
      apiKey: 'server-only-key',
      async fetchImpl(_url, init) {
        Object.assign(seenHeaders, init?.headers);

        return new Response(
          JSON.stringify({
            content: [
              {
                type: 'text',
                text: '{"caption":"Built clean and ready for the season.","hashtags":["#FenceLife"],"alternatives":["A clean cedar upgrade.","Privacy with polished curb appeal."]}',
              },
            ],
          }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(seenHeaders['x-api-key'], 'server-only-key');
  assert.equal(result.caption, 'Built clean and ready for the season.');
  assert.deepEqual(result.hashtags, ['#FenceLife']);
  assert.equal(JSON.stringify(result).includes('server-only-key'), false);
});

test('generateCaption turns Claude failures into a graceful API error', async () => {
  await assert.rejects(
    () =>
      generateCaption(
        business,
        captionGenerateSchema.parse({
          business_id: '11111111-1111-4111-8111-111111111111',
          prompt_context: 'New cedar fence installation in Heber City',
          tone: 'professional',
          include_hashtags: true,
        }),
        {
          apiKey: 'server-only-key',
          async fetchImpl() {
            return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 });
          },
        },
      ),
    /Caption generation failed/,
  );
});
