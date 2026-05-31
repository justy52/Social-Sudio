import type { PostMediaRecord } from './client.ts';

export type ImageSizePresetId = '1080x1080' | '1080x1350' | '1080x566' | '1200x630';
export type BackgroundFit = 'fit' | 'fill';
export type TextPosition = 'top' | 'center' | 'bottom';
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ImageSizePreset = {
  id: ImageSizePresetId;
  label: string;
  width: number;
  height: number;
};

export type ImageEditorSettings = {
  sizePreset: ImageSizePresetId;
  backgroundFit: BackgroundFit;
  text: string;
  fontSize: number;
  fontColor: string;
  isBold: boolean;
  textPosition: TextPosition;
  hasTextHighlight: boolean;
  logoUrl?: string | null;
  logoPosition: LogoPosition;
  logoSize: number;
};

export type DrawRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const imageSizePresets: ImageSizePreset[] = [
  { id: '1080x1080', label: 'Instagram square', width: 1080, height: 1080 },
  { id: '1080x1350', label: 'Instagram portrait', width: 1080, height: 1350 },
  { id: '1080x566', label: 'Instagram landscape', width: 1080, height: 566 },
  { id: '1200x630', label: 'Facebook link preview', width: 1200, height: 630 },
];

export const defaultImageEditorSettings: ImageEditorSettings = {
  sizePreset: '1080x1080',
  backgroundFit: 'fill',
  text: '',
  fontSize: 54,
  fontColor: '#FFFFFF',
  isBold: true,
  textPosition: 'bottom',
  hasTextHighlight: true,
  logoPosition: 'bottom-right',
  logoSize: 140,
};

export function parseImageSizePreset(presetId: string): ImageSizePreset {
  const preset = imageSizePresets.find((item) => item.id === presetId);

  if (!preset) {
    throw new Error(`Unsupported image size preset: ${presetId}`);
  }

  return preset;
}

export function getFirstOriginalMedia(media: PostMediaRecord[]) {
  return media.find((item) => !item.isEdited) ?? media[0] ?? null;
}

export function calculateImageDrawRect(input: {
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  fit: BackgroundFit;
}): DrawRect {
  const scale =
    input.fit === 'fill'
      ? Math.max(input.targetWidth / input.sourceWidth, input.targetHeight / input.sourceHeight)
      : Math.min(input.targetWidth / input.sourceWidth, input.targetHeight / input.sourceHeight);
  const width = input.sourceWidth * scale;
  const height = input.sourceHeight * scale;

  return {
    x: (input.targetWidth - width) / 2,
    y: (input.targetHeight - height) / 2,
    width,
    height,
  };
}

export function buildEditedImageUploadFormData(input: {
  postId: string;
  file: Blob;
  width: number;
  height: number;
  originalUrl?: string | null;
}) {
  const formData = new FormData();
  formData.append('post_id', input.postId);
  formData.append('width', String(input.width));
  formData.append('height', String(input.height));

  if (input.originalUrl) {
    formData.append('original_url', input.originalUrl);
  }

  formData.append('file', input.file, buildEditedImageFileName(input.postId));
  return formData;
}

export function buildEditedImageFileName(postId: string) {
  return `edited-${postId}.png`;
}
