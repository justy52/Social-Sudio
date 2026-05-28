import { useState } from 'react';
import { UserButton } from '@clerk/clerk-react';
import { CalendarDays, Home, Menu, Settings, StickyNote, X } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { BusinessSetupForm } from '@/components/business-setup-form';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading';
import { Select } from '@/components/ui/select';
import { useBusinessContext } from '@/context/business-context';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Posts', href: '/posts', icon: StickyNote },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppShell() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { activeBusiness, businesses, error, isLoading, selectBusiness } = useBusinessContext();

  if (isLoading) {
    return <LoadingState label="Loading Social Studio" />;
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-5 text-sm text-card-foreground">
          <h1 className="mb-2 text-base font-semibold">Could not load your workspace</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!activeBusiness) {
    return <BusinessSetupForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <SidebarContent />
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-foreground/20"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation"
            type="button"
          />
          <div className="relative h-full w-72 border-r border-border bg-card">
            <div className="flex justify-end p-3">
              <Button
                aria-label="Close navigation"
                size="icon"
                variant="ghost"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
            <SidebarContent onNavigate={() => setIsMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Button
              aria-label="Open navigation"
              className="lg:hidden"
              size="icon"
              variant="ghost"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium uppercase text-muted-foreground">
                Active business
              </p>
              <div className="mt-1 max-w-xs">
                <Select
                  aria-label="Select active business"
                  value={activeBusiness.id}
                  onChange={(event) => selectBusiness(event.target.value)}
                >
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col px-4 py-5">
      <div className="mb-8">
        <p className="text-lg font-semibold tracking-normal">Social Studio</p>
        <p className="mt-1 text-sm text-muted-foreground">Content planning for small business</p>
      </div>

      <nav className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
