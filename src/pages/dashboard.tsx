import { CalendarDays, CheckCircle2, Download, ImagePlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusinessContext } from '@/context/business-context';

const workflowItems = [
  {
    title: 'Create content',
    description: 'Draft posts, upload and edit images, and generate captions from brand context.',
    icon: ImagePlus,
  },
  {
    title: 'Export or schedule',
    description: 'Quick Export copies post text and downloads images, or schedule approved posts.',
    icon: Download,
  },
  {
    title: 'Post manually',
    description: 'Use the Today checklist to export, copy text, mark posted, and undo if needed.',
    icon: CalendarDays,
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
            Manual posting workspace for {activeBusiness?.name ?? 'your business'}.
          </p>
        </div>
        <Badge>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Phase 3 MVP
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {workflowItems.map((item) => {
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
          <CardTitle>Current MVP workflow</CardTitle>
          <CardDescription>
            Social Studio is focused on the daily manual posting loop: create content, prepare
            the final asset, schedule what is due, and track what has been posted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div className="rounded-md border border-border p-3">1. Create and caption posts</div>
            <div className="rounded-md border border-border p-3">2. Quick export or schedule</div>
            <div className="rounded-md border border-border p-3">3. Use Today and mark posted</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
