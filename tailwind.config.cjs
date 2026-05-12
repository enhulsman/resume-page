module.exports = {
  content: ['./src/**/*.{astro,js,jsx,ts,tsx,mdx,css}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      screens: {
        'xs': '460px',
      },
      colors: {
        // NOTE: These reference CSS variables. Do NOT use with Tailwind opacity modifiers
        // (bg-primary-500/30 etc.) — CSS vars break opacity decomposition in TW3.
        // No component currently uses these class names; this is reference-doc alignment only.
        primary: {
          50: 'var(--color-accent-light)',
          100: 'var(--color-accent-light)',
          500: 'var(--color-accent-primary)',
          600: 'var(--color-accent-hover)',
          700: 'var(--color-accent-hover)',
        },
        teal: {
          DEFAULT: 'var(--color-teal)',
        },
        surface: {
          50: 'var(--color-bg-primary)',
          100: 'var(--color-bg-secondary)',
          200: 'var(--color-bg-tertiary)',
          800: 'var(--color-bg-secondary)',
          850: 'var(--color-bg-secondary)',
          900: 'var(--color-bg-primary)',
          950: 'var(--color-bg-primary)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          muted: 'var(--color-text-muted)',
          'primary-dark': 'var(--color-text-primary)',
          'secondary-dark': 'var(--color-text-secondary)',
          'tertiary-dark': 'var(--color-text-tertiary)',
          'muted-dark': 'var(--color-text-muted)',
        }
      }
    },
  },
  plugins: [],
};
