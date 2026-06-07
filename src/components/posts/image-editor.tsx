import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  defaultImageEditorSettings,
  imageSizePresets,
  parseImageSizePreset,
  calculateImageDrawRect,
  type BackgroundFit,
  type ImageEditorSettings,
  type ImageSizePresetId,
  type LogoPosition,
  type TextPosition,
} from '@/lib/posts/image-editor';
import {
  uploadEditedPostImage,
  type AuthTokenProvider,
  type PostMediaRecord,
} from '@/lib/posts/client';

type ImageEditorProps = {
  postId: string;
  backgroundMedia: PostMediaRecord | null;
  businessLogoUrl?: string | null;
  getToken: AuthTokenProvider;
  onSaved: (media: PostMediaRecord) => Promise<void> | void;
};

export function ImageEditor({
  postId,
  backgroundMedia,
  businessLogoUrl,
  getToken,
  onSaved,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [settings, setSettings] = useState<ImageEditorSettings>({
    ...defaultImageEditorSettings,
    logoUrl: businessLogoUrl,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preset = useMemo(() => parseImageSizePreset(settings.sizePreset), [settings.sizePreset]);

  useEffect(() => {
    setSettings((current) => ({ ...current, logoUrl: businessLogoUrl }));
  }, [businessLogoUrl]);

  useEffect(() => {
    let cancelled = false;

    async function drawPreview() {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');

      if (!canvas || !context) {
        return;
      }

      canvas.width = preset.width;
      canvas.height = preset.height;
      context.clearRect(0, 0, preset.width, preset.height);
      context.fillStyle = '#111827';
      context.fillRect(0, 0, preset.width, preset.height);

      if (!backgroundMedia) {
        return;
      }

      const [backgroundImage, logoImage] = await Promise.all([
        loadImage(backgroundMedia.blobUrl),
        settings.logoUrl ? loadImage(settings.logoUrl).catch(() => null) : Promise.resolve(null),
      ]);

      if (cancelled) {
        return;
      }

      drawEditorCanvas(context, {
        settings,
        backgroundImage,
        logoImage,
        width: preset.width,
        height: preset.height,
      });
    }

    void drawPreview().catch(() => {
      setError('Could not render image preview.');
    });

    return () => {
      cancelled = true;
    };
  }, [backgroundMedia, preset.height, preset.width, settings]);

  async function handleSaveEditedImage() {
    if (!backgroundMedia) {
      setError('Upload an image before saving an edited version.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Could not read the editor canvas.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const blob = await canvasToPngBlob(canvas);
      const media = await uploadEditedPostImage(getToken, {
        postId,
        file: blob,
        width: preset.width,
        height: preset.height,
        originalUrl: backgroundMedia.blobUrl,
      });

      setMessage('Edited image saved.');
      await onSaved(media);
    } catch (saveError) {
      setError(readError(saveError, 'Could not save edited image.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (!backgroundMedia) {
    return (
      <section className="space-y-3 rounded-md border border-dashed border-primary/25 bg-secondary/30 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10">
            <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-semibold">Image editor</h3>
        </div>
        <p className="text-sm text-muted-foreground">Upload an image to open the editor.</p>
      </section>
    );
  }

  return (
    <section className="relative space-y-4 overflow-hidden rounded-md border border-primary/15 bg-card/55 p-4 shadow-[0_18px_48px_rgba(2,6,23,0.28),0_0_30px_rgba(56,189,248,0.08)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/25 bg-primary/10 shadow-[0_0_22px_rgba(56,189,248,0.14)]">
            <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-semibold">Image editor</h3>
        </div>
        <Button type="button" onClick={handleSaveEditedImage} disabled={isSaving}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSaving ? 'Saving' : 'Save edited image'}
        </Button>
      </div>

      {(message || error) && (
        <div
          className={
            error
              ? 'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive shadow-[0_0_24px_rgba(239,68,68,0.08)]'
              : 'rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary shadow-[0_0_24px_rgba(56,189,248,0.08)]'
          }
        >
          {error ?? message}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-primary/15 bg-background shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_16px_45px_rgba(2,6,23,0.3)]">
        <canvas ref={canvasRef} className="block h-auto w-full" aria-label="Image editor preview" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="editor-size">Size</Label>
          <Select
            id="editor-size"
            value={settings.sizePreset}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                sizePreset: event.target.value as ImageSizePresetId,
              }))
            }
          >
            {imageSizePresets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} ({item.id})
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="background-fit">Background</Label>
          <Select
            id="background-fit"
            value={settings.backgroundFit}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                backgroundFit: event.target.value as BackgroundFit,
              }))
            }
          >
            <option value="fill">Fill</option>
            <option value="fit">Fit</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="overlay-text">Text overlay</Label>
        <Textarea
          id="overlay-text"
          value={settings.text}
          onChange={(event) => setSettings((current) => ({ ...current, text: event.target.value }))}
          placeholder="Add one text overlay."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="font-size">Font size</Label>
          <Input
            id="font-size"
            type="range"
            min="24"
            max="120"
            value={settings.fontSize}
            onChange={(event) =>
              setSettings((current) => ({ ...current, fontSize: Number(event.target.value) }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="font-color">Font color</Label>
          <Input
            id="font-color"
            type="color"
            value={settings.fontColor}
            onChange={(event) =>
              setSettings((current) => ({ ...current, fontColor: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="text-position">Text position</Label>
          <Select
            id="text-position"
            value={settings.textPosition}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                textPosition: event.target.value as TextPosition,
              }))
            }
          >
            <option value="top">Top</option>
            <option value="center">Center</option>
            <option value="bottom">Bottom</option>
          </Select>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <label className="flex min-h-8 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.isBold}
              onChange={(event) =>
                setSettings((current) => ({ ...current, isBold: event.target.checked }))
              }
              className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            />
            Bold
          </label>
          <label className="flex min-h-8 items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={settings.hasTextHighlight}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  hasTextHighlight: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
            />
            Highlight
          </label>
        </div>
      </div>

      {settings.logoUrl && (
        <div className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="logo-position">Logo position</Label>
            <Select
              id="logo-position"
              value={settings.logoPosition}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  logoPosition: event.target.value as LogoPosition,
                }))
              }
            >
              <option value="top-left">Top left</option>
              <option value="top-right">Top right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="bottom-right">Bottom right</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-size">Logo size</Label>
            <Input
              id="logo-size"
              type="range"
              min="64"
              max="280"
              value={settings.logoSize}
              onChange={(event) =>
                setSettings((current) => ({ ...current, logoSize: Number(event.target.value) }))
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}

type DrawEditorCanvasInput = {
  settings: ImageEditorSettings;
  backgroundImage: HTMLImageElement;
  logoImage: HTMLImageElement | null;
  width: number;
  height: number;
};

function drawEditorCanvas(
  context: CanvasRenderingContext2D,
  { settings, backgroundImage, logoImage, width, height }: DrawEditorCanvasInput,
) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#111827';
  context.fillRect(0, 0, width, height);

  const backgroundRect = calculateImageDrawRect({
    sourceWidth: backgroundImage.naturalWidth,
    sourceHeight: backgroundImage.naturalHeight,
    targetWidth: width,
    targetHeight: height,
    fit: settings.backgroundFit,
  });

  context.drawImage(
    backgroundImage,
    backgroundRect.x,
    backgroundRect.y,
    backgroundRect.width,
    backgroundRect.height,
  );

  drawTextOverlay(context, settings, width, height);

  if (logoImage) {
    drawLogo(context, settings, logoImage, width, height);
  }
}

function drawTextOverlay(
  context: CanvasRenderingContext2D,
  settings: ImageEditorSettings,
  width: number,
  height: number,
) {
  const text = settings.text.trim();
  if (!text) {
    return;
  }

  const padding = Math.round(width * 0.055);
  const maxTextWidth = width - padding * 2;
  const fontWeight = settings.isBold ? '700' : '400';
  context.font = `${fontWeight} ${settings.fontSize}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const lines = wrapText(context, text, maxTextWidth);
  const lineHeight = Math.round(settings.fontSize * 1.22);
  const blockHeight = lines.length * lineHeight;
  const centerY =
    settings.textPosition === 'top'
      ? padding + blockHeight / 2
      : settings.textPosition === 'center'
        ? height / 2
        : height - padding - blockHeight / 2;

  if (settings.hasTextHighlight) {
    context.fillStyle = 'rgba(17, 24, 39, 0.68)';
    context.fillRect(
      padding / 2,
      centerY - blockHeight / 2 - settings.fontSize * 0.35,
      width - padding,
      blockHeight + settings.fontSize * 0.7,
    );
  }

  context.fillStyle = settings.fontColor;
  lines.forEach((line, index) => {
    const lineY = centerY - blockHeight / 2 + lineHeight / 2 + index * lineHeight;
    context.fillText(line, width / 2, lineY);
  });
}

function drawLogo(
  context: CanvasRenderingContext2D,
  settings: ImageEditorSettings,
  logoImage: HTMLImageElement,
  width: number,
  height: number,
) {
  const padding = Math.round(width * 0.035);
  const scale = settings.logoSize / Math.max(logoImage.naturalWidth, logoImage.naturalHeight);
  const logoWidth = logoImage.naturalWidth * scale;
  const logoHeight = logoImage.naturalHeight * scale;
  const x = settings.logoPosition.endsWith('right') ? width - padding - logoWidth : padding;
  const y = settings.logoPosition.startsWith('bottom') ? height - padding - logoHeight : padding;

  context.drawImage(logoImage, x, y, logoWidth, logoHeight);
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth || !line) {
      line = nextLine;
    } else {
      lines.push(line);
      line = word;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines.slice(0, 5);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image failed to load'));
    image.src = src;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas export failed'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

function readError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
