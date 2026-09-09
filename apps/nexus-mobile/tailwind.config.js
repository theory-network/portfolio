const { join } = require('node:path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [join(__dirname, 'src/**/*.{html,ts}')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Mirrors the mockup's CSS custom properties 1:1 so hand-written
        // Tailwind utility classes and the ported global CSS agree on one palette.
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        line: 'var(--line)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        'muted-2': 'var(--muted-2)',
        personal: 'var(--personal)',
        pro: 'var(--pro)',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
