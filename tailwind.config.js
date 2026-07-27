/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        shadow: {
          primary: '#0a0a0f',
          secondary: '#111118',
          card: '#1a1a2e',
          gold: '#f0c040',
          goldDark: '#d4a017',
          purple: '#8b5cf6',
          purpleDark: '#6d28d9',
          purpleLight: '#a78bfa',
          red: '#ef4444',
          green: '#22c55e',
          blue: '#6ab0ff',
          cyan: '#00d4ff',
          text: '#ffffff',
          textSecondary: '#9ca3af',
          textMuted: '#6b7280',
        },
      },
      fontFamily: {
        heading: ['Cinzel', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        goldGlow: '0 0 20px rgba(240,192,64,0.4)',
        purpleGlow: '0 0 20px rgba(139,92,246,0.4)',
      },
      keyframes: {
        emberPulse: {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.04)' },
        },
        auraDrift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -8px, 0)' },
        },
      },
      animation: {
        emberPulse: 'emberPulse 5s ease-in-out infinite',
        auraDrift: 'auraDrift 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
