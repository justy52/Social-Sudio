import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/App';
import '@/styles/globals.css';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {publishableKey ? (
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/sign-in">
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ClerkProvider>
    ) : (
      <MissingClerkConfig />
    )}
  </React.StrictMode>,
);

function MissingClerkConfig() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-lg border border-border bg-card p-5 text-card-foreground">
        <h1 className="text-base font-semibold">Clerk publishable key required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add `VITE_CLERK_PUBLISHABLE_KEY` to `.env.local` to run the authenticated app.
        </p>
      </div>
    </main>
  );
}
