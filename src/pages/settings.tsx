import { type FormEvent, useEffect, useState } from 'react';
import { Building2, Palette, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBusinessContext } from '@/context/business-context';
import type { BusinessFormValues } from '@/types';

export function SettingsPage() {
  const { activeBusiness, updateBusiness } = useBusinessContext();
  const [values, setValues] = useState<BusinessFormValues>({ name: '' });
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!activeBusiness) {
      return;
    }

    setValues({
      name: activeBusiness.name,
      industry: activeBusiness.industry ?? '',
      websiteUrl: activeBusiness.websiteUrl ?? '',
      brandVoice: activeBusiness.brandVoice ?? '',
      primaryColor: activeBusiness.primaryColor,
      accentColor: activeBusiness.accentColor,
      logoUrl: activeBusiness.logoUrl ?? '',
      timezone: activeBusiness.timezone,
    });
  }, [activeBusiness]);

  if (!activeBusiness) {
    return null;
  }

  const isStatusError = Boolean(status && status !== 'Business settings saved.');

  const updateValue = (field: keyof BusinessFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      await updateBusiness(activeBusiness.id, values);
      setStatus('Business settings saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-lg border border-primary/15 bg-card/60 p-5 shadow-[0_22px_70px_rgba(2,6,23,0.36)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.14),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.16),transparent_34%)]" />
        <div className="relative flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
            <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the basic business brand settings used by future content workflows.
            </p>
          </div>
        </div>
      </header>

      <Card className="max-w-3xl overflow-hidden border-primary/15 bg-card/70">
        <CardHeader className="relative overflow-hidden border-b border-border/60 bg-secondary/25">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(139,92,246,0.13),transparent_32%),linear-gradient(90deg,rgba(56,189,248,0.08),transparent_38%)]" />
          <div className="relative flex items-start gap-3">
            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 shadow-[0_0_22px_rgba(56,189,248,0.14)]">
              <Palette className="h-4 w-4 text-primary" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Business profile</CardTitle>
              <CardDescription>
                This is light business branding for your own workspace, not full white-label SaaS.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="settings-business-name">Business name</Label>
                <Input
                  id="settings-business-name"
                  value={values.name ?? ''}
                  onChange={(event) => updateValue('name', event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-industry">Industry</Label>
                <Input
                  id="settings-industry"
                  value={values.industry ?? ''}
                  onChange={(event) => updateValue('industry', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-website-url">Website URL</Label>
                <Input
                  id="settings-website-url"
                  value={values.websiteUrl ?? ''}
                  onChange={(event) => updateValue('websiteUrl', event.target.value)}
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-primary-color">Primary color</Label>
                <Input
                  id="settings-primary-color"
                  value={values.primaryColor ?? '#0F766E'}
                  onChange={(event) => updateValue('primaryColor', event.target.value)}
                  type="color"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-accent-color">Accent color</Label>
                <Input
                  id="settings-accent-color"
                  value={values.accentColor ?? '#6D5BD0'}
                  onChange={(event) => updateValue('accentColor', event.target.value)}
                  type="color"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="settings-logo-url">Logo URL placeholder</Label>
                <Input
                  id="settings-logo-url"
                  value={values.logoUrl ?? ''}
                  onChange={(event) => updateValue('logoUrl', event.target.value)}
                  type="url"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="settings-brand-voice">Brand voice</Label>
                <Textarea
                  id="settings-brand-voice"
                  value={values.brandVoice ?? ''}
                  onChange={(event) => updateValue('brandVoice', event.target.value)}
                />
              </div>
            </div>

            {status ? (
              <p
                role={isStatusError ? 'alert' : 'status'}
                aria-live="polite"
                className={
                  isStatusError
                    ? 'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
                    : 'rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary'
                }
              >
                {status}
              </p>
            ) : null}

            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? 'Saving...' : 'Save settings'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
