import { SignUp } from '@clerk/clerk-react';

export function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-transparent px-4 py-10">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </main>
  );
}
