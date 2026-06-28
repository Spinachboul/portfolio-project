import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeName = 'light' | 'dark' | 'sepia' | 'ocean' | 'forest';

export const THEMES: { id: ThemeName; label: string; swatch: string }[] = [
  { id: 'light', label: 'Light', swatch: '#faf9f8' },
  { id: 'dark', label: 'Dark', swatch: '#0c0c0e' },
  { id: 'sepia', label: 'Sepia', swatch: '#f4ecd8' },
  { id: 'ocean', label: 'Ocean', swatch: '#e2f0f4' },
  { id: 'forest', label: 'Forest', swatch: '#f0f7f0' },
];

type Ctx = {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
};

const ThemeContext = createContext<Ctx | null>(null);
const STORAGE_KEY = 'devjournal.theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    if (saved && THEMES.some((t) => t.id === saved)) return saved;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: ThemeName) => setThemeState(t);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
