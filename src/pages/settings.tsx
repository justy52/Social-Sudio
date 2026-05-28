import { type FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
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
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the basic business brand settings used by future content workflows.
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
          <CardDescription>
            This is light business branding for your own workspace, not full white-label SaaS.
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

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
