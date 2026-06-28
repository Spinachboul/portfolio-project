import { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme, THEMES, type ThemeName } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost h-9 w-9 !px-0"
        aria-label="Change theme"
        title="Change theme"
      >
        <Palette size={18} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-surface shadow-lg p-1 z-50 animate-fade-in">
          <p className="px-3 py-1.5 text-xs font-medium text-muted uppercase tracking-wider">
            Theme
          </p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTheme(t.id as ThemeName);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-surface-2 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ background: t.swatch }}
                />
                {t.label}
              </span>
              {theme === t.id && <Check size={15} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
