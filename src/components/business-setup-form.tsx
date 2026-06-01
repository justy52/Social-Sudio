import { type FormEvent, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBusinessContext } from '@/context/business-context';
import type { BusinessFormValues } from '@/types';

const industryOptions = [
  'Contractor / Trades',
  'Fitness / Wellness',
  'Restaurant / Food',
  'Retail',
  'Professional Services',
  'Transportation / Logistics',
  'Other',
];

const initialValues: Required<BusinessFormValues> = {
  name: '',
  industry: '',
  websiteUrl: '',
  brandVoice: 'Professional, helpful, and approachable.',
  primaryColor: '#0F766E',
  accentColor: '#6D5BD0',
  logoUrl: '',
  timezone: 'America/Denver',
};

export function BusinessSetupForm() {
  const { createBusiness } = useBusinessContext();
  const [values, setValues] = useState(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateValue = (field: keyof BusinessFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await createBusiness(values);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Could not create the business.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-3xl items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle>Set up your first business</CardTitle>
          <CardDescription>
            Add the basic brand details Social Studio will use for future captions, draft
            review, and manual exports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="business-name">Business name</Label>
                <Input
                  id="business-name"
                  value={values.name}
                  onChange={(event) => updateValue('name', event.target.value)}
                  placeholder="Iron Backs Gym"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  id="industry"
                  value={values.industry}
                  onChange={(event) => updateValue('industry', event.target.value)}
                >
                  <option value="">Select an industry</option>
                  {industryOptions.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website-url">Website URL</Label>
                <Input
                  id="website-url"
                  value={values.websiteUrl}
                  onChange={(event) => updateValue('websiteUrl', event.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary color</Label>
                <Input
                  id="primary-color"
                  value={values.primaryColor}
                  onChange={(event) => updateValue('primaryColor', event.target.value)}
                  type="color"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent-color">Accent color</Label>
                <Input
                  id="accent-color"
                  value={values.accentColor}
                  onChange={(event) => updateValue('accentColor', event.target.value)}
                  type="color"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="logo-url">Logo URL placeholder</Label>
                <Input
                  id="logo-url"
                  value={values.logoUrl}
                  onChange={(event) => updateValue('logoUrl', event.target.value)}
                  placeholder="https://example.com/logo.png"
                  type="url"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="brand-voice">Brand voice</Label>
                <Textarea
                  id="brand-voice"
                  value={values.brandVoice}
                  onChange={(event) => updateValue('brandVoice', event.target.value)}
                  placeholder="Professional, helpful, and approachable."
                />
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create business'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
