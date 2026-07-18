/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] }, boxShadow: { card: '0 1px 2px rgba(15,23,42,.04), 0 12px 30px rgba(15,23,42,.05)' } } },
  plugins: [],
};
