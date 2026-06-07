import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const appNavigation = [
  { name: 'Dashboard', href: '/dashboard', description: 'Track live content pipeline metrics.' },
  {
    name: 'Posts',
    href: '/posts',
    description: 'Create drafts, upload images, and generate AI captions.',
  },
  { name: 'Calendar', href: '/calendar', description: 'Manage scheduled manual posting queues.' },
  {
    name: 'Settings',
    href: '/settings',
    description: 'Update business profile and brand context.',
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-3 text-lg font-semibold tracking-normal">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 shadow-[0_0_24px_rgba(56,189,248,0.2)]">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_rgba(56,189,248,0.85)]" />
            </span>
            <span>Social Studio</span>
          </Link>

          <nav className="flex flex-wrap gap-2" aria-label="Primary app navigation">
            {appNavigation.map((item) => (
              <Button key={item.href} asChild size="sm" variant="ghost">
                <Link to={item.href}>{item.name}</Link>
              </Button>
            ))}
          </nav>
        </header>

        <section className="space-y-5">
          <Badge>Phase 3 MVP</Badge>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl font-semibold tracking-normal">Social Studio</h1>
            <p className="text-base leading-7 text-muted-foreground">
              AI-assisted content planning, database-backed post drafts, review, scheduling, and
              manual export for small businesses.
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Use Posts for the validated AI caption workflow. Social Studio does not auto-post to
              social platforms in the Phase 3 MVP.
            </p>
          </div>

          <Button asChild>
            <Link to="/posts">Open Posts</Link>
          </Button>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
              App workflow
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with live metrics, create or review posts, then schedule or export work for
              manual publishing.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {appNavigation.map((item) => (
              <Card key={item.href}>
                <CardHeader>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
