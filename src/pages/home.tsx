import { Link } from 'react-router-dom';
import { PrototypeNav } from '@/components/layout/prototype-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const prototypeWorkflow = [
  'Business Profile / Brand Memory',
  'Draft Templates',
  'Content Ideas',
  'Caption Generation',
  'Draft Review',
  'Manual Export',
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PrototypeNav />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="space-y-5">
          <Badge>Local prototype</Badge>
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl font-semibold tracking-normal">Social Studio</h1>
            <p className="text-base leading-7 text-muted-foreground">
              AI-assisted content planning, caption drafting, review, and manual export for
              small businesses.
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              This prototype supports owner review and manual posting workflows. It does not
              auto-post to social platforms.
            </p>
          </div>

          <Button asChild>
            <Link to="/studio">Open Caption Studio</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Opening Caption Studio uses the existing sign-in gate for this prototype.
          </p>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
              Prototype workflow
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with brand context, generate options, review drafts, and export approved
              posts for manual publishing.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prototypeWorkflow.map((item, index) => (
              <Card key={item}>
                <CardHeader>
                  <CardTitle className="text-base">{item}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Step {index + 1}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
