/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#f6fbff',
          100: '#eaf5ff',
          200: '#cfe8ff',
          300: '#abd6ff',
          400: '#78beff',
          500: '#49a6ff',
          600: '#2a8dff',
          700: '#1f73d6',
          800: '#1f5cab',
          900: '#1f4a85',
        },
      },
    },
  },
  plugins: [],
};
