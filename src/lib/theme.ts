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

export function getCurrentTheme(): ThemeName {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  return (attr === 'dark' || attr === 'gruvbox') ? attr : 'light';
}

export function setTheme(theme: ThemeName): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  // Apply to DOM (light is default, no attribute needed)
  if (theme === 'light') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  // Persist to storage
  localStorage.setItem('theme', theme);
}
