import type { GeneratedCaption } from './client.ts';

export type CaptionGeneratorSelection = {
  caption: string;
  hashtags: string[];
  aiGenerated: true;
};

export function buildCaptionSelection(
  generated: GeneratedCaption,
  selectedCaption = generated.caption,
): CaptionGeneratorSelection {
  return {
    caption: selectedCaption.trim(),
    hashtags: generated.hashtags,
    aiGenerated: true,
  };
}
