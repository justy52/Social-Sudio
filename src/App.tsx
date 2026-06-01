import { RedirectToSignIn, useAuth } from '@clerk/clerk-react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { PrototypeNav } from '@/components/layout/prototype-nav';
import { LoadingState } from '@/components/ui/loading';
import { BusinessProvider } from '@/context/business-context';
import { CalendarPage } from '@/pages/calendar';
import { CaptionTestPage as CaptionStudioPage } from '@/pages/caption-test';
import { DashboardPage } from '@/pages/dashboard';
import { HomePage } from '@/pages/home';
import { NotFoundPage } from '@/pages/not-found';
import { PostsPage } from '@/pages/posts';
import { SettingsPage } from '@/pages/settings';
import { SignInPage } from '@/pages/sign-in';
import { SignUpPage } from '@/pages/sign-up';

export function App() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route path="/studio" element={<ProtectedCaptionStudio />} />
      <Route path="/caption-test" element={<ProtectedCaptionStudio />} />
      <Route element={<ProtectedApp />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function ProtectedCaptionStudio() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingState label="Checking your session" />;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="min-h-screen bg-background">
      <PrototypeNav />
      <CaptionStudioPage />
    </div>
  );
}

function ProtectedApp() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingState label="Checking your session" />;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <BusinessProvider>
      <AppShell />
    </BusinessProvider>
  );
}
