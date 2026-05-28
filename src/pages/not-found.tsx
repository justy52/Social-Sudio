import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-64 flex-col items-start justify-center gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Page not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">That route is not part of Social Studio.</p>
      </div>
      <Button asChild>
        <Link to="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  );
}
