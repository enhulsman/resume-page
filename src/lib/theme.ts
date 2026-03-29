export type ThemeName = 'dark' | 'light';

export interface ThemeConfig {
  name: ThemeName;
  displayName: string;
  icon: string;
}

export const themes: ThemeConfig[] = [
  { name: 'dark', displayName: 'Dark', icon: '🌙' },
  { name: 'light', displayName: 'Light', icon: '☀️' },
];

export function getCurrentTheme(): ThemeName {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: ThemeName): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Dark is default (no attribute). Light requires data-theme="light".
  if (theme === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  localStorage.setItem('theme', theme);
}
