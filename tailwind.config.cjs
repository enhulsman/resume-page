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
        primary: {
          50: 'rgb(255 249 235)',
          100: 'rgb(254 240 200)',
          500: 'rgb(201 148 43)',
          600: 'rgb(175 125 30)',
          700: 'rgb(150 105 20)',
        },
        surface: {
          50: 'rgb(252 250 245)',
          100: 'rgb(245 242 235)',
          200: 'rgb(235 232 225)',
          800: 'rgb(36 34 43)',
          850: 'rgb(32 30 39)',
          900: 'rgb(28 26 35)',
          950: 'rgb(20 18 27)',
        },
        text: {
          primary: 'rgb(35 30 25)',
          secondary: 'rgb(60 55 45)',
          tertiary: 'rgb(90 85 75)',
          muted: 'rgb(130 125 115)',
          'primary-dark': 'rgb(240 234 214)',
          'secondary-dark': 'rgb(210 204 186)',
          'tertiary-dark': 'rgb(170 164 150)',
          'muted-dark': 'rgb(120 116 108)',
        }
      }
    },
  },
  plugins: [],
};
