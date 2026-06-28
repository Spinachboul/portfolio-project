import { useEffect, useState } from 'react';
import { Menu, X, PenTool, LayoutDashboard } from 'lucide-react';
import { useRouter } from '../lib/router';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/blog', label: 'Blog' },
  { to: '/blueprint', label: 'Blueprint' },
  { to: '/contact', label: 'Contact' },
];

export default function Nav() {
  const { path, navigate } = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [path]);

  const isActive = (to: string) =>
    to === '/' ? path === '/' : path === to || path.startsWith(to + '/');

  const go = (to: string) => navigate(to);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-bg/85 backdrop-blur-md border-b border-border'
          : 'bg-bg/0 border-b border-transparent'
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between">
        <button
          type="button"
          onClick={() => go('/')}
          className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg">
            <PenTool size={16} />
          </span>
          <span>Dev Journal</span>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <button
              key={l.to}
              type="button"
              onClick={() => go(l.to)}
              className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(l.to)
                  ? 'text-text'
                  : 'text-muted hover:text-text hover:bg-surface-2'
              }`}
            >
              {l.label}
              {isActive(l.to) && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
          {user && (
            <button
              type="button"
              onClick={() => go('/admin')}
              className={`ml-1 flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/admin')
                  ? 'text-text'
                  : 'text-muted hover:text-text hover:bg-surface-2'
              }`}
            >
              <LayoutDashboard size={15} />
              Admin
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <button
              type="button"
              onClick={() => go('/admin')}
              className="hidden md:inline-flex btn-outline h-9"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => go('/login')}
              className="hidden md:inline-flex btn-outline h-9"
            >
              Sign in
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden btn-ghost h-9 w-9 !px-0"
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-border bg-surface animate-fade-in">
          <div className="container-page py-2 flex flex-col">
            {LINKS.map((l) => (
              <button
                key={l.to}
                type="button"
                onClick={() => go(l.to)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive(l.to) ? 'bg-surface-2 text-text' : 'text-muted'
                }`}
              >
                {l.label}
              </button>
            ))}
            {user && (
              <button
                type="button"
                onClick={() => go('/admin')}
                className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-muted"
              >
                Admin
              </button>
            )}
            {!user && (
              <button
                type="button"
                onClick={() => go('/login')}
                className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-muted"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
