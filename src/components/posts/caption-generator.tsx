import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  generateCaption,
  type AuthTokenProvider,
  type CaptionTone,
  type GeneratedCaption,
} from '@/lib/posts/client';
import { buildCaptionSelection, type CaptionGeneratorSelection } from '@/lib/posts/captions-ui';
import { cn } from '@/lib/utils';

const toneOptions: { value: CaptionTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'funny', label: 'Funny' },
  { value: 'inspirational', label: 'Inspirational' },
];

type CaptionGeneratorProps = {
  businessId: string;
  getToken: AuthTokenProvider;
  onUseCaption: (selection: CaptionGeneratorSelection) => void;
};

export function CaptionGenerator({
  businessId,
  getToken,
  onUseCaption,
}: CaptionGeneratorProps) {
  const [promptContext, setPromptContext] = useState('');
  const [tone, setTone] = useState<CaptionTone>('professional');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [imageDescription, setImageDescription] = useState('');
  const [generated, setGenerated] = useState<GeneratedCaption | null>(null);
  const [selectedCaption, setSelectedCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!promptContext.trim()) {
      setError('Add a post topic before generating.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateCaption(getToken, {
        business_id: businessId,
        prompt_context: promptContext.trim(),
        tone,
        include_hashtags: includeHashtags,
        ...(imageDescription.trim() ? { image_description: imageDescription.trim() } : {}),
      });

      setGenerated(result);
      setSelectedCaption(result.caption);
    } catch (generateError) {
      setError(readError(generateError, 'Could not generate a caption.'));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleUseCaption() {
    if (!generated) {
      return;
    }

    onUseCaption(buildCaptionSelection(generated, selectedCaption));
  }

  return (
    <section className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Caption generator</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="caption-topic">What is this post about?</Label>
        <Textarea
          id="caption-topic"
          value={promptContext}
          onChange={(event) => setPromptContext(event.target.value)}
          placeholder="New cedar fence installation in Heber City"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="caption-tone">Tone</Label>
          <Select
            id="caption-tone"
            value={tone}
            onChange={(event) => setTone(event.target.value as CaptionTone)}
          >
            {toneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex min-h-10 items-center gap-2 pt-6 text-sm font-medium">
          <input
            type="checkbox"
            checked={includeHashtags}
            onChange={(event) => setIncludeHashtags(event.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          Include hashtags
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="caption-image-description">Image description</Label>
        <Input
          id="caption-image-description"
          value={imageDescription}
          onChange={(event) => setImageDescription(event.target.value)}
          placeholder="Finished cedar fence with mountain view"
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="button" onClick={handleGenerate} disabled={isGenerating}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {isGenerating ? 'Generating' : generated ? 'Regenerate' : 'Generate'}
      </Button>

      {generated && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="space-y-2">
            <Label htmlFor="generated-caption">Generated caption</Label>
            <Textarea
              id="generated-caption"
              value={selectedCaption}
              onChange={(event) => setSelectedCaption(event.target.value)}
            />
          </div>

          {generated.alternatives.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Alternatives</p>
              <div className="grid gap-2">
                {generated.alternatives.map((alternative) => (
                  <button
                    key={alternative}
                    type="button"
                    onClick={() => setSelectedCaption(alternative)}
                    className={cn(
                      'rounded-md border bg-background p-3 text-left text-sm transition-colors hover:border-primary/50',
                      selectedCaption === alternative ? 'border-primary' : 'border-border',
                    )}
                  >
                    {alternative}
                  </button>
                ))}
              </div>
            </div>
          )}

          {generated.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {generated.hashtags.map((hashtag) => (
                <span
                  key={hashtag}
                  className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground"
                >
                  {hashtag}
                </span>
              ))}
            </div>
          )}

          <Button type="button" variant="secondary" onClick={handleUseCaption}>
            Use this caption
          </Button>
        </div>
      )}
    </section>
  );
}

function readError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
