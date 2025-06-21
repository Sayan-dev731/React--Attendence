/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          primary: '#1f2937',
          secondary: '#374151',
          accent: '#4b5563',
        }
      }
    },
  },
  plugins: [],
};
