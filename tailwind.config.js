/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"], // Adjust paths as necessary
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2DB6FF',
        secondary: '#F47CC6',
        background: '#F5F5F5',
        surface: '#FFFFFF',
        text: '#2D2D2D',
        textSecondary: '#7A7A7A',
        border: '#E0E0E0',
        // Dark theme colors - using black instead of gray
        'dark-bg': '#000000',
        'dark-surface': '#1A1A1A',
        'dark-text': '#FFFFFF',
        'dark-text-secondary': '#CCCCCC',
        'dark-border': '#333333',
      },
    },
  },
  plugins: [],
};
