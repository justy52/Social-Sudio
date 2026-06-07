import { SignUp } from '@clerk/clerk-react';

export function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10">
      <section className="w-full max-w-md space-y-5">
        <div className="relative overflow-hidden rounded-lg border border-primary/15 bg-card/60 p-5 text-center shadow-[0_22px_70px_rgba(2,6,23,0.36)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.18),transparent_34%)]" />
          <div className="relative mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(56,189,248,0.2)]">
            <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_18px_rgba(56,189,248,0.85)]" />
          </div>
          <h1 className="relative text-xl font-semibold">Social Studio</h1>
          <p className="relative mt-1 text-sm text-muted-foreground">Create your command center</p>
        </div>
        <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" appearance={authAppearance} />
      </section>
    </main>
  );
}

const authAppearance = {
  variables: {
    colorPrimary: '#38BDF8',
    colorBackground: '#0F172A',
    colorInputBackground: '#111827',
    colorInputText: '#E2E8F0',
    colorText: '#E2E8F0',
    colorTextSecondary: '#94A3B8',
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full',
    card: 'border border-border/60 bg-card/85 text-card-foreground shadow-[0_22px_70px_rgba(2,6,23,0.42)] backdrop-blur-2xl',
    headerTitle: 'text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButton:
      'border-border/70 bg-secondary/70 text-foreground transition-colors hover:bg-primary/10',
    formFieldInput:
      'border-input/80 bg-secondary/70 text-foreground focus:border-primary focus:ring-2 focus:ring-cyan-400/40',
    formButtonPrimary:
      'bg-primary text-primary-foreground shadow-[0_0_28px_rgba(56,189,248,0.24)] transition-colors hover:bg-primary/90',
    footerActionLink: 'text-primary hover:text-cyan-200',
  },
};
