import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const prototypeNavigation = [
  { name: 'Home', href: '/' },
  { name: 'Caption Studio', href: '/studio' },
];

export function PrototypeNav() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <NavLink to="/" className="text-lg font-semibold tracking-normal">
          Social Studio
        </NavLink>

        <nav className="flex flex-wrap gap-2">
          {prototypeNavigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
