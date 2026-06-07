import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const prototypeNavigation = [
  { name: 'Home', href: '/' },
  { name: 'Caption Studio', href: '/studio', aliases: ['/caption-test'] },
];

export function PrototypeNav() {
  const location = useLocation();

  return (
    <header className="border-b border-border/50 bg-background/72 shadow-[0_12px_46px_rgba(2,6,23,0.22)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <NavLink to="/" className="flex items-center gap-3 text-lg font-semibold tracking-normal">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 shadow-[0_0_24px_rgba(56,189,248,0.2)]">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_rgba(56,189,248,0.85)]" />
          </span>
          <span>Social Studio</span>
        </NavLink>

        <nav className="flex flex-wrap gap-2">
          {prototypeNavigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-md border border-transparent px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive || item.aliases?.includes(location.pathname)
                    ? 'border-primary/35 bg-primary/15 text-primary shadow-[0_0_24px_rgba(56,189,248,0.14)]'
                    : 'text-muted-foreground hover:border-primary/20 hover:bg-primary/10 hover:text-foreground',
                )
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
