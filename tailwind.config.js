/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        bgDeep: 'rgb(var(--c-bgDeep) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        inkSoft: 'rgb(var(--c-inkSoft) / <alpha-value>)',
        inkMuted: 'rgb(var(--c-inkMuted) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        accentStrong: 'rgb(var(--c-accentStrong) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
      },
      borderRadius: {
        sm: '12px',
        md: '18px',
        lg: '28px',
      },
      boxShadow: {
        // Neumorphism adaptatif (variables light/dark)
        'neu': '8px 8px 18px rgb(var(--shadow-dark) / 0.55), -8px -8px 18px rgb(var(--shadow-light) / 0.85)',
        'neu-sm': '4px 4px 10px rgb(var(--shadow-dark) / 0.45), -4px -4px 10px rgb(var(--shadow-light) / 0.85)',
        'neu-in': 'inset 5px 5px 10px rgb(var(--shadow-dark) / 0.55), inset -5px -5px 10px rgb(var(--shadow-light) / 0.85)',
      },
      fontSize: {
        display: ['56px', { lineHeight: '1' }],
        hero:    ['96px', { lineHeight: '1' }],
        mega:    ['144px', { lineHeight: '1' }],
      },
      keyframes: {
        halo: {
          '0%, 100%': { boxShadow: '8px 8px 18px rgb(var(--shadow-dark) / 0.55), -8px -8px 18px rgb(var(--shadow-light) / 0.85)' },
          '50%':      { boxShadow: '0 0 0 8px rgb(var(--c-accent) / 0.25), 8px 8px 18px rgb(var(--shadow-dark) / 0.55), -8px -8px 18px rgb(var(--shadow-light) / 0.85)' },
        },
      },
      animation: {
        halo: 'halo 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
