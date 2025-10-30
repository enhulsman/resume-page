import { type ThemeName } from './theme.ts';

export { getCurrentTheme } from './theme.ts';

/**
 * Get the CSS variables for a specific theme.
 * Used for components like iframes that need to inherit themes.
 */
export function getThemeVariables(theme: ThemeName): string {
  const baseVariables = `
    /* Theme variables inherited from parent */
    --color-bg-primary: rgb(255 255 255);
    --color-bg-secondary: rgb(248 250 252);
    --color-bg-tertiary: rgb(241 245 249);
    --color-bg-elevated: rgba(255 255 255 / 0.7);
    --color-text-primary: rgb(15 23 42);
    --color-text-secondary: rgb(51 65 85);
    --color-text-tertiary: rgb(71 85 105);
    --color-text-muted: rgb(100 116 139);
    --color-border-primary: rgb(226 232 240);
    --color-border-secondary: rgb(203 213 225);
    --color-accent-primary: rgb(99 102 241);
    --color-accent-hover: rgb(79 70 229);
    --color-accent-light: rgb(165 180 252);
    --color-success: rgb(34 197 94);
    --color-warning: rgb(245 158 11);
    --color-error: rgb(239 68 68);
    --transition-theme: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-fast: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  const darkOverrides = `
    --color-bg-primary: rgb(15 23 42);
    --color-bg-secondary: rgb(30 41 59);
    --color-bg-tertiary: rgb(51 65 85);
    --color-bg-elevated: rgba(30 41 59 / 0.8);
    --color-text-primary: rgb(248 250 252);
    --color-text-secondary: rgb(226 232 240);
    --color-text-tertiary: rgb(203 213 225);
    --color-text-muted: rgb(148 163 184);
    --color-border-primary: rgb(71 85 105);
    --color-border-secondary: rgb(51 65 85);
    --color-accent-hover: rgb(129 140 248);
  `;

  const gruvboxOverrides = `
    --color-bg-primary: rgb(40 40 40);
    --color-bg-secondary: rgb(60 56 54);
    --color-bg-tertiary: rgb(80 73 69);
    --color-bg-elevated: rgba(60 56 54 / 0.9);
    --color-text-primary: rgb(235 219 178);
    --color-text-secondary: rgb(213 196 161);
    --color-text-tertiary: rgb(189 174 147);
    --color-text-muted: rgb(146 131 116);
    --color-border-primary: rgb(102 92 84);
    --color-border-secondary: rgb(80 73 69);
    --color-accent-primary: rgb(254 128 25);
    --color-accent-hover: rgb(254 128 25);
    --color-accent-light: rgb(254 128 25);
  `;

  switch (theme) {
    case 'dark':
      return baseVariables + darkOverrides;
    case 'gruvbox':
      return baseVariables + gruvboxOverrides;
    default:
      return baseVariables;
  }
}
