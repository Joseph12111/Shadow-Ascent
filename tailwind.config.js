/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        shadow: {
          primary: '#0A0A0F',
          secondary: '#0D0D14',
          card: '#14141C',
          gold: '#F5C542',
          goldDark: '#D1A030',
          purple: '#8B5CF6',
          purpleDark: '#6D28D9',
          purpleLight: '#A855F7',
          red: '#EF4444',
          green: '#22C55E',
          blue: '#6AB0FF',
          cyan: '#00D4FF',
          text: '#FFFFFF',
          textSecondary: '#A1A1AA',
          textMuted: '#71717A',
          border: '#2A2438',
        },
      },
      fontFamily: {
        heading: ['Cinzel', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
        goldGlow: '0 0 20px rgba(245,197,66,0.4)',
        goldGlowStrong: '0 0 32px rgba(245,197,66,0.55)',
        purpleGlow: '0 0 20px rgba(168,85,247,0.4)',
        purpleGlowStrong: '0 0 32px rgba(168,85,247,0.55)',
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
