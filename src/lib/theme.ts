export type ThemeName = 'dark' | 'light';

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  icon: string;
}

export const themes: ThemeConfig[] = [
  { name: 'light', displayName: 'Light', icon: '☀️' },
  { name: 'dark', displayName: 'Dark', icon: '🌙' },
];

export function getCurrentTheme(): ThemeName {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  // no attribute: nothing chosen yet on the homepage, which follows the system
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function setTheme(theme: ThemeName): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Always explicit: the homepage stylesheet follows the system when the attribute is
  // missing, so "dark" has to be written out to win over a light system setting.
  document.documentElement.setAttribute('data-theme', theme);

  try { localStorage.setItem('theme', theme); } catch { /* storage blocked: the choice lasts this page */ }
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
}
