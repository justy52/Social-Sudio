import { CalendarDays } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manual posting calendar work starts in Phase 3 after the content MVP is complete.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
          <CardTitle>Calendar placeholder</CardTitle>
          <CardDescription>
            No cron, email reminders, or auto-publishing are included in Phase 1.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
