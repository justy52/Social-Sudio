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
        <div className="max-w-md rounded-lg border border-border/60 bg-card/80 p-5 text-sm text-card-foreground shadow-[0_20px_70px_rgba(2,6,23,0.38)] backdrop-blur-xl">
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
    <div className="min-h-screen bg-transparent">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/60 bg-card/70 shadow-[12px_0_55px_rgba(2,6,23,0.34)] backdrop-blur-2xl lg:block">
        <SidebarContent />
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-background/75 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation"
            type="button"
          />
          <div className="relative h-full w-72 border-r border-border/60 bg-card/85 shadow-[20px_0_70px_rgba(2,6,23,0.5)] backdrop-blur-2xl">
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
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/72 shadow-[0_12px_46px_rgba(2,6,23,0.22)] backdrop-blur-2xl">
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
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 shadow-[0_0_28px_rgba(56,189,248,0.22)]">
            <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_18px_rgba(56,189,248,0.85)]" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-normal">Social Studio</p>
            <p className="text-xs uppercase tracking-normal text-primary/80">AI command center</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Content planning for small business</p>
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
                  'flex h-10 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'border-primary/35 bg-primary/15 text-primary shadow-[0_0_28px_rgba(56,189,248,0.16)]'
                    : 'text-muted-foreground hover:border-primary/20 hover:bg-primary/10 hover:text-foreground',
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
