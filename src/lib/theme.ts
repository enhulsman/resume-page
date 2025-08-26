export type ThemeName = 'light' | 'dark' | 'gruvbox';

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  icon: string;
}

export const themes: ThemeConfig[] = [
  { name: 'light', displayName: 'Light', icon: '☀️' },
  { name: 'dark', displayName: 'Dark', icon: '🌙' },
  { name: 'gruvbox', displayName: 'Gruvbox', icon: '🟫' },
];

export const defaultTheme: ThemeName = 'light';

// Theme management utilities
export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') return defaultTheme;
  
  const stored = localStorage.getItem('theme') as ThemeName;
  return stored && themes.some(t => t.name === stored) ? stored : defaultTheme;
}

export function setStoredTheme(theme: ThemeName): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('theme', theme);
}

export function applyTheme(theme: ThemeName): void {
  if (typeof document === 'undefined') return;
  
  // Remove all theme data attributes
  themes.forEach(t => {
    document.documentElement.removeAttribute(`data-theme`);
  });
  
  // Apply new theme (light is default, no data attribute needed)
  if (theme !== 'light') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function getSystemTheme(): ThemeName {
  if (typeof window === 'undefined') return defaultTheme;
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initializeTheme(): ThemeName {
  const stored = getStoredTheme();
  const theme = stored === defaultTheme ? getSystemTheme() : stored;
  applyTheme(theme);
  return theme;
}
