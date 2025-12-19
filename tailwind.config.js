/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        foton: {
          blue: '#0066B3', // Primary Foton Blue
          dark: '#041A54', // Dark Blue (Footer/Header)
          gold: '#BC8602', // Accent Gold
          black: '#000000',
          gray: '#333333',
          light: '#F5F5F5'
        }
      }
    },
  },
  plugins: [],
}
