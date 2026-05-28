import { Building2, CheckCircle2, ImagePlus, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusinessContext } from '@/context/business-context';

const foundationItems = [
  {
    title: 'Business profile',
    description: 'Brand voice, colors, industry, and logo placeholder are ready.',
    icon: Building2,
  },
  {
    title: 'Protected workspace',
    description: 'Routes sit behind Clerk authentication.',
    icon: ShieldCheck,
  },
  {
    title: 'Phase 2 entry point',
    description: 'Image upload and content creation will start after this foundation.',
    icon: ImagePlus,
  },
];

export function DashboardPage() {
  const { activeBusiness } = useBusinessContext();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Foundation workspace for {activeBusiness?.name}.
          </p>
        </div>
        <Badge>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Phase 1
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {foundationItems.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title}>
              <CardHeader>
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>First useful workflow</CardTitle>
          <CardDescription>
            The product path stays focused: business setup, image upload, basic branded edit, AI
            caption draft, review, approve, and export for manual posting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-md border border-border p-3">1. Business setup</div>
            <div className="rounded-md border border-border p-3">2. Content MVP next</div>
            <div className="rounded-md border border-border p-3">3. Manual posting only</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
