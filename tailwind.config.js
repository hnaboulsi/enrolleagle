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
        ink: '#0b0f19',
        slate: '#1f2937',
        brand: '#0f766e',
        sand: '#f8f4ef',
        gold: '#eab308'
      },
      boxShadow: {
        soft: '0 12px 30px rgba(15, 118, 110, 0.15)'
      }
    }
  },
  plugins: []
};
