/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e'
        },
        accent: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87'
        }
      },
      boxShadow: {
        soft: '0 20px 40px -12px rgba(14, 165, 233, 0.25)',
        glow: '0 0 40px rgba(168, 85, 247, 0.3)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)',
        'gradient-mesh': 'radial-gradient(at 0% 0%, rgba(14, 165, 233, 0.2) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.2) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.15) 0px, transparent 50%)'
      }
    }
  },
  plugins: []
};
