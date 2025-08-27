module.exports = {
  content: ['./src/**/*.{astro,js,jsx,ts,tsx,mdx,css}'],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      screens: {
        'xs': '460px', // Custom breakpoint for your specific needs
        // sm: '640px' (default)
        // md: '768px' (default)  
        // lg: '1024px' (default)
        // xl: '1280px' (default)
      },
      colors: {
        // Custom theme colors for better dark mode support
        primary: {
          50: 'rgb(240 249 255)', // blue-50
          100: 'rgb(224 242 254)', // blue-100
          500: 'rgb(59 130 246)', // blue-500
          600: 'rgb(37 99 235)', // blue-600
          700: 'rgb(29 78 216)', // blue-700
        },
        surface: {
          // Light mode
          50: 'rgb(248 250 252)', // slate-50
          100: 'rgb(241 245 249)', // slate-100
          200: 'rgb(226 232 240)', // slate-200
          // Dark mode
          800: 'rgb(30 41 59)', // slate-800
          850: 'rgb(25 35 51)', // Custom darker slate
          900: 'rgb(15 23 42)', // slate-900
          950: 'rgb(2 6 23)', // slate-950
        },
        text: {
          // Light mode
          primary: 'rgb(15 23 42)', // slate-900
          secondary: 'rgb(51 65 85)', // slate-700
          tertiary: 'rgb(71 85 105)', // slate-600
          muted: 'rgb(100 116 139)', // slate-500
          // Dark mode
          'primary-dark': 'rgb(248 250 252)', // slate-50
          'secondary-dark': 'rgb(226 232 240)', // slate-200
          'tertiary-dark': 'rgb(203 213 225)', // slate-300
          'muted-dark': 'rgb(148 163 184)', // slate-400
        }
      }
    },
  },
  plugins: [],
};
