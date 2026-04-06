/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chrome: {
          950: '#060916',
          900: '#09101d',
          850: '#0d1524',
          800: '#111b2d',
          700: '#18263f',
        },
        accent: {
          300: '#c3ff74',
          400: '#9ef65f',
          500: '#78df53',
        },
      },
      boxShadow: {
        shell: '0 24px 80px rgba(0, 0, 0, 0.45)',
        glow: '0 0 0 1px rgba(158, 246, 95, 0.16), 0 0 32px rgba(158, 246, 95, 0.10)',
      },
      borderRadius: {
        shell: '28px',
      },
    },
  },
};
