/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#FFFDF5',
          cream: '#FFF9E6',
          card: '#FFFFFF',
          dark: '#121212',
          black: '#000000',
          yellow: '#FFE600',
          green: '#00E599',
          pink: '#FF6B8B',
          purple: '#A388EE',
          blue: '#4D9FFF',
          cyan: '#2DE2E6',
          orange: '#FF8811',
          red: '#FF4757',
          gray: '#E2E8F0',
          muted: '#71717A',
        }
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0px 0px #000000',
        'brutal': '4px 4px 0px 0px #000000',
        'brutal-lg': '6px 6px 0px 0px #000000',
        'brutal-xl': '8px 8px 0px 0px #000000',
        'brutal-red': '4px 4px 0px 0px #DC2626',
        'brutal-green': '4px 4px 0px 0px #16A34A',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
